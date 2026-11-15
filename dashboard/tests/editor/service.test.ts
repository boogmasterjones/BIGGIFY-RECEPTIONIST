import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findEditables, parseDoc, versionOf } from '@/lib/editor/htmldoc';
import { addCardToIndex, buildGuideHtml, cleanGuideInput, templateParts, CARD_MARKER } from '@/lib/editor/newguide';
import { createGuide, listPages, savePage, savePhoto, sniffImage } from '@/lib/editor/service';
import { LocalStore } from '@/lib/editor/store-local';
import { GitHubStore, clearGitHubCaches } from '@/lib/editor/store-github';

const GUIDE = `<!DOCTYPE html><html><head><title>A guide | Biggify</title><meta name="description" content="d" /></head><body>
<header><nav><a class="logo" href="/">Biggify</a></nav></header>
<main id="main">
  <h1>A guide</h1>
  <p>Hello there.</p>
  <div class="g-share-btns"><a class="g-btn" href="#" data-share="copy"><span>Copy link</span></a></div>
  <div class="g-end g-next"><h2>Your next steps</h2><div class="g-next-tool"><p>Get the X-Ray</p></div><div class="g-sign"><b>Wyatt</b></div></div>
  <section class="g-more"><h2>More guides</h2></section>
</main>
<footer><p>&copy; Biggify LLC</p></footer>
</body></html>
`;
const INDEX = `<html><head><title>Guides</title></head><body><main><div class="g-cards">
    <a class="g-card" href="/guides/a-guide"><h3>A guide</h3></a>
    ${CARD_MARKER}
  </div></main></body></html>`;

function site() {
  const dir = mkdtempSync(join(tmpdir(), 'editor-'));
  mkdirSync(join(dir, 'public', 'guides', 'a-guide'), { recursive: true });
  mkdirSync(join(dir, 'public', 'tools'), { recursive: true });
  writeFileSync(join(dir, 'public', 'guides', 'a-guide', 'index.html'), GUIDE);
  writeFileSync(join(dir, 'public', 'guides', 'index.html'), INDEX);
  writeFileSync(join(dir, 'public', 'guides', 'guide.css'), 'body{}');
  return dir;
}

