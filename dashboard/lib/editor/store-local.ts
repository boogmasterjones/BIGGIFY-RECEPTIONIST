/**
 * Local mode (a developer's computer): the editor reads and writes the files in this folder directly. "Changes" are
 * what git sees as changed against the last commit in public/guides and public/tools; Undo restores the committed
 * version; Publish is simulated (nothing is committed or pushed).
 */
import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { assertReadable, assertWritable, isReadable, isWritable } from './paths';
import type { Change, ContentStore, PublishResult } from './store';

const run = promisify(execFile);
const ROOTS = ['public/guides', 'public/tools'];

export class LocalStore implements ContentStore {
  readonly mode = 'local' as const;
  private root: string;
  constructor(root: string = process.cwd()) {
    this.root = resolve(root);
  }

  private abs(path: string) {
    const p = resolve(join(this.root, ...path.split('/')));
    if (!p.startsWith(this.root + sep)) throw new Error('outside the site folder');
    return p;
  }

  private async git(args: string[], allowFail = false): Promise<string> {
    try {
      const { stdout } = await run('git', args, { cwd: this.root, maxBuffer: 20 * 1024 * 1024, windowsHide: true });
      return stdout;
    } catch (e) {
      if (allowFail) return '';
      throw e;
    }
  }

  async read(path: string) {
    assertReadable(path);
    try {
      return await readFile(this.abs(path), 'utf8');
    } catch {
      return null;
    }
  }

  async readBinary(path: string) {
    assertReadable(path);
    try {
      return new Uint8Array(await readFile(this.abs(path)));
    } catch {
      return null;
    }
  }

  async list(dir: string) {
    const d = dir.replace(/\/$/, '');
    assertReadable(d + '/');
    const out: string[] = [];
    const walk = async (abs: string) => {
      let entries;
      try {
        entries = await readdir(abs, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const p = join(abs, e.name);
        if (e.isDirectory()) await walk(p);
        else if (e.isFile() && !e.name.startsWith('.')) out.push(relative(this.root, p).split(sep).join('/'));
      }
    };
    await walk(this.abs(d));
    return out.sort();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- same signature as the GitHub store (no commits here)
  async write(path: string, content: string | Uint8Array, _message?: string) {
    assertWritable(path);
    await mkdir(dirname(this.abs(path)), { recursive: true });
    await writeFile(this.abs(path), content);
  }

  async readPublished(path: string) {
    assertReadable(path);
    try {
      return await this.git(['show', `HEAD:./${path}`]);
    } catch {
      return null;
    }
  }

  async changes(): Promise<Change[]> {
    const diff = await this.git(['diff', '--relative', '--name-status', '--no-renames', '-z', 'HEAD', '--', ...ROOTS], true);
    const added = await this.git(['ls-files', '--others', '--exclude-standard', '-z', '--', ...ROOTS], true);
    const changes: Change[] = [];
    const parts = diff.split('\0').filter(Boolean);
    for (let i = 0; i + 1 < parts.length; i += 2) {
      const code = parts[i];
      const path = parts[i + 1];
      if (!isReadable(path)) continue;
      changes.push({ path, status: code === 'A' ? 'added' : code === 'D' ? 'deleted' : 'modified' });
    }
    for (const path of added.split('\0').filter(Boolean)) if (isReadable(path)) changes.push({ path, status: 'added' });
    return changes.sort((a, b) => a.path.localeCompare(b.path));
  }

  async undo(path: string) {
    assertWritable(path);
    const tracked = (await this.git(['ls-files', '--', path], true)).trim();
    if (tracked) await this.git(['checkout', 'HEAD', '--', path]);
    else await rm(this.abs(path), { force: true });
  }

  async undoAll() {
    for (const c of await this.changes()) if (isWritable(c.path)) await this.undo(c.path).catch(() => {});
  }

  async publish(): Promise<PublishResult> {
    return { published: false, simulated: true, changes: await this.changes() };
  }
}
