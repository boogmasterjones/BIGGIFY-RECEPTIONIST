/**
 * Who may use the site editor, and the request checks every editor route runs. Pure functions (no Next.js imports) so
 * they can be tested on their own; lib/editor/session.ts wires them to Supabase sign-in.
 *
 * Rule: the person must be signed in with the dashboard's normal Supabase sign-in, their email must be confirmed, and
 * it must be on the EDITOR_EMAILS list. Anyone else, including other signed-in dashboard users, gets nothing.
 */

export interface SignedInUser {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
}

export interface Editor {
  id: string;
  email: string;
  dev?: boolean;
}

export type Access = { ok: true; editor: Editor } | { ok: false; status: 401 | 403; reason: 'signed-out' | 'not-allowed' | 'not-set-up' };

export function decideAccess(user: SignedInUser | null, allowlist: string[]): Access {
  if (!user) return { ok: false, status: 401, reason: 'signed-out' };
  if (!allowlist.length) return { ok: false, status: 403, reason: 'not-set-up' };
  const email = (user.email ?? '').trim().toLowerCase();
  if (!email || !user.email_confirmed_at) return { ok: false, status: 403, reason: 'not-allowed' };
  if (!allowlist.includes(email)) return { ok: false, status: 403, reason: 'not-allowed' };
  return { ok: true, editor: { id: user.id, email } };
}

/**
 * Changes must come from the editor's own pages: same origin (Origin header, or Sec-Fetch-Site), so another website
 * can't make a signed-in owner's browser save something.
 */
export function sameOrigin(headers: Headers, requestUrl: string): boolean {
  const site = headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return false;
  const origin = headers.get('origin');
  if (!origin) return site === 'same-origin';
  let want: string;
  try {
    want = new URL(requestUrl).origin;
  } catch {
    return false;
  }
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  const proto = headers.get('x-forwarded-proto') ?? new URL(requestUrl).protocol.replace(':', '');
  const forwarded = host ? `${proto}://${host}` : null;
  return origin === want || (forwarded !== null && origin === forwarded);
}

/** A small fixed-window counter per key, kept in memory (per server instance; a brake, not a wall). */
export class RateLimiter {
  private hits = new Map<string, { n: number; start: number }>();
  constructor(
    private max: number,
    private windowMs: number,
  ) {}

  take(key: string, now = Date.now()): { ok: boolean; retryAfterSec: number } {
    let h = this.hits.get(key);
    if (!h || now - h.start >= this.windowMs) h = { n: 0, start: now };
    if (h.n >= this.max) return { ok: false, retryAfterSec: Math.ceil((h.start + this.windowMs - now) / 1000) };
    h.n++;
    this.hits.set(key, h);
    if (this.hits.size > 5000) this.hits.delete(this.hits.keys().next().value as string);
    return { ok: true, retryAfterSec: 0 };
  }
}
