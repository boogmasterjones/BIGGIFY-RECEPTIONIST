import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { systemPrompt } from './prompt.js';
import { getAvailableSlots, createBooking } from './calcom.js';
import { updateLead, getLead } from './store.js';
import { sendSurvey, alertOwner } from './twilioSms.js';

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
      "Book the appointment once the caller has chosen a time, OR record a callback request if they aren't ready to book. Provide the caller's name and the service reason.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "Caller's full name" },
        service: { type: 'string', description: 'Short description of the service/issue' },
        starts_at: {
          type: 'string',
          description: 'The ISO 8601 start time the caller chose (from check_availability). Omit if callback_only.',
        },
        callback_only: {
          type: 'boolean',
          description: 'True if the caller is not booking a firm time and just wants a callback.',
        },
      },
      required: ['name', 'service'],
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
    updateLead(leadId, {
      name: input.name || lead?.name || null,
      service: input.service || lead?.service || null,
    });

    if (input.callback_only || !input.starts_at) {
      const updated = updateLead(leadId, { status: 'callback_requested' });
      await sendSurvey(updated);
      updateLead(leadId, { surveySent: true });
      await alertOwner(updated);
      return JSON.stringify({
        booked: false,
        callback: true,
        message: 'Callback recorded. Survey text sent to the caller and owner alerted.',
      });
    }

    const result = await createBooking({
      startsAt: input.starts_at,
      name: input.name,
      phone: lead?.phone,
      service: input.service,
    });
    const updated = updateLead(leadId, {
      status: result.ok ? 'booked' : 'booking_failed',
      appointment: { startsAt: input.starts_at, humanTime: result.humanTime, calBookingId: result.calBookingId },
    });
    await sendSurvey(updated);
    updateLead(leadId, { surveySent: true });
    await alertOwner(updated);
    return JSON.stringify({
      booked: result.ok,
      when: result.humanTime,
      message: result.ok
        ? 'Appointment booked. Survey text sent to the caller and owner alerted.'
        : 'Booking system hiccup — tell the caller the team will confirm the time by text shortly.',
    });
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
