// Builds the free video resource pages (owner 2026-11-16: "every video gets its own gobiggify.com page, so Biggify has a frick ton
// of resources"). Source: content/video-pages/*.md (one per page) and content/video-pages/guides/*.md (the free checklists the videos
// point to). Output: plain static pages in public/videos/<slug>/ and public/guides/<slug>/, and the /videos hub (app/sitemap.ts and /llms.txt pick them up from public/ through lib/seo/site-pages.ts),
// in the same look as the other guides (tools.css + guide.css + videos.css).
//
// The YouTube IDs and the draft list live in ONE file, public/videos/videos.js. A page shows a player only for a video that has an ID
// there (no ID = no player, nothing broken), and gets a VideoObject in its schema only then. A page listed under "draft" is noindex
// and left out of the hub, the sitemap and every related-links list.
//
// Runs on its own (`npm run videos`) and before every build (`prebuild`). tests/video-pages.test.ts fails if the output is stale.
// Throws (so the build fails loudly) on: a page above grade 5 (owner 2026-11-18: 3rd-grade reading level for all marketing; the
// builder also prints every page above grade 4 or with a sentence over 15 words), a placeholder like [X] or [DATA: ...], a broken
// internal link, a link to a draft page,
// a missing title/description, or two pages with the same title.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DASH = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(DASH, "public");
const SRC = join(DASH, "content", "video-pages");
// Same host and entities as lib/seo/site.ts and lib/seo/entities.ts (this plain-JS script can't import those TypeScript files;
// tests/video-pages.test.ts checks the copies below stay identical to them).
export const SITE = "https://www.gobiggify.com";
export const BYLINE = "By Wyatt, founder of Biggify, Port Charlotte FL";

export const TOPICS = [
  ["calls", "Calls", "Every call picked up, and what a missed one really costs."],
  ["reviews", "Reviews and word of mouth", "How I get reviews, how many you need, and what people see when they look you up."],
  ["google", "Your Google profile", "How Google picks who shows up, and how I change a profile without trouble."],
  ["websites", "Websites and photos", "What I put on a trade website so people call, and the photos I use."],
  ["estimates", "Estimates", "The questions and texts that turn more estimates into booked jobs."],
  ["marketer", "Choosing a marketer", "How I'd check any marketing company, and the math I use to judge marketing."],
  ["scam-calls", "Sales and scam calls", "The calls trade owners keep getting, and what I do with each one."],
  ["ai", "AI and ChatGPT", "How AI picks who to name, and what I do so it names my clients."],
];

// Cards for the existing guides and tools a page can list under "Keep going" (path -> tag, title, blurb).
const KNOWN = {
  "/guides/ai-receptionist": ["Phones & calls", "Is an AI receptionist worth it? Do the math", "A calculator for what your unanswered calls cost, and what a receptionist does on each call."],
  "/guides/missed-calls-competitors": ["Phones & calls", "Every missed call is a job your competitor answers", "What callers do after you miss them, a 7-day call audit and the money math."],
  "/guides/quote-follow-up": ["Winning the job", "Following up on a quote without being pushy", "One question at the walkthrough, the quote within 24 hours, two texts, then stop."],
  "/guides/how-much-on-the-phone": ["Phones & pricing", "\"How much?\" on the first call", "Questions first, then an honest range, then the next step."],
  "/guides/reviews-that-stick": ["Google reviews", "More Google reviews without tripping the filters", "Ask scripts, a QR review card, past customers, and Google's and the FTC's rules."],
  "/guides/reviews-that-stick#past-customers": ["Google reviews", "Getting reviews from past customers", "Who to text, how many a week, and what to say."],
  "/guides/reviews-disappeared": ["Google reviews", "Your Google reviews disappeared? The 5-minute check", "Gone, hidden or a Google glitch, and what to do about each."],
  "/guides/fake-review-attack": ["Google reviews", "Hit with a wave of fake 1-star reviews?", "What to do in the first hour, and which report to use."],
  "/guides/google-profile-changes": ["Google profile", "Change your Google profile without getting suspended", "The edits that make Google re-check you, the safe order, and who should own the profile."],
  "/guides/still-no-calls": ["Getting calls", "Everything's set up and the phone still doesn't ring?", "A 15-minute check that finds where your calls are leaking."],
  "/guides/spam-competitors": ["Google Maps spam", "Fake competitor listings: what gets them removed", "How to spot them, which report to use, and the proof Google acts on."],
  "/guides/questions-before-you-sign": ["Hiring a marketing company", "30 questions to ask before you sign", "A good answer and a red flag for each one."],
  "/guides/who-owns-your-stuff": ["Ownership", "Who owns your stuff? The 15-minute check", "Your domain, website, Google profile, ad accounts and phone number."],
  "/guides/marketing-is-simple": ["Start here", "Marketing a trade business is simpler than they make it sound", "The whole formula on one page."],
  "/guides/social-media-real-job": ["Social media", "What social media is really for", "Proving you're real and busy to people checking you out before they call."],
  "/tools/xray": ["Free report", "Google Profile X-Ray", "I look at your Google profile next to the top 3 near you and send the 3 fixes that matter most."],
  "/tools/missed-calls": ["Free calculator", "Missed Call Money Leak", "3 questions. See what the calls you miss could be worth in a year."],
  "/tools/review-kit": ["Free kit", "Review Booster Kit", "A review card with your own QR code, plus 20 texts to copy."],
  "/tools/website-playbook": ["Free playbook", "The Complete Website Playbook", "What a trade website needs to make the phone ring, chapter by chapter."],
  "/tools/google-posts": ["Done for you", "4 Free Google Posts", "A month of Google posts for your trade and town, ready to paste."],
  "/tools/social-playbook": ["Free playbook", "The Complete Social Media Playbook", "Set up Facebook, Instagram and Google right, then a 12-post rotation."],
  "/tools/demo-line": ["Try it", "Call the demo receptionist", "Hear an AI receptionist answer like a trade business."],
};