describe('local mode (a developer computer)', () => {
  it('saves an edit straight into the file', async () => {
    const dir = site();
    const store = new LocalStore(dir);
    const file = join(dir, 'public', 'guides', 'a-guide', 'index.html');
    const idx = findEditables(parseDoc(GUIDE)).findIndex((e) => e.tag === 'p');
    const r = await savePage(store, 'guides/a-guide', versionOf(GUIDE), { type: 'text', index: idx, html: 'Changed <em>here</em>.' });
    const now = readFileSync(file, 'utf8');
    expect(now).toContain('<p>Changed <em>here</em>.</p>');
    expect(r.version).toBe(versionOf(now));
  });

  it('refuses a save made on an older version of the page', async () => {
    const store = new LocalStore(site());
    await expect(savePage(store, 'guides/a-guide', 'stale', { type: 'text', index: 0, html: 'x' })).rejects.toMatchObject({ status: 409 });
  });

  it('refuses pages it may not edit', async () => {
    const store = new LocalStore(site());
    await expect(savePage(store, '../app', 'v', { type: 'text', index: 0, html: 'x' })).rejects.toMatchObject({ status: 404 });
    await expect(store.write('public/guides/guide.css', 'x', 'm')).rejects.toThrow();
    await expect(store.write('public/guides/../../evil.html', 'x', 'm')).rejects.toThrow();
  });

  it('lists the pages with titles', async () => {
    const pages = await listPages(new LocalStore(site()));
    expect(pages.map((p) => [p.page, p.title])).toEqual([
      ['guides', 'Guides'],
      ['guides/a-guide', 'A guide'],
    ]);
  });

  it('saves real photos only, next to their page', async () => {
    const dir = site();
    const store = new LocalStore(dir);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const { src } = await savePhoto(store, 'guides/a-guide', png, 'My Van!.PNG');
    expect(src).toMatch(/^\/guides\/a-guide\/photos\/my-van-[0-9a-f]{6}\.png$/);
    expect(existsSync(join(dir, 'public', src))).toBe(true);
    await expect(savePhoto(store, 'guides/a-guide', new TextEncoder().encode('<svg onload=alert(1)>'), 'x.png')).rejects.toThrow(/not a JPEG/);
    await expect(savePhoto(store, 'guides', png, 'x.png')).rejects.toThrow();
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpg');
  });

  it('makes a new guide from the existing design and adds its card', async () => {
    const dir = site();
    const store = new LocalStore(dir);
    const { page } = await createGuide(store, {
      title: 'Ten <script>alert(1)</script> review tips',
      topic: 'Reviews',
      description: 'A short description of the new guide for Google.',
      intro: 'Intro text & more.',
      sections: [{ heading: 'First part', body: 'Para one.\n\nPara two.\n\n- a\n- b' }],
    });
    expect(page).toBe('guides/ten-alert-1-review-tips');
    const html = readFileSync(join(dir, 'public', 'guides', 'ten-alert-1-review-tips', 'index.html'), 'utf8');
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('<h1>Ten alert(1) review tips</h1>');
    expect(html).toContain('<p>Intro text &amp; more.</p>'.replace('<p>', '<p class="g-lead">'));
    expect(html).toContain('<ul>');
    expect(html).toContain('<a class="logo" href="/">Biggify</a>'); // header copied from the existing guide
    expect(html).toContain('&copy; Biggify LLC');
    expect(html).toContain('g-next-tool');
    expect(findEditables(parseDoc(html)).length).toBeGreaterThan(5);
    const index = readFileSync(join(dir, 'public', 'guides', 'index.html'), 'utf8');
    expect(index).toContain('href="/guides/ten-alert-1-review-tips"');
    expect(index.indexOf('ten-alert-1-review-tips')).toBeLessThan(index.indexOf(CARD_MARKER));
    await expect(
      createGuide(store, { title: 'Ten alert 1 review tips', topic: '', description: 'Another description that is long enough.', intro: '', sections: [{ heading: 'x', body: 'y' }] }),
    ).rejects.toThrow(/already a guide/);
  });
});

describe('new guide pieces', () => {
  it('needs a title, description and a section', () => {
    expect(() => cleanGuideInput({ title: '', topic: '', description: '', intro: '', sections: [] }, [])).toThrow();
    expect(() => cleanGuideInput({ title: 'Good title', topic: '', description: 'short', intro: '', sections: [{ heading: 'a', body: 'b' }] }, [])).toThrow(/description/);
  });
  it('keeps structured data safe from </script>', () => {
    const g = cleanGuideInput({ title: 'x </script><script>alert(1)', topic: '', description: 'A description </script> long enough', intro: '', sections: [{ heading: 'a', body: 'b' }] }, []);
    const html = buildGuideHtml(g, templateParts(GUIDE));
    expect(html.match(/<script/g)?.length).toBe(2); // the JSON-LD block and guide.js only
  });
  it('adds the card once', () => {
    const g = { slug: 'new-one', topic: 'T', title: 'New', description: 'D' };
    const once = addCardToIndex(INDEX, g);
    expect(addCardToIndex(once, g)).toBe(once);
  });
});

// ------------------------------------------------------------------------------------------------ GitHub mode

interface Call {
  method: string;
  url: string;
  body?: Record<string, unknown>;
}

