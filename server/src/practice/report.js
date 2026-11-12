// After a practice call: one email with the scorecards, a deeper written review and the transcripts,
// so Wyatt can read back what he said. Goes to PRACTICE_REPORT_EMAIL, else OWNER_ALERT_EMAIL.
// PRACTICE_REPORT_EMAIL=off turns it off. Best-effort: a failure is logged, never retried.

import { config } from '../config.js';
import { sendEmail } from '../email.js';
import { DRILL_BY_ID } from './drills.js';
import { runFacts } from './prompts.js';
import { reviewRequest } from './prompts.js';
import { practiceModels, completeText } from './model.js';

export function reportRecipient() {
  const v = (process.env.PRACTICE_REPORT_EMAIL || '').trim();
  if (/^off$/i.test(v)) return '';
  return v || config.business.ownerAlertEmail || '';
}

function runHeader(r, i) {
  const s = r.scenario;
  const who = s.role === 'owner' ? `${s.speaker.first} ${s.speaker.last}` : `${s.speaker.first} (${s.role})`;
  const score = r.score !== null ? `${r.score}/10` : 'no score';
  return `RUN ${i + 1}: ${DRILL_BY_ID[s.drill].name}, ${who} at ${s.biz.name} (${s.biz.trade.label}, ${s.biz.town}, ${s.biz.state}), ${s.personalityLabel}, ${s.difficulty}. ${r.paused ? 'Paused' : `Ended: ${r.run.outcome || 'n/a'}`}. Score ${score}.`;
}

export function buildReportText(session, review = '') {
  const sum = session.summary();
  const out = [
    `Cold call practice: ${sum.runs} run${sum.runs === 1 ? '' : 's'}, best score ${sum.best ?? 'n/a'}${sum.best !== null ? '/10' : ''}, about ${sum.minutes} minute${sum.minutes === 1 ? '' : 's'}. Voice: ${sum.voice}.`,
    '',
  ];
  session.runs.forEach((r, i) => {
    out.push(runHeader(r, i));
    if (r.scorecard) out.push(`What the coach said: ${r.scorecard}`);
    out.push('');
  });
  if (review) out.push('THE WRITTEN REVIEW', '', review, '');
  out.push('TRANSCRIPTS (from speech-to-text, so a few words may be off)', '');
  session.runs.forEach((r, i) => {
    const s = r.scenario;
    out.push(`--- Run ${i + 1} ---`, `PROSPECT: ${s.pickup}`);
    for (const t of r.run.turns) out.push(`${t.who === 'rep' ? 'YOU' : 'PROSPECT'}: ${t.text}`);
    const habits = [s.priceTwice ? 'They were set to ask the price twice.' : '', s.asksDoesItWork ? 'They were set to ask whether it works.' : ''].filter(Boolean).join(' ');
    out.push(`Hidden details you didn't know: ${s.situation} ${s.pains.join(' ')}${habits ? ` ${habits}` : ''}`, '');
  });
  return out.join('\n');
}

export async function sendPracticeReport(session) {
  const to = reportRecipient();
  const scored = session.runs.filter((r) => r.run.turns.some((t) => t.who === 'rep'));
  if (!to || !scored.length) return { ok: false, reason: to ? 'no runs' : 'no recipient' };
  let review = '';
  try {
    const runsText = scored.map((r, i) => `=== RUN ${i + 1} ===\n${runFacts(r.scenario, r.run)}\nSPOKEN SCORECARD: ${r.scorecard || '(none)'}`).join('\n\n');
    review = await completeText({ model: practiceModels.review, prompt: reviewRequest(runsText, session.summary()), maxTokens: 6000 });
  } catch (err) {
    console.error('[practice] written review failed:', err.message);
  }
  const sum = session.summary();
  const subject = `Cold call practice: ${sum.runs} run${sum.runs === 1 ? '' : 's'}${sum.best !== null ? `, best ${sum.best}/10` : ''}`;
  return sendEmail(to, subject, buildReportText(session, review), 'Practice Coach');
}
