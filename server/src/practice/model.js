import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { forSpeech, sentenceEnd } from '../claude.js';

// Models for the practice line, all changeable on Render without a code change:
//   PRACTICE_MODEL         the prospect (live, every turn: must be fast)   default claude-haiku-5-5
//                          (2026-11-13: Haiku 4.5 hung up on its first line and once answered AS Wyatt;
//                          it no longer follows the receptionist's CLAUDE_MODEL)
//   PRACTICE_COACH_MODEL   the spoken scorecard and coach questions        default claude-sonnet-5-5 at low effort
//                          (in local tests Haiku mixed up who said what and graded too kindly; Sonnet's
//                          scorecard starts in about 1 to 2 s, while the bridge line plays)
//   PRACTICE_REVIEW_MODEL  the written review emailed after the call       default claude-opus-5-5 (not live, so speed doesn't matter)
export const practiceModels = {
  actor: process.env.PRACTICE_MODEL || 'claude-haiku-5-5',
  coach: process.env.PRACTICE_COACH_MODEL || 'claude-sonnet-5-5',
  review: process.env.PRACTICE_REVIEW_MODEL || 'claude-opus-5-5',
};

let client = null;
function anthropic() {
  if (!client) client = new Anthropic({ apiKey: config.anthropicApiKey || process.env.ANTHROPIC_API_KEY });
  return client;
}

// Haiku 4.5 and older take thinking "disabled", which is the fastest for a live call. Newer models
// (Haiku 5.5, Sonnet 5.5, Opus 5.5) reject that or think by default, so they get the lowest effort
// instead: thinking stays adaptive and short.
export function speedParams(model, effort = 'low') {
  if (/^claude-(haiku|sonnet|opus)-4-5|^claude-3/.test(model)) return { thinking: { type: 'disabled' } };
  return { output_config: { effort } };
}

/**
 * Stream one model reply. Complete sentences go to `onSentence` as soon as they exist (for the
 * phone's text-to-speech), the rest when the reply ends. Returns { message, text }.
 */
export async function streamReply({ model, system, messages, tools, maxTokens = 400, effort = 'low', onSentence, signal }) {
  let buffer = '';
  let text = '';
  const emit = (piece) => {
    const say = forSpeech(piece);
    if (say && onSentence) onSentence(say);
  };
  const stream = anthropic().messages.stream(
    {
      model,
      max_tokens: maxTokens,
      system,
      messages,
      ...(tools && tools.length ? { tools } : {}),
      ...speedParams(model, effort),
    },
    signal ? { signal } : undefined
  );
  stream.on('text', (delta) => {
    if (signal?.aborted) return;
    text += delta;
    buffer += delta;
    for (let cut = sentenceEnd(buffer); cut > 0; cut = sentenceEnd(buffer)) {
      emit(buffer.slice(0, cut));
      buffer = buffer.slice(cut);
    }
  });
  const message = await stream.finalMessage();
  if (!signal?.aborted && buffer.trim()) emit(buffer);
  return { message, text: text.trim() };
}

// A non-live request (the emailed review). Streams too, so a long answer never hits a timeout.
export async function completeText({ model, prompt, maxTokens = 4000, effort = 'medium' }) {
  const stream = anthropic().messages.stream({
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
    ...(/^claude-(haiku|sonnet|opus)-4-5|^claude-3/.test(model) ? {} : { output_config: { effort } }),
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') throw new Error('the model declined the review');
  return message.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}
