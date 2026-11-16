import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import nextConfig, { parseVideoLinks, readVideoLinks, videoDestination, videoRedirects } from '../next.config';

// Video links (owner 2026-11-16): gobiggify.com/<slug> -> the free trial page tagged src=yt-<slug>, the video's offer on the page, and
// the tag carried in the form to Hubert.

const DASHBOARD = join(__dirname, '..');
const PUBLIC = join(DASHBOARD, 'public');
const CONFIG = readFileSync(join(PUBLIC, 'tools', 'config.js'), 'utf8');
const VIDEOS = readFileSync(join(PUBLIC, 'tools', 'videos.js'), 'utf8');
const OFFER = readFileSync(join(PUBLIC, 'tools', 'trial', 'video-offer.js'), 'utf8');
const TRIAL = readFileSync(join(PUBLIC, 'tools', 'trial', 'index.html'), 'utf8');

type Fake = { attrs: Record<string, string>; filled: Record<string, string[]>; sent: { url: string; body: Record<string, unknown> }[]; store: Map<string, string>; window: Record<string, unknown> };

/** Runs config.js, videos.js and video-offer.js the way the trial page's <head> does, at the given address. */
function openTrial(href: string, store = new Map<string, string>()): Fake {
  const url = new URL(href);
  const attrs: Record<string, string> = {};
  const filled: Record<string, string[]> = { '[data-video-title]': [], '[data-video-offer]': [] };
  const sent: Fake['sent'] = [];
  const document = {
    readyState: 'complete',
    documentElement: { setAttribute: (k: string, v: string) => void (attrs[k] = v) },
    addEventListener: () => undefined,
    querySelectorAll: (sel: string) => {
      if (!(sel in filled)) return [];
      return [{ set textContent(v: string) { filled[sel].push(v); } }];
    },
  };
  const window: Record<string, unknown> = {
    location: { search: url.search, pathname: url.pathname },
    localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
    crypto: { randomUUID: () => '11111111-2222-4333-8444-555555555555' },
  };
  const fetch = (u: string, init: { body: string }) => {
    sent.push({ url: u, body: JSON.parse(init.body) });
    return Promise.resolve({ status: 200, json: () => Promise.resolve({ ok: true }) });
  };
  const ctx = { window, document, fetch, URLSearchParams, Uint8Array, Date, JSON, Object, Array, String };
  for (const src of [CONFIG, VIDEOS, OFFER]) runInNewContext(src, ctx);
  return { attrs, filled, sent, store, window };
}

describe('the video link list (public/tools/videos.js)', () => {
  const links = readVideoLinks();

  it('has the "I called 100 contractors" video with the 50%-off offer and no price', () => {
    expect(links['100-calls']).toEqual({ title: 'I called 100 contractors', offer: '50_off_after_trial', offerText: '50% off after your free month' });
  });

  it('turns each video into a short redirect to the trial page with the source tag', () => {
    expect(videoRedirects(links)).toContainEqual({
      source: '/100-calls',
      destination: '/tools/trial?src=yt-100-calls&utm_source=youtube&utm_medium=video&utm_campaign=100-calls',
      permanent: false,
    });
    expect(videoDestination('new-video')).toContain('src=yt-new-video');
  });

  it('the site config serves those redirects', async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toEqual(videoRedirects(links));
    expect(redirects.map((r) => r.source)).toContain('/100-calls');
  });

  it('never clashes with a page or file that already lives at the top of the site', () => {
    const taken = new Set([
      ...readdirSync(join(DASHBOARD, 'app')).map((n) => n.replace(/\.[a-z]+$/, '')),
      ...readdirSync(join(PUBLIC)).map((n) => n.replace(/\.[a-z0-9]+$/, '')),
      'api', 'auth', 'login', 'home', 'guides', 'tools', 'fonts', '_next', '_vercel',
    ]);
    for (const slug of Object.keys(links)) expect(taken.has(slug), slug).toBe(false);
  });

  it('refuses a malformed list, a bad slug or a price', () => {
    expect(() => parseVideoLinks('var x = 1;')).toThrow();
    expect(() => parseVideoLinks('window.BIGGIFY_VIDEOS = { "Bad Slug": { "title": "t", "offer": "o", "offerText": "x" } };')).toThrow(/bad slug/);
    expect(() => parseVideoLinks('window.BIGGIFY_VIDEOS = { "ok": { "title": "t", "offer": "o", "offerText": "Only $80 a month" } };')).toThrow(/price/);
    expect(() => parseVideoLinks('window.BIGGIFY_VIDEOS = { "ok": { "title": "t" } };')).toThrow(/needs/);
  });
});

describe('the trial page with a video tag', () => {
  it('shows the video offer when the address carries src=yt-100-calls', () => {
    const page = openTrial('https://gobiggify.com/tools/trial?src=yt-100-calls&utm_source=youtube&utm_medium=video&utm_campaign=100-calls');
    expect(page.attrs['data-video']).toBe('100-calls');
    expect(page.filled['[data-video-title]']).toEqual(['I called 100 contractors']);
    expect(page.filled['[data-video-offer]']).toEqual(['50% off after your free month']);
  });

  it('keeps the offer on a later visit with no tags in the address (the tag is kept in the browser)', () => {
    const first = openTrial('https://gobiggify.com/tools/trial?src=yt-100-calls&utm_source=youtube');
    const later = openTrial('https://gobiggify.com/tools/trial', first.store);
    expect(later.attrs['data-video']).toBe('100-calls');
  });

  it('changes nothing for a normal visit or an unknown video', () => {
    expect(openTrial('https://gobiggify.com/tools/trial').attrs).toEqual({});
    expect(openTrial('https://gobiggify.com/tools/trial?src=yt-not-a-video').attrs).toEqual({});
    expect(openTrial('https://gobiggify.com/tools/trial?src=partner:bni').attrs).toEqual({});
  });

  it('sends the source tag with the trial form to Hubert', async () => {
    const page = openTrial('https://gobiggify.com/tools/trial?src=yt-100-calls&utm_source=youtube&utm_medium=video&utm_campaign=100-calls');
    const B = page.window.Biggify as { send(body: Record<string, unknown>): Promise<unknown> };
    await B.send({ action: 'submit', magnet: 'receptionist_trial', email: 'a@b.co' });
    expect(page.sent).toHaveLength(1);
    expect(page.sent[0].body.utm).toEqual({ src: 'yt-100-calls', utm_source: 'youtube', utm_medium: 'video', utm_campaign: '100-calls' });
    expect(page.sent[0].body.page).toBe('/tools/trial');
  });

  it('the page loads the offer scripts in the head and keeps every price out of the video version', () => {
    const head = TRIAL.slice(0, TRIAL.indexOf('</head>'));
    expect(head).toMatch(/<script src="\/tools\/config\.js"><\/script>\s*<script src="\/tools\/videos\.js"><\/script>\s*<script src="\/tools\/trial\/video-offer\.js"><\/script>/);
    expect(TRIAL.match(/src="\/tools\/config\.js"/g)).toHaveLength(1);
    // Every $ amount on the page sits inside a [data-default-only] block, which the video version hides.
    const blocks = [...TRIAL.matchAll(/<(div|ul)[^>]*data-video-only[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => m[2]);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    for (const b of blocks) expect(b).not.toMatch(/\$\s*\d/);
    const priced = /<ul class="under" data-default-only>([\s\S]*?)<\/ul>/.exec(TRIAL);
    expect(priced?.[1]).toMatch(/\$147/);
    expect(TRIAL.replace(priced?.[0] ?? '', '')).not.toMatch(/\$\s*\d/);
  });
});
