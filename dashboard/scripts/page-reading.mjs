// Reading check for the hand-written public pages (free guides and tools): owner's rule 2026-11-18, all marketing at a
// 3rd-grade reading level, no sentence over 15 words. Same splitter and word count as the video page builder.
//   node scripts/page-reading.mjs public/guides/still-no-calls/index.html ...   -> prints each block with a long sentence
// tests/page-reading.test.ts runs it over every guide and tool page so they stay fixed.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { READING_MAX_SENTENCE_WORDS, splitSentences } from "./build-video-pages.mjs";

const NAMES = ["Wyatt Brunderman", "Port Charlotte", "Biggify", "Wyatt"];
// The SMS opt-in wording is carrier compliance text, not marketing copy; it stays word for word.
const SKIP = [/^By providing your phone number/];
const BREAK = "\u0000";

/** The text blocks a reader reads inside <main>: paragraphs, list items, table cells, headings, quotes, FAQ questions. */
export function pageBlocks(html) {
  const main = (/<main\b[\s\S]*?<\/main>/.exec(html) || [html])[0].replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, " ");
  const re = /<(p|li|td|th|h[1-6]|blockquote|figcaption|dd|dt|summary|label)\b[^>]*>([\s\S]*?)<\/(?:p|li|td|th|h[1-6]|blockquote|figcaption|dd|dt|summary|label)>/g;
  const out = [];
  for (let x; (x = re.exec(main)); ) out.push(x[2]);
  return out;
}

/** Plain text of one block. A bold label followed by its own <span>, or a nested list, starts a new part. */
export function blockText(s) {
  return s
    .replace(/<\/(b|strong)>\s*<span\b[^>]*>/g, `</$1>${BREAK}`)
    .replace(/<(ul|ol)\b/g, `${BREAK}<$1`)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#39;|&rsquo;|&apos;/g, "'")
    .replace(/&[a-z]+;|&#\d+;/g, " ")
    .replace(/[ \t\r\n]+/g, " ")
    .trim();
}

/** Words in one sentence; a name (Biggify, Port Charlotte, Wyatt) or a link counts as one word. */
function wordCount(s) {
  let t = s.replace(/https?:\/\/\S+/g, "it");
  for (const n of NAMES) t = t.replace(new RegExp(`\\b${n}\\b`, "g"), "it");
  return t.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
}

/** Sentences over the limit in one block of text. */
export function longSentences(text) {
  if (SKIP.some((r) => r.test(text))) return [];
  return text
    .split(BREAK)
    .flatMap((part) => splitSentences(part.trim()))
    .map((s) => ({ s, words: wordCount(s) }))
    .filter((x) => x.words > READING_MAX_SENTENCE_WORDS);
}

/** Every block on a page that has a long sentence: [{ block, long: [{ s, words }] }]. */
export function pageLongBlocks(html) {
  const seen = new Set();
  const out = [];
  for (const block of pageBlocks(html)) {
    if (seen.has(block)) continue;
    seen.add(block);
    const long = longSentences(blockText(block));
    if (long.length) out.push({ block, long });
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const f of process.argv.slice(2)) {
    const found = pageLongBlocks(readFileSync(f, "utf8"));
    if (!process.env.QUIET) for (const b of found) console.log((/</.test(b.block) ? "@@ " + b.block.trim() + "\n" : "") + "   >> " + b.long.map((x) => `[${x.words}] ${x.s}`).join(" | "));
    console.log(`## ${f}: ${found.length} block(s) with a sentence over ${READING_MAX_SENTENCE_WORDS} words`);
  }
}
