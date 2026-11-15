import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { devBypass as editorDevBypass } from '@/lib/editor/config';

/** A "next" address after signing in: only the website editor, only this site. */
export function isSafeNext(next: string | null): next is string {
  return !!next && /^\/editor(?:\/[a-z0-9/-]*)?$/.test(next) && !next.includes('//');
}

// Refreshes the Supabase auth session on every request and guards protected routes.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  // Site editor on a developer's computer, sign-in skipped (EDITOR_DEV_BYPASS=1; never in production).
  if (editorDevBypass() && (path.startsWith('/editor') || path.startsWith('/api/editor'))) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The site editor's API answers 401/403 itself (JSON, not a redirect to the sign-in page).
  if (path.startsWith('/api/editor')) return response;

  const isPublic =
    path === '/' ||
    path.startsWith('/how-it-works') ||
    path.startsWith('/login') ||
    path.startsWith('/auth') ||
    path.startsWith('/privacy') ||
    path.startsWith('/terms') ||
    path.startsWith('/sms') ||
    path.startsWith('/guides') ||
    path.startsWith('/tools') ||
    path.startsWith('/fonts');
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    // The website editor sends you back to where you were after signing in.
    if (path.startsWith('/editor')) url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }
  // Logged-in users have no reason to see the marketing landing page or the
  // login form — send them straight into the dashboard instead (or back to the website editor).
  if (user && (path === '/' || path.startsWith('/login'))) {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get('next');
    url.pathname = path.startsWith('/login') && isSafeNext(next) ? next : '/home';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