// ---------- config (public/videos/videos.js) ----------

export function parseVideoConfig(source) {
  const m = /window\.BIGGIFY_VIDEO_PAGES\s*=\s*(\{[\s\S]*\})\s*;?\s*$/.exec(source);
  if (!m) throw new Error('videos/videos.js: expected "window.BIGGIFY_VIDEO_PAGES = { ... };" at the end of the file');
  const cfg = JSON.parse(m[1]);
  if (!cfg.youtube || typeof cfg.youtube !== "object") throw new Error("videos/videos.js: needs a youtube map");
  if (!cfg.draft || typeof cfg.draft !== "object") throw new Error("videos/videos.js: needs a draft map");
  for (const [slug, v] of Object.entries(cfg.youtube)) {
    if (!v || typeof v !== "object" || typeof v.id !== "string") throw new Error(`videos/videos.js: "${slug}" needs { "id": "", "uploaded": "" }`);
    if (v.id && !/^[A-Za-z0-9_-]{11}$/.test(v.id)) throw new Error(`videos/videos.js: "${slug}" has a YouTube ID that doesn't look right: "${v.id}"`);
    if (v.uploaded && !/^\d{4}-\d{2}-\d{2}$/.test(v.uploaded)) throw new Error(`videos/videos.js: "${slug}" uploaded must be YYYY-MM-DD`);
  }
  return cfg;
}

// ---------- tiny markdown (only what these pages use) ----------

