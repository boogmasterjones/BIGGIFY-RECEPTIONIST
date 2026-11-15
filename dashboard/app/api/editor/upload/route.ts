// Upload a photo for a guide or tool page. The bytes are checked (real JPEG, PNG or WebP, at most 6 MB) and saved
// next to the page in public/<guides|tools>/<page>/photos/.
import { MAX_PHOTO_BYTES, requireStore, savePhoto } from '@/lib/editor/service';
import { errorResponse, guard, json } from '@/lib/editor/session';

export const dynamic = 'force-dynamic';

const TOO_BIG = 'That photo is too big. Use one under 6 MB.';

export async function POST(request: Request) {
  const g = await guard(request, 'upload');
  if (!g.ok) return g.response;
  try {
    const page = new URL(request.url).searchParams.get('page') ?? '';
    const declared = Number(request.headers.get('content-length') ?? '0');
    if (declared > MAX_PHOTO_BYTES) return json({ error: TOO_BIG }, 413);
    const buf = new Uint8Array(await request.arrayBuffer());
    if (buf.length > MAX_PHOTO_BYTES) return json({ error: TOO_BIG }, 413);
    let name = 'photo';
    try {
      name = decodeURIComponent(request.headers.get('x-file-name') ?? 'photo');
    } catch {
      /* keep the default name */
    }
    return json(await savePhoto(requireStore(), page, buf, name));
  } catch (e) {
    return errorResponse(e);
  }
}
