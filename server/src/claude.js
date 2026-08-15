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
        ? 'Callback scheduled. Now ask for their name, then the kind of work, then their area.'
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
    await alertOwner(updated); // owner now has the full picture
    return JSON.stringify({ recorded: true });
  }

  if (name === 'cancel_appointment') {
    updateLead(leadId, { status: 'canceled', cancelReason: input.reason || 'out of scope' });
    return JSON.stringify({ canceled: true, message: 'Appointment canceled. Let the caller know politely.' });
  }

  return JSON.stringify({ error: `unknown tool ${name}` });
}

// Holds the conversation for a single phone call.
export class CallSession {
  constructor(leadId) {
    this.leadId = leadId;
    this.messages = [];
  }

  // Takes the caller's transcribed utterance, returns the receptionist's spoken reply.
  async handleUtterance(text) {
    this.messages.push({ role: 'user', content: text });

    // Tool loop: keep going until the model produces a final spoken reply.
    for (let i = 0; i < 5; i++) {
      const res = await client.messages.create({
        model: config.claudeModel,
        max_tokens: 1024,
        system: systemPrompt(),
        thinking: { type: 'adaptive' },
        output_config: { effort: 'low' },
        tools,
        messages: this.messages,
      });

      this.messages.push({ role: 'assistant', content: res.content });

      if (res.stop_reason === 'tool_use') {
        const toolResults = [];
        for (const block of res.content) {
          if (block.type === 'tool_use') {
            const out = await runTool(block.name, block.input || {}, this.leadId);
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: out });
          }
        }
        this.messages.push({ role: 'user', content: toolResults });
        continue; // let the model respond to the tool results
      }

      // Final answer — collect spoken text.
      const spoken = res.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join(' ')
        .trim();
      return spoken || 'Sorry, could you say that again?';
    }
    return 'Let me get someone to help you — one moment.';
  }
}
