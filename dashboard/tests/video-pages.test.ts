import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import { ORGANIZATION, PERSON, WEBSITE } from '@/lib/seo/entities';
import { SITE } from '@/lib/seo/site';
import * as gen from '../scripts/build-video-pages.mjs';
import { build, parseVideoConfig, type VideoConfig } from '../scripts/build-video-pages.mjs';

// The free video pages (owner 2026-11-16: every video gets its own gobiggify.com page). Built from content/video-pages by
// scripts/build-video-pages.mjs; YouTube IDs and drafts live in public/videos/videos.js.

const DASH = join(__dirname, '..');
const PUBLIC = join(DASH, 'public');
const CONFIG_SRC = readFileSync(join(PUBLIC, 'videos', 'videos.js'), 'utf8');
const config = parseVideoConfig(CONFIG_SRC);
const result = build({ write: false });
const rel = (f: string) => f.slice(PUBLIC.length).replace(/\\/g, '/');
const pageFiles = [...result.files.entries()].filter(([f]) => f.endsWith('index.html'));

function jsonld(html: string) {
  const m = /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/.exec(html);
  expect(m, 'JSON-LD block').toBeTruthy();
  return JSON.parse(m![1]) as { '@graph': { '@type': string; [k: string]: unknown }[] };
}
const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ');

