/**
 * gobiggify.com storage: the GitHub repository, through the GitHub REST API.
 *
 * - Every save is a commit on the drafts branch (default "site-drafts"). The live branch (default "main") is untouched,
 *   so the live site does not change (dashboard/vercel.json also tells Vercel not to build the drafts branch).
 * - "What's changed" is GitHub's comparison of live...drafts.
 * - Publish merges drafts into live with one merge commit: Vercel builds once per publish. Drafts then moves up to
 *   the merge, ready for the next edits.
 * - The app lives in a folder of the repository (EDITOR_GITHUB_DIR, default "dashboard"); paths are mapped to and
 *   from it here, and only paths under that folder's public/guides and public/tools are ever touched.
 */
import type { Fetch, TokenSource } from './github-auth';
import { EditorError, assertReadable, assertWritable, isReadable } from './paths';
import type { Change, ContentStore, PublishResult } from './store';

export interface GitHubStoreOptions {
  repo: string;
  dir: string;
  liveBranch: string;
  draftsBranch: string;
  tokens: TokenSource;
  fetch?: Fetch;
}

interface TreeEntry {
  path: string;
  sha: string;
  type: string;
}

const API = 'https://api.github.com';
const blobCache = new Map<string, Uint8Array>();
const treeCache = new Map<string, Map<string, TreeEntry>>();

function remember<K, V>(map: Map<K, V>, k: K, v: V, max: number) {
  if (map.size >= max) map.delete(map.keys().next().value as K);
  map.set(k, v);
}

const enc = (path: string) => path.split('/').map(encodeURIComponent).join('/');
const toB64 = (c: string | Uint8Array) => Buffer.from(typeof c === 'string' ? Buffer.from(c, 'utf8') : c).toString('base64');

export class GitHubStore implements ContentStore {
  readonly mode = 'github' as const;
  private fetchFn: Fetch;
  private heads = new Map<string, string | null>();
  private prefix: string;

  constructor(private o: GitHubStoreOptions) {
    this.fetchFn = o.fetch ?? globalThis.fetch;
    this.prefix = o.dir ? o.dir.replace(/\/+$/, '') + '/' : '';
  }

  private repoPath(path: string) {
    return this.prefix + path;
  }

  private sitePath(repoPath: string): string | null {
    if (!repoPath.startsWith(this.prefix)) return null;
    return repoPath.slice(this.prefix.length);
  }

