/**
 * Which files the site editor may touch. Paths are relative to the dashboard folder ("public/guides/x/index.html").
 *
 * The editor can only ever write:
 * - the HTML of a guide or free tool (public/guides/<slug>/index.html, public/tools/<slug>/index.html, or another
 *   .html file in that folder such as print.html),
 * - the two hub pages (public/guides/index.html, public/tools/index.html),
 * - photos it uploaded (public/guides/<slug>/photos/<name>.webp|jpg|png, same for tools).
 * Never CSS, JavaScript, the app's code or settings, and never anything outside public/guides and public/tools.
 */

export class EditorError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export const SECTIONS = ['guides', 'tools'] as const;
export type Section = (typeof SECTIONS)[number];

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

const HTML_FILE = /^public\/(?:guides|tools)\/(?:[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?\/)?[a-z0-9][a-z0-9-]{0,59}\.html$/;
const PHOTO_FILE =
  /^public\/(?:guides|tools)\/[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?\/photos\/[a-z0-9][a-z0-9-]{0,80}\.(?:webp|jpe?g|png)$/;

function basicOk(path: unknown): path is string {
  return (
    typeof path === 'string' &&
    path.length > 0 &&
    path.length <= 240 &&
    !path.includes('..') &&
    !path.includes('\\') &&
    !path.includes('//') &&
    !path.includes('\0') &&
    !path.startsWith('/') &&
    !/%/.test(path)
  );
}

/** May the editor write (or delete) this path? */
export function isWritable(path: unknown): path is string {
  return basicOk(path) && (HTML_FILE.test(path) || PHOTO_FILE.test(path));
}

export function isHtmlPath(path: string): boolean {
  return basicOk(path) && HTML_FILE.test(path);
}

export function isPhotoPath(path: string): boolean {
  return basicOk(path) && PHOTO_FILE.test(path);
}

/** May the editor read this path? Anything under public/guides or public/tools (for listing and previews). */
export function isReadable(path: unknown): path is string {
  return basicOk(path) && /^public\/(?:guides|tools)\//.test(path);
}

export function assertWritable(path: unknown): asserts path is string {
  if (!isWritable(path)) throw new EditorError("That file can't be changed from the editor.", 400);
}

export function assertReadable(path: unknown): asserts path is string {
  if (!isReadable(path)) throw new EditorError("That file can't be opened from the editor.", 400);
}

/**
 * The file behind a page address as the public site serves it: "guides" → public/guides/index.html,
 * "guides/still-no-calls" → public/guides/still-no-calls/index.html. Returns null for anything else.
 */
export function fileForPage(page: string): string | null {
  if (typeof page !== 'string') return null;
  const p = page.replace(/^\/+|\/+$/g, '');
  const parts = p.split('/');
  if (!SECTIONS.includes(parts[0] as Section)) return null;
  if (parts.length === 1) return `public/${parts[0]}/index.html`;
  if (parts.length === 2 && SLUG_RE.test(parts[1])) return `public/${parts[0]}/${parts[1]}/index.html`;
  if (parts.length === 3 && SLUG_RE.test(parts[1]) && /^[a-z0-9][a-z0-9-]{0,59}\.html$/.test(parts[2]) && parts[2] !== 'index.html') {
    return `public/${parts[0]}/${parts[1]}/${parts[2]}`;
  }
  return null;
}

/** The page address (as above) for a page's file, or null. */
export function pageForFile(path: string): string | null {
  const m = /^public\/(guides|tools)(?:\/([a-z0-9-]+))?\/([a-z0-9-]+\.html)$/.exec(path);
  if (!m) return null;
  const [, section, slug, file] = m;
  if (!slug) return file === 'index.html' ? section : null;
  return file === 'index.html' ? `${section}/${slug}` : `${section}/${slug}/${file}`;
}

/** The public URL path of a file in public/ ("public/guides/x/photos/a.webp" → "/guides/x/photos/a.webp"). */
export function publicUrl(path: string): string {
  return '/' + path.replace(/^public\//, '');
}

/** Make a URL-safe slug from a title. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/g, '');
}
