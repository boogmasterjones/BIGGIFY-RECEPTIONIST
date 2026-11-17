import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The public pages search engines and AI answer engines should find (owner 2026-11-16: "100% optimized SEO and GEO").
// The guides and free tools are plain pages in public/guides and public/tools; this reads them straight from disk at build
// time, so sitemap.xml and llms.txt list a new page as soon as its folder has an index.html (no list to keep in sync).

export { SITE } from './site';

/** App pages that are public and worth indexing (the rest of the app sits behind the login). */
export const APP_PAGES = ['/', '/how-it-works', '/privacy', '/terms'] as const;

export type StaticPage = {
  /** Address on the site, e.g. /guides/still-no-calls */
  path: string;
  section: 'guides' | 'tools';
  hub: boolean;
  title: string;
  description: string;
  h1: string;
  noindex: boolean;
};

// Only read while building: sitemap.xml and llms.txt are static files made at build time, so the server bundle doesn't need
// these folders (the ignore comment stops the build from tracing the whole project into it).
const DIRS = {
  guides: join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'guides'),
  tools: join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'tools'),
} as const;

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

/** Reads one page's title, meta description, first H1 and robots flag. */
export function readStaticPage(file: string, path: string, section: 'guides' | 'tools', hub: boolean): StaticPage {
  const html = readFileSync(file, 'utf8');
  const title = decode(/<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? '');
  const description = decode(/<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '');
  const h1 = decode(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? '');
  const noindex = /<meta name="robots" content="[^"]*noindex/i.test(html);
  return { path, section, hub, title, description, h1, noindex };
}

/** Every guide and tool page (hubs first), read from public/. Thank-you and print pages are not folders' index.html, so they're never listed. */
export function staticPages(): StaticPage[] {
  const out: StaticPage[] = [];
  for (const section of ['guides', 'tools'] as const) {
    const dir = DIRS[section];
    out.push(readStaticPage(join(dir, 'index.html'), `/${section}`, section, true));
    const slugs = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, 'index.html')))
      .map((d) => d.name)
      .sort();
    for (const slug of slugs) out.push(readStaticPage(join(dir, slug, 'index.html'), `/${section}/${slug}`, section, false));
  }
  return out;
}

/** Indexable guide and tool pages only. */
export const indexablePages = () => staticPages().filter((p) => !p.noindex);

/** The page title without the " | Biggify" ending, for lists. */
export const shortTitle = (title: string) => title.replace(/\s*\|\s*Biggify$/, '');
