import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Next 16 renamed "middleware" to "proxy" (same behavior).
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Run on all routes except static assets and images. The public guides, free tools, video pages and their fonts (plain files in
    // public/) never touch the login check, and nor do robots.txt, sitemap.xml and llms.txt (crawlers have no login).
    '/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|llms\\.txt|google[0-9a-f]+\\.html|guides|tools|videos|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)',
  ],
};
