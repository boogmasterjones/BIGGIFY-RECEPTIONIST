// The site editor's view of a guide or tool page: the draft version of the page with the in-page editor added.
// Only for a signed-in editor; never cached or indexed. The public page (/guides/…, /tools/…) is a plain static file
// and never contains any of this.
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { annotate, readMeta } from '@/lib/editor/htmldoc';
import { OVERLAY_CSS, OVERLAY_JS } from '@/lib/editor/overlay';
import { fileForPage } from '@/lib/editor/paths';
import { loadPage, requireStore } from '@/lib/editor/service';
import { errorResponse, getEditorAccess } from '@/lib/editor/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, ctx: { params: Promise<{ page: string[] }> }) {
  const { page: parts } = await ctx.params;
  const page = (parts ?? []).join('/');
  const access = await getEditorAccess();
  if (!access.ok) {
    if (access.status === 401) {
      const url = new URL('/login', request.url);
      url.searchParams.set('next', `/editor/preview/${page}`);
      return NextResponse.redirect(url);
    }
    return new NextResponse('This account cannot edit the website.', { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  if (!fileForPage(page)) return new NextResponse('Not found', { status: 404 });

  try {
    const store = requireStore();
    const { html, version, path } = await loadPage(store, page);
    const meta = readMeta(html);
    const nonce = randomBytes(16).toString('base64');
    const livePath = '/' + page;
    const slugPage = /^(?:guides|tools)\/[a-z0-9-]+$/.test(page);
    const state = {
      page,
      version,
      mode: store.mode,
      livePath,
      title: meta.title,
      description: meta.description,
      section: slugPage ? page.split('/')[0] : null,
    };
    const inject =
      `<style>${OVERLAY_CSS}</style>` +
      `<script nonce="${nonce}">window.__ED=${JSON.stringify(state).replace(/</g, '\\u003c')};</script>` +
      `<script nonce="${nonce}">${OVERLAY_JS}</script>`;
    const folder = path.replace(/^public/, '').replace(/[^/]+$/, '');
    const out = annotate(html, {
      baseHref: folder,
      inject,
      rewriteSrc:
        store.mode === 'github'
          ? (src) => (/^\/(?:guides|tools)\/[a-z0-9-]+\/photos\/[a-z0-9.-]+$/.test(src) ? `/api/editor/media?path=${encodeURIComponent('public' + src)}` : src)
          : undefined,
    });
    const csp = [
      "default-src 'self'",
      `script-src 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self'",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join('; ');
    return new NextResponse(out.html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
        'Content-Security-Policy': csp,
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'same-origin',
      },
    });
  } catch (e) {
    const r = errorResponse(e);
    const body = (await r.json()) as { error?: string };
    return new NextResponse(body.error ?? 'Error', { status: r.status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}