function fakeGitHub(files: Record<string, string>) {
  const calls: Call[] = [];
  const blobs = new Map<string, string>();
  const tree = Object.entries(files).map(([path, content], i) => {
    const sha = `blob${i}`;
    blobs.set(sha, content);
    return { path, sha, type: 'blob' };
  });
  const refs: Record<string, string> = { main: 'c-main' };
  const fetchFn = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url, body });
    const p = url.replace('https://api.github.com/repos/o/r', '');
    const ok = (j: unknown, status = 200) => new Response(JSON.stringify(j), { status, headers: { 'Content-Type': 'application/json' } });
    let m: RegExpMatchArray | null;
    if ((m = p.match(/^\/git\/ref\/heads\/(.+)$/))) return refs[m[1]] ? ok({ object: { sha: refs[m[1]] } }) : ok({}, 404);
    if (p === '/git/refs' && method === 'POST') {
      refs[String(body.ref).replace('refs/heads/', '')] = body.sha;
      return ok({}, 201);
    }
    if ((m = p.match(/^\/git\/refs\/heads\/(.+)$/)) && method === 'PATCH') {
      refs[m[1]] = body.sha;
      return ok({});
    }
    if (p.startsWith('/git/trees/')) return ok({ tree });
    if ((m = p.match(/^\/git\/blobs\/(.+)$/))) return ok({ content: Buffer.from(blobs.get(m[1]) ?? '').toString('base64'), encoding: 'base64' });
    if (p.startsWith('/contents/') && method === 'PUT') {
      refs[body.branch] = `c-${calls.length}`;
      return ok({ commit: { sha: refs[body.branch] } });
    }
    if (p.startsWith('/compare/')) return ok({ ahead_by: 1, behind_by: 0, files: [{ filename: 'dashboard/public/guides/a-guide/index.html', status: 'modified' }, { filename: 'server/index.js', status: 'modified' }] });
    if (p === '/merges') return ok({ sha: 'c-merged' }, 201);
    return ok({ message: 'nope' }, 404);
  }) as typeof fetch;
  return { fetchFn, calls, refs };
}

describe('GitHub mode (gobiggify.com)', () => {
  const make = (f: ReturnType<typeof fakeGitHub>) =>
    new GitHubStore({ repo: 'o/r', dir: 'dashboard', liveBranch: 'main', draftsBranch: 'site-drafts', tokens: { token: async () => 't0ken' }, fetch: f.fetchFn });

  it('saves to the drafts branch, inside the dashboard folder, never to main', async () => {
    clearGitHubCaches();
    const gh = fakeGitHub({ 'dashboard/public/guides/a-guide/index.html': GUIDE, 'dashboard/public/guides/index.html': INDEX });
    const store = make(gh);
    const idx = findEditables(parseDoc(GUIDE)).findIndex((e) => e.tag === 'p');
    await savePage(store, 'guides/a-guide', versionOf(GUIDE), { type: 'text', index: idx, html: 'From GitHub mode' });
    const put = gh.calls.find((c) => c.method === 'PUT')!;
    expect(put.url).toBe('https://api.github.com/repos/o/r/contents/dashboard/public/guides/a-guide/index.html');
    expect(put.body!.branch).toBe('site-drafts');
    expect(Buffer.from(String(put.body!.content), 'base64').toString('utf8')).toContain('<p>From GitHub mode</p>');
    expect(gh.calls.some((c) => c.method !== 'GET' && JSON.stringify(c.body ?? {}).includes('"branch":"main"'))).toBe(false);
  });

  it('lists only guide/tool changes and publishes with one merge into main', async () => {
    clearGitHubCaches();
    const gh = fakeGitHub({ 'dashboard/public/guides/a-guide/index.html': GUIDE });
    gh.refs['site-drafts'] = 'c-drafts';
    const store = make(gh);
    expect(await store.changes()).toEqual([{ path: 'public/guides/a-guide/index.html', status: 'modified' }]);
    const r = await store.publish('Publish');
    expect(r.published).toBe(true);
    const merge = gh.calls.find((c) => c.url.endsWith('/merges'))!;
    expect(merge.body).toMatchObject({ base: 'main', head: 'site-drafts' });
  });

  it('refuses to write code or settings', async () => {
    const store = make(fakeGitHub({}));
    await expect(store.write('../server/index.js', 'x', 'm')).rejects.toThrow();
    await expect(store.write('public/guides/guide.css', 'x', 'm')).rejects.toThrow();
  });

  it("never passes GitHub's own error text to the browser", async () => {
    clearGitHubCaches();
    const store = new GitHubStore({
      repo: 'o/r',
      dir: 'dashboard',
      liveBranch: 'main',
      draftsBranch: 'site-drafts',
      tokens: { token: async () => 't' },
      fetch: (async () => new Response(JSON.stringify({ message: 'Bad credentials ghp_secret' }), { status: 401 })) as typeof fetch,
    });
    await expect(store.read('public/guides/index.html')).rejects.toThrow(/did not answer as expected/);
    await expect(store.read('public/guides/index.html')).rejects.not.toThrow(/ghp_secret/);
  });
});
