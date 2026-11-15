/**
 * Where the editor reads and writes the site's files. Paths are relative to the dashboard folder
 * ("public/guides/x/index.html").
 *
 * - LocalStore (a developer's computer): the files in this folder, directly. "What's changed" is what git sees as
 *   changed against the last commit; Publish only lists what would go live (nothing is committed or pushed).
 * - GitHubStore (gobiggify.com): the GitHub repository through the GitHub API. Every save is a commit on a drafts
 *   branch; Publish merges the drafts into the live branch, so Vercel builds once per publish.
 *
 * Every write passes assertWritable (guides, tools and their photos only).
 */

export interface Change {
  path: string;
  status: 'added' | 'modified' | 'deleted';
}

export interface PublishResult {
  published: boolean;
  /** local mode: nothing was published, this is what would have been */
  simulated: boolean;
  changes: Change[];
  commit?: string;
}

export interface ContentStore {
  readonly mode: 'local' | 'github';
  /** the draft version of a text file, or null when it does not exist */
  read(path: string): Promise<string | null>;
  readBinary(path: string): Promise<Uint8Array | null>;
  /** every file under a folder (recursive), draft version */
  list(dir: string): Promise<string[]>;
  write(path: string, content: string | Uint8Array, message: string): Promise<void>;
  /** the live version of a text file, or null */
  readPublished(path: string): Promise<string | null>;
  /** files that differ between the drafts and what is live */
  changes(): Promise<Change[]>;
  /** put one file back the way it is live */
  undo(path: string): Promise<void>;
  /** put everything back the way it is live */
  undoAll(): Promise<void>;
  publish(message: string): Promise<PublishResult>;
}

export { EditorError as StoreError } from './paths';
