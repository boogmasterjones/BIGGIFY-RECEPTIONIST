// Make a new guide from the guide design and add its card to the guides page (as drafts, like any other change).
import type { NewGuideInput } from '@/lib/editor/newguide';
import { createGuide, requireStore } from '@/lib/editor/service';
import { errorResponse, guard, json } from '@/lib/editor/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const g = await guard(request, 'write');
  if (!g.ok) return g.response;
  try {
    const text = await request.text();
    if (text.length > 200_000) return json({ error: 'That guide is too long for one go. Add the rest in the editor.' }, 413);
    let input: NewGuideInput;
    try {
      input = JSON.parse(text);
    } catch {
      return json({ error: 'Bad request.' }, 400);
    }
    return json(await createGuide(requireStore(), input));
  } catch (e) {
    return errorResponse(e);
  }
}
