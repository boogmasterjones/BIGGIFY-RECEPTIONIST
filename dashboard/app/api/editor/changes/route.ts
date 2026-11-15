// What's changed since the last publish (drafts compared with the live site).
import { pageForFile } from '@/lib/editor/paths';
import { requireStore } from '@/lib/editor/service';
import { errorResponse, guard, json } from '@/lib/editor/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const g = await guard(request, 'read');
  if (!g.ok) return g.response;
  try {
    const store = requireStore();
    const changes = await store.changes();
    return json({ mode: store.mode, changes: changes.map((c) => ({ ...c, page: pageForFile(c.path) })) });
  } catch (e) {
    return errorResponse(e);
  }
}
