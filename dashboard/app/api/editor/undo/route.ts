// Put one page (or photo) back the way it is live, or all drafts.
import { isWritable } from '@/lib/editor/paths';
import { requireStore } from '@/lib/editor/service';
import { errorResponse, guard, json } from '@/lib/editor/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const g = await guard(request, 'write');
  if (!g.ok) return g.response;
  try {
    const body = (await request.json().catch(() => ({}))) as { path?: unknown; all?: unknown };
    const store = requireStore();
    if (body.all === true) await store.undoAll();
    else if (isWritable(body.path)) await store.undo(body.path);
    else return json({ error: "That file can't be changed from the editor." }, 400);
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
