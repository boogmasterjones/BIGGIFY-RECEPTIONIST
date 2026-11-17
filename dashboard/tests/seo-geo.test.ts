import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { buildGuideHtml, cleanGuideInput, templateParts } from '@/lib/editor/newguide';
import { BYLINE, clip, pageTitle } from '@/lib/seo/entities';
import { buildLlmsTxt } from '@/lib/seo/llms';
import { NAMED_CRAWLERS } from '@/lib/seo/robots';
import { SITE, staticPages } from '@/lib/seo/site-pages';

// SEO + GEO rules for every free guide and tool (owner 2026-11-16: "100% optimized SEO and GEO, without sacrificing the
// content"). Audit and scorecard: docs/SEO_GEO_AUDIT_2026-11-16.md.

const PUBLIC = join(__dirname, '..', 'public');
const pages = staticPages().filter((p) => !p.noindex);
const html = (path: string) => readFileSync(join(PUBLIC, path.slice(1), 'index.html'), 'utf8');
const text = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .replace(/ ([.,!?;:)])/g, '$1')
    .replace(/\( /g, '(')
    .trim();

type Node = Record<string, unknown> & { '@type': string | string[] };
function graph(path: string): Node[] {
  const blocks = [...html(path).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  expect(blocks, `${path}: one JSON-LD block`).toHaveLength(1);
  const j = JSON.parse(blocks[0][1]) as { '@context': string; '@graph': Node[] };
  expect(j['@context']).toBe('https://schema.org');
  return j['@graph'];
}
const ofType = (g: Node[], t: string) => g.filter((n) => ([] as string[]).concat(n['@type']).includes(t));

describe('every guide and tool page', () => {
  it('finds all of them (2 hubs, 17 guides, 13 tools)', () => {
    expect(pages.length).toBeGreaterThanOrEqual(32);
  });

  it('has a unique title of 60 characters or less and a unique description of 155 or less', () => {
    for (const p of pages) {
      expect(p.title.length, `${p.path} title "${p.title}"`).toBeLessThanOrEqual(60);
      expect(p.description.length, `${p.path} description`).toBeGreaterThanOrEqual(70);
      expect(p.description.length, `${p.path} description`).toBeLessThanOrEqual(155);
    }
    expect(new Set(pages.map((p) => p.title)).size).toBe(pages.length);
    expect(new Set(pages.map((p) => p.description)).size).toBe(pages.length);
  });

  it('has exactly one H1 and no H1 hidden in a second copy', () => {
    for (const p of pages) expect(html(p.path).match(/<h1[\s>]/g), p.path).toHaveLength(1);
  });

  it('has a canonical, og and twitter tags on www.gobiggify.com, and is indexable', () => {
    for (const p of pages) {
      const h = html(p.path);
      const url = `${SITE}${p.path}`;
      expect(h, p.path).toContain(`<link rel="canonical" href="${url}" />`);
      expect(h, p.path).toContain(`<meta property="og:url" content="${url}" />`);
      for (const k of ['og:type', 'og:title', 'og:description', 'og:image', 'og:site_name']) expect(h, `${p.path} ${k}`).toMatch(new RegExp(`<meta property="${k}" content="[^"]+" />`));
      expect(h, p.path).toContain('<meta name="twitter:card" content="summary" />');
      expect(h, p.path).not.toMatch(/<meta name="robots" content="[^"]*noindex/);
      // gobiggify.com without www 308-redirects to www; canonicals and schema must not point at a redirect.
      expect(h, p.path).not.toContain('https://gobiggify.com');
    }
  });

  it('gives every image a real alt text', () => {
    for (const p of pages) for (const img of html(p.path).match(/<img\b[^>]*>/g) ?? []) expect(img, p.path).toMatch(/alt="[^"]+"|aria-hidden="true"/);
  });

  it('names the author the same way on the page and in the schema: Wyatt, founder of Biggify, Port Charlotte FL', () => {
    for (const p of pages.filter((x) => x.section === 'guides' && !x.hub)) expect(html(p.path), p.path).toContain('By Wyatt, founder of Biggify, Port Charlotte FL');
    for (const p of pages) {
      const g = graph(p.path);
      const [person] = ofType(g, 'Person');
      const [org] = ofType(g, 'Organization');
      expect(person, p.path).toMatchObject({ '@id': `${SITE}/#wyatt`, name: 'Wyatt Brunderman', jobTitle: 'Founder', worksFor: { '@id': `${SITE}/#org` } });
      expect(org, p.path).toMatchObject({ '@id': `${SITE}/#org`, name: 'Biggify', url: `${SITE}/`, address: { addressLocality: 'Port Charlotte', addressRegion: 'FL' } });
      // sameAs only with real profile links (none confirmed yet); never a placeholder.
      for (const u of (org.sameAs as string[] | undefined) ?? []) expect(u).toMatch(/^https:\/\/(www\.)?(facebook|instagram|youtube|linkedin|google)\.com\/.+/);
    }
  });

  it('has valid JSON-LD: a main node by Wyatt for Biggify, breadcrumbs ending on the page, no dates, no ratings', () => {
    for (const p of pages) {
      const g = graph(p.path);
      const url = `${SITE}${p.path}`;
      const main = [...ofType(g, 'Article'), ...ofType(g, 'WebPage'), ...ofType(g, 'CollectionPage')];
      expect(main, p.path).toHaveLength(1);
      expect(main[0], p.path).toMatchObject({ author: { '@id': `${SITE}/#wyatt` }, publisher: { '@id': `${SITE}/#org` } });
      if (ofType(g, 'Article').length) expect(String(main[0].headline).length, `${p.path} headline`).toBeLessThanOrEqual(110);
      const [crumbs] = ofType(g, 'BreadcrumbList');
      const items = crumbs.itemListElement as { position: number; item: string }[];
      expect(items[0].item).toBe(`${SITE}/`);
      expect(items.at(-1)!.item, p.path).toBe(url);
      items.forEach((it, i) => expect(it.position).toBe(i + 1));
      const raw = JSON.stringify(g);
      // Guides never show a date (owner rule), in the page or in the schema. No ratings or reviews in schema at all.
      expect(raw, p.path).not.toMatch(/"date(Published|Modified|Created)"/);
      expect(raw, p.path).not.toMatch(/aggregateRating|"Review"/);
    }
  });

  it('only has FAQPage schema for the questions actually shown on the page, word for word', () => {
    for (const p of pages) {
      const h = html(p.path);
      const [faq] = ofType(graph(p.path), 'FAQPage');
      const box = /<div class="g-faq">([\s\S]*?)<\/div>\s*<\/section>/.exec(h);
      const visible = box ? [...box[1].matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)].map((m) => ({ q: text(m[1]), a: text(m[2]) })) : [];
      if (!visible.length) {
        expect(faq, `${p.path} has FAQ schema but no visible FAQ`).toBeUndefined();
        continue;
      }
      const schema = (faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[]).map((q) => ({ q: q.name, a: q.acceptedAnswer.text }));
      expect(schema, p.path).toEqual(visible);
    }
  });

  it('only marks a page HowTo when it lists real steps', () => {
    for (const p of pages) {
      for (const howto of ofType(graph(p.path), 'HowTo')) {
        const steps = howto.step as { '@type': string; name: string; text: string }[];
        expect(steps.length, p.path).toBeGreaterThanOrEqual(3);
        for (const s of steps) expect(s['@type']).toBe('HowToStep');
      }
    }
  });

  it('has no orphans: each hub links every page in it, and each page gets a link from another guide or tool', () => {
    const guideHub = html('/guides');
    const toolHub = html('/tools');
    const items = pages.filter((p) => !p.hub);
    for (const p of items) {
      const hub = p.section === 'guides' ? guideHub : toolHub;
      expect(hub, `${p.path} missing from its hub`).toContain(`href="${p.path}"`);
      const inbound = items.filter((o) => o.path !== p.path && new RegExp(`href="${p.path}(?:[#?"])`).test(html(o.path)));
      expect(inbound.length, `${p.path} has no link from another guide or tool`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('thank-you and print pages', () => {
  it('stay out of the index', () => {
    for (const section of ['guides', 'tools'])
      for (const d of readdirSync(join(PUBLIC, section), { withFileTypes: true }).filter((x) => x.isDirectory()))
        for (const f of ['thanks.html', 'print.html']) {
          const file = join(PUBLIC, section, d.name, f);
          if (existsSync(file)) expect(readFileSync(file, 'utf8'), `${section}/${d.name}/${f}`).toMatch(/<meta name="robots" content="[^"]*noindex/);
        }
  });
});

describe('sitemap.xml, robots.txt and llms.txt', () => {
  it('sitemap lists the home page and every guide and tool on www, and nothing twice', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain(`${SITE}/`);
    for (const p of pages) expect(urls).toContain(`${SITE}${p.path}`);
    expect(new Set(urls).size).toBe(urls.length);
    for (const u of urls) expect(u.startsWith(SITE)).toBe(true);
    expect(urls.some((u) => /thanks|print/.test(u))).toBe(false);
  });

  it('robots.txt lets everyone, the AI answer crawlers by name, read the guides and tools, and points at the sitemap', () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    for (const rule of rules) {
      expect(rule.allow).toBe('/');
      for (const d of ([] as string[]).concat(rule.disallow ?? [])) expect(['/guides', '/tools', '/'].some((pub) => d === pub || pub.startsWith(d))).toBe(false);
    }
    const named = rules.flatMap((rule) => ([] as string[]).concat(rule.userAgent ?? []));
    for (const bot of ['GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended']) expect(named).toContain(bot);
    expect(NAMED_CRAWLERS.length).toBeGreaterThan(5);
    expect(r.sitemap).toBe(`${SITE}/sitemap.xml`);
  });

  it('llms.txt lists every guide and tool with its one-line description', () => {
    const txt = buildLlmsTxt();
    expect(txt.startsWith('# Biggify\n')).toBe(true);
    for (const p of pages.filter((x) => !x.hub)) expect(txt).toContain(`(${SITE}${p.path}): ${p.description}`);
  });

  it('the login check never runs on the crawler files', () => {
    const proxy = readFileSync(join(__dirname, '..', 'proxy.ts'), 'utf8');
    const matcher = new RegExp(`^${/'(\/\(\(\?![^']+)'/.exec(proxy)![1].replace(/\\\\/g, '\\')}$`);
    for (const path of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/guides/still-no-calls', '/tools/xray']) expect(matcher.test(path), path).toBe(false);
    expect(matcher.test('/home')).toBe(true);
  });
});

describe('a guide made with the site editor', () => {
  it('comes out with the same SEO basics as the hand-built guides', () => {
    const long = 'How to keep every single customer happy when the job runs late and the weather turns bad on you';
    const g = cleanGuideInput({ title: long, topic: 'Customers', description: 'A long description. '.repeat(12), intro: '', sections: [{ heading: 'First', body: 'Do this.' }] }, []);
    const h = buildGuideHtml(g, templateParts(readFileSync(join(PUBLIC, 'guides', 'still-no-calls', 'index.html'), 'utf8')));
    const title = /<title>([^<]*)<\/title>/.exec(h)![1];
    const desc = /<meta name="description" content="([^"]*)"/.exec(h)![1];
    expect(title.length).toBeLessThanOrEqual(60);
    expect(desc.length).toBeLessThanOrEqual(155);
    expect(h).toContain(`<link rel="canonical" href="${SITE}/guides/${g.slug}" />`);
    expect(h).toContain('<meta name="twitter:card" content="summary" />');
    expect(h).toContain(BYLINE);
    expect(h).not.toContain('https://gobiggify.com');
    const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(h)![1]) as { '@graph': Node[] };
    expect(ofType(ld['@graph'], 'Article')[0]).toMatchObject({ author: { '@id': `${SITE}/#wyatt` }, publisher: { '@id': `${SITE}/#org` } });
    expect(ofType(ld['@graph'], 'Person')).toHaveLength(1);
  });

  it('titles and descriptions are cut at a word, never mid-word', () => {
    expect(pageTitle('Short title')).toBe('Short title | Biggify');
    expect(clip('one two three four', 9)).toBe('one two');
    expect(clip('First sentence here. Second one is longer than the limit allows.', 30)).toBe('First sentence here.');
  });
});
