import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { systemPrompt } from './prompt.js';
import { getAvailableSlots, createBooking } from './calcom.js';
import { updateLead, getLead } from './store.js';
import { alertOwner } from './twilioSms.js';

const client = new Anthropic({ apiKey: config.anthropicApiKey });

const tools = [
  {
    name: 'check_availability',
    description:
      'Get the next available appointment openings. Call this before offering the caller any times. Returns real slots — only offer times this returns.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
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
      "Save the details you collect AFTER booking: the caller's name, the kind of work they need, and the area they're in. Call this once you have all three.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "Caller's name" },
        work_type: { type: 'string', description: 'The kind of work the caller needs done' },
        location: { type: 'string', description: 'The area / part of town / city the caller is located in' },
      },
      required: ['work_type', 'location'],
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
      "Cancel the appointment you just booked for this caller — use when the job is outside what the business offers or outside the service area and the caller agrees to cancel.",
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Short reason, e.g. "out of service area" or "service not offered"' },
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
async function runTool(name, input, leadId) {
  if (name === 'check_availability') {
    const slots = await getAvailableSlots(3);
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
        message: 'Callback request recorded. Now ask for their name, the job, and their area.',
      });
    }

    const result = await createBooking({
      startsAt: input.starts_at,
      name: input.name || lead?.name || 'Caller',
      phone: lead?.phone,
      service: lead?.service,
    });
    updateLead(leadId, {
      status: result.ok ? 'booked' : 'booking_failed',
      appointment: { startsAt: input.starts_at, humanTime: result.humanTime, calBookingId: result.calBookingId },
    });
    return JSON.stringify({
      booked: result.ok,
      when: result.humanTime,
      message: result.ok
        ? 'Callback scheduled. Now ask for all three in one message: their name, the kind of work, and their area. Follow up only for anything they leave out.'
        : 'Booking hiccup — tell the caller the team will confirm the time shortly, then ask for their name, job, and area.',
    });
  }

  if (name === 'record_details') {
    const current = getLead(leadId);
    const updated = updateLead(leadId, {
      name: input.name || current?.name || null,
      service: input.work_type || current?.service || null,
      survey: {
        issue: input.work_type || null,
        address: input.location || null,
        completedAt: new Date().toISOString(),
      },
      status: current?.status === 'callback_requested' ? 'callback_requested' : 'qualified',
    });
    // Fire-and-forget: never block the live call on an email/SMS send.
    alertOwner(updated).catch((e) => console.error('[alert] record_details:', e.message));
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
    alertOwner(updated).catch((e) => console.error('[alert] take_message:', e.message));
    return JSON.stringify({
      recorded: true,
      message: 'Message saved and sent to the team. Confirm to the caller that someone will get it, then wrap up.',
    });
  }

  if (name === 'cancel_appointment') {
    updateLead(leadId, { status: 'canceled', cancelReason: input.reason || 'out of scope' });
    return JSON.stringify({ canceled: true, message: 'Appointment canceled. Let the caller know politely.' });
  }

  return JSON.stringify({ error: `unknown tool ${name}` });
}

// Holds the conversation for a single phone call.
export class CallSession {
  constructor(leadId, slots = null) {
    this.leadId = leadId;
    this.slots = slots; // pre-fetched availability, injected into the prompt
    this.messages = [];
    this.ended = false; // set true when the AI decides to hang up
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
          max_tokens: 512,
          // Cache the (static) system prompt so time-to-first-token drops on every
          // follow-up turn in the call — and on later calls within the cache window.
          system: [{ type: 'text', text: systemPrompt(this.slots), cache_control: { type: 'ephemeral' } }],
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
            const out = await runTool(block.name, block.input || {}, this.leadId);
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
