/**
 * Site editor settings, read from environment variables (names only; the values live in Vercel or .env.local).
 *
 * Who may edit
 *   EDITOR_EMAILS                  comma-separated emails of the people allowed to edit (the owner). Required.
 *
 * Where saves go (production)
 *   EDITOR_GITHUB_REPO             owner/repository, e.g. boogmasterjones/BIGGIFY-RECEPTIONIST
 *   EDITOR_GITHUB_TOKEN            a fine-grained token limited to that repository with Contents: Read and write
 *     or EDITOR_GITHUB_APP_ID + EDITOR_GITHUB_APP_PRIVATE_KEY (+ optional EDITOR_GITHUB_INSTALLATION_ID)
 *   EDITOR_GITHUB_DIR              folder of the app inside the repository, default "dashboard"
 *   EDITOR_LIVE_BRANCH             default "main" (Vercel deploys it)
 *   EDITOR_DRAFTS_BRANCH           default "site-drafts"
 *
 * Development only
 *   EDITOR_DEV_BYPASS=1            no sign-in needed (only when not in production and not on Vercel)
 */

export interface GitHubSettings {
  repo: string;
  dir: string;
  liveBranch: string;
  draftsBranch: string;
  token?: string;
  appId?: string;
  privateKey?: string;
  installationId?: string;
}

const env = (k: string) => (process.env[k] ?? '').trim();

export function editorEmails(): string[] {
  return env('EDITOR_EMAILS')
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
}

/** Signing in is skipped only on a developer's own computer, and only when asked for. */
export function devBypass(): boolean {
  return !isProduction() && env('EDITOR_DEV_BYPASS') === '1';
}

const BRANCH_RE = /^[A-Za-z0-9._/-]{1,100}$/;

export function githubSettings(): GitHubSettings | null {
  const repo = env('EDITOR_GITHUB_REPO');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) return null;
  const token = env('EDITOR_GITHUB_TOKEN') || undefined;
  const appId = env('EDITOR_GITHUB_APP_ID') || undefined;
  const privateKey = process.env.EDITOR_GITHUB_APP_PRIVATE_KEY || undefined;
  if (!token && !(appId && privateKey)) return null;
  const liveBranch = env('EDITOR_LIVE_BRANCH') || 'main';
  const draftsBranch = env('EDITOR_DRAFTS_BRANCH') || 'site-drafts';
  if (!BRANCH_RE.test(liveBranch) || !BRANCH_RE.test(draftsBranch) || liveBranch === draftsBranch) return null;
  const dir = (process.env.EDITOR_GITHUB_DIR ?? 'dashboard').trim().replace(/^\/+|\/+$/g, '');
  if (dir && !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(dir)) return null;
  if (dir.includes('..')) return null;
  return { repo, dir, liveBranch, draftsBranch, token, appId, privateKey, installationId: env('EDITOR_GITHUB_INSTALLATION_ID') || undefined };
}

export type StoreMode = 'github' | 'local' | 'none';

/** GitHub when connected; local files on a developer's computer; otherwise saving is switched off. */
export function storeMode(): StoreMode {
  if (githubSettings()) return 'github';
  if (!isProduction()) return 'local';
  return 'none';
}

/** Names of settings that are missing, for the editor's "not set up yet" message. Never values. */
export function missingSettings(): string[] {
  const out: string[] = [];
  if (!editorEmails().length) out.push('EDITOR_EMAILS');
  if (isProduction() && !githubSettings()) {
    if (!env('EDITOR_GITHUB_REPO')) out.push('EDITOR_GITHUB_REPO');
    if (!env('EDITOR_GITHUB_TOKEN') && !env('EDITOR_GITHUB_APP_ID')) out.push('EDITOR_GITHUB_TOKEN');
  }
  return out;
}
