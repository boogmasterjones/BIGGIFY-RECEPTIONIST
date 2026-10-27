import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { systemBlocks, greetingFor } from './prompt.js';
import { getAvailableSlots, fetchSlotMap, selectSlots, createBooking, cancelBooking } from './calcom.js';

// How long a fetched week of availability stays good for within one call. Calls
// are minutes long, so this is effectively "once per call" — the point is to
// keep Cal.com off the critical path mid-conversation.
const SLOT_MAP_TTL_MS = 3 * 60 * 1000;
import { updateLead, getLead } from './store.js';
import { alertOwner, alertBookingFailed } from './twilioSms.js';
import { upsertContactByPhone, createAppointment as sbCreateAppointment, createJob as sbCreateJob, updateCall, updateAppointment as sbUpdateAppointment, createNotification } from './supabase.js';

const client = new Anthropic({ apiKey: config.anthropicApiKey });

const tools = [
  {
    name: 'save_callback_time',
    description:
      "Save when the caller wants the team to call them back. Call this as soon as they tell you, in their own words (e.g. 'tomorrow at 3 PM', 'this afternoon', 'as soon as possible'). If they give no time, use 'as soon as possible'. If the caller's number was marked NOT available, also pass callback_number.",
    input_schema: {
      type: 'object',
      properties: {
        callback_time: {
          type: 'string',
          description: "When the caller wants the call back, as they said it, or 'as soon as possible'.",
        },
        callback_number: {
          type: 'string',
          description: "The caller's phone number, ONLY if caller ID was not available and they gave you one.",
        },
      },
      required: ['callback_time'],
      additionalProperties: false,
    },
  },
  {
    name: 'record_details',
    description:
      "Save the kind of job the caller needs (a bathroom, a kitchen, and so on). Call this as soon as they answer. No name is collected.",
    input_schema: {
      type: 'object',
      properties: {
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
  if (name === 'save_callback_time') {
    // Plain answering service: no calendar slots. The caller says when they want
    // the call back (or "as soon as possible") and we store it as text.
    const callbackTime = String(input.callback_time || '').trim().slice(0, 120) || 'as soon as possible';
    const patch = { status: 'callback_requested', callbackTime };
    const typedNumber = String(input.callback_number || '').replace(/[^\d+]/g, '');
    if (typedNumber.length >= 7) patch.phone = typedNumber;
    updateLead(leadId, patch);
    return JSON.stringify({
      saved: true,
      callback_time: callbackTime,
      message: 'Saved. Now acknowledge it briefly and ask exactly: "One question, and that\'s it: what type of work are you looking to get done?" (no examples), in the same message.',
    });
  }

  if (name === 'check_availability') {
    // Answer out of the week of availability fetched once at the start of the
    // call. Going back to Cal.com here put a network round trip in the middle of
    // a live conversation, which the caller just hears as dead air.
    const lead = getLead(leadId);
    let buckets = lead?.slotMap;
    if (!buckets || Date.now() - (lead?.slotMapAt || 0) > SLOT_MAP_TTL_MS) {
      buckets = await fetchSlotMap(biz.cal, biz.timezone);
      if (buckets) updateLead(leadId, { slotMap: buckets, slotMapAt: Date.now() });
    }
    const slots = buckets
      ? selectSlots(buckets, 3, biz.timezone, input.preferred_time || null)
      : await getAvailableSlots(3, biz.cal, biz.timezone, input.preferred_time || null);
    // Keep every time we've offered, not just the latest batch: a caller can
    // circle back to something from two turns ago ("actually, make it the first
    // one"), and book_appointment refuses any time it can't find in here.
    const offered = lead?.availabilityCache || [];
    updateLead(leadId, {
      availabilityCache: [...offered, ...slots.filter((s) => !offered.some((o) => o.startsAt === s.startsAt))],
    });
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

    // Confirm to the caller NOW and send it to Cal.com in the background. The
    // slot has already been validated twice above — it must be one we handed
    // out on this call, and at least an hour away — so the reservation is sound.
    // Awaiting the round trip here meant the caller sat through it in dead
    // silence, which was the longest single pause on the whole call. If the
    // write does fail, the owner gets an ACTION NEEDED alert and the lead
    // itself is never lost.
    const when = matchedSlot.humanTime;
    updateLead(leadId, {
      status: 'booked',
      appointment: { startsAt: input.starts_at, humanTime: when, calBookingId: null },
    });
    createBooking({
      startsAt: input.starts_at,
      name: input.name || lead?.name || 'Caller',
      phone: lead?.phone,
      service: lead?.service,
      cal: biz.cal,
      ownerEmail: biz.ownerAlertEmail,
      timeZone: biz.timezone,
    })
      .then((result) => {
        if (!result.ok) {
          updateLead(leadId, { status: 'booking_failed' });
          return alertBookingFailed(getLead(leadId), business, result.error);
        }
        updateLead(leadId, {
          appointment: { startsAt: input.starts_at, humanTime: when, calBookingId: result.calBookingId },
        });
        return sbCreateAppointment({
          businessId: biz.id,
          contactId: lead?.dbContactId,
          startsAt: input.starts_at,
          notes: `Booked by AI receptionist. Cal.com: ${result.calBookingId || 'n/a'}`,
          calBookingId: result.calBookingId,
        }).then((apptId) => { if (apptId) updateLead(leadId, { dbApptId: apptId }); });
      })
      .catch((e) => console.error('[calcom] background booking:', e.message));

    return JSON.stringify({
      booked: true,
      when,
      message: 'Callback scheduled. Now ask for both in one message: their name and what kind of work they need. Follow up only for anything they leave out.',
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
        const when = lead?.callbackTime || lead?.appointment?.humanTime;
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

// The TTS speaks whatever we hand it, literally. Interrupt markers from our own
// history ("…[interrupted]") can get echoed back by the model, ellipses become
// long dead-air pauses in the middle of a sentence, and newlines get read as
// separate utterances. Strip all of it before anything reaches the caller.
function forSpeech(text = '') {
  return text
    .replace(/…?\s*\[[^\]]*\]/g, ' ') // bracketed markers/stage directions
    .replace(/[*_`#]+/g, '') // stray markdown
    .replace(/\.{3,}|…/g, ', ') // ellipsis -> a short breath, not a dead stop
    .replace(/\s*\n+\s*/g, ' ') // one spoken line, never several
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();
}

// Index just past the first safe sentence end in `buf`, or -1 if there isn't
// one yet. Lets us hand the TTS a finished sentence the moment it exists,
// instead of holding the whole reply until the model stops generating — but
// never a fragment that ends mid-clause, which is what makes TTS starve and
// pause in the middle of a phrase.
const ABBREV = /(?:\b[a-z]|\b(?:mr|mrs|ms|dr|sr|jr|st|approx|apt|vs|etc|no)|\d)\.$/i;
function sentenceEnd(buf) {
  const re = /[.!?]+["')\]]?(?=\s)/g;
  let m;
  while ((m = re.exec(buf))) {
    const end = m.index + m[0].length;
    if (end < 25) continue; // too short to be worth speaking on its own
    if (ABBREV.test(buf.slice(0, end))) continue; // "9 a.m." / "Mr." — not a sentence end
    return end + 1; // take the following space too
  }
  return -1;
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
    // book_appointment only accepts a starts_at we actually handed out, and it
    // checks the lead's availabilityCache to decide. These pre-fetched slots go
    // straight into the system prompt for the AI to offer, so they have to be in
    // that cache too — otherwise the most common path in the whole call (caller
    // picks one of the two times offered right after the greeting) gets
    // rejected, and the AI has to re-run check_availability mid-call before it
    // can book, which is a Cal.com round trip of dead air for nothing.
    if (Array.isArray(slots) && slots.length) updateLead(leadId, { availabilityCache: slots });
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
        else if (Array.isArray(m.content)) {
          // Text alongside a real tool call is lead-in narration that
          // handleUtterance deliberately never speaks — skip it here so the
          // transcript matches what the caller actually heard. Text alongside
          // ONLY an end_call is the spoken goodbye, which IS voiced — keep it.
          const toolUses = m.content.filter((b) => b.type === 'tool_use');
          const hasRealTool = toolUses.some((b) => b.name !== 'end_call');
          if (!hasRealTool) text = m.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ');
        }
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
      const m = this.messages[i];
      if (m.role !== 'assistant') continue;
      // Never rewrite a turn that carries tool_use blocks. The message right
      // after it holds their tool_result, and dropping the tool_use orphans
      // that result — which the API rejects outright, so every later turn in
      // the call fails and the caller just hears "Sorry, I hit a snag."
      if (Array.isArray(m.content) && m.content.some((b) => b.type === 'tool_use')) return;
      const heard = (heardText || '').trim();
      this.messages[i] = {
        role: 'assistant',
        content: heard ? `${heard} …[the caller interrupted here — they may not have heard the rest]` : '…[interrupted]',
      };
      return;
    }
  }

  // An aborted turn can leave the history ending on a user message — either a
  // tool_result whose assistant reply never arrived, or the caller's last words
  // if we were cut off before answering. The API requires user and assistant
  // turns to alternate, so close the gap before adding the next utterance.
  #repairHistory() {
    const last = this.messages[this.messages.length - 1];
    if (last?.role === 'user') this.messages.push({ role: 'assistant', content: '…[interrupted]' });
  }

  // Takes the caller's transcribed utterance. Streams the reply text through
  // onToken(delta) as it's generated (for low-latency voice), and also returns
  // the full reply string (used by the browser test, which isn't streamed).
  async handleUtterance(text, onToken, signal) {
    this.#repairHistory();
    this.messages.push({ role: 'user', content: text });
    let spoken = '';
    let buffer = '';
    const aborted = () => signal?.aborted;

    // Only ever hand the TTS whole sentences, never token-by-token fragments —
    // a fragment that ends mid-clause makes the voice stall in the middle of a
    // phrase waiting for the rest.
    const flush = () => {
      if (!onToken) return;
      const say = forSpeech(buffer);
      buffer = '';
      if (say) onToken(say);
    };

    // Speak each sentence the moment it's complete, rather than holding the
    // whole reply until the model finishes. Enabled only AFTER a tool has run:
    // text on those turns is always meant for the caller, whereas text on a
    // turn that's about to call a tool is lead-in narration we deliberately
    // throw away (see the tool branch below) and must never voice.
    //
    // This is the fix for the long silence on a booking turn, where the caller
    // was waiting through a model round trip, a Cal.com round trip, and then a
    // whole second generation before hearing a single word.
    let streamSentences = false;
    const flushSentences = () => {
      if (!onToken || !streamSentences) return;
      for (let cut = sentenceEnd(buffer); cut > 0; cut = sentenceEnd(buffer)) {
        const say = forSpeech(buffer.slice(0, cut));
        buffer = buffer.slice(cut);
        if (say) onToken(`${say} `);
      }
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
          system: systemBlocks(this.business, null, this.greeting, Boolean(getLead(this.leadId)?.phone)),
          thinking: { type: 'disabled' }, // no thinking = much faster for voice
          tools,
          messages: this.messages,
        },
        signal ? { signal } : undefined
      );
      stream.on('text', (delta) => {
        if (aborted()) return; // caller barged in — stop emitting
        spoken += delta;
        buffer += delta;
        flushSentences(); // no-op until a tool has run this turn
      });
      const res = await stream.finalMessage();
      this.messages.push({ role: 'assistant', content: res.content });

      const endCall = res.content.some((b) => b.type === 'tool_use' && b.name === 'end_call');

      // The model is told to speak its goodbye and call end_call in one message,
      // and it often bundles a real tool into that same message (record_details
      // with the name and job, say). Those still have to run, or the lead is
      // silently lost on the way out — no owner alert, nothing saved.
      if (endCall) {
        const lastTools = res.content.filter((b) => b.type === 'tool_use' && b.name !== 'end_call');
        if (lastTools.length) {
          const results = await Promise.all(
            lastTools.map(async (block) => ({
              type: 'tool_result',
              tool_use_id: block.id,
              content: await runTool(block.name, block.input || {}, this.leadId, this.business),
            }))
          );
          this.messages.push({ role: 'user', content: results });
        }
      }

      // If the model called tools (other than end_call), run them and continue.
      if (res.stop_reason === 'tool_use' && !endCall) {
        // Never speak text that leads into a tool call, even though the prompt
        // tells the model not to generate any — models narrate anyway sometimes
        // ("let me check that", "great news, that works"), and each flush() was
        // sending that as its own separate spoken line, making multi-tool turns
        // sound like disjointed thinking-out-loud. Discard it instead: only the
        // text from the FINAL, tool-free turn ever reaches the caller's ears.
        buffer = '';
        spoken = '';
        // Run them concurrently — a turn that calls check_availability and
        // book_appointment together was paying both network round trips back to
        // back, as dead air on a live call.
        const toolResults = await Promise.all(
          res.content
            .filter((b) => b.type === 'tool_use')
            .map(async (block) => ({
              type: 'tool_result',
              tool_use_id: block.id,
              content: await runTool(block.name, block.input || {}, this.leadId, this.business),
            }))
        );
        this.messages.push({ role: 'user', content: toolResults });
        // Everything the model says from here on is addressed to the caller, so
        // it's safe to start speaking it sentence by sentence as it arrives.
        streamSentences = true;
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
