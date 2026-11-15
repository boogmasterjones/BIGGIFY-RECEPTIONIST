import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { missingSettings } from '@/lib/editor/config';
import { getStore, listPages } from '@/lib/editor/service';
import { getEditorAccess } from '@/lib/editor/session';
import EditorHome from './editor-home';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Website editor | Biggify', robots: { index: false, follow: false } };

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen grid place-items-center bg-[#FFF6E1] p-6 text-center">
      <div className="max-w-md rounded-2xl bg-white border border-[#ece3ca] p-8">
        <div className="text-xl font-extrabold mb-2">{title}</div>
        <div className="text-neutral-600 text-sm space-y-2">{children}</div>
      </div>
    </main>
  );
}

export default async function EditorPage() {
  const access = await getEditorAccess();
  if (!access.ok && access.status === 401) redirect('/login?next=/editor');
  if (!access.ok) {
    return access.reason === 'not-set-up' ? (
      <Notice title="The editor isn't switched on yet">
        <p>Add your email to <code>EDITOR_EMAILS</code> in Vercel (see docs/EDITOR_FOR_WYATT.md), then redeploy.</p>
      </Notice>
    ) : (
      <Notice title="This account can't edit the website">
        <p>You&apos;re signed in, but this email isn&apos;t on the editor list. Sign in with the owner&apos;s email.</p>
      </Notice>
    );
  }

  const store = getStore();
  if (!store) {
    return (
      <Notice title="The editor isn't connected yet">
        <p>Saving needs the GitHub settings in Vercel. Missing: {missingSettings().join(', ') || 'GitHub settings'}.</p>
        <p>See docs/EDITOR_FOR_WYATT.md, Setup.</p>
      </Notice>
    );
  }

  let pages: Awaited<ReturnType<typeof listPages>> = [];
  let loadError: string | null = null;
  try {
    pages = await listPages(store);
  } catch (e) {
    loadError = e instanceof Error && 'status' in e ? e.message : 'Could not load the pages. Try again in a minute.';
  }

  return <EditorHome pages={pages} mode={store.mode} email={access.editor.email} loadError={loadError} />;
}
