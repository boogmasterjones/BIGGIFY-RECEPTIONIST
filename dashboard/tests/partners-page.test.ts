import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import { buildLlmsTxt } from '@/lib/seo/llms';
import { MAX_GRADE, MAX_SENTENCE_WORDS, readingLevel, splitSentences, wordCount } from '@/lib/content/reading-level';
import { plainLanguageCheck, readableText } from '@/lib/content/plain-language';
import nextConfig from '@/next.config';
import { config as proxyConfig } from '@/proxy';

// The Biggify Partners sign-up page, gobiggify.com/partners (owner 2026-11-18). Hubert's API contract: docs/affiliates/PARTNER_API.md.
// The owner's hard rule: every word at a 3rd-grade reading level (grade 4 or under, no sentence over 15 words), measured with the
// same maths as Hubert's lib/content/plain-language.ts (copied to lib/content here).

const PUBLIC = join(__dirname, '..', 'public');
const HTML = readFileSync(join(PUBLIC, 'partners', 'index.html'), 'utf8');
const SCRIPT = readFileSync(join(PUBLIC, 'partners', 'partner-form.js'), 'utf8');
const NAMES = ['Biggify', 'Wyatt Brunderman', 'Port Charlotte'];

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

/** Every piece of text a visitor reads, one block per line: the body (no scripts or styles), plus title, description and alt texts. */
function pageBlocks(): string[] {
  const body = /<body>([\s\S]*)<\/body>/.exec(HTML)![1].replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const text = decode(
    body
      // A block's end (and a bold lead-in like "<b>A check for each one</b>") is the end of a thought.
      .replace(/<\/(h1|h2|h3|p|li|label|legend|option|button|span|b|a|summary|div)>/g, '\n')
      .replace(/<(br|input|select|textarea)\b[^>]*>/g, '\n')
      .replace(/<[^>]+>/g, ' '),
  );
  const head = [/<title>([^<]*)<\/title>/, /<meta name="description" content="([^"]*)"/, /<meta property="og:title" content="([^"]*)"/]
    .map((re) => decode(re.exec(HTML)![1]));
  const alts = [...HTML.matchAll(/alt="([^"]+)"/g)].map((m) => m[1]);
  const placeholders = [...HTML.matchAll(/placeholder="([^"]+)"/g)].map((m) => m[1]);
  return [...head, ...alts, ...placeholders, ...text.split('\n')].map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => /[a-z]/i.test(l));
}

function scriptMessages(): Record<string, string> {
  const window: Record<string, unknown> = {};
  runInNewContext(SCRIPT, { window });
  return (window.BiggifyPartner as { MESSAGES: Record<string, string> }).MESSAGES;
}

/** Each block as its own thought (a label or heading has no full stop), as plain-language.ts reads lines. */
const asText = (blocks: string[]) => blocks.map((b) => (/[.!?…:]$/.test(b) ? b : `${b}.`)).join('\n');

describe('partners page words: 3rd-grade reading level (owner rule 2026-11-18)', () => {
  const blocks = [...pageBlocks(), ...Object.values(scriptMessages())];

  it('the whole page reads at grade 4 or under', () => {
    const check = plainLanguageCheck(asText(blocks), NAMES, 'The partners page');
    expect(check.problems).toEqual([]);
    expect(check.grade, `grade ${check.grade}`).toBeLessThanOrEqual(MAX_GRADE);
  });

  it('the running text alone (no short labels or headings to pull the grade down) reads at grade 4 or under', () => {
    const prose = blocks.filter((b) => wordCount(b) >= 8);
    const check = plainLanguageCheck(asText(prose), NAMES, 'The partners page text');
    expect(check.problems).toEqual([]);
    expect(check.grade, `grade ${check.grade}`).toBeLessThanOrEqual(MAX_GRADE);
  });

  it('has no sentence over 15 words', () => {
    for (const block of blocks)
      for (const s of splitSentences(readableText(block, NAMES))) expect(wordCount(s), s).toBeLessThanOrEqual(MAX_SENTENCE_WORDS);
  });

  it('every longer paragraph passes the check on its own', () => {
    for (const block of blocks) {
      const check = plainLanguageCheck(block, NAMES, block.slice(0, 40));
      expect(check.problems, block).toEqual([]);
    }
  });

  it('measures the page, not just a few words', () => {
    expect(readingLevel(readableText(asText(blocks), NAMES)).words).toBeGreaterThan(300);
  });
});

