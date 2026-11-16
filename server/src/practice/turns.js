// Turn-taking for the practice line (2026-11-16: "it interrupts me way too much" and "responds to things twice").
//
// Telnyx's speech-to-text sends a final 'prompt' every time Wyatt pauses for a breath, and the TeXML
// <ConversationRelay> verb has no end-of-speech / silence setting to make it wait longer. Reading his script he
// pauses mid-sentence, so the prospect used to answer the first half of the sentence (talking over him), then
// answer the second half too: two replies to one thing he said.
//
// The gate collects the fragments of one turn and hands them over as ONE line, only after he has been quiet for
// `waitMs` (longer when the words so far sound unfinished: "...and", "so the", "because"). A fragment that is
// only a filler ("um", "so") never makes the prospect answer on its own. The same transcript arriving twice is
// counted once.

const FILLER = new Set(['um', 'umm', 'uh', 'uhh', 'er', 'erm', 'ah', 'hmm', 'mm', 'mhm', 'so', 'and', 'but', 'well', 'like', 'okay so', 'yeah so', 'and um', 'so um', 'uh so', 'and uh']);
// Words a finished sentence almost never ends on: he is still mid-thought.
const UNFINISHED_END = /\b(and|but|or|so|because|cause|the|a|an|to|of|with|for|i|we|your|my|our|um|uh|like|if|when|just|about|in|on|at|from|into|than|then)$/;

export const norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

export const isFillerOnly = (t) => {
  const n = norm(t).replace(/'/g, '');
  return !n || FILLER.has(n) || n.split(' ').every((w) => FILLER.has(w));
};

export const soundsUnfinished = (t) => {
  const raw = String(t || '').trim();
  if (!raw) return false;
  if (/[,\-–—]$/.test(raw)) return true; // the transcript itself shows a trailing comma or dash
  if (/[.?!]$/.test(raw) && !/\b(and|but|so|because|the|a|to)\.$/i.test(raw)) return false;
  return UNFINISHED_END.test(norm(raw));
};

export const DEFAULT_TURN_WAIT_MS = Number(process.env.PRACTICE_TURN_WAIT_MS) || 1400;
export const DEFAULT_UNFINISHED_WAIT_MS = Number(process.env.PRACTICE_UNFINISHED_WAIT_MS) || 2600;

export class TurnGate {
  /**
   * @param {object} o
   * @param {(text: string) => void} o.onTurn  called once per finished turn, with every fragment joined
   * @param {number} [o.waitMs]                quiet time after the last fragment before the turn is his
   * @param {number} [o.unfinishedWaitMs]      the same when his words so far sound unfinished
   * @param {Function} [o.setTimer] [o.clearTimer] [o.now]  injectable for tests
   */
  constructor({ onTurn, waitMs = DEFAULT_TURN_WAIT_MS, unfinishedWaitMs = DEFAULT_UNFINISHED_WAIT_MS, setTimer = setTimeout, clearTimer = clearTimeout, now = Date.now }) {
    this.onTurn = onTurn;
    this.waitMs = waitMs;
    this.unfinishedWaitMs = Math.max(waitMs, unfinishedWaitMs);
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.now = now;
    this.parts = [];
    this.owed = false; // a reply was cancelled before any word of it was heard: the turn still needs an answer
    this.timer = null;
    this.speaking = false;
    this.lastFired = { text: '', at: 0 };
    this.closed = false;
  }

  get pending() {
    return this.parts.length > 0 || this.owed;
  }

  // A final transcript from Telnyx.
  add(text) {
    if (this.closed) return;
    const t = String(text || '').trim();
    if (!t) return this.#schedule();
    const n = norm(t);
    // The same words twice in a row (a repeated final from the speech-to-text) count once.
    if (this.parts.length && norm(this.parts[this.parts.length - 1]) === n) return this.#schedule();
    if (!this.parts.length && n.split(' ').length >= 3 && n === norm(this.lastFired.text) && this.now() - this.lastFired.at < 4000) return;
    this.parts.push(t);
    this.#schedule();
  }

  // The reply to the last turn was cancelled before he heard any of it (he kept talking): answer again once
  // he is done, together with whatever he says next.
  owe() {
    if (this.closed) return;
    this.owed = true;
    this.#schedule();
  }

  // Telnyx speaker events: never answer while he is talking.
  setSpeaking(on) {
    this.speaking = Boolean(on);
    if (this.speaking) {
      this.clearTimer(this.timer);
      this.timer = null;
    } else if (this.pending) {
      this.#schedule();
    }
  }

  close() {
    this.closed = true;
    this.clearTimer(this.timer);
    this.timer = null;
    this.parts = [];
    this.owed = false;
  }

  #schedule() {
    this.clearTimer(this.timer);
    this.timer = null;
    if (!this.pending || this.speaking || this.closed) return;
    const text = this.parts.join(' ');
    const ms = soundsUnfinished(text) ? this.unfinishedWaitMs : this.waitMs;
    this.timer = this.setTimer(() => this.#fire(), ms);
  }

  #fire() {
    this.timer = null;
    if (this.speaking || this.closed) return;
    const text = this.parts.join(' ').trim();
    // Only "um" / "so": nothing to answer yet. Keep it; it joins whatever he says next.
    if (text && isFillerOnly(text) && !this.owed) return;
    const owed = this.owed;
    this.parts = [];
    this.owed = false;
    if (!text && !owed) return;
    this.lastFired = { text, at: this.now() };
    this.onTurn(text, { owed });
  }
}
