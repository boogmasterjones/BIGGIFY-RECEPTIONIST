// Draft photos for the editor's preview (photos uploaded but not published yet are not on the live site).
import { isPhotoPath } from '@/lib/editor/paths';
import { requireStore } from '@/lib/editor/service';
import { errorResponse, guard } from '@/lib/editor/session';

export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

export async function GET(request: Request) {
  const g = await guard(request, 'read');
  if (!g.ok) return g.response;
  try {
    const path = new URL(request.url).searchParams.get('path') ?? '';
    if (!isPhotoPath(path)) return new Response('Not found', { status: 404 });
    const bytes = await requireStore().readBinary(path);
    if (!bytes) return new Response('Not found', { status: 404 });
    const ext = path.split('.').pop()!.toLowerCase();
    return new Response(Buffer.from(bytes), {
      headers: {
        'Content-Type': TYPES[ext] ?? 'application/octet-stream',
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