const esc = (s) => String(s).replace(/&(?!(?:[a-z]+|#\d+);)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attr = (s) => esc(s).replace(/"/g, "&quot;");
const plain = (s) => String(s).replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

function inline(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
      const ext = /^https?:/.test(u) && !u.startsWith(SITE);
      return `<a href="${attr(u)}"${ext ? ' rel="noopener" target="_blank"' : ""}>${t}</a>`;
    });
}

const ICON = {
  tip: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
  warn: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  good: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  sms: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

function callout(kind, text) {
  const m = /^\*\*([^*]+)\*\*\s*([\s\S]*)$/.exec(text);
  const label = m ? `<span class="g-label">${esc(m[1])}</span>` : "";
  return `<div class="g-callout g-${kind}"><span class="g-ico">${svg(kind)}</span><div>${label}<p>${inline(m ? m[2] : text)}</p></div></div>`;
}

/** Turns one page body into HTML. Each "## " heading starts a numbered section. Returns { html, toc, videos }. */
function renderBody(md, ctx) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [], toc = [], videos = [];
  let i = 0, sectionOpen = false, n = 0, para = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } };
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { flush(); i++; continue; }
    let m;
    if ((m = /^## (.+?)(?:\s*\{#([a-z0-9-]+)\})?$/.exec(t))) {
      flush();
      if (sectionOpen) out.push("</section>");
      n++;
      const id = m[2] || m[1].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
      toc.push({ id, text: plain(m[1]) });
      out.push(`<section id="${id}"><span class="g-kicker">${String(n).padStart(2, "0")}</span><h2>${inline(m[1])}</h2>`);
      sectionOpen = true; i++; continue;
    }
    if ((m = /^### (.+)$/.exec(t))) { flush(); out.push(`<h3>${inline(m[1])}</h3>`); i++; continue; }
    if ((m = /^:::(\w+)\s*(.*)$/.exec(t))) {
      flush();
      const kind = m[1], arg = m[2].trim(), body = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ":::") body.push(lines[i++]);
      i++;
      if (kind === "text") {
        const txt = body.join(" ").trim();
        out.push(`<div class="g-callout g-good v-text"><span class="g-ico">${svg("good")}</span><div><span class="g-label">${esc(arg)}</span><p>${inline(txt)}</p><button class="v-copy" type="button" data-copy="${attr(plain(txt).replace(/^"|"$/g, ""))}">${svg("copy")}<span>Copy text</span></button></div></div>`);
      } else if (kind === "check") {
        const items = body.map((l) => l.trim()).filter((l) => l.startsWith("- ")).map((l) => `<li><label><input type="checkbox" /><span>${inline(l.slice(2))}</span></label></li>`);
        const id = arg.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "check";
        out.push(`<div class="g-check" id="check-${id}"><div class="g-check-top"><b>${esc(arg)}</b><span class="g-check-count">0 of ${items.length} done</span></div><div class="g-check-bar"><span></span></div><ul>${items.join("")}</ul><div class="g-check-done">All done. Nice work.</div><div class="g-check-actions"><button class="g-btn" type="button" data-share="print">${svg("print")}<span>Print it</span></button><button class="g-btn" type="button" data-reset><span>Start over</span></button></div></div>`);
      } else if (kind === "video") {
        const v = ctx.video(arg);
        if (v) { videos.push(v); out.push(v.html); }
      } else if (kind === "dodont") {
        const split = body.findIndex((l) => l.trim() === "---");
        const li = (arr) => arr.map((l) => l.trim()).filter((l) => l.startsWith("- ")).map((l) => `<li>${inline(l.slice(2))}</li>`).join("");
        const [doT, dontT] = arg.split("|").map((s) => s.trim());
        out.push(`<div class="g-dodont"><div class="g-do"><h4><i>✓</i>${esc(doT || "Do")}</h4><ul>${li(body.slice(0, split))}</ul></div><div class="g-dont"><h4><i>✕</i>${esc(dontT || "Don't")}</h4><ul>${li(body.slice(split + 1))}</ul></div></div>`);
      } else throw new Error(`${ctx.file}: unknown block :::${kind}`);
      continue;
    }
    if ((m = /^>(!|\+)?\s?(.*)$/.exec(t))) {
      flush();
      const kind = m[1] === "!" ? "warn" : m[1] === "+" ? "good" : "tip";
      const buf = [m[2]];
      i++;
      while (i < lines.length && /^>/.test(lines[i].trim())) buf.push(lines[i++].trim().replace(/^>[!+]?\s?/, ""));
      out.push(callout(kind, buf.join(" ")));
      continue;
    }
    if (/^(- |\d+\. )/.test(t)) {
      flush();
      const ordered = /^\d+\. /.test(t), items = [];
      while (i < lines.length && /^(- |\d+\. |\s{2,}\S)/.test(lines[i])) {
        const l = lines[i];
        if (/^\s{2,}\S/.test(l) && items.length) items[items.length - 1] += " " + l.trim();
        else items.push(l.trim().replace(/^(- |\d+\. )/, ""));
        i++;
      }
      const li = items.map((x) => (ordered ? `<li><span>${inline(x)}</span></li>` : `<li>${inline(x)}</li>`)).join("");
      out.push(ordered ? `<ol class="g-steps">${li}</ol>` : `<ul>${li}</ul>`);
      continue;
    }
    if (t.startsWith("<")) { flush(); out.push(t); i++; continue; }
    para.push(t); i++;
  }
  flush();
  if (sectionOpen) out.push("</section>");
  return { html: out.join("\n"), toc, videos };
}

// ---------- pages ----------

function readPages(dir, kind) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((f) => {
    const raw = readFileSync(join(dir, f), "utf8").replace(/^﻿/, "");
    const m = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/.exec(raw.replace(/\r\n/g, "\n"));
    if (!m) throw new Error(`${f}: needs a --- JSON front matter --- block`);
    let meta;
    try { meta = JSON.parse(m[1]); } catch (e) { throw new Error(`${f}: front matter is not valid JSON (${e.message})`); }
    const slug = f.replace(/\.md$/, "");
    for (const k of ["title", "description", "summary", "chip"]) if (!meta[k]) throw new Error(`${f}: front matter needs "${k}"`);
    if (kind === "video" && !TOPICS.some(([id]) => id === meta.topic)) throw new Error(`${f}: unknown topic "${meta.topic}"`);
    if (meta.description.length > 155 || meta.description.length < 70) throw new Error(`${f}: description is ${meta.description.length} characters (70 to 155)`);
    return { ...meta, slug, kind, file: f, body: m[2], path: kind === "video" ? `/videos/${slug}` : `/guides/${slug}` };
  });
}

