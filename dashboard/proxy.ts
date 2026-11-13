import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Next 16 renamed "middleware" to "proxy" (same behavior).
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Run on all routes except static assets and images. The public guides, free tools and their fonts (plain files in
    // public/) never touch the login check.
    '/((?!_next/static|_next/image|favicon.ico|guides|tools|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)',
  ],
};
