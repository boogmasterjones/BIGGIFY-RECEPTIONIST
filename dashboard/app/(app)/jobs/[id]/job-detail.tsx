'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateJobMeta,
  addTask,
  toggleTask,
  deleteTask,
  addMaterial,
  updateMaterial,
  setMaterialStatus,
  deleteMaterial,
  aiExtractMaterial,
  type MaterialInput,
} from './actions';

export type Stage = { id: string; name: string; color: string; position: number };
export type Task = { id: string; title: string; done: boolean; position: number };
export type Material = {
  id: string;
  name: string | null;
  vendor: string | null;
  url: string | null;
  image_url: string | null;
  price_cents: number | null;
  sku: string | null;
  dimensions: string | null;
  quantity: number | null;
  lead_time: string | null;
  room: string | null;
  status: string;
  notes: string | null;
  position: number;
};
export type Job = {
  id: string;
  title: string | null;
  service: string | null;
  description: string | null;
  stage_id: string | null;
  value_cents: number | null;
  contact: { id: string; name: string | null; phone: string | null; email: string | null } | null;
};

const input =
  'w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-[15px] outline-none focus:border-[#CF0000]';

const MAT_STATUS: { value: string; label: string; color: string }[] = [
  { value: 'proposed', label: 'Proposed', color: '#6b7280' },
  { value: 'approved', label: 'Approved', color: '#4a3fd6' },
  { value: 'ordered', label: 'Ordered', color: '#9a6b00' },
  { value: 'delivered', label: 'Delivered', color: '#067a63' },
];

function money(cents: number | null) {
  if (cents == null) return '';
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 });
}

const emptyMat: MaterialInput = {
  name: '', vendor: '', url: '', image_url: '', price: '', sku: '', dimensions: '',
  quantity: '', lead_time: '', room: '', status: 'proposed', notes: '',
};

