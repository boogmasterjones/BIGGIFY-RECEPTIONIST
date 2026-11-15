// Publish: merge all drafts into the live branch in one commit (one Vercel build). On a developer's computer nothing
// is committed; the answer lists what would go live.
import { requireStore } from '@/lib/editor/service';
import { errorResponse, guard, json } from '@/lib/editor/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const g = await guard(request, 'write');
  if (!g.ok) return g.response;
  try {
    return json(await requireStore().publish('Site editor: publish guide and tool changes'));
  } catch (e) {
    return errorResponse(e);
  }
}
