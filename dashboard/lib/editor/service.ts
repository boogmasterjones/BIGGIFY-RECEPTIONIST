/**
 * The site editor's operations, shared by its pages and API routes. Every function here assumes the caller already
 * checked the editor's sign-in (lib/editor/session.ts).
 */
import { randomBytes } from 'node:crypto';
import { githubSettings, storeMode } from './config';
import { InstallationTokens, StaticToken } from './github-auth';
import { applyOp, readMeta, versionOf, type EditOp } from './htmldoc';
import { addCardToIndex, buildGuideHtml, cleanGuideInput, templateParts, type NewGuideInput } from './newguide';
import { EditorError, SLUG_RE, assertWritable, fileForPage, pageForFile, publicUrl } from './paths';
import type { ContentStore } from './store';
import { GitHubStore } from './store-github';
import { LocalStore } from './store-local';

let cached: { key: string; store: ContentStore } | null = null;

/** The store for this server: GitHub when connected, local files on a developer's computer, otherwise none. */
export function getStore(): ContentStore | null {
  const mode = storeMode();
  if (mode === 'none') return null;
  const gh = githubSettings();
  const key = mode === 'github' && gh ? `gh:${gh.repo}:${gh.dir}:${gh.liveBranch}:${gh.draftsBranch}:${gh.appId ?? 'token'}` : `local:${process.cwd()}`;
  if (cached?.key === key) return cached.store;
  let store: ContentStore;
  if (mode === 'github' && gh) {
    const tokens = gh.token
      ? new StaticToken(gh.token)
      : new InstallationTokens({ appId: gh.appId!, privateKey: gh.privateKey!, installationId: gh.installationId, repo: gh.repo });
    store = new GitHubStore({ repo: gh.repo, dir: gh.dir, liveBranch: gh.liveBranch, draftsBranch: gh.draftsBranch, tokens });
  } else {
    store = new LocalStore(process.cwd());
  }
  cached = { key, store };
  return store;
}

export function requireStore(): ContentStore {
  const s = getStore();
  if (!s) throw new EditorError("The editor isn't connected to the website's storage yet. See docs/EDITOR_FOR_WYATT.md, Setup.", 503);
  return s;
}

export interface PageInfo {
  page: string;
  path: string;
  section: 'guides' | 'tools';
  title: string;
  isHub: boolean;
}

const cleanTitle = (t: string) => t.replace(/\s*\|\s*Biggify\s*$/i, '').trim();

/** Every guide and tool page (index.html files), with their titles. */
export async function listPages(store: ContentStore): Promise<PageInfo[]> {
  const out: PageInfo[] = [];
  for (const section of ['guides', 'tools'] as const) {
    const files = (await store.list(`public/${section}`)).filter((p) => /^public\/(?:guides|tools)\/(?:[a-z0-9-]+\/)?index\.html$/.test(p));
    const pages = await Promise.all(
      files.map(async (path) => {
        const html = (await store.read(path)) ?? '';
        const m = readMeta(html);
        const page = pageForFile(path)!;
        return { page, path, section, title: cleanTitle(m.h1 || m.title) || page, isHub: page === section } satisfies PageInfo;
      }),
    );
    pages.sort((a, b) => Number(b.isHub) - Number(a.isHub) || a.title.localeCompare(b.title));
    out.push(...pages);
  }
  return out;
}

export async function loadPage(store: ContentStore, page: string): Promise<{ path: string; html: string; version: string }> {
  const path = fileForPage(page);
  if (!path) throw new EditorError("That page isn't one the editor can open.", 404);
  const html = await store.read(path);
  if (html === null) throw new EditorError('That page was not found.', 404);
  return { path, html, version: versionOf(html) };
}

/** Apply one change to a page. The version must match what the editor was looking at. */
export async function savePage(store: ContentStore, page: string, version: string, op: EditOp): Promise<{ version: string }> {
  const { path, html, version: current } = await loadPage(store, page);
  if (version !== current) throw new EditorError('This page was changed somewhere else (another tab?). Reload the page, then make your change again.', 409);
  const next = applyOp(html, op);
  if (next === html) return { version: current };
  assertWritable(path);
  await store.write(path, next, `Site editor: edit ${page}`);
  return { version: versionOf(next) };
}

// ------------------------------------------------------------------------------------------------ photos

export const MAX_PHOTO_BYTES = 6 * 1024 * 1024;

/** The photo's real type from its first bytes (never from its name or what the browser claims). */
export function sniffImage(b: Uint8Array): 'webp' | 'jpg' | 'png' | null {
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png';
  return null;
}

/** Save an uploaded photo next to the page it is for; returns its public address. */
export async function savePhoto(store: ContentStore, page: string, bytes: Uint8Array, nameHint: string): Promise<{ src: string }> {
  const file = fileForPage(page);
  const m = file ? /^public\/(guides|tools)\/([a-z0-9-]+)\/index\.html$/.exec(file) : null;
  if (!m) throw new EditorError('Photos can only be added to a guide or a tool page.');
  if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) throw new EditorError('That photo is too big. Use one under 6 MB.');
  const ext = sniffImage(bytes);
  if (!ext) throw new EditorError('That file is not a JPEG, PNG or WebP photo.');
  const base = (nameHint || 'photo')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'photo';
  const path = `public/${m[1]}/${m[2]}/photos/${base}-${randomBytes(3).toString('hex')}.${ext}`;
  assertWritable(path);
  await store.write(path, bytes, `Site editor: photo for ${page}`);
  return { src: publicUrl(path) };
}

// ------------------------------------------------------------------------------------------------ new guide

const TEMPLATE_GUIDES = ['google-profile-changes', 'marketing-is-simple', 'still-no-calls'];

export async function createGuide(store: ContentStore, input: NewGuideInput): Promise<{ page: string }> {
  const files = await store.list('public/guides');
  const slugs = files.map((p) => /^public\/guides\/([a-z0-9-]+)\//.exec(p)?.[1]).filter((s): s is string => !!s);
  const existing = [...new Set(slugs)];
  const g = cleanGuideInput(input, existing);
  if (!SLUG_RE.test(g.slug)) throw new EditorError('That web address is not allowed.');

  let template: string | null = null;
  for (const t of [...TEMPLATE_GUIDES, ...existing]) {
    template = await store.read(`public/guides/${t}/index.html`);
    if (template) break;
  }
  if (!template) throw new EditorError('No existing guide to copy the design from.', 500);

  const indexPath = 'public/guides/index.html';
  const index = await store.read(indexPath);
  if (index === null) throw new EditorError('The guides page was not found.', 500);

  const html = buildGuideHtml(g, templateParts(template));
  const guidePath = `public/guides/${g.slug}/index.html`;
  assertWritable(guidePath);
  await store.write(guidePath, html, `Site editor: new guide ${g.slug}`);
  await store.write(indexPath, addCardToIndex(index, g), `Site editor: add ${g.slug} to the guides page`);
  return { page: `guides/${g.slug}` };
}
