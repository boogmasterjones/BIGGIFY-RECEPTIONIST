// COPY of C:\dev\biggify-platform\lib\content\reading-level.ts (Hubert). The two repos don't share code; keep them in step.
// Reading level, the same rules as Biggify Studio's teleprompter check (C:\dev\biggify-studio\shared\scriptFile.ts readingLevel and
// shared\splitter.ts splitSentences), copied here because the two repos don't share code. Keep them in step: Flesch-Kincaid grade,
// aim for grade 3, warn above MAX_GRADE, sentences at most MAX_SENTENCE_WORDS words.

export const MAX_GRADE = 4;
export const MAX_SENTENCE_WORDS = 15;

const ABBREVIATIONS = ["mr", "mrs", "ms", "dr", "st", "jr", "sr", "vs", "etc", "e.g", "i.e", "inc", "llc", "co", "no", "approx", "ft", "sq"];

export function splitSentences(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const out: string[] = [];
  let current = "";
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]!;
    current += ch;
    if (ch !== "." && ch !== "!" && ch !== "?") continue;
    while (i + 1 < clean.length && /[.!?"'”’)\]]/.test(clean[i + 1]!)) current += clean[++i];
    const next = clean[i + 1];
    if (next !== undefined && next !== " ") continue;
    if (ch === ".") {
      const lastWord = current.trim().split(" ").pop() ?? "";
      const bare = lastWord.replace(/[."'”’)\]]+$/g, "").toLowerCase();
      if (ABBREVIATIONS.includes(bare)) continue;
      if (/^[A-Z]$/.test(lastWord.replace(/\.$/, ""))) continue;
    }
    const after = clean.slice(i + 2, i + 3);
    if (after && !/[A-Z0-9"'“‘$(]/.test(after)) continue;
    out.push(current.trim());
    current = "";
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

export function syllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return /\d/.test(word) ? Math.max(1, Math.min(3, word.replace(/\D/g, "").length)) : 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

export type ReadingLevel = { grade: number; words: number; sentences: number; hardWords: string[]; longSentences: { words: number; start: string }[] };

/** Flesch-Kincaid grade = 0.39 x words/sentence + 11.8 x syllables/word - 15.59 (never below 0). */
export function readingLevel(text: string): ReadingLevel {
  const sents = splitSentences(text);
  const list = sents.length ? sents : text.trim() ? [text.trim()] : [];
  let words = 0;
  let syl = 0;
  const hard = new Set<string>();
  const longSentences: ReadingLevel["longSentences"] = [];
  for (const sent of list) {
    const ws = sent.split(/\s+/).filter((x) => /[a-z0-9]/i.test(x));
    words += ws.length;
    if (ws.length > MAX_SENTENCE_WORDS) longSentences.push({ words: ws.length, start: ws.slice(0, 6).join(" ") });
    for (const w of ws) {
      const n = syllables(w);
      syl += n;
      if (n >= 3) hard.add(w.replace(/[^\w'-]/g, "").toLowerCase());
    }
  }
  if (!words) return { grade: 0, words: 0, sentences: 0, hardWords: [], longSentences: [] };
  const grade = Math.max(0, 0.39 * (words / list.length) + 11.8 * (syl / words) - 15.59);
  return { grade: Math.round(grade * 10) / 10, words, sentences: list.length, hardWords: [...hard].slice(0, 8), longSentences };
}

export const wordCount = (s: string) => s.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