  private async api<T = unknown>(method: string, path: string, body?: unknown, okStatuses: number[] = []): Promise<{ status: number; json: T }> {
    let token: string;
    try {
      token = await this.o.tokens.token();
    } catch {
      throw new EditorError("The editor can't reach the website's storage (GitHub sign-in failed). Check the editor settings in Vercel.", 502);
    }
    const r = await this.fetchFn(`${API}/repos/${this.o.repo}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'biggify-site-editor',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    const json = (r.status === 204 ? null : await r.json().catch(() => null)) as T;
    if (!r.ok && !okStatuses.includes(r.status)) {
      // GitHub's own message never reaches the browser; the status is enough to tell what happened.
      const clash = r.status === 409 || r.status === 422;
      throw new EditorError(
        clash
          ? 'Someone else changed the same thing at the same time. Reload and try again.'
          : `The website's storage (GitHub) did not answer as expected (status ${r.status}). Try again in a minute.`,
        clash ? 409 : 502,
      );
    }
    return { status: r.status, json };
  }

  private async head(branch: string, fresh = false): Promise<string | null> {
    if (!fresh && this.heads.has(branch)) return this.heads.get(branch)!;
    const { status, json } = await this.api<{ object: { sha: string } }>('GET', `/git/ref/heads/${enc(branch)}`, undefined, [404]);
    const sha = status === 404 ? null : json.object.sha;
    this.heads.set(branch, sha);
    return sha;
  }

  private async liveHead(): Promise<string> {
    const sha = await this.head(this.o.liveBranch);
    if (!sha) throw new EditorError(`The live branch "${this.o.liveBranch}" was not found.`, 500);
    return sha;
  }

  private async draftsHead(): Promise<string> {
    const sha = await this.head(this.o.draftsBranch);
    if (sha) return sha;
    const live = await this.liveHead();
    await this.api('POST', '/git/refs', { ref: `refs/heads/${this.o.draftsBranch}`, sha: live });
    this.heads.set(this.o.draftsBranch, live);
    return live;
  }

  private lastSync = 0;

  /**
   * When the drafts hold nothing unpublished but the live branch has moved on (someone published code or content
   * another way), move the drafts up to live first, so edits start from the newest page and Publish never clashes.
   */
  private async sync(): Promise<void> {
    if (Date.now() - this.lastSync < 20_000) return;
    this.lastSync = Date.now();
    const drafts = await this.head(this.o.draftsBranch, true);
    const live = await this.head(this.o.liveBranch, true);
    if (!drafts || !live || drafts === live) return;
    const { json } = await this.api<{ ahead_by?: number; behind_by?: number }>(
      'GET',
      `/compare/${enc(this.o.liveBranch)}...${enc(this.o.draftsBranch)}`,
    );
    if (json.ahead_by === 0 && (json.behind_by ?? 0) > 0) {
      await this.api('PATCH', `/git/refs/heads/${enc(this.o.draftsBranch)}`, { sha: live, force: false }, [422]);
      this.heads.set(this.o.draftsBranch, live);
    }
  }

  private async readHead(): Promise<string> {
    await this.sync();
    return (await this.head(this.o.draftsBranch)) ?? (await this.liveHead());
  }

  private async tree(commit: string): Promise<Map<string, TreeEntry>> {
    const hit = treeCache.get(commit);
    if (hit) return hit;
    const { json } = await this.api<{ tree: TreeEntry[] }>('GET', `/git/trees/${commit}?recursive=1`);
    const map = new Map(json.tree.filter((e) => e.type === 'blob').map((e) => [e.path, e]));
    remember(treeCache, commit, map, 20);
    return map;
  }

  private async blob(sha: string): Promise<Uint8Array> {
    const hit = blobCache.get(sha);
    if (hit) return hit;
    const { json } = await this.api<{ content: string; encoding: string }>('GET', `/git/blobs/${sha}`);
    const bytes = new Uint8Array(Buffer.from(json.content, json.encoding === 'base64' ? 'base64' : 'utf8'));
    remember(blobCache, sha, bytes, 300);
    return bytes;
  }

  private async fileAt(commit: string, path: string): Promise<Uint8Array | null> {
    const e = (await this.tree(commit)).get(this.repoPath(path));
    return e ? this.blob(e.sha) : null;
  }

  async read(path: string) {
    assertReadable(path);
    const b = await this.fileAt(await this.readHead(), path);
    return b ? Buffer.from(b).toString('utf8') : null;
  }

  async readBinary(path: string) {
    assertReadable(path);
    return this.fileAt(await this.readHead(), path);
  }

  async list(dir: string) {
    const d = dir.endsWith('/') ? dir : dir + '/';
    assertReadable(d);
    const prefix = this.repoPath(d);
    return [...(await this.tree(await this.readHead())).keys()]
      .filter((p) => p.startsWith(prefix))
      .map((p) => this.sitePath(p)!)
      .sort();
  }

  private async put(path: string, content: string | Uint8Array, message: string) {
    const drafts = await this.draftsHead();
    const existing = (await this.tree(drafts)).get(this.repoPath(path));
    const { json } = await this.api<{ commit: { sha: string } }>('PUT', `/contents/${enc(this.repoPath(path))}`, {
      message,
      content: toB64(content),
      branch: this.o.draftsBranch,
      ...(existing ? { sha: existing.sha } : {}),
    });
    this.heads.set(this.o.draftsBranch, json.commit.sha);
  }

  private async del(path: string, message: string) {
    const drafts = await this.draftsHead();
    const existing = (await this.tree(drafts)).get(this.repoPath(path));
    if (!existing) return;
    const { json } = await this.api<{ commit: { sha: string } }>('DELETE', `/contents/${enc(this.repoPath(path))}`, {
      message,
      sha: existing.sha,
      branch: this.o.draftsBranch,
    });
    this.heads.set(this.o.draftsBranch, json.commit.sha);
  }

  async write(path: string, content: string | Uint8Array, message: string) {
    assertWritable(path);
    // Always start from the newest drafts commit, so two browser tabs (or two server instances) can't undo each other.
    await this.sync();
    await this.head(this.o.draftsBranch, true);
    await this.put(path, content, message);
  }

  async readPublished(path: string) {
    assertReadable(path);
    const b = await this.fileAt(await this.liveHead(), path);
    return b ? Buffer.from(b).toString('utf8') : null;
  }

  async changes(): Promise<Change[]> {
    const drafts = await this.head(this.o.draftsBranch, true);
    if (!drafts) return [];
    const live = await this.head(this.o.liveBranch, true);
    if (!live || drafts === live) return [];
    const { json } = await this.api<{ files?: { filename: string; status: string }[] }>(
      'GET',
      `/compare/${enc(this.o.liveBranch)}...${enc(this.o.draftsBranch)}`,
    );
    const out: Change[] = [];
    for (const f of json.files ?? []) {
      const p = this.sitePath(f.filename);
      if (!p || !isReadable(p)) continue;
      out.push({ path: p, status: f.status === 'added' ? 'added' : f.status === 'removed' ? 'deleted' : 'modified' });
    }
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }

  async undo(path: string) {
    assertWritable(path);
    await this.head(this.o.draftsBranch, true);
    const live = await this.fileAt(await this.liveHead(), path);
    if (live) await this.put(path, live, `Site editor: undo changes to ${path}`);
    else await this.del(path, `Site editor: undo (remove new file) ${path}`);
  }

  async undoAll() {
    const live = await this.head(this.o.liveBranch, true);
    if (!live || !(await this.head(this.o.draftsBranch, true))) return;
    await this.api('PATCH', `/git/refs/heads/${enc(this.o.draftsBranch)}`, { sha: live, force: true });
    this.heads.set(this.o.draftsBranch, live);
  }

  async publish(message: string): Promise<PublishResult> {
    const changes = await this.changes();
    if (changes.length === 0) return { published: false, simulated: false, changes };
    const { status, json } = await this.api<{ sha: string } | null>(
      'POST',
      '/merges',
      { base: this.o.liveBranch, head: this.o.draftsBranch, commit_message: message },
      [409],
    );
    if (status === 409) {
      throw new EditorError('The live site changed in a way that clashes with these drafts. Ask Claude to merge the "site-drafts" branch by hand.', 409);
    }
    if (status === 204 || !json) return { published: false, simulated: false, changes: [] };
    await this.api('PATCH', `/git/refs/heads/${enc(this.o.draftsBranch)}`, { sha: json.sha, force: false }, [422]);
    this.heads.set(this.o.liveBranch, json.sha);
    this.heads.set(this.o.draftsBranch, json.sha);
    return { published: true, simulated: false, changes, commit: json.sha };
  }
}

/** For tests. */
export function clearGitHubCaches() {
  blobCache.clear();
  treeCache.clear();
}
