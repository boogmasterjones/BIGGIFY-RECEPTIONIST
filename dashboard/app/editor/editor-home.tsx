'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PageInfo } from '@/lib/editor/service';

type Change = { path: string; status: 'added' | 'modified' | 'deleted'; page: string | null };

async function post<T = unknown>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  const j = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}

const STATUS_WORDS: Record<Change['status'], string> = { added: 'new', modified: 'changed', deleted: 'removed' };

function describe(c: Change, titles: Map<string, string>): string {
  if (c.page) return titles.get(c.page) ?? '/' + c.page;
  const photo = /^public\/(guides|tools)\/([a-z0-9-]+)\/photos\//.exec(c.path);
  if (photo) return `Photo for ${titles.get(`${photo[1]}/${photo[2]}`) ?? photo[2]}`;
  return c.path.replace(/^public\//, '');
}

export default function EditorHome({
  pages,
  mode,
  email,
  loadError,
}: {
  pages: PageInfo[];
  mode: 'local' | 'github';
  email: string;
  loadError: string | null;
}) {
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const titles = new Map(pages.map((p) => [p.page, p.title]));

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/editor/changes', { credentials: 'same-origin', cache: 'no-store' });
      const j = (await r.json()) as { changes?: Change[]; error?: string };
      if (!r.ok) throw new Error(j.error || 'Could not load the changes.');
      setChanges(j.changes ?? []);
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Could not load the changes.', bad: true });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the change list once on open
    void refresh();
  }, [refresh]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Something went wrong.', bad: true });
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  const publish = () =>
    run(async () => {
      if (!confirm(mode === 'local' ? 'Show what would be published?' : `Publish ${changes?.length ?? 0} change(s) to gobiggify.com now?`)) return;
      const r = await post<{ published: boolean; simulated: boolean; changes: Change[] }>('/api/editor/publish', {});
      if (r.simulated) setMsg({ text: `On this computer nothing is published. ${r.changes.length} file(s) are changed here; commit them with git.` });
      else if (r.published) setMsg({ text: 'Published! The live site updates in about 1–2 minutes.' });
      else setMsg({ text: 'Nothing to publish.' });
    });

  const undo = (path: string) =>
    run(async () => {
      if (!confirm('Put this back the way it is on the live site? Your unpublished changes to it will be lost.')) return;
      await post('/api/editor/undo', { path });
      setMsg({ text: 'Put back.' });
    });

  const undoAll = () =>
    run(async () => {
      if (!confirm('Throw away ALL unpublished changes? This cannot be undone.')) return;
      await post('/api/editor/undo', { all: true });
      setMsg({ text: 'All drafts thrown away.' });
    });

  const guides = pages.filter((p) => p.section === 'guides');
  const tools = pages.filter((p) => p.section === 'tools');

  return (
    <main className="min-h-screen bg-[#FFF6E1] text-neutral-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <header className="flex flex-wrap items-center gap-3 justify-between mb-6">
          <div>
            <div className="text-2xl font-extrabold tracking-tight">
              <span className="text-[#CF0000]">BIGG</span>ify <span className="text-neutral-500 font-bold">website editor</span>
            </div>
            <p className="text-sm text-neutral-500">
              Signed in as {email}
              {mode === 'local' ? ' · on this computer (edits the files directly)' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/" target="_blank" rel="noopener" className="rounded-full border border-[#e2d8bd] bg-white px-4 py-2 text-sm font-bold">
              View website
            </a>
            <a href="/home" className="rounded-full border border-[#e2d8bd] bg-white px-4 py-2 text-sm font-bold">
              Dashboard
            </a>
          </div>
        </header>

        {msg && (
          <div className={`mb-5 rounded-xl px-4 py-3 text-sm font-semibold ${msg.bad ? 'bg-[#fde3df] text-[#8a1010]' : 'bg-[#e4f6e4] text-[#145214]'}`}>{msg.text}</div>
        )}
        {loadError && <div className="mb-5 rounded-xl bg-[#fde3df] px-4 py-3 text-sm font-semibold text-[#8a1010]">{loadError}</div>}

        <section id="changes" className="mb-8 rounded-2xl border border-[#ece3ca] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold">Changes not published yet</h2>
              <p className="text-sm text-neutral-500">
                {mode === 'local'
                  ? 'Saved straight into the files on this computer.'
                  : 'Saved as drafts. Visitors see nothing until you press Publish.'}
              </p>
            </div>
            <div className="flex gap-2">
              {!!changes?.length && (
                <button type="button" disabled={busy} onClick={undoAll} className="rounded-full border border-[#e2d8bd] px-4 py-2 text-sm font-bold disabled:opacity-50">
                  Undo everything
                </button>
              )}
              <button
                type="button"
                disabled={busy || !changes?.length}
                onClick={publish}
                className="rounded-full bg-[#CF0000] px-5 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {busy ? 'Working…' : `Publish${changes?.length ? ` (${changes.length})` : ''}`}
              </button>
            </div>
          </div>
          <ul className="mt-4 divide-y divide-[#f1ead6]">
            {changes === null && <li className="py-2 text-sm text-neutral-500">Loading…</li>}
            {changes?.length === 0 && <li className="py-2 text-sm text-neutral-500">Nothing waiting. Everything you see on the website is up to date.</li>}
            {changes?.map((c) => (
              <li key={c.path} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="text-sm">
                  <b>{describe(c, titles)}</b> <span className="text-neutral-500">({STATUS_WORDS[c.status]})</span>
                </span>
                <span className="flex gap-2">
                  {c.page && (
                    <a href={`/editor/preview/${c.page}`} className="rounded-full bg-[#f6f0e0] px-3 py-1.5 text-sm font-bold">
                      Open
                    </a>
                  )}
                  <button type="button" disabled={busy} onClick={() => undo(c.path)} className="rounded-full bg-[#f6f0e0] px-3 py-1.5 text-sm font-bold disabled:opacity-50">
                    Undo
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold">Guides (your articles)</h2>
              <p className="text-sm text-neutral-500">Click Edit, then click any words or photo on the page to change them.</p>
            </div>
            <button type="button" onClick={() => setShowNew((v) => !v)} className="rounded-full bg-[#16130d] px-5 py-2 text-sm font-bold text-white">
              {showNew ? 'Close' : '+ New guide'}
            </button>
          </div>
          {/* the editor view is a plain page (not a Next.js page), so a full page load is right here */}
          {showNew && <NewGuideForm onDone={(page) => window.location.assign(new URL(`/editor/preview/${page}`, window.location.origin))} />}
          <PageList pages={guides} />
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-extrabold">Free tools and playbooks</h2>
          <PageList pages={tools} />
        </section>

        <section className="rounded-2xl border border-dashed border-[#e2d8bd] p-5 text-sm text-neutral-600">
          <b>Home page, How it works, Privacy, Terms:</b> these are built into the app, so they can&apos;t be edited here yet. Ask Claude to
          change them for you.
        </section>
      </div>
    </main>
  );
}

function PageList({ pages }: { pages: PageInfo[] }) {
  if (!pages.length) return <p className="text-sm text-neutral-500">No pages found.</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {pages.map((p) => (
        <li key={p.page} className="flex items-center justify-between gap-3 rounded-xl border border-[#ece3ca] bg-white px-4 py-3">
          <span className="min-w-0">
            <span className="block truncate font-bold">{p.isHub ? (p.section === 'guides' ? 'The guides page (list of all guides)' : 'The free tools page') : p.title}</span>
            <span className="block truncate text-xs text-neutral-500">/{p.page}</span>
          </span>
          <a href={`/editor/preview/${p.page}`} className="shrink-0 rounded-full bg-[#CF0000] px-4 py-1.5 text-sm font-bold text-white">
            Edit
          </a>
        </li>
      ))}
    </ul>
  );
}

function NewGuideForm({ onDone }: { onDone: (page: string) => void }) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [intro, setIntro] = useState('');
  const [sections, setSections] = useState([{ heading: '', body: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (i: number, k: 'heading' | 'body', v: string) => setSections((s) => s.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await post<{ page: string }>('/api/editor/new-guide', { title, topic, description, intro, sections });
      onDone(r.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not make the guide.');
      setBusy(false);
    }
  }

  const input = 'w-full rounded-lg border border-[#e2d8bd] px-3 py-2.5 text-[15px] outline-none focus:border-[#CF0000]';
  return (
    <form onSubmit={submit} className="mb-5 space-y-3 rounded-2xl border border-[#ece3ca] bg-white p-5">
      <h3 className="text-lg font-extrabold">New guide</h3>
      <p className="text-sm text-neutral-500">
        Fill in the basics. You can change every word (and add photos) on the page afterwards. It stays a draft until you publish.
      </p>
      <label className="block text-sm font-bold">
        Title (the big headline)
        <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="How to get more Google reviews this month" required />
      </label>
      <label className="block text-sm font-bold">
        Topic (the small label)
        <input className={input} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Google reviews" />
      </label>
      <label className="block text-sm font-bold">
        Short description (for the guides page and Google, 1–2 sentences)
        <textarea className={input} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} required />
      </label>
      <label className="block text-sm font-bold">
        Intro (the first paragraph under the title)
        <textarea className={input} rows={3} value={intro} onChange={(e) => setIntro(e.target.value)} />
      </label>
      {sections.map((s, i) => (
        <fieldset key={i} className="space-y-2 rounded-xl bg-[#fbf7ec] p-3">
          <legend className="text-sm font-bold">Section {i + 1}</legend>
          <input className={input} value={s.heading} onChange={(e) => set(i, 'heading', e.target.value)} placeholder="Section heading" />
          <textarea
            className={input}
            rows={5}
            value={s.body}
            onChange={(e) => set(i, 'body', e.target.value)}
            placeholder={'Write the text. Leave an empty line between paragraphs.\n- Start lines with a dash for a bullet list'}
          />
          {sections.length > 1 && (
            <button type="button" className="text-sm font-bold text-[#8a1010]" onClick={() => setSections((x) => x.filter((_, j) => j !== i))}>
              Remove this section
            </button>
          )}
        </fieldset>
      ))}
      <button type="button" className="rounded-full border border-[#e2d8bd] px-4 py-2 text-sm font-bold" onClick={() => setSections((s) => [...s, { heading: '', body: '' }])}>
        + Add a section
      </button>
      {error && <p className="text-sm font-semibold text-[#b00000]">{error}</p>}
      <div>
        <button type="submit" disabled={busy} className="rounded-full bg-[#CF0000] px-6 py-2.5 font-bold text-white disabled:opacity-60">
          {busy ? 'Making it…' : 'Make the guide'}
        </button>
      </div>
    </form>
  );
}