describe('the generated video pages', () => {
  it('are up to date with content/video-pages (run "npm run videos" and commit if this fails)', () => {
    for (const [file, html] of result.files) {
      expect(existsSync(file), rel(file)).toBe(true);
      // A Windows checkout may have CRLF line endings; the generator writes LF.
      expect(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), rel(file)).toBe(html);
    }
  });

  it('build every video page, the hub and the three free checklists', () => {
    expect(result.live.length).toBeGreaterThanOrEqual(30);
    expect(result.guides.map((g) => g.path).sort()).toEqual(['/guides/agency-checklist', '/guides/phone-test', '/guides/scam-calls']);
    expect(result.files.has(join(PUBLIC, 'videos', 'index.html'))).toBe(true);
  });

  it('never show a placeholder like [X], [DATA: ...], [SOURCE ...] or [PROSPECT NAME]', () => {
    for (const [file, html] of pageFiles) expect(visibleText(html), rel(file)).not.toMatch(/\[(?:[A-Z][A-Z0-9 :.,'_/-]*|DATA[^\]]*|SOURCE[^\]]*)\]/);
  });

  it('each have one h1, a title, a description, a canonical and Open Graph tags', () => {
    const titles = new Set<string>();
    for (const [file, html] of pageFiles) {
      const path = rel(file).replace(/\/index\.html$/, '');
      expect((html.match(/<h1[\s>]/g) ?? []).length, rel(file)).toBe(1);
      expect(html).toContain(`<link rel="canonical" href="${SITE}${path}" />`);
      expect(html).toContain(`<meta property="og:url" content="${SITE}${path}" />`);
      expect(html).toMatch(/<meta property="og:title" content="[^"]+" \/>/);
      const title = /<title>([^<]+)<\/title>/.exec(html)![1];
      expect(titles.has(title), `duplicate title ${title}`).toBe(false);
      titles.add(title);
      const desc = /<meta name="description" content="([^"]+)" \/>/.exec(html)![1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      expect(desc.length).toBeLessThanOrEqual(165);
    }
  });

  it('load the same analytics as the guides (Vercel Analytics and the visit beacon)', () => {
    for (const [file, html] of pageFiles) {
      expect(html, rel(file)).toContain('<script defer src="/_vercel/insights/script.js"></script>');
      expect(html, rel(file)).toContain('<script defer src="/tools/beacon.js"></script>');
    }
  });

  it('carry Article, BreadcrumbList, Person and Organization schema, FAQPage only with real questions, and no VideoObject without an ID', () => {
    for (const p of [...result.live, ...result.guides]) {
      const html = result.files.get(join(PUBLIC, p.path.slice(1), 'index.html'))!;
      const types = jsonld(html)['@graph'].map((n) => n['@type']);
      expect(types, p.path).toEqual(expect.arrayContaining(['Article', 'BreadcrumbList', 'Person', 'Organization']));
      expect(types.includes('FAQPage'), p.path).toBe((p.faq ?? []).length > 0);
      const hasId = (p.scripts ?? []).some((s) => config.youtube[s]?.id);
      expect(types.includes('VideoObject'), p.path).toBe(hasId);
      if (!hasId) expect(html, p.path).not.toMatch(/youtube|v-play/);
    }
  });

  it('only link to pages and files that exist (no broken links, no links to drafts)', () => {
    const drafts = new Set(result.drafts.map((d) => d.path));
    const generated = new Set(pageFiles.map(([f]) => rel(f).replace(/\/index\.html$/, '') || '/'));
    const routes = new Set(['/', '/how-it-works', '/privacy', '/terms', '/guides', '/tools', '/100-calls']);
    for (const [file, html] of pageFiles) {
      for (const [, href] of html.matchAll(/href="(\/[^"#?]*)/g)) {
        const path = href.replace(/\/$/, '') || '/';
        const fromDraft = drafts.has(rel(file).replace(/\/index\.html$/, ''));
        if (!fromDraft) expect(drafts.has(path), `${rel(file)} -> ${path}`).toBe(false);
        if (routes.has(path) || generated.has(path)) continue;
        const f = join(PUBLIC, path);
        const ok = existsSync(f) && (statSync(f).isFile() || existsSync(join(f, 'index.html')));
        expect(ok, `${rel(file)} -> ${href}`).toBe(true);
      }
    }
  });

  it('keep drafts noindex and out of the hub and the sitemap', () => {
    const hub = result.files.get(join(PUBLIC, 'videos', 'index.html'))!;
    const urls = sitemap().map((e) => e.url);
    expect(result.drafts.map((d) => d.slug)).toEqual(Object.keys(config.draft));
    for (const d of result.drafts) {
      expect(result.files.get(join(PUBLIC, d.path.slice(1), 'index.html'))).toContain('<meta name="robots" content="noindex, follow" />');
      expect(hub).not.toContain(`href="${d.path}"`);
      expect(urls).not.toContain(`${SITE}${d.path}`);
    }
    for (const p of [...result.live, ...result.guides]) {
      expect(urls).toContain(`${SITE}${p.path}`);
      expect(result.files.get(join(PUBLIC, p.path.slice(1), 'index.html'))).not.toContain('noindex');
    }
    for (const p of result.live) expect(hub, p.path).toContain(`href="${p.path}"`);
  });

  it('give every video page its free resource link and the Biggify next steps', () => {
    for (const p of result.live) {
      const html = result.files.get(join(PUBLIC, p.path.slice(1), 'index.html'))!;
      expect(html, p.path).toContain('class="g-next-tool"');
      expect(html, p.path).toContain('class="g-next-dfy"');
    }
  });
});

describe('the shared SEO entities', () => {
  it('the generator uses the same host, Organization, Person and WebSite as lib/seo', () => {
    expect(gen.SITE).toBe(SITE);
    expect(gen.ORGANIZATION).toEqual(ORGANIZATION);
    expect(gen.PERSON).toEqual(PERSON);
    expect(gen.WEBSITE).toEqual(WEBSITE);
  });
});

describe('the video slot (public/videos/videos.js)', () => {
  it('lists every studio script once, with no ID yet', () => {
    expect(Object.keys(config.youtube).length).toBeGreaterThanOrEqual(60);
    for (const p of result.pages) for (const s of p.scripts ?? []) expect(config.youtube[s], `${p.slug}: ${s}`).toBeTruthy();
  });

  it('shows a player and a VideoObject once an ID is added, and nothing before', () => {
    const withId: VideoConfig = JSON.parse(JSON.stringify(config));
    withId.youtube['reviews-most-long'] = { id: 'abcDEF12345', uploaded: '2026-12-01', title: 'How I Get My Trade Businesses the Most Reviews Possible' };
    const html = build({ write: false, config: withId }).files.get(join(PUBLIC, 'videos', 'reviews-most', 'index.html'))!;
    expect(html).toContain('data-yt="abcDEF12345"');
    const video = jsonld(html)['@graph'].find((n) => n['@type'] === 'VideoObject')!;
    expect(video).toMatchObject({ name: 'How I Get My Trade Businesses the Most Reviews Possible', uploadDate: '2026-12-01', embedUrl: 'https://www.youtube-nocookie.com/embed/abcDEF12345' });
    expect(result.files.get(join(PUBLIC, 'videos', 'reviews-most', 'index.html'))).not.toContain('data-yt=');
  });

  it('refuses a malformed config or a bad ID', () => {
    expect(() => parseVideoConfig('var x = 1;')).toThrow();
    expect(() => parseVideoConfig('window.BIGGIFY_VIDEO_PAGES = { "youtube": { "a": { "id": "nope" } }, "draft": {} };')).toThrow(/YouTube ID/);
    expect(() => parseVideoConfig('window.BIGGIFY_VIDEO_PAGES = { "youtube": { "a": { "id": "", "uploaded": "Dec 1" } }, "draft": {} };')).toThrow(/uploaded/);
  });
});

describe('reading level (owner 2026-11-18: all marketing at a 3rd-grade reading level)', () => {
  it('uses the same Flesch-Kincaid math as Hubert and the Studio', () => {
    expect(gen.readingLevel('You miss a call. They call the next guy. He gets the job.').grade).toBeLessThanOrEqual(3);
    const hard = gen.readingLevel('Comprehensive reputation management dramatically increases organizational visibility across municipalities.');
    expect(hard.grade).toBeGreaterThan(8);
    expect(hard.hardWords).toContain('comprehensive');
    expect(gen.syllables('customer')).toBe(3);
    expect(gen.readingLevel(Array.from({ length: 18 }, () => 'go').join(' ') + '.').longSentences[0].words).toBe(18);
  });

  it('measures headings, lists and front-matter copy, without names, links or markdown', () => {
    const text = gen.pageReadingText({
      description: 'Call Biggify in Port Charlotte.',
      summary: 'See [the guide](/guides/x).',
      body: '## Who I am {#me}\n\n- **One thing**\n:::video some-video\n> **Tip** Keep it short',
    });
    expect(text).toBe('Call it in it. See the guide. Who I am. One thing. Tip Keep it short.');
  });

  it('reports every page; none is above grade 5 (that fails the build)', () => {
    expect(result.reading.length).toBe(result.pages.length);
    for (const r of result.reading) expect(r.grade, r.path).toBeLessThanOrEqual(gen.READING_MAX_GRADE + 1);
    expect(result.reading.filter((r) => r.tooHard)).toEqual([]);
    expect(gen.readingSummary(result.reading)).toMatch(/^Reading level/);
  });

  it('fails the build for a page above grade 5', () => {
    const hard = { ...result.pages[0], description: '', summary: '', card: '', resource: undefined, next: [], faq: [], body: 'Comprehensive reputation management dramatically increases organizational visibility across municipalities.' };
    const [r] = gen.readingReport([hard]);
    expect(r.tooHard).toBe(true);
  });

  it('fails the build for any sentence over 15 words, and every page is at grade 4 or under with none (rewritten 2026-11-18)', () => {
    expect(gen.READING_LONG_SENTENCES_FAIL).toBe(true);
    const long = { ...result.pages[0], body: Array.from({ length: 16 }, () => 'go').join(' ') + '.' };
    expect(gen.readingReport([long])[0].tooHard).toBe(true);
    for (const r of result.reading) {
      expect(r.longSentences, r.path).toEqual([]);
      expect(r.grade, r.path).toBeLessThanOrEqual(gen.READING_MAX_GRADE);
    }
  });
});

describe('the site serves /videos to everyone', () => {
  it('keeps /videos out of the login check and rewrites the folders to their pages', () => {
    expect(readFileSync(join(DASH, 'proxy.ts'), 'utf8')).toMatch(/\|videos\|/);
    expect(readFileSync(join(DASH, 'lib', 'supabase', 'middleware.ts'), 'utf8')).toContain("path.startsWith('/videos')");
    const next = readFileSync(join(DASH, 'next.config.ts'), 'utf8');
    expect(next).toContain('{ source: "/videos", destination: "/videos/index.html" }');
    expect(next).toContain('{ source: "/videos/:slug", destination: "/videos/:slug/index.html" }');
  });
});
