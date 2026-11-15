// Save one change to a guide or tool page (text, photo, add/remove a block, title & description).
import type { EditOp } from '@/lib/editor/htmldoc';
import { requireStore, savePage } from '@/lib/editor/service';
import { errorResponse, guard, json } from '@/lib/editor/session';

export const dynamic = 'force-dynamic';

const MAX_BODY = 64 * 1024;
const TYPES = new Set(['text', 'image', 'insert', 'remove', 'meta']);

export async function POST(request: Request) {
  const g = await guard(request, 'write');
  if (!g.ok) return g.response;
  try {
    if (!(request.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'Expected JSON.' }, 415);
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ error: 'That is too much for one save. Split it into more paragraphs.' }, 413);
    let body: { page?: unknown; version?: unknown; op?: { type?: unknown } };
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: 'Bad request.' }, 400);
    }
    if (typeof body.page !== 'string' || typeof body.version !== 'string' || !body.op || typeof body.op !== 'object' || !TYPES.has(String(body.op.type))) {
      return json({ error: 'Bad request.' }, 400);
    }
    return json(await savePage(requireStore(), body.page, body.version, body.op as EditOp));
  } catch (e) {
    return errorResponse(e);
  }
}
