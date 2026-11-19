// Reading check for the hand-written public pages (free guides and tools): owner's rule 2026-11-18, all marketing at a
// 3rd-grade reading level. Grade 4 or under for every page, never above; no sentence over 15 words. Same splitter, word
// count and Flesch-Kincaid math as the video page builder (scripts/build-video-pages.mjs).
//   node scripts/page-reading.mjs public/guides/still-no-calls/index.html ...   -> grade, plus each long sentence to fix
// tests/page-reading.test.ts runs it over every guide and tool page (body copy and meta/og/twitter descriptions).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { READING_MAX_GRADE, READING_MAX_SENTENCE_WORDS, readingLevel, splitSentences } from "./build-video-pages.mjs";

// Names count as one short word, like the video builder: they can't be made simpler.
const NAMES = ["Wyatt Brunderman", "Port Charlotte", "Biggify", "Wyatt"];
// Topic words, measured like names (owner's agent, 2026-11-18): the subject of these pages that has no plainer word.
// They are only exempt when measuring the grade; they still count as words for sentence length. Global, for all pages:
//   Google            (the company; every page is about Google)
//   Business Profile  (Google's product name)
//   warranty / warranties   (the topic of the home warranty guide and packet)
//   insurance / insured     (the real thing contractors must carry; no plainer word)
//   certificate       (only inside the fixed term "certificate holder" / "certificate of insurance", the insurers' own words)
//   review / reviews  (Google reviews; the topic of four guides)
//   Instagram, Facebook (names of apps)
// Per page, on top of those (the page's own subject):
//   home warranty guide + packet ("warranty" in the path): "warranty company/companies", "homeowner(s)",
//     "contractor(s)", "general liability", "application(s)" (the networks' own word for the sign-up you apply with)
//   Google Business Profile playbook: "category", "categories" (Google's own name for the setting the chapter is about)
export const TOPIC_WORDS_BY_PAGE = {
  warranty: ["warranty companies", "warranty company", "homeowners", "homeowner's", "homeowner", "contractors", "contractor", "general liability", "applications", "application"],
  "google-playbook": ["categories", "category"],
};
export const TOPIC_WORDS = ["Business Profile", "certificate holder", "Google", "warranties", "warranty", "insurance", "insured", "reviews", "review", "Instagram", "Facebook"];
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

/** Reading grade of plain text, with names, links and topic words measured as one short word. */
export function textGrade(text, path = "") {
  const extra = Object.entries(TOPIC_WORDS_BY_PAGE).filter(([k]) => path.includes(k)).flatMap(([, v]) => v);
  const t = swap(swap(swap(text.replace(/https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+/g, "it"), NAMES), extra), TOPIC_WORDS);
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
