import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { systemPrompt, greetingFor } from './prompt.js';
import { getAvailableSlots, createBooking, cancelBooking } from './calcom.js';
import { updateLead, getLead } from './store.js';
import { alertOwner } from './twilioSms.js';
import { upsertContactByPhone, createAppointment as sbCreateAppointment, createJob as sbCreateJob, updateCall, updateAppointment as sbUpdateAppointment, createNotification } from './supabase.js';

const client = new Anthropic({ apiKey: config.anthropicApiKey });

const tools = [
  {
    name: 'check_availability',
    description:
      'Get the next available appointment openings. Call this before offering the caller any times. Returns real slots — only offer times this returns. If the caller named a specific day/time (e.g. "tomorrow at 4pm"), pass preferred_time so you get the closest real opening to that instead of just the soonest one.',
    input_schema: {
      type: 'object',
      properties: {
        preferred_time: {
          type: 'string',
          description: 'ISO 8601 timestamp for the day/time the caller asked about, your best-effort guess (e.g. tomorrow 4pm in the business timezone). Only used to find the closest real opening on that day — omit if the caller has no specific preference.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'book_appointment',
    description:
      "Schedule the callback time the caller chose. Call this as soon as they pick a time — you do NOT need their name or the job details yet (those come after). Or set callback_only if they won't pick a firm time.",
    input_schema: {
      type: 'object',
      properties: {
        starts_at: {
          type: 'string',
          description: 'The ISO 8601 start time the caller chose (from check_availability). Omit if callback_only.',
        },
        name: { type: 'string', description: "Caller's name, if you already have it (optional)" },
        callback_only: {
          type: 'boolean',
          description: 'True if the caller is not booking a firm time and just wants a callback whenever.',
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'record_details',
    description:
      "Save the details you collect AFTER booking: the caller's name and the kind of work they need. Call this once you have both.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "Caller's name" },
        work_type: { type: 'string', description: 'The kind of work / reason the caller needs help' },
      },
      required: ['work_type'],
      additionalProperties: false,
    },
  },
  {
    name: 'take_message',
    description:
      "Take a message from the caller INSTEAD of booking a callback — use when the caller would rather just leave a message, doesn't want to schedule a time, or declines the times offered. Collect what they want to say and their name; you already have their phone number.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "Caller's name, if you have it" },
        message: { type: 'string', description: 'What the caller wants to pass along to the team' },
      },
      required: ['message'],
      additionalProperties: false,
    },
  },
  {
    name: 'cancel_appointment',
    description:
      "Cancel the callback appointment you just booked for this caller. Use this ANY time the caller wants it canceled — they directly ask to cancel, they change their mind, or the job turns out to be outside what the business offers and they agree to cancel.",
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Short reason, e.g. "caller asked to cancel", "out of service area", or "service not offered"' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'end_call',
    description:
      'Hang up the call. Call this ONLY when the conversation is fully complete — after you have said a brief goodbye in the SAME message. Always include the goodbye words in your text; end_call just disconnects after you finish speaking.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

// Runs one tool and returns the string result to feed back to Claude.
// `business` is the tenant config resolved for this call (its Cal.com creds,
// owner email, Supabase id, etc.).
async function runTool(name, input, leadId, business) {
  const biz = business || {};
  if (name === 'check_availability') {
    const slots = await getAvailableSlots(3, biz.cal, biz.timezone, input.preferred_time || null);
    updateLead(leadId, { availabilityCache: slots });
    return JSON.stringify({
      slots: slots.map((s) => ({ starts_at: s.startsAt, when: s.humanTime })),
    });
  }

  if (name === 'book_appointment') {
    const lead = getLead(leadId);
    if (input.name) updateLead(leadId, { name: input.name });

    if (input.callback_only || !input.starts_at) {
      updateLead(leadId, { status: 'callback_requested' });
      return JSON.stringify({
        booked: false,
        callback: true,
        message: 'Callback request recorded. Now ask for their name and what they need.',
      });
    }

    // Defensive: the model has to type out starts_at by hand, and can mis-transcribe
    // it (e.g. treating a local 9am as UTC). Never trust a free-form timestamp — only
    // accept one that exactly matches a slot we actually handed out this call.
    const cachedSlots = lead?.availabilityCache || [];
    const matchedSlot = cachedSlots.find((s) => s.startsAt === input.starts_at);
    if (!matchedSlot) {
      return JSON.stringify({
        booked: false,
        message: 'That starts_at value does not match any time from check_availability — never retype or reconstruct a timestamp. Call check_availability again if needed, then pass its starts_at value back exactly as given, unmodified.',
      });
    }

    // Must be at least an hour out — never book something the team can't realistically make.
    if (new Date(input.starts_at).getTime() < Date.now() + 60 * 60 * 1000) {
      return JSON.stringify({
        booked: false,
        message: 'That time is too soon (must be at least an hour from now). Apologize briefly, call check_availability again, and offer the new times.',
      });
    }

    const result = await createBooking({
      startsAt: input.starts_at,
      name: input.name || lead?.name || 'Caller',
      phone: lead?.phone,
      service: lead?.service,
      cal: biz.cal,
      ownerEmail: biz.ownerAlertEmail,
      timeZone: biz.timezone,
    });
    updateLead(leadId, {
      status: result.ok ? 'booked' : 'booking_failed',
      appointment: { startsAt: input.starts_at, humanTime: result.humanTime, calBookingId: result.calBookingId },
    });
    // Persist the appointment to Supabase (best-effort, no-ops without a business id).
    // Fire-and-forget — the caller doesn't need to wait on our own DB write to
    // hear their confirmation; the real-time-critical part (Cal.com) is already done.
    sbCreateAppointment({
      businessId: biz.id,
      contactId: lead?.dbContactId,
      startsAt: input.starts_at,
      notes: `Booked by AI receptionist. Cal.com: ${result.calBookingId || 'n/a'}`,
      calBookingId: result.calBookingId,
    })
      .then((apptId) => { if (apptId) updateLead(leadId, { dbApptId: apptId }); })
      .catch((e) => console.error('[supabase] book_appointment:', e.message));
    return JSON.stringify({
      booked: result.ok,
      when: result.humanTime,
      message: result.ok
        ? 'Callback scheduled. Now ask for both in one message: their name and what kind of work they need. Follow up only for anything they leave out.'
        : 'Booking hiccup — tell the caller the team will confirm the time shortly, then ask for their name and what they need.',
    });
  }

  if (name === 'record_details') {
    const current = getLead(leadId);
    const updated = updateLead(leadId, {
      name: input.name || current?.name || null,
      service: input.work_type || current?.service || null,
      survey: { issue: input.work_type || null, completedAt: new Date().toISOString() },
      status: current?.status === 'callback_requested' ? 'callback_requested' : 'qualified',
    });
    // Fire-and-forget: never block the live call on an email/SMS send.
    alertOwner(updated, business).catch((e) => console.error('[alert] record_details:', e.message));
    // Persist to Supabase (best-effort).
    if (biz.id) {
      (async () => {
        const contactId = await upsertContactByPhone({ businessId: biz.id, phone: current?.phone, name: updated.name });
        if (contactId) updateLead(leadId, { dbContactId: contactId });
        const jobId = await sbCreateJob({ businessId: biz.id, contactId, service: updated.service });
        if (jobId) updateLead(leadId, { dbJobId: jobId });
        const lead = getLead(leadId);
        if (lead?.dbApptId && jobId) sbUpdateAppointment(lead.dbApptId, { job_id: jobId });
        if (lead?.dbCallId) updateCall(lead.dbCallId, { contact_id: contactId, job_id: jobId, outcome: 'booked' });
        const when = lead?.appointment?.humanTime;
        createNotification({
          businessId: biz.id,
          type: 'new_lead',
          title: `New callback — ${updated.name || 'Caller'}`,
          body: [updated.service, when ? `callback ${when}` : null].filter(Boolean).join(' · ') || undefined,
        });
      })().catch((e) => console.error('[supabase] record_details:', e.message));
    }
    return JSON.stringify({ recorded: true });
  }

  if (name === 'take_message') {
    const current = getLead(leadId);
    const updated = updateLead(leadId, {
      name: input.name || current?.name || null,
      status: 'message',
      message: input.message || null,
      survey: { notes: input.message || null, completedAt: new Date().toISOString() },
    });
    // Fire-and-forget: never block the live call on an email/SMS send.
    alertOwner(updated, business).catch((e) => console.error('[alert] take_message:', e.message));
    if (biz.id) {
      (async () => {
        const contactId = await upsertContactByPhone({ businessId: biz.id, phone: current?.phone, name: updated.name });
        const lead = getLead(leadId);
        if (lead?.dbCallId) updateCall(lead.dbCallId, { contact_id: contactId, outcome: 'message' });
        createNotification({
          businessId: biz.id,
          type: 'new_message',
          title: `New message — ${updated.name || 'Caller'}`,
          body: updated.message || undefined,
        });
      })().catch((e) => console.error('[supabase] take_message:', e.message));
    }
    return JSON.stringify({
      recorded: true,
      message: 'Message saved and sent to the team. Confirm to the caller that someone will get it, then wrap up.',
    });
  }

  if (name === 'cancel_appointment') {
    const lead = getLead(leadId);
    const calBookingId = lead?.appointment?.calBookingId;
    const calResult = calBookingId ? await cancelBooking(calBookingId, biz.cal, input.reason) : { ok: true };
    updateLead(leadId, { status: 'canceled', cancelReason: input.reason || 'out of scope' });
    if (lead?.dbApptId) sbUpdateAppointment(lead.dbApptId, { status: 'canceled' });
    if (lead?.dbCallId) updateCall(lead.dbCallId, { outcome: 'canceled' });
    return JSON.stringify({
      canceled: calResult.ok,
      message: calResult.ok
        ? 'Appointment canceled. Let the caller know politely.'
        : 'Cancellation hit a snag on our end — tell the caller the team will follow up to confirm it, then wrap up.',
    });
  }

  return JSON.stringify({ error: `unknown tool ${name}` });
}

// Holds the conversation for a single phone call.
export class CallSession {
  constructor(business, leadId, slots = null) {
    this.business = business || {};
    this.greeting = greetingFor(this.business);
    this.leadId = leadId;
    this.slots = slots; // pre-fetched availability, injected into the prompt
    this.messages = [];
    this.ended = false; // set true when the AI decides to hang up
  }

  // A clean, human-readable transcript of the call for the dashboard: an ordered
  // list of { role: 'assistant' | 'caller', text } turns. Drops the tool plumbing
  // (tool_use / tool_result) and leads with the spoken greeting.
  transcript() {
    const turns = [];
    if (this.greeting) turns.push({ role: 'assistant', text: this.greeting });
    for (const m of this.messages) {
      if (m.role === 'user') {
        // Caller utterances are plain strings; tool_result turns are arrays — skip those.
        if (typeof m.content === 'string') {
          const t = m.content.trim();
          if (t) turns.push({ role: 'caller', text: t });
        }
      } else if (m.role === 'assistant') {
        let text = '';
        if (typeof m.content === 'string') text = m.content;
        else if (Array.isArray(m.content)) text = m.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ');
        text = text.replace(/\s*…?\[[^\]]*\]/g, '').trim(); // strip interrupt markers
        if (text) turns.push({ role: 'assistant', text });
      }
    }
    return turns;
  }

  // The caller talked over the AI: trim the last assistant turn to only what was
  // actually spoken before the interrupt, so the model knows the caller may not
  // have heard the rest and can bring the key part back naturally.
  markInterrupted(heardText) {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'assistant') {
        const heard = (heardText || '').trim();
        this.messages[i] = {
          role: 'assistant',
          content: heard ? `${heard} …[the caller interrupted here — they may not have heard the rest]` : '…[interrupted]',
        };
        return;
      }
    }
  }

  // Takes the caller's transcribed utterance. Streams the reply text through
  // onToken(delta) as it's generated (for low-latency voice), and also returns
  // the full reply string (used by the browser test, which isn't streamed).
  async handleUtterance(text, onToken, signal) {
    this.messages.push({ role: 'user', content: text });
    let spoken = '';
    let buffer = '';
    const aborted = () => signal?.aborted;

    // Send the reply in as few pieces as possible — ideally the whole thing at
    // once — so ConversationRelay's TTS reads it as one smooth phrase instead of
    // pausing between streamed fragments. We only flush at tool boundaries and at
    // the very end, not on every token.
    const flush = () => {
      if (onToken && buffer) { onToken(buffer); buffer = ''; }
    };

    // Tool loop: keep going until the model produces a final spoken reply.
    try {
    for (let i = 0; i < 6; i++) {
      if (aborted()) break;
      const stream = client.messages.stream(
        {
          model: config.claudeModel,
          // Replies are 1-2 spoken sentences (+ maybe a tool call) — 512 was way
          // more headroom than ever needed and adds nothing but worst-case latency.
          max_tokens: 300,
          // Cache the (static) system prompt so time-to-first-token drops on every
          // follow-up turn in the call — and on later calls within the cache window.
          system: [{ type: 'text', text: systemPrompt(this.business, this.slots, this.greeting), cache_control: { type: 'ephemeral' } }],
          thinking: { type: 'disabled' }, // no thinking = much faster for voice
          tools,
          messages: this.messages,
        },
        signal ? { signal } : undefined
      );
      stream.on('text', (delta) => {
        if (aborted()) return; // caller barged in — stop emitting
        spoken += delta;
        buffer += delta; // accumulate; we send it as one piece below
      });
      const res = await stream.finalMessage();
      this.messages.push({ role: 'assistant', content: res.content });

      const endCall = res.content.some((b) => b.type === 'tool_use' && b.name === 'end_call');

      // If the model called tools (other than end_call), run them and continue.
      if (res.stop_reason === 'tool_use' && !endCall) {
        flush(); // speak any lead-in text before running tools
        const toolResults = [];
        for (const block of res.content) {
          if (block.type === 'tool_use') {
            const out = await runTool(block.name, block.input || {}, this.leadId, this.business);
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: out });
          }
        }
        this.messages.push({ role: 'user', content: toolResults });
        continue;
      }

      if (endCall) this.ended = true;
      break;
    }
    } catch (err) {
      // An interrupt aborts the stream — that's expected, not an error. Record
      // whatever was spoken so the history stays coherent, then bail quietly.
      if (aborted() || err?.name === 'APIUserAbortError' || err?.name === 'AbortError') {
        if (spoken.trim() && this.messages[this.messages.length - 1]?.role !== 'assistant') {
          this.messages.push({ role: 'assistant', content: spoken });
        }
        return spoken.trim();
      }
      throw err;
    }

    flush(); // send the whole reply as one piece
    let finalText = spoken.trim();
    if (!finalText) {
      finalText = this.ended ? 'Thanks for calling — have a great day!' : 'Sorry, could you say that again?';
      if (onToken) onToken(finalText); // make sure the fallback is spoken too
    }
    return finalText;
  }
}
