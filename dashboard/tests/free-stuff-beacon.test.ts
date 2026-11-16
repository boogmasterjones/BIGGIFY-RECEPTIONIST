import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

// The visit beacon on every free guide and tool (public/tools/beacon.js), counted on Hubert's "Free stuff" tab.

const PUBLIC = join(__dirname, '..', 'public');
const BEACON = readFileSync(join(PUBLIC, 'tools', 'beacon.js'), 'utf8');
const ENDPOINT = 'https://biggify-dashboard.netlify.app/api/public/free-stuff-view';

const itemPages = ['guides', 'tools'].flatMap((folder) =>
  readdirSync(join(PUBLIC, folder), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(PUBLIC, folder, d.name, 'index.html')))
    .map((d) => `${folder}/${d.name}/index.html`),
);

type Sent = { url: string; body: string };

function run(opts: { href: string; referrer?: string; storage?: Record<string, string>; webdriver?: boolean; beacon?: boolean }) {
  const url = new URL(opts.href);
  const store = new Map(Object.entries(opts.storage ?? {}));
  const sent: Sent[] = [];
  const fetched: Sent[] = [];
  const window = {
    location: { hostname: url.hostname, pathname: url.pathname, search: url.search },
    localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
    crypto: { randomUUID: () => '11111111-2222-4333-8444-555555555555' },
    fetch: (u: string, init: { body: string }) => void fetched.push({ url: u, body: init.body }),
  };
  const navigator = {
    webdriver: opts.webdriver ?? false,
    sendBeacon: opts.beacon === false ? undefined : (u: string, body: string) => (sent.push({ url: u, body }), true),
  };
  runInNewContext(BEACON, { window, navigator, document: { referrer: opts.referrer ?? '' }, URL, URLSearchParams, Uint8Array });
  return { sent, fetched, store };
}

describe('beacon tag on the pages', () => {
  it('every guide and tool page (30) loads /tools/beacon.js once, right after Vercel Analytics', () => {
    expect(itemPages.length).toBe(30);
    for (const p of itemPages) {
      const html = readFileSync(join(PUBLIC, p), 'utf8');
      expect(html.match(/<script defer src="\/tools\/beacon\.js"><\/script>/g), p).toHaveLength(1);
      expect(html, p).toMatch(/<script defer src="\/_vercel\/insights\/script\.js"><\/script>\s*<script defer src="\/tools\/beacon\.js"><\/script>/);
    }
  });
});

describe('beacon.js', () => {
  it('sends the path, the referrer host only, three utm tags and a random visitor id to Hubert', () => {
    const { sent, store } = run({
      href: 'https://www.gobiggify.com/guides/still-no-calls?utm_source=facebook&utm_campaign=groups&utm_content=n3&utm_medium=social&email=a@b.com',
      referrer: 'https://l.facebook.com/l.php?u=https%3A%2F%2Fgobiggify.com&h=secret',
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe(ENDPOINT);
    expect(JSON.parse(sent[0].body)).toEqual({
      path: '/guides/still-no-calls',
      visitor: '11111111-2222-4333-8444-555555555555',
      referrer: 'l.facebook.com',
      utm_source: 'facebook',
      utm_campaign: 'groups',
      utm_content: 'n3',
    });
    expect(store.get('biggify_vid')).toBe('11111111-2222-4333-8444-555555555555');
  });

  it('keeps the same visitor id across visits and leaves out empty fields', () => {
    const { sent } = run({ href: 'https://gobiggify.com/tools/xray', storage: { biggify_vid: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' } });
    expect(JSON.parse(sent[0].body)).toEqual({ path: '/tools/xray', visitor: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' });
  });

  it('falls back to fetch (no-cors, keepalive) without sendBeacon', () => {
    const { sent, fetched } = run({ href: 'https://gobiggify.com/tools/xray', beacon: false });
    expect(sent).toHaveLength(0);
    expect(fetched).toHaveLength(1);
    expect(fetched[0].url).toBe(ENDPOINT);
  });

  it('counts nothing on previews, local copies, automated browsers or a browser marked ?nocount=1', () => {
    expect(run({ href: 'https://dashboard-git-x.vercel.app/guides/still-no-calls' }).sent).toHaveLength(0);
    expect(run({ href: 'http://localhost:3000/guides/still-no-calls' }).sent).toHaveLength(0);
    expect(run({ href: 'https://gobiggify.com/guides/still-no-calls', webdriver: true }).sent).toHaveLength(0);
    const marked = run({ href: 'https://gobiggify.com/guides/still-no-calls?nocount=1' });
    expect(marked.sent).toHaveLength(0);
    expect(run({ href: 'https://gobiggify.com/tools/xray', storage: Object.fromEntries(marked.store) }).sent).toHaveLength(0);
    expect(run({ href: 'https://gobiggify.com/tools/xray?nocount=0', storage: Object.fromEntries(marked.store) }).sent).toHaveLength(1);
  });
});
