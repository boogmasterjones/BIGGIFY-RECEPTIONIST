'use client';

import Link from 'next/link';
import { useEffect, useOptimistic, useRef, useState, startTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ConfirmButton from '@/components/confirm-button';
import { textOn } from '@/lib/colors';
import { createJob, updateJob, setJobStage, deleteJob } from './actions';

export type Stage = { id: string; name: string; color: string; position: number };
export type ContactOption = { id: string; name: string | null };
export type Job = {
  id: string;
  title: string | null;
  contact_id: string | null;
  service: string | null;
  description: string | null;
  stage_id: string | null;
  value_cents: number | null;
  source: string;
  created_at: string;
  contact: { id: string; name: string | null } | null;
};

const input =
  'w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-[15px] outline-none focus:border-[#CF0000]';

function money(cents: number | null) {
  if (cents == null) return '—';
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 });
}

export default function JobsClient({
  businessId,
  initial,
  contacts,
  stages,
}: {
  businessId: string;
  initial: Job[];
  contacts: ContactOption[];
  stages: Stage[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'board' | 'list'>('board');

  // Pointer-drag + optimistic state
  const [overStage, setOverStage] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ id: string; label: string; x: number; y: number } | null>(null);
  const dragRef = useRef<{ id: string; sx: number; sy: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const colRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [optimisticJobs, moveOptimistic] = useOptimistic(
    initial,
    (state: Job[], { id, stageId }: { id: string; stageId: string }) =>
      state.map((j) => (j.id === id ? { ...j, stage_id: stageId } : j)),
  );

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('jobsView') : null;
    if (saved === 'list' || saved === 'board') setView(saved);
  }, []);

  // Opened via the ⌘K "New job" command (/jobs?new=1)
  useEffect(() => {
    if (params.get('new') === '1') {
      setEditing(null);
      setError(null);
      setOpen(true);
      router.replace('/jobs');
    }
  }, [params, router]);
  function pickView(v: 'board' | 'list') {
    setView(v);
    try {
      window.localStorage.setItem('jobsView', v);
    } catch {}
  }

  const stageById = new Map(stages.map((s) => [s.id, s]));
  const firstStageId = stages[0]?.id ?? null;
  const bucketOf = (j: Job) => (j.stage_id && stageById.has(j.stage_id) ? j.stage_id : firstStageId);

  // Group jobs into their stage columns (created-desc order preserved from the server).
  const byStage = new Map<string, Job[]>();
  stages.forEach((s) => byStage.set(s.id, []));
  for (const j of optimisticJobs) {
    const b = bucketOf(j);
    if (b && byStage.has(b)) byStage.get(b)!.push(j);
  }

  function move(id: string, stageId: string) {
    const cur = optimisticJobs.find((j) => j.id === id);
    if (!cur || bucketOf(cur) === stageId) return;
    setFlashId(id);
    startTransition(async () => {
      moveOptimistic({ id, stageId });
      await setJobStage(id, stageId);
    });
    setTimeout(() => setFlashId(null), 650);
  }

  // Which column is under this point? (board hit-test)
  function stageAt(x: number, y: number): string | null {
    for (const s of stages) {
      const el = colRefs.current[s.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return s.id;
    }
    return null;
  }

  function onCardPointerDown(e: React.PointerEvent, j: Job) {
    if (e.button !== 0) return; // left button only
    dragRef.current = { id: j.id, sx: e.clientX, sy: e.clientY, moved: false };
    const label = j.title || j.contact?.name || j.service || 'Job';

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = ev.clientX - d.sx;
      const dy = ev.clientY - d.sy;
      if (!d.moved && Math.hypot(dx, dy) < 6) return; // click vs. drag threshold
      if (!d.moved) {
        d.moved = true;
        document.body.style.userSelect = 'none';
      }
      setGhost({ id: d.id, label, x: ev.clientX, y: ev.clientY });
      setOverStage(stageAt(ev.clientX, ev.clientY));
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = '';
      const d = dragRef.current;
      dragRef.current = null;
      setGhost(null);
      setOverStage(null);
      if (d && d.moved) {
        suppressClick.current = true; // don't let the ensuing click navigate
        setTimeout(() => (suppressClick.current = false), 0);
        const target = stageAt(ev.clientX, ev.clientY);
        if (target) move(d.id, target);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function startAdd() {
    setEditing(null);
    setError(null);
    setOpen(true);
  }
  function startEdit(j: Job) {
    setEditing(j);
    setError(null);
    setOpen(true);
  }

  async function save(form: FormData) {
    setBusy(true);
    setError(null);
    const payload = {
      title: String(form.get('title') || ''),
      contact_id: String(form.get('contact_id') || ''),
      service: String(form.get('service') || ''),
      description: String(form.get('description') || ''),
      stage_id: String(form.get('stage_id') || ''),
      value: String(form.get('value') || ''),
    };
    const res = editing ? await updateJob(editing.id, payload) : await createJob(businessId, payload);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Something went wrong');
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function remove(j: Job) {
    await deleteJob(j.id);
    router.refresh();
  }

  const toggle =
    'px-3 py-1.5 text-sm font-bold rounded-lg transition-colors';

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Jobs</h1>
          <p className="text-neutral-500">
            Your pipeline — drag a job to move it. Customize stages in{' '}
            <a href="/settings" className="text-[#CF0000] underline">
              Settings
            </a>
            .
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl bg-white border border-[#ece3ca] p-1">
            <button onClick={() => pickView('board')} className={`${toggle} ${view === 'board' ? 'bg-[#CF0000] text-white' : 'text-neutral-500 hover:text-neutral-800'}`}>
              Board
            </button>
            <button onClick={() => pickView('list')} className={`${toggle} ${view === 'list' ? 'bg-[#CF0000] text-white' : 'text-neutral-500 hover:text-neutral-800'}`}>
              List
            </button>
          </div>
          <button onClick={startAdd} className="rounded-full bg-[#CF0000] text-white font-bold px-5 py-2.5 hover:bg-[#e00a0a] active:scale-[.98] transition">
            + Add job
          </button>
        </div>
      </div>

      {optimisticJobs.length === 0 ? (
        <div className="rounded-2xl bg-white border border-[#ece3ca] p-10 text-center text-neutral-400">
          No jobs yet. Add one, or they&apos;ll appear here as the AI books calls.
        </div>
      ) : view === 'board' ? (
        /* ---------------- BOARD ---------------- */
        <>
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
          {stages.map((s) => {
            const jobs = byStage.get(s.id) || [];
            const total = jobs.reduce((sum, j) => sum + (j.value_cents || 0), 0);
            const isOver = overStage === s.id && ghost != null;
            return (
              <div
                key={s.id}
                ref={(el) => {
                  colRefs.current[s.id] = el;
                }}
                className={`w-72 shrink-0 rounded-2xl border p-2.5 transition-colors ${
                  isOver ? 'border-[#CF0000] bg-white shadow-[inset_0_0_0_2px_rgba(207,0,0,0.15)]' : 'border-[#ece3ca] bg-[#FFFBF0]'
                }`}
              >
                <div className="flex items-center gap-2 px-1.5 py-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color || '#9aa0b4' }} />
                  <span className="text-sm font-bold text-neutral-700">{s.name}</span>
                  <span className="ml-auto text-xs font-bold text-neutral-400 tabular-nums">{jobs.length}</span>
                </div>
                {total > 0 && (
                  <div className="px-1.5 pb-2 text-[11px] font-semibold text-neutral-400 tabular-nums">{money(total)}</div>
                )}
                <div className="min-h-[80px] space-y-2">
                  {jobs.map((j) => (
                    <div
                      key={j.id}
                      onPointerDown={(e) => onCardPointerDown(e, j)}
                      onClickCapture={(e) => {
                        if (suppressClick.current) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      className={`group rounded-xl bg-white border p-3 cursor-grab active:cursor-grabbing transition-all touch-none select-none ${
                        ghost?.id === j.id ? 'opacity-40' : 'hover:-translate-y-0.5 hover:shadow-md'
                      } ${flashId === j.id ? 'border-[#CF0000] ring-2 ring-[#CF0000]/30' : 'border-[#ece3ca]'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/jobs/${j.id}`} draggable={false} className="font-semibold text-[14px] leading-tight hover:text-[#CF0000]">
                          {j.title || j.contact?.name || 'Open job'}
                        </Link>
                        {j.source === 'ai_call' && (
                          <span className="text-[9px] font-bold uppercase tracking-wide text-[#CF0000] bg-[#FDECEC] rounded px-1.5 py-0.5 shrink-0">AI</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
                        <span className="truncate">{j.service || (j.title && j.contact?.name) || '—'}</span>
                        {j.value_cents != null && <span className="font-bold text-neutral-500 tabular-nums shrink-0 ml-2">{money(j.value_cents)}</span>}
                      </div>
                    </div>
                  ))}
                  {jobs.length === 0 && (
                    <div className={`rounded-xl border border-dashed text-[11px] text-center py-4 transition-colors ${isOver ? 'border-[#CF0000] text-[#CF0000]' : 'border-[#e4d9bd] text-neutral-300'}`}>
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* floating "lifted" ghost that follows the cursor while dragging */}
        {ghost && (
          <div
            className="fixed z-[60] pointer-events-none rounded-xl bg-white border border-[#CF0000] shadow-xl px-3 py-2 text-[13px] font-semibold -rotate-2"
            style={{ left: ghost.x + 14, top: ghost.y + 10 }}
          >
            {ghost.label}
          </div>
        )}
        </>
      ) : (
        /* ---------------- LIST ---------------- */
        <div className="rounded-2xl bg-white border border-[#ece3ca] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Service</th>
                <th className="px-5 py-3 font-semibold">Value</th>
                <th className="px-5 py-3 font-semibold">Stage</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {optimisticJobs.map((j) => {
                const stage = j.stage_id ? stageById.get(j.stage_id) : null;
                const selColor = stage?.color ?? stageById.get(bucketOf(j) || '')?.color ?? '#9aa0b4';
                return (
                  <tr key={j.id} className="border-b border-neutral-50 hover:bg-[#FFFBF0]">
                    <td className="px-5 py-3">
                      <Link href={`/jobs/${j.id}`} className="font-semibold hover:text-[#CF0000]">
                        {j.title || j.contact?.name || 'Open job'}
                      </Link>
                      {j.title && j.contact?.name && <div className="text-neutral-400 text-xs">{j.contact.name}</div>}
                    </td>
                    <td className="px-5 py-3 text-neutral-600">{j.service || '—'}</td>
                    <td className="px-5 py-3 text-neutral-600">{money(j.value_cents)}</td>
                    <td className="px-5 py-3">
                      <select
                        value={bucketOf(j) ?? ''}
                        onChange={(e) => move(j.id, e.target.value)}
                        className="text-[12px] font-semibold rounded-full px-2.5 py-1 outline-none cursor-pointer"
                        style={{ backgroundColor: selColor, color: textOn(selColor) }}
                      >
                        {stages.map((s) => (
                          <option key={s.id} value={s.id} className="text-neutral-900 bg-white">
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button onClick={() => startEdit(j)} className="text-neutral-400 hover:text-[#CF0000] text-sm mr-3">
                        Edit
                      </button>
                      <ConfirmButton onConfirm={() => remove(j)} className="text-neutral-300 hover:text-[#CF0000] text-sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-extrabold">{editing ? 'Edit job' : 'Add job'}</h2>
              <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-700">
                ✕
              </button>
            </div>
            <form action={save} className="space-y-3">
              <input name="title" defaultValue={editing?.title ?? ''} placeholder="Project / job title (optional)" className={input} />
              <label className="block text-sm font-semibold">Customer</label>
              <select name="contact_id" defaultValue={editing?.contact_id ?? ''} className={input}>
                <option value="">— No contact —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || 'Unnamed'}
                  </option>
                ))}
              </select>
              <input name="service" defaultValue={editing?.service ?? ''} placeholder="Service (e.g. AC repair)" className={input} />
              <input
                name="value"
                defaultValue={editing?.value_cents != null ? String(editing.value_cents / 100) : ''}
                placeholder="Value ($)"
                className={input}
              />
              <label className="block text-sm font-semibold">Stage</label>
              <select name="stage_id" defaultValue={editing?.stage_id ?? stages[0]?.id ?? ''} className={input}>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <textarea name="description" defaultValue={editing?.description ?? ''} placeholder="Description / notes" rows={4} className={input} />
              {error && <p className="text-sm text-[#b00000]">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-[#CF0000] text-white font-bold py-2.5 disabled:opacity-60"
              >
                {busy ? 'Saving…' : editing ? 'Save changes' : 'Add job'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
