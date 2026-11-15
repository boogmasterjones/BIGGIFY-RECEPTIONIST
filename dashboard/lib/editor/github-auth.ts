/**
 * GitHub access for the editor, server side only. Either:
 * - a fine-grained token (EDITOR_GITHUB_TOKEN) limited to the one repository with Contents: Read and write, or
 * - a GitHub App (EDITOR_GITHUB_APP_ID + EDITOR_GITHUB_APP_PRIVATE_KEY): its key signs a short-lived JWT that is
 *   exchanged for an installation token limited to the one repository and to "contents: write". Tokens are kept in
 *   memory until shortly before they expire.
 * Nothing here is ever logged or sent to the browser.
 */
import { createPrivateKey, createSign } from 'node:crypto';

export type Fetch = typeof globalThis.fetch;
const API = 'https://api.github.com';
const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');

export interface TokenSource {
  token(): Promise<string>;
}

export class StaticToken implements TokenSource {
  constructor(private t: string) {}
  async token() {
    return this.t;
  }
}

/** Accepts the key as pasted into Vercel: real newlines, "\n" escapes, or the whole PEM base64-encoded. */
export function normalizePem(key: string): string {
  let k = key.trim();
  if (!k.includes('-----BEGIN')) {
    try {
      k = Buffer.from(k, 'base64').toString('utf8').trim();
    } catch {
      /* fall through */
    }
  }
  return k.replace(/\\n/g, '\n').trim();
}

export function appJwt(appId: string, privateKey: string, now = Date.now()): string {
  const iat = Math.floor(now / 1000) - 60;
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iat, exp: iat + 9 * 60, iss: appId }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const sig = signer.sign(createPrivateKey(normalizePem(privateKey)));
  return `${header}.${payload}.${b64url(sig)}`;
}

export class InstallationTokens implements TokenSource {
  private cached: { token: string; expires: number } | null = null;
  private installationId: string | undefined;

  constructor(
    private creds: { appId: string; privateKey: string; installationId?: string; repo: string },
    private fetchFn: Fetch = globalThis.fetch,
    private now: () => number = Date.now,
  ) {
    this.installationId = creds.installationId || undefined;
  }

  async token(): Promise<string> {
    if (this.cached && this.cached.expires - 5 * 60_000 > this.now()) return this.cached.token;
    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${appJwt(this.creds.appId, this.creds.privateKey, this.now())}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'biggify-site-editor',
    };
    if (!this.installationId) {
      const r = await this.fetchFn(`${API}/repos/${this.creds.repo}/installation`, { headers });
      if (!r.ok) throw new Error(`GitHub App not installed on the repository (status ${r.status})`);
      this.installationId = String(((await r.json()) as { id: number }).id);
    }
    const r = await this.fetchFn(`${API}/app/installations/${this.installationId}/access_tokens`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ repositories: [this.creds.repo.split('/')[1]], permissions: { contents: 'write' } }),
    });
    if (!r.ok) throw new Error(`GitHub refused the App's token request (status ${r.status})`);
    const j = (await r.json()) as { token: string; expires_at: string };
    this.cached = { token: j.token, expires: Date.parse(j.expires_at) || this.now() + 50 * 60_000 };
    return j.token;
  }
}
