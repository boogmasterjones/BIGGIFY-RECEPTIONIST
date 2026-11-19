// Reading check for the hand-written public pages (free guides and tools): owner's rule 2026-11-18, all marketing at a
// 3rd-grade reading level. Grade 4 or under for every page, never above; no sentence over 15 words. Same splitter, word
// count and Flesch-Kincaid math as the video page builder (scripts/build-video-pages.mjs).
//   node scripts/page-reading.mjs public/guides/still-no-calls/index.html ...   -> grade, plus each long sentence to fix
// tests/page-reading.test.ts runs it over every guide and tool page (body copy and meta/og/twitter descriptions).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { READING_MAX_GRADE, READING_MAX_SENTENCE_WORDS, readingLevel, splitSentences } from "./build-video-pages.mjs";

// Proper names count as one short word when measuring the grade, like the video builder (they can't be made simpler).
// ONLY proper names (owner's agent, 2026-11-18): people, places, and company or product names. Ordinary words (warranty,
// insurance, review, contractor and so on) are never skipped. They still count as words for sentence length.
const NAMES = [
  // people, Biggify, Google's and Meta's products
  "Wyatt Brunderman", "Wyatt", "Biggify", "Google Business Profile", "Business Profile", "Google", "Facebook", "Instagram",
  // places
  "Port Charlotte", "Florida", "California", "Pennsylvania", "Illinois", "Maryland", "Massachusetts", "Washington",
  "Sarasota", "Venice", "Tulsa", "Mesa", "Gilbert", "Chandler", "Edison",
  // other companies and products named on the pages
  "American Home Shield", "First American", "Old Republic", "Fidelity National", "Housecall Pro", "ServiceTitan", "ServiceM8",
  "Microsoft", "GoDaddy", "Namecheap", "Cloudflare", "Squarespace", "HomeAdvisor", "Thumbtack", "Nextdoor", "Trustpilot",
  "CallRail", "RingCentral",
];
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

const swap = (s, list) => {
  for (const n of list) s = s.replace(new RegExp(`\\b${n}\\b`, "gi"), "it");
  return s;
};

/** Words in one sentence; a name (Biggify, Port Charlotte, Wyatt) or a link counts as one word. */
function wordCount(s) {
  return swap(s.replace(/https?:\/\/\S+/g, "it"), NAMES).split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
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

/** Reading grade of plain text, with proper names and links measured as one short word. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function textGrade(text, path = "") {
  const t = swap(text.replace(/https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+/g, "it"), NAMES);
  return readingLevel(t).grade;
}

/** The page's body copy as one text: each block (and each part of a block) ends as a sentence. */
export function pageText(html) {
  return pageBlocks(html)
    .map((b) => blockText(b))
    .filter((t) => !SKIP.some((r) => r.test(t)))
    .flatMap((t) => t.split(BREAK))
    .map((x) => x.trim())
    .filter((x) => /[a-z0-9]/i.test(x))
    .map((x) => (/[.!?]["')\]]*$/.test(x) ? x : `${x}.`))
    .join(" ");
}

/** Reading grade of the page's body copy. */
export function pageGrade(html, path = "") {
  return textGrade(pageText(html), path);
}

/** The meta, og and twitter descriptions on a page: [{ key, text }]. */
export function pageDescriptions(html) {
  const out = [];
  for (const [, , key, content] of html.matchAll(/<meta (name|property)="(description|og:description|twitter:description)" content="([^"]*)"/g)) {
    out.push({ key, text: blockText(content) });
  }
  return out;
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

/** Everything wrong on a page: long sentences in the body, the body grade, and each description's length and grade. */
export function pageProblems(html, path = "") {
  const problems = [];
  for (const b of pageLongBlocks(html)) for (const x of b.long) problems.push(`[${x.words} words] ${x.s}`);
  const g = pageGrade(html, path);
  if (g > READING_MAX_GRADE) problems.push(`page reads at grade ${g} (max ${READING_MAX_GRADE})`);
  for (const d of pageDescriptions(html)) {
    for (const x of longSentences(d.text)) problems.push(`${d.key}: [${x.words} words] ${x.s}`);
    const dg = textGrade(d.text, path);
    if (dg > READING_MAX_GRADE) problems.push(`${d.key} reads at grade ${dg} (max ${READING_MAX_GRADE}): ${d.text}`);
  }
  return problems;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const f of process.argv.slice(2)) {
    const html = readFileSync(f, "utf8");
    if (!process.env.QUIET) for (const b of pageLongBlocks(html)) console.log((/</.test(b.block) ? "@@ " + b.block.trim() + "\n" : "") + "   >> " + b.long.map((x) => `[${x.words}] ${x.s}`).join(" | "));
    const problems = pageProblems(html, f).filter((p) => !/^\[\d+ words\]/.test(p));
    console.log(`## ${f}: grade ${pageGrade(html, f)}, ${pageLongBlocks(html).length} long block(s)${problems.length ? "\n   " + problems.join("\n   ") : ""}`);
  }
}
