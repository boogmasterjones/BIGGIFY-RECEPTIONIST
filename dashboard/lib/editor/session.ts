/**
 * Sign-in for the site editor: the dashboard's normal Supabase sign-in, plus the EDITOR_EMAILS list
 * (see lib/editor/access.ts for the rule). Used by every editor page and API route.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { RateLimiter, decideAccess, sameOrigin, type Access } from './access';
import { devBypass, editorEmails } from './config';
import { EditorError } from './paths';

export async function getEditorAccess(): Promise<Access> {
  if (devBypass()) return { ok: true, editor: { id: 'dev', email: 'dev@localhost', dev: true } };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ok: false, status: 403, reason: 'not-set-up' };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return decideAccess(user ? { id: user.id, email: user.email, email_confirmed_at: user.email_confirmed_at } : null, editorEmails());
}

const writes = new RateLimiter(120, 10 * 60_000); // saves per person per 10 minutes
const uploads = new RateLimiter(30, 10 * 60_000);
const reads = new RateLimiter(600, 10 * 60_000);

const NO_STORE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };

export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extra } });
}

/**
 * Checks for an editor API route: signed in and on the list, same-origin for changes, and within the rate limit.
 * Returns the editor, or a ready response to send back.
 */
export async function guard(
  request: Request,
  kind: 'read' | 'write' | 'upload',
): Promise<{ ok: true; email: string } | { ok: false; response: NextResponse }> {
  if (kind !== 'read' && !sameOrigin(request.headers, request.url)) {
    return { ok: false, response: json({ error: 'Changes can only be made from the editor itself.' }, 403) };
  }
  const access = await getEditorAccess();
  if (!access.ok) {
    const error = access.reason === 'signed-out' ? 'Please sign in again.' : access.reason === 'not-set-up' ? 'The editor is not set up yet.' : 'This account cannot edit the website.';
    return { ok: false, response: json({ error }, access.status) };
  }
  const limiter = kind === 'upload' ? uploads : kind === 'write' ? writes : reads;
  const r = limiter.take(access.editor.id);
  if (!r.ok) {
    return { ok: false, response: json({ error: `That's a lot of changes in a short time. Wait ${Math.ceil(r.retryAfterSec / 60)} minute(s) and try again.` }, 429, { 'Retry-After': String(r.retryAfterSec) }) };
  }
  return { ok: true, email: access.editor.email };
}

/** Turn any error into a plain answer for the browser; details only in the server log, never secrets. */
export function errorResponse(e: unknown) {
  if (e instanceof EditorError) return json({ error: e.message }, e.status);
  console.error('[site-editor]', e instanceof Error ? e.message : 'unknown error');
  return json({ error: 'Something went wrong on the server. Try again in a minute.' }, 500);
}