describe('partners page facts', () => {
  const text = pageBlocks().join(' ');

  it('shows the pitch numbers only: $700, or 7% each month for a year, and $250 for a website only', () => {
    expect(text).toContain('$700');
    expect(text).toContain('7%');
    expect(text).toContain('$250');
    expect(text).toMatch(/one year|a year/);
    expect(text).not.toMatch(/\$1,?100|10%/);
  });

  it('never promises a code on sign-up, and states the rules plainly', () => {
    expect(text).toContain('Once you are all set, I send you your own code.');
    expect(text).toContain('You never sell a thing.');
    expect(text).toContain("Please don't promise them any results.");
    expect(text).toContain('I take one business per trade in each town.');
    expect(text).toContain('(941) 401-8288');
    expect(text).toContain('Wyatt Brunderman, Biggify, Port Charlotte, FL.');
  });

  it('uses no AI images: only the site logo', () => {
    const imgs = [...HTML.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map((m) => m[1]);
    expect(imgs).toEqual(['/logo.webp']);
  });
});

describe('partners form', () => {
  it('has a label for every field, the honeypot hidden, and an error box next to each field', () => {
    for (const id of ['name', 'business', 'email', 'phone', 'city', 'kind', 'message', 'website']) {
      expect(HTML, id).toMatch(new RegExp(`<label for="${id}">`));
      expect(HTML, id).toMatch(new RegExp(`id="${id}"`));
    }
    expect(HTML).toContain('<div class="hp" aria-hidden="true"><label for="website">Leave this empty</label>');
    for (const name of ['name', 'business', 'email', 'phone', 'city', 'kind', 'payoutKind', 'message'])
      expect(HTML, name).toMatch(new RegExp(`<div class="field" data-name="${name}">[\\s\\S]*?<p class="error"></p>`));
    expect(HTML).toContain('<legend>How do you want to be paid?</legend>');
    expect(HTML).toMatch(/name="payoutKind" value="cash"/);
    expect(HTML).toMatch(/name="payoutKind" value="percent"/);
  });

  it('only offers the kinds Hubert knows', () => {
    const kinds = [...HTML.matchAll(/<option value="([^"]*)">/g)].map((m) => m[1]).filter(Boolean);
    expect(kinds).toEqual(['supply_house', 'bookkeeper', 'insurance', 'sign_shop', 'banker', 'client', 'other']);
  });

  it('posts to the partner URL from /tools/config.js', () => {
    const config = readFileSync(join(PUBLIC, 'tools', 'config.js'), 'utf8');
    expect(config).toContain('HUBERT_PARTNER_URL: "https://biggify-dashboard.netlify.app/api/public/partner-apply"');
    expect(HTML.indexOf('/tools/config.js')).toBeLessThan(HTML.indexOf('/partners/partner-form.js'));
  });

  const window: Record<string, unknown> = {};
  runInNewContext(SCRIPT, { window });
  const P = window.BiggifyPartner as {
    check: (v: Record<string, string>) => [string, string] | null;
    buildBody: (v: Record<string, string>, extra: { elapsedMs: number; page: string; utm: Record<string, string> }) => Record<string, unknown>;
    describe: (status: number, json: unknown) => { ok: boolean; field?: string; message: string };
    MESSAGES: Record<string, string>;
  };
  const good = { name: 'Pat Lee', business: 'Coast Supply', email: 'pat@coastsupply.com', phone: '(941) 555-0199', city: 'Port Charlotte', kind: 'supply_house', payoutKind: 'cash', message: '', website: '' };

  it('checks the fields before sending', () => {
    expect(P.check(good)).toBeNull();
    expect(P.check({ ...good, name: '' })?.[0]).toBe('name');
    expect(P.check({ ...good, email: 'pat' })).toEqual(['email', 'Enter your email.']);
    expect(P.check({ ...good, phone: '555-0199' })?.[0]).toBe('phone');
    expect(P.check({ ...good, phone: '+1 941 555 0199' })).toBeNull();
    expect(P.check({ ...good, payoutKind: '' })).toEqual(['payoutKind', 'Pick how you want to be paid.']);
  });

  it('sends the contract fields, never an amount, and leaves blank ones out', () => {
    const body = P.buildBody({ ...good, payoutKind: 'percent' }, { elapsedMs: 23000, page: '/partners', utm: { src: 'bni' } });
    expect(body).toEqual({
      name: 'Pat Lee', email: 'pat@coastsupply.com', payoutKind: 'percent', website: '', elapsedMs: 23000, page: '/partners', utm: { src: 'bni' },
      business: 'Coast Supply', phone: '(941) 555-0199', city: 'Port Charlotte', kind: 'supply_house',
    });
    expect(P.buildBody({ ...good, kind: 'made_up' }, { elapsedMs: 1, page: '/partners', utm: {} })).not.toHaveProperty('kind');
  });

  it("shows Hubert's own words for every answer, and plain words when it can't be reached", () => {
    const thanks = 'Thanks! I got your sign-up. I will call you soon. Once you are all set, I will send you your own code. Wyatt';
    expect(P.describe(200, { ok: true, message: thanks })).toEqual({ ok: true, message: thanks });
    expect(P.describe(200, { ok: true, duplicate: true, message: 'Thanks! I already have your sign-up.' }).message).toBe('Thanks! I already have your sign-up.');
    expect(P.describe(400, { ok: false, field: 'email', error: 'Enter your email.' })).toEqual({ ok: false, field: 'email', message: 'Enter your email.' });
    expect(P.describe(400, { ok: false })).toEqual({ ok: false, message: 'Please check the form.' });
    expect(P.describe(429, { ok: false, error: 'Too many tries.' }).message).toBe('Too many tries.');
    expect(P.describe(503, { ok: false, error: 'Sign-ups are not open yet. Please call or text me at 941-401-8288.' }).message).toContain('not open yet');
    expect(P.describe(503, {}).message).toBe(P.MESSAGES.notOpen);
    expect(P.describe(0, {}).message).toBe(P.MESSAGES.offline);
    expect(P.describe(502, null).message).toBe(P.MESSAGES.broken);
    // No answer ever shows a partner code.
    expect(JSON.stringify(P.MESSAGES)).not.toMatch(/your code is/i);
  });
});

describe('partners page is on the site', () => {
  it('is in the sitemap and llms.txt', () => {
    expect(sitemap().map((e) => e.url)).toContain('https://www.gobiggify.com/partners');
    expect(buildLlmsTxt()).toContain('(https://www.gobiggify.com/partners)');
  });

  it('opens at /partners and skips the login check', async () => {
    const rw = (await nextConfig.rewrites!()) as { afterFiles: { source: string; destination: string }[] };
    expect(rw.afterFiles).toContainEqual({ source: '/partners', destination: '/partners/index.html' });
    const re = new RegExp(`^${proxyConfig.matcher[0]}$`);
    expect(re.test('/partners')).toBe(false);
    expect(re.test('/home')).toBe(true);
  });

  it('is linked from the home page footer and the free tools hub', () => {
    expect(readFileSync(join(__dirname, '..', 'app', 'page.tsx'), 'utf8')).toContain('<a href="/partners">Partners</a>');
    expect(readFileSync(join(PUBLIC, 'tools', 'index.html'), 'utf8')).toContain('<a href="/partners">Partners</a>');
  });
});
