import { buildLlmsTxt } from '@/lib/seo/llms';

// /llms.txt for AI answer engines (built at build time from the pages themselves; see lib/seo/llms.ts).
export const dynamic = 'force-static';

export function GET() {
  return new Response(buildLlmsTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