const PLACEHOLDER = /\[(?:[A-Z][A-Z0-9 :.,'_\/-]*|DATA[^\]]*|SOURCE[^\]]*|PROSPECT[^\]]*)\]/;

// ---------- reading level (owner's hard rule 2026-11-18: ALL marketing at a 3rd-grade reading level) ----------
// The same Flesch-Kincaid math as Hubert (biggify-platform lib/content/reading-level.ts + plain-language.ts) and Biggify Studio's
// teleprompter check; keep them in step. Aim for grade 3. Names (Biggify, Port Charlotte, Wyatt) don't count.
//   a page above grade READING_MAX_GRADE + 1 (5)           -> the build FAILS (every page passed this on 2026-11-18)
//   a page above READING_MAX_GRADE (4)                     -> printed "fix" list
//   a sentence over READING_MAX_SENTENCE_WORDS (15) words  -> printed "fix" list for now. Hubert treats it as a problem, but on
//     2026-11-18 every page still had some (many in the front-matter description/summary). Set READING_LONG_SENTENCES_FAIL to
//     true once they are fixed, and the build fails on them too.
export const READING_MAX_GRADE = 4;
export const READING_MAX_SENTENCE_WORDS = 15;
export const READING_LONG_SENTENCES_FAIL = false;
const READING_NAMES = ["Wyatt Brunderman", "Port Charlotte", "Biggify", "Wyatt"];
const ABBREVIATIONS = ["mr", "mrs", "ms", "dr", "st", "jr", "sr", "vs", "etc", "e.g", "i.e", "inc", "llc", "co", "no", "approx", "ft", "sq"];

export function splitSentences(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const out = [];
  let current = "";
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    current += ch;
    if (ch !== "." && ch !== "!" && ch !== "?") continue;
    while (i + 1 < clean.length && /[.!?"'”’)\]]/.test(clean[i + 1])) current += clean[++i];
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

export function syllables(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return /\d/.test(word) ? Math.max(1, Math.min(3, word.replace(/\D/g, "").length)) : 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** Flesch-Kincaid grade = 0.39 x words/sentence + 11.8 x syllables/word - 15.59 (never below 0). */
export function readingLevel(text) {
  const sents = splitSentences(text);
  const list = sents.length ? sents : text.trim() ? [text.trim()] : [];
  let words = 0, syl = 0;
  const hard = new Set(), longSentences = [];
  for (const sent of list) {
    const ws = sent.split(/\s+/).filter((x) => /[a-z0-9]/i.test(x));
    words += ws.length;
    if (ws.length > READING_MAX_SENTENCE_WORDS) longSentences.push({ words: ws.length, start: ws.slice(0, 6).join(" ") });
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

/** Everything a reader reads on one page (front matter copy + body), as plain sentences: markdown marks, links, anchors and
 * names dropped; headings, list items and block lines end as sentences. */
export function pageReadingText(p) {
  const lines = [p.description, p.summary, p.card, p.resource?.text, ...(p.next || []), ...(p.faq || []).flat()].filter(Boolean);
  for (const raw of String(p.body || "").split("\n")) {
    let t = raw.trim();
    if (!t || t === ":::" || t === "---" || /^:::video\b/.test(t) || t.startsWith("<")) continue;
    t = t.replace(/^:::\w+\s*/, "").replace(/^#{1,6}\s+/, "").replace(/\s*\{#[a-z0-9-]+\}\s*$/, "").replace(/^>[!+]?\s?/, "").replace(/^(- |\d+\. )/, "");
    if (t) lines.push(t);
  }
  let text = lines
    .map((l) => plain(l).replace(/https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+/g, "it").replace(/[*_`|]/g, " ").replace(/\s+/g, " ").trim())
    .filter((l) => /[a-z0-9]/i.test(l))
    .map((l) => (/[.!?]["'”’)\]]*$/.test(l) ? l : `${l.replace(/[:;,\s-]+$/, "")}.`))
    .join(" ");
  for (const n of READING_NAMES) text = text.replace(new RegExp(`\\b${n}\\b`, "g"), "it");
  return text;
}

/** Reading level of every page, hardest first, with what is wrong. */
export function readingReport(pages) {
  return pages
    .map((p) => {
      const r = readingLevel(pageReadingText(p));
      const tooHard = r.grade > READING_MAX_GRADE + 1 || (READING_LONG_SENTENCES_FAIL && r.longSentences.length > 0);
      const warn = !tooHard && (r.grade > READING_MAX_GRADE || r.longSentences.length > 0);
      return { file: p.file, path: p.path, grade: r.grade, words: r.words, longSentences: r.longSentences, hardWords: r.hardWords, tooHard, warn };
    })
    .sort((a, b) => b.grade - a.grade);
}

function head({ title, description, path, ogType = "article", noindex, jsonld }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${attr(description)}" />
${noindex ? '<meta name="robots" content="noindex, follow" />\n' : ""}<link rel="canonical" href="${SITE}${path}" />
<meta property="og:type" content="${ogType}" />
<meta property="og:site_name" content="Biggify" />
<meta property="og:title" content="${attr(title.replace(/\s*\|\s*Biggify$/, ""))}" />
<meta property="og:description" content="${attr(description)}" />
<meta property="og:url" content="${SITE}${path}" />
<meta property="og:image" content="${SITE}/LOGO.png" />
<meta property="og:image:alt" content="Biggify logo" />
<meta name="twitter:card" content="summary" />
<link rel="icon" href="/LOGO.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&display=swap" />
<link rel="stylesheet" href="/tools/tools.css" />
<link rel="stylesheet" href="/guides/guide.css" />
<link rel="stylesheet" href="/videos/videos.css" />
<!-- Generated by scripts/build-video-pages.mjs from content/video-pages. Edit the .md file, not this one. No dates shown (owner rule). -->
<script type="application/ld+json">
${JSON.stringify(jsonld).replace(/</g, "\\u003c")}
</script>
  <script defer src="/_vercel/insights/script.js"></script>
  <script defer src="/tools/beacon.js"></script>
</head>`;
}

const HEADER = `<a class="skip" href="#main">Skip to content</a>
<div class="g-progress" aria-hidden="true"><span></span></div>
<header>
  <div class="wrap">
    <nav>
      <a class="logo" href="/"><img src="/LOGO.png" alt="Biggify" /></a>
      <div class="nav-cta">
        <a class="nav-link hide-sm" href="/videos">Videos</a>
        <a class="nav-link hide-sm" href="/guides">Guides</a>
        <a class="nav-link hide-sm" href="/tools">Free tools</a>
        <a class="nav-phone" href="tel:+19414018288">📞 (941) 401-8288</a>
      </div>
    </nav>
  </div>
</header>`;

const FOOTER = `<footer>
  <div class="wrap">
    <p>&copy; Biggify LLC · <a href="/privacy">Privacy</a> · <a href="/videos">Videos</a> · <a href="/guides">Guides</a> · <a href="/tools">Free tools</a></p>
  </div>
</footer>
<script src="/guides/guide.js" defer></script>
<script src="/videos/video-page.js" defer></script>
</body>
</html>
`;

export const ORGANIZATION = { "@type": "Organization", "@id": `${SITE}/#org`, name: "Biggify", legalName: "Biggify LLC", url: `${SITE}/`, logo: { "@type": "ImageObject", url: `${SITE}/LOGO.png` }, telephone: "+1-941-401-8288", address: { "@type": "PostalAddress", addressLocality: "Port Charlotte", addressRegion: "FL", addressCountry: "US" }, founder: { "@id": `${SITE}/#wyatt` }, sameAs: ["https://www.facebook.com/profile.php?id=61596442231096", "https://www.instagram.com/gobiggify/", "https://www.yelp.com/biz/fyMw080KhnER2sEkdSMJGQ"] };
export const PERSON = { "@type": "Person", "@id": `${SITE}/#wyatt`, name: "Wyatt Brunderman", jobTitle: "Founder", description: "Founder of Biggify in Port Charlotte, FL. Runs Google profiles, reviews and phones for trade businesses.", worksFor: { "@id": `${SITE}/#org` } };
export const WEBSITE = { "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: "Biggify", publisher: { "@id": `${SITE}/#org` }, inLanguage: "en-US" };

/** Same rule as pageTitle() in lib/seo/entities.ts, except a title that doesn't fit is an error here: write a seoTitle instead. */
export function pageTitle(title, file) {
  const withBrand = `${title} | Biggify`;
  if (withBrand.length <= 60) return withBrand;
  if (title.length <= 60) return title;
  throw new Error(`${file}: title "${title}" is ${title.length} characters; add a "seoTitle" of 60 or less`);
}

function crumbs(list, path) {
  return { "@type": "BreadcrumbList", "@id": `${SITE}${path}#breadcrumb`, itemListElement: list.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${SITE}${path}` })) };
}

function wordCount(html) { return html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length; }

export function build({ write = true, config } = {}) {
  const cfg = config || parseVideoConfig(readFileSync(join(PUBLIC, "videos", "videos.js"), "utf8"));
  const pages = [...readPages(SRC, "video"), ...readPages(join(SRC, "guides"), "guide")];
  const byPath = new Map(pages.map((p) => [p.path, p]));
  const isDraft = (p) => p.kind === "video" && Object.prototype.hasOwnProperty.call(cfg.draft, p.slug);
  const titles = new Set();
  for (const p of pages) {
    if (titles.has(p.title)) throw new Error(`${p.file}: same title as another page`);
    titles.add(p.title);
    for (const s of p.scripts || []) if (!(s in cfg.youtube)) throw new Error(`${p.file}: script "${s}" is not in videos.js youtube map`);
  }

  const files = new Map();
  const errors = [];

  const linkOk = (href, from) => {
    if (!href.startsWith("/") || href.startsWith("//")) return true;
    const path = href.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
    const page = byPath.get(path);
    if (page) { if (isDraft(page) && !isDraft(from)) errors.push(`${from.file}: links to draft page ${path}`); return true; }
    const shortLinks = readFileSync(join(PUBLIC, "tools", "videos.js"), "utf8"); // gobiggify.com/100-calls style video links (next.config.ts)
    if (/^\/[a-z0-9-]+$/.test(path) && shortLinks.includes(`"${path.slice(1)}":`)) return true;
    if (["/", "/how-it-works", "/privacy", "/terms", "/videos", "/guides", "/tools"].includes(path)) return true;
    const f = join(PUBLIC, path);
    if (existsSync(f) && (statSync(f).isFile() || existsSync(join(f, "index.html")))) return true;
    errors.push(`${from.file}: broken link ${href}`);
    return false;
  };

  const card = (p) => `<a class="g-card" href="${p.path}"><span class="g-tag">${esc(p.kind === "guide" ? "Free checklist" : TOPICS.find(([id]) => id === p.topic)[1])}</span><h3>${esc(p.cardTitle || p.title)}</h3><p>${esc(p.card || p.description)}</p><span class="g-go">${p.kind === "guide" ? "Open it →" : "Read it →"}</span></a>`;

  for (const p of pages) {
    const draft = isDraft(p);
    const pageVideos = [];
    const video = (scriptSlug) => {
      const v = cfg.youtube[scriptSlug];
      if (!v) { errors.push(`${p.file}: :::video ${scriptSlug} is not in videos.js`); return null; }
      if (!v.id) return null;
      const label = v.title || p.title;
      const html = `<figure class="v-video"><button class="v-play" type="button" data-yt="${attr(v.id)}" aria-label="Play the video: ${attr(label)}" style="background-image:url('https://i.ytimg.com/vi/${attr(v.id)}/hqdefault.jpg')">${svg("play")}<span>Play the video</span></button><figcaption><a href="https://www.youtube.com/watch?v=${attr(v.id)}" rel="noopener" target="_blank">Watch on YouTube</a></figcaption></figure>`;
      const obj = { "@type": "VideoObject", name: label, description: p.description, thumbnailUrl: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`, embedUrl: `https://www.youtube-nocookie.com/embed/${v.id}`, contentUrl: `https://www.youtube.com/watch?v=${v.id}` };
      if (v.uploaded) obj.uploadDate = v.uploaded;
      pageVideos.push(obj);
      return { html, obj };
    };
    const mainVideo = p.video ? video(p.video) : null;
    const body = renderBody(p.body, { file: p.file, video });

    const faqHtml = (p.faq || []).length
      ? `<section id="faq"><span class="g-kicker">${String(body.toc.length + 1).padStart(2, "0")}</span><h2>Quick answers</h2><div class="g-faq">${p.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${inline(a)}</p></details>`).join("")}</div></section>`
      : "";
    const toc = [...body.toc, ...(faqHtml ? [{ id: "faq", text: "Quick answers" }] : [])];

    const related = (p.related || []).filter((h) => { const t = byPath.get(h.split("#")[0]); return !(t && isDraft(t) && !draft); });
    const relatedCards = related.map((h) => {
      const t = byPath.get(h);
      if (t) return card(t);
      const ext = p.relatedInfo?.[h] || KNOWN[h];
      if (!ext) { errors.push(`${p.file}: related link ${h} needs relatedInfo {tag,title,text}`); return ""; }
      return `<a class="g-card" href="${h}"><span class="g-tag">${esc(ext[0])}</span><h3>${esc(ext[1])}</h3><p>${esc(ext[2])}</p><span class="g-go">${h.startsWith("/tools") ? "Open it →" : "Read the guide →"}</span></a>`;
    });

    const r = p.resource;
    if (!r || !r.href || !r.label || !r.text) errors.push(`${p.file}: needs resource {href,label,text}`);
    const next = p.next || [];
    const crumbList = p.kind === "video" ? [["Biggify", "/"], ["Videos", "/videos"], [p.crumb || p.chip, p.path]] : [["Biggify", "/"], ["Guides", "/guides"], [p.crumb || p.chip, p.path]];
    const minutes = Math.max(2, Math.round((wordCount(body.html) + wordCount(faqHtml)) / 200));

    const dfy = p.dfy || "We build websites and run Google profiles, review requests and social posts for local trades, with an AI receptionist for the calls you miss. My promise is simple: 300% ROI in 4 months, or I work for free until you get it.";
    const html = `${head({
      title: pageTitle(p.seoTitle || p.title, p.file),
      description: p.description,
      path: p.path,
      noindex: draft,
      jsonld: {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Article", "@id": `${SITE}${p.path}#article`, headline: p.title, description: p.description, abstract: p.summary, author: { "@id": `${SITE}/#wyatt` }, publisher: { "@id": `${SITE}/#org` }, image: `${SITE}/LOGO.png`, inLanguage: "en-US", isPartOf: { "@id": `${SITE}/#website` }, mainEntityOfPage: `${SITE}${p.path}`, breadcrumb: { "@id": `${SITE}${p.path}#breadcrumb` }, ...(pageVideos.length ? { video: pageVideos.map((v) => ({ "@id": v.embedUrl })) } : {}) },
          ...pageVideos.map((v) => ({ ...v, "@id": v.embedUrl })),
          crumbs(crumbList, p.path),
          ORGANIZATION,
          PERSON,
          WEBSITE,
          ...((p.faq || []).length ? [{ "@type": "FAQPage", mainEntity: p.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: plain(a) } })) }] : []),
        ],
      },
    })}
<body class="guide-page v-page">
${HEADER}

<main id="main">
<section class="g-hero v-hero">
  <div class="g-grain" aria-hidden="true"></div>
  <div class="wrap">
    <div>
      <nav class="g-crumbs" aria-label="Breadcrumb"><a href="/">Biggify</a><span aria-hidden="true">/</span><a href="${crumbList[1][1]}">${crumbList[1][0]}</a><span aria-hidden="true">/</span><span>${esc(crumbList[2][0])}</span></nav>
      <span class="g-chip"><i></i>${esc(p.chip)}</span>
      <h1>${inline(p.h1 || p.title)}</h1>
      <p class="g-lead">${inline(p.summary)}</p>
      <div class="g-meta">
        <span>${svg("clock")}${minutes} min read</span>
        <span>${svg("person")}${BYLINE}</span>
      </div>
    </div>
  </div>
</section>

<div class="wrap">
  <div class="v-main">
    ${mainVideo ? mainVideo.html : ""}
    ${toc.length > 2 ? `<details class="g-toc v-toc"><summary>On this page</summary><ol>${toc.map((x) => `<li><a href="#${x.id}">${esc(x.text)}</a></li>`).join("")}</ol></details>` : ""}
    <article class="g-article">
${body.html}
${faqHtml}

      <div class="g-share">
        <div><b>Know an owner this would help?</b><p>Send it to them.</p></div>
        <div class="g-share-btns">
          <a class="g-btn" href="#" data-share="copy">${svg("link")}<span>Copy link</span></a>
          <a class="g-btn" href="#" data-share="sms">${svg("sms")}<span>Text it</span></a>
          <a class="g-btn" href="#" data-share="email">${svg("mail")}<span>Email it</span></a>
        </div>
      </div>

      <div class="g-end g-next" id="next-steps">
        <h2>Your next steps</h2>
        ${next.length ? `<ol class="g-next-list">${next.map((s) => `<li><span>${inline(s)}</span></li>`).join("")}</ol>` : ""}
        ${r ? `<div class="g-next-tool"><p>${inline(r.text)}</p><a class="btn btn-primary" href="${attr(r.href)}">${esc(r.label)}</a></div>` : ""}
        <div class="g-next-dfy">
          <p><strong>Rather have it done for you?</strong> ${inline(dfy)}</p>
          <div class="g-next-links">
            <a class="btn btn-ghost" href="/#plans">See the plans</a>
            <a href="/how-it-works">How it works</a>
            <a href="tel:+19414018288">Call or text (941) 401-8288</a>
          </div>
        </div>
        <div class="g-sign"><span class="g-avatar" aria-hidden="true">W</span><div><b>Wyatt, Biggify</b><small>I run websites, Google profiles, reviews and phones for trade businesses.</small></div></div>
      </div>
    </article>
  </div>

  <section class="g-more" aria-labelledby="more">
    <h2 id="more">${p.kind === "video" ? "Keep going" : "More free help"}</h2>
    <div class="g-cards">
      ${relatedCards.join("\n      ")}
      <a class="g-card" href="/videos"><span class="g-tag">All videos</span><h3>Every video, written out</h3><p>Calls, reviews, Google, websites, estimates and choosing a marketer. Plain English, free.</p><span class="g-go">See them all →</span></a>
    </div>
  </section>
</div>
</main>

${FOOTER}`;

    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((x) => x[1].replace(/&amp;/g, "&"));
    for (const h of hrefs) linkOk(h, p);
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<!--[\s\S]*?-->/g, "");
    const ph = PLACEHOLDER.exec(visible.replace(/<[^>]+>/g, " ")) || PLACEHOLDER.exec(JSON.stringify({ ...p, body: "" }));
    if (ph) errors.push(`${p.file}: placeholder ${ph[0]} must not be published`);
    if ((html.match(/<h1[\s>]/g) || []).length !== 1) errors.push(`${p.file}: needs exactly one h1`);
    const dir = p.kind === "video" ? join(PUBLIC, "videos", p.slug) : join(PUBLIC, "guides", p.slug);
    files.set(join(dir, "index.html"), html);
  }

  // hub
  const live = pages.filter((p) => p.kind === "video" && !isDraft(p));
  const guides = pages.filter((p) => p.kind === "guide");
  const hubJson = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": `${SITE}/videos#page`, name: "Free videos for trade business owners, written out", description: "", url: `${SITE}/videos`, about: "Marketing for trade businesses", author: { "@id": `${SITE}/#wyatt` }, publisher: { "@id": `${SITE}/#org` }, isPartOf: { "@id": `${SITE}/#website` }, inLanguage: "en-US", breadcrumb: { "@id": `${SITE}/videos#breadcrumb` }, mainEntity: { "@type": "ItemList", itemListElement: live.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}${p.path}`, name: p.title })) } },
      crumbs([["Biggify", "/"], ["Videos", "/videos"]], "/videos"),
      ORGANIZATION,
      PERSON,
      WEBSITE,
    ],
  };
  const hubDesc = "Every Biggify video written out for trade owners: missed calls, Google reviews, Google profiles, websites, estimates and picking a marketer.";
  hubJson["@graph"][0].description = hubDesc;
  const hub = `${head({ title: "Free videos for trade owners, written out | Biggify", description: hubDesc, path: "/videos", ogType: "website", jsonld: hubJson })}
<body class="guide-page v-page">
${HEADER}
<main id="main">
<section class="g-hero v-hub-hero">
  <div class="g-grain" aria-hidden="true"></div>
  <div class="wrap">
    <div>
      <nav class="g-crumbs" aria-label="Breadcrumb"><a href="/">Biggify</a><span aria-hidden="true">/</span><span>Videos</span></nav>
      <span class="g-chip"><i></i>Free videos, written out</span>
      <h1>How I do it, <em>for my trade businesses</em></h1>
      <p class="g-lead">Every video I make, written out in plain words, so you can read it, copy the texts and use the checklists. Calls, reviews, Google, websites, estimates and how to pick a marketer. No sign-up.</p>
      <nav class="v-topics" aria-label="Topics">${TOPICS.filter(([id]) => live.some((p) => p.topic === id)).map(([id, name]) => `<a href="#${id}">${esc(name)}</a>`).join("")}</nav>
    </div>
  </div>
</section>
<div class="wrap v-hub">
${TOPICS.filter(([id]) => live.some((p) => p.topic === id)).map(([id, name, blurb]) => `  <section id="${id}" aria-labelledby="${id}-h">
    <h2 class="v-hub-h" id="${id}-h">${esc(name)} <span>${esc(blurb)}</span></h2>
    <div class="g-cards">
      ${live.filter((p) => p.topic === id).sort((a, b) => (a.order ?? 50) - (b.order ?? 50) || a.title.localeCompare(b.title)).map(card).join("\n      ")}
    </div>
  </section>`).join("\n")}
  <section aria-labelledby="checklists-h">
    <h2 class="v-hub-h" id="checklists-h">Free checklists <span>The printable lists the videos point to.</span></h2>
    <div class="g-cards">
      ${guides.map(card).join("\n      ")}
    </div>
  </section>
  <section class="g-end" style="margin-top:34px">
    <div>
      <h2>Rather have someone look at yours?</h2>
      <p>Send me your business name and I'll send back the 3 things I'd fix first on your Google profile. Free, no call needed.</p>
      <div class="g-sign"><span class="g-avatar" aria-hidden="true">W</span><div><b>Wyatt, Biggify</b><small>I run websites, Google profiles, reviews and phones for trade businesses.</small></div></div>
    </div>
    <a class="btn btn-primary" href="/tools/xray">Get my free Google Profile X-Ray</a>
  </section>
</div>
</main>
${FOOTER}`;
  files.set(join(PUBLIC, "videos", "index.html"), hub);


  const reading = readingReport(pages);
  for (const r of reading.filter((x) => x.tooHard)) {
    errors.push(`${r.file}: reads at grade ${r.grade}${r.longSentences.length ? ` with ${r.longSentences.length} sentence(s) over ${READING_MAX_SENTENCE_WORDS} words` : ""}; must be 3rd-grade reading level, never above grade ${READING_MAX_GRADE + 1} (owner rule 2026-11-18)`);
  }

  if (errors.length) throw new Error("Video pages:\n  " + errors.join("\n  "));
  if (write) for (const [f, c] of files) { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, c); }
  return { files, pages, live, drafts: pages.filter(isDraft), guides, reading };
}

/** The printed reading-level list (every run of the builder). */
export function readingSummary(reading) {
  const hard = reading.filter((r) => r.tooHard), warn = reading.filter((r) => r.warn);
  const out = [`Reading level (3rd-grade rule: aim 3; fix anything above grade ${READING_MAX_GRADE} or with a sentence over ${READING_MAX_SENTENCE_WORDS} words; above grade ${READING_MAX_GRADE + 1} fails the build): ${reading.length - hard.length - warn.length} ok, ${warn.length} to fix, ${hard.length} too hard`];
  for (const r of [...hard, ...warn]) {
    const long = r.longSentences.length ? `, ${r.longSentences.length} long sentence${r.longSentences.length > 1 ? "s" : ""} (e.g. ${r.longSentences[0].words} words: "${r.longSentences[0].start}...")` : "";
    out.push(`  ${r.tooHard ? "TOO HARD" : "fix     "} grade ${String(r.grade).padStart(4)}  ${r.path}${long}${r.hardWords.length ? `; hard words: ${r.hardWords.slice(0, 5).join(", ")}` : ""}`);
  }
  return out.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = build();
  console.log(`Video pages: ${r.live.length} live, ${r.drafts.length} draft, ${r.guides.length} checklists, ${r.files.size} files written.`);
  console.log(readingSummary(r.reading));
}
