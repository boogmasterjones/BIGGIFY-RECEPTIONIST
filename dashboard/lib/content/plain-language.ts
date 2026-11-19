// COPY of C:\dev\biggify-platform\lib\content\plain-language.ts (Hubert). The two repos don't share code; keep them in step.
// The owner's rule (2026-11-18, in capitals): ALL marketing, of every kind, is written at a 3rd-grade reading level. Every AI
// writer of marketing puts PLAIN_LANGUAGE_RULE in its instructions, and every check of marketing text runs plainLanguageCheck.
//
// Measured with the Flesch-Kincaid grade from reading-level.ts (the same check as Biggify Studio's teleprompter). Names are not
// the writer's choice, so the business, its towns and its services are swapped for a one-syllable word before measuring, and
// links, markdown and hashtags are dropped.
//   grade above MAX_GRADE + 1 (5)          -> problem (the text is refused or rewritten)
//   grade above MAX_GRADE (4)              -> warning (a person checks it)
//   a sentence over MAX_SENTENCE_WORDS (15) -> problem
// Very short text (under MIN_WORDS words, e.g. a title or button) is too short to measure fairly; only its long words are
// looked at, as a warning.

import { MAX_GRADE, MAX_SENTENCE_WORDS, readingLevel } from "./reading-level";

export const PLAIN_LANGUAGE_RULE =
  "Reading level (the owner's hard rule for all marketing): write at a 3rd-grade reading level. Use short, common words a " +
  "kid would know. Keep sentences to 12 words or fewer, one idea each. Prefer one- and two-syllable words: \"use\" not " +
  "\"utilize\", \"help\" not \"assist\", \"fix\" not \"repair\" when it fits, \"call\" not \"contact\". The business name, " +
  "towns and services can stay as they are. Never drop or soften a true claim to make it simpler; say it in plain words.";

export const MIN_WORDS = 12;

export type PlainLanguageCheck = { problems: string[]; warnings: string[]; grade: number };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The text a reader actually reads: no links, markdown marks, hashtags or code, and the given names swapped for "it". */
export function readableText(text: string, names: readonly (string | null | undefined)[] = []): string {
  let t = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // A link is not read as words; a placeholder like [link] is dropped, others ([Name], [NUMBER]) read as one short word.
    .replace(/https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+/g, "")
    .replace(/\[link\]/gi, "")
    .replace(/\[[^\]\n]{1,40}\]/g, "It")
    // Phone numbers, bare web addresses (clearvantwc.com) and years read as one plain word, not a run of "hard" digits.
    .replace(/(\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "it")
    .replace(/\b[\w-]+\.(com|net|org|us|co|io|biz|info)\b(\/\S*)?/gi, "it")
    .replace(/\b(19|20)\d{2}\b/g, "it")
    .replace(/(^|\s)#[\w-]+/g, " ")
    .replace(/^#{1,6}\s+(.*)$/gm, "$1.")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_`>|]/g, " ")
    // A line that ends without a full stop (a heading like "Why it works:", a list item, a line before a link) is its own
    // thought when the next line starts a new one (capital letter, digit or quote). Hard-wrapped prose continues in lower case.
    .replace(/([^.!?\s])[ \t]*:?[ \t]*\n+(?=\s*["“'‘(]?[A-Z0-9$])/g, "$1.\n");
  const list = names.filter((n): n is string => !!n && n.trim().length > 1).sort((a, b) => b.length - a.length);
  for (const n of list) t = t.replace(new RegExp(`\\b${escape(n.trim())}\\b`, "gi"), "it");
  return t.replace(/\s+/g, " ").trim();
}

/** Problems and warnings for one piece of marketing text against the 3rd-grade rule. */
export function plainLanguageCheck(text: string, names: readonly (string | null | undefined)[] = [], label = "The text"): PlainLanguageCheck {
  const plain = readableText(text, names);
  const level = readingLevel(plain);
  const problems: string[] = [];
  const warnings: string[] = [];
  if (level.words < MIN_WORDS) {
    if (level.hardWords.length) warnings.push(`${label} has long words (${level.hardWords.join(", ")}); use simpler ones (3rd-grade rule).`);
    return { problems, warnings, grade: level.grade };
  }
  const hard = level.hardWords.length ? ` Hard words: ${level.hardWords.join(", ")}.` : "";
  if (level.grade > MAX_GRADE + 1) problems.push(`${label} reads at grade ${level.grade}; it must be 3rd-grade reading level (owner rule).${hard}`);
  else if (level.grade > MAX_GRADE) warnings.push(`${label} reads at grade ${level.grade}; aim for 3.${hard}`);
  for (const s of level.longSentences.slice(0, 3)) problems.push(`${label} has a ${s.words}-word sentence ("${s.start}…"); keep sentences to ${MAX_SENTENCE_WORDS} words or fewer.`);
  return { problems, warnings, grade: level.grade };
}