export default function JobDetail({
  businessId,
  job,
  stages,
  tasks,
  materials,
}: {
  businessId: string;
  job: Job;
  stages: Stage[];
  tasks: Task[];
  materials: Material[];
}) {
  const router = useRouter();
  const [taskTitle, setTaskTitle] = useState('');
  const [matOpen, setMatOpen] = useState(false);
  const [matEditingId, setMatEditingId] = useState<string | null>(null);
  const [mat, setMat] = useState<MaterialInput>(emptyMat);
  const [busy, setBusy] = useState(false);
  const [autofillBusy, setAutofillBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    router.refresh();
  }

  // --- stage / title ---
  async function setStage(stageId: string) {
    await updateJobMeta(job.id, { stage_id: stageId });
    refresh();
  }
  async function saveTitle(title: string) {
    if (title !== (job.title || '')) {
      await updateJobMeta(job.id, { title });
      refresh();
    }
  }

  // --- tasks ---
  async function onAddTask() {
    if (!taskTitle.trim()) return;
    await addTask(job.id, businessId, taskTitle);
    setTaskTitle('');
    refresh();
  }

  // --- materials ---
  function openAdd() {
    setMatEditingId(null);
    setMat(emptyMat);
    setError(null);
    setMatOpen(true);
  }
  function openEdit(m: Material) {
    setMatEditingId(m.id);
    setMat({
      name: m.name ?? '', vendor: m.vendor ?? '', url: m.url ?? '', image_url: m.image_url ?? '',
      price: m.price_cents != null ? String(m.price_cents / 100) : '',
      sku: m.sku ?? '', dimensions: m.dimensions ?? '', quantity: m.quantity != null ? String(m.quantity) : '',
      lead_time: m.lead_time ?? '', room: m.room ?? '', status: m.status, notes: m.notes ?? '',
    });
    setError(null);
    setMatOpen(true);
  }
  async function autofill() {
    if (!mat.url) {
      setError('Paste a product link first.');
      return;
    }
    setAutofillBusy(true);
    setError(null);
    const res = await aiExtractMaterial(mat.url);
    setAutofillBusy(false);
    if (!res.ok || !res.data) {
      setError(res.error || 'Could not extract details.');
      return;
    }
    const d = res.data;
    setMat((prev) => ({
      ...prev,
      name: d.name || prev.name,
      vendor: d.vendor || prev.vendor,
      price: d.price || prev.price,
      image_url: d.image_url || prev.image_url,
      sku: d.sku || prev.sku,
      dimensions: d.dimensions || prev.dimensions,
    }));
  }
  async function saveMat() {
    setBusy(true);
    setError(null);
    const res = matEditingId
      ? await updateMaterial(matEditingId, job.id, mat)
      : await addMaterial(job.id, businessId, mat);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Something went wrong');
      return;
    }
    setMatOpen(false);
    refresh();
  }

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div>
      <Link href="/jobs" className="text-sm text-neutral-400 hover:text-neutral-700">
        ← Jobs
      </Link>

      {/* Title + customer */}
      <div className="mt-2 mb-5">
        <input
          defaultValue={job.title || ''}
          onBlur={(e) => saveTitle(e.target.value)}
          placeholder={job.service || 'Untitled job'}
          className="text-2xl font-extrabold tracking-tight bg-transparent outline-none w-full placeholder:text-neutral-300"
        />
        <div className="text-neutral-500 text-sm mt-0.5">
          {job.contact?.name || 'No contact'}
          {job.contact?.phone ? ` · ${job.contact.phone}` : ''}
          {job.service ? ` · ${job.service}` : ''}
        </div>
      </div>

      {/* Process bar */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {stages.map((s) => {
          const active = s.id === job.stage_id;
          return (
            <button
              key={s.id}
              onClick={() => setStage(s.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition"
              style={
                active
                  ? { backgroundColor: s.color, color: 'white' }
                  : { backgroundColor: '#fff', color: '#6b7280', border: '1px solid #ece3ca' }
              }
            >
              {s.name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks */}
        <div className="rounded-2xl bg-white border border-[#ece3ca] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold">Tasks</div>
            <div className="text-xs text-neutral-400">
              {doneCount}/{tasks.length}
            </div>
          </div>
          <div className="space-y-1.5 mb-3">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 group">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={(e) => toggleTask(t.id, job.id, e.target.checked).then(refresh)}
                  className="w-4 h-4 accent-[#CF0000]"
                />
                <span className={`flex-1 text-sm ${t.done ? 'line-through text-neutral-300' : ''}`}>
                  {t.title}
                </span>
                <button
                  onClick={() => deleteTask(t.id, job.id).then(refresh)}
                  className="text-neutral-200 group-hover:text-[#CF0000] text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-sm text-neutral-300">No tasks yet.</p>}
          </div>
          <div className="flex gap-2">
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddTask()}
              placeholder="Add a task…"
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#CF0000]"
            />
            <button onClick={onAddTask} className="rounded-lg bg-[#CF0000] text-white px-3 text-sm font-bold">
              +
            </button>
          </div>
        </div>

        {/* Materials */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#ece3ca] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold">Materials &amp; sourcing</div>
            <button onClick={openAdd} className="rounded-full bg-[#CF0000] text-white font-bold px-4 py-2 text-sm">
              + Add material
            </button>
          </div>
          {materials.length === 0 ? (
            <p className="text-sm text-neutral-300 py-6 text-center">
              No materials yet. Add one — paste a product link and let AI fill in the details.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {materials.map((m) => {
                const st = MAT_STATUS.find((s) => s.value === m.status) || MAT_STATUS[0];
                return (
                  <div key={m.id} className="border border-neutral-100 rounded-xl p-3 flex gap-3">
                    {m.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.image_url} alt="" className="w-16 h-16 rounded-lg object-cover bg-neutral-50 shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-[#FFF6E1] shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <button onClick={() => openEdit(m)} className="font-semibold text-sm hover:text-[#CF0000] block truncate w-full text-left">
                        {m.name || 'Untitled item'}
                      </button>
                      <div className="text-xs text-neutral-400 truncate">
                        {[m.vendor, m.room].filter(Boolean).join(' · ') || '—'}
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-sm font-semibold">{money(m.price_cents) || '—'}</span>
                        <select
                          value={m.status}
                          onChange={(e) => setMaterialStatus(m.id, job.id, e.target.value).then(refresh)}
                          className="text-[11px] font-semibold rounded-full px-2 py-0.5 text-white outline-none cursor-pointer"
                          style={{ backgroundColor: st.color }}
                        >
                          {MAT_STATUS.map((s) => (
                            <option key={s.value} value={s.value} className="text-neutral-900 bg-white">
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Material slide-over */}
      {matOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMatOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold">{matEditingId ? 'Edit material' : 'Add material'}</h2>
              <button onClick={() => setMatOpen(false)} className="text-neutral-400 hover:text-neutral-700">✕</button>
            </div>

            {/* AI autofill */}
            <div className="rounded-xl bg-[#FFF6E1] p-3 mb-4">
              <div className="text-xs font-semibold text-neutral-600 mb-1.5">Paste a product link → auto-fill</div>
              <div className="flex gap-2">
                <input
                  value={mat.url}
                  onChange={(e) => setMat({ ...mat, url: e.target.value })}
                  placeholder="https://…"
                  className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#CF0000]"
                />
                <button
                  onClick={autofill}
                  disabled={autofillBusy}
                  className="rounded-lg bg-neutral-900 text-white px-3 text-sm font-bold disabled:opacity-60 whitespace-nowrap"
                >
                  {autofillBusy ? '…' : '✨ Fill'}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <input value={mat.name} onChange={(e) => setMat({ ...mat, name: e.target.value })} placeholder="Name" className={input} />
              <input value={mat.vendor} onChange={(e) => setMat({ ...mat, vendor: e.target.value })} placeholder="Vendor / brand" className={input} />
              <div className="grid grid-cols-2 gap-3">
                <input value={mat.price} onChange={(e) => setMat({ ...mat, price: e.target.value })} placeholder="Price ($)" className={input} />
                <input value={mat.quantity} onChange={(e) => setMat({ ...mat, quantity: e.target.value })} placeholder="Qty" className={input} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={mat.room} onChange={(e) => setMat({ ...mat, room: e.target.value })} placeholder="Room" className={input} />
                <input value={mat.sku} onChange={(e) => setMat({ ...mat, sku: e.target.value })} placeholder="SKU / model" className={input} />
              </div>
              <input value={mat.dimensions} onChange={(e) => setMat({ ...mat, dimensions: e.target.value })} placeholder="Dimensions" className={input} />
              <input value={mat.lead_time} onChange={(e) => setMat({ ...mat, lead_time: e.target.value })} placeholder="Lead time" className={input} />
              <input value={mat.image_url} onChange={(e) => setMat({ ...mat, image_url: e.target.value })} placeholder="Image URL" className={input} />
              <select value={mat.status} onChange={(e) => setMat({ ...mat, status: e.target.value })} className={input}>
                {MAT_STATUS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <textarea value={mat.notes} onChange={(e) => setMat({ ...mat, notes: e.target.value })} placeholder="Notes" rows={3} className={input} />
              {error && <p className="text-sm text-[#b00000]">{error}</p>}
              <div className="flex gap-2">
                <button onClick={saveMat} disabled={busy} className="flex-1 rounded-full bg-[#CF0000] text-white font-bold py-2.5 disabled:opacity-60">
                  {busy ? 'Saving…' : matEditingId ? 'Save' : 'Add material'}
                </button>
                {matEditingId && (
                  <button
                    onClick={() => { if (confirm('Delete this material?')) deleteMaterial(matEditingId, job.id).then(() => { setMatOpen(false); refresh(); }); }}
                    className="rounded-full border border-neutral-200 text-neutral-500 px-4 hover:text-[#CF0000]"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
