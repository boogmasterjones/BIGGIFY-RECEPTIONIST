'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import CallCard, { type CallLite } from '@/components/call-card';
import ConfirmButton from '@/components/confirm-button';
import BackLink from '@/components/back-link';
import { textOn } from '@/lib/colors';
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
  addRoom,
  updateRoom,
  deleteRoom,
  uploadJobFiles,
  updateJobFile,
  deleteJobFile,
  setFollowupsPaused,
  postJobMessage,
  draftInvoiceFromJob,
  type MaterialInput,
  type RoomInput,
} from './actions';
import { deleteJob } from '../actions';

export type Stage = { id: string; name: string; color: string; position: number };
export type Task = { id: string; title: string; done: boolean; position: number };
export type Room = {
  id: string;
  name: string;
  sqft: number | null;
  dimensions: string | null;
  budget_cents: number | null;
  notes: string | null;
  position: number;
};
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
  room_id: string | null;
  status: string;
  notes: string | null;
  position: number;
};
export type JobFile = {
  id: string;
  name: string | null;
  caption: string | null;
  note: string | null;
  storage_path: string;
  mime: string | null;
  size_bytes: number | null;
  created_at: string;
  url: string | null;
};
export type Message = {
  id: string;
  author_name: string | null;
  source: string;
  body: string;
  created_at: string;
};
export type JobInvoice = {
  id: string;
  number: string | null;
  status: string;
  items: { quantity: number; unit_price_cents: number }[];
};
export type Followup = {
  id: string;
  kind: string; // 'quote' | 'review'
  step: number;
  status: string;
  created_at: string;
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

function fileSize(bytes: number | null) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Total sourced cost of a material line (price × qty). */
function lineTotal(m: Material) {
  if (m.price_cents == null) return 0;
  return m.price_cents * (m.quantity && m.quantity > 0 ? m.quantity : 1);
}

const emptyMat: MaterialInput = {
  name: '', vendor: '', url: '', image_url: '', price: '', sku: '', dimensions: '',
  quantity: '', lead_time: '', room: '', room_id: '', status: 'proposed', notes: '',
};

const emptyRoom: RoomInput = { name: '', sqft: '', dimensions: '', budget: '', notes: '' };

export default function JobDetail({
  businessId,
  job,
  stages,
  tasks,
  materials,
  rooms,
  files,
  messages,
  expensesTotal,
  invoices,
  calls,
  followups,
  followupsPaused,
  quotedAt,
  canInvoice,
}: {
  businessId: string;
  job: Job;
  stages: Stage[];
  tasks: Task[];
  materials: Material[];
  rooms: Room[];
  files: JobFile[];
  messages: Message[];
  expensesTotal: number;
  invoices: JobInvoice[];
  calls: CallLite[];
  followups: Followup[];
  followupsPaused: boolean;
  quotedAt: string | null;
  canInvoice: boolean;
}) {
  const router = useRouter();
  const [taskTitle, setTaskTitle] = useState('');
  const [taskError, setTaskError] = useState<string | null>(null);
  const taskInputRef = useRef<HTMLInputElement>(null);
  const [msgBody, setMsgBody] = useState('');
  const [msgBusy, setMsgBusy] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);
  const [invBusy, setInvBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileEditing, setFileEditing] = useState<JobFile | null>(null);
  const [fileForm, setFileForm] = useState<{ caption: string; note: string }>({ caption: '', note: '' });
  const [matOpen, setMatOpen] = useState(false);
  const [matEditingId, setMatEditingId] = useState<string | null>(null);
  const [mat, setMat] = useState<MaterialInput>(emptyMat);
  const [roomOpen, setRoomOpen] = useState(false);
  const [roomEditingId, setRoomEditingId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomInput>(emptyRoom);
  const [busy, setBusy] = useState(false);
  const [autofillBusy, setAutofillBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    router.refresh();
  }

  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const roomLabel = (m: Material) => (m.room_id ? roomById.get(m.room_id)?.name : null) || m.room || null;
  const materialsInRoom = (roomId: string) => materials.filter((m) => m.room_id === roomId);
  const sourcedForRoom = (roomId: string) =>
    materialsInRoom(roomId).reduce((sum, m) => sum + lineTotal(m), 0);

  const totalPlanned = rooms.reduce((s, r) => s + (r.budget_cents ?? 0), 0);
  const totalSourced = materials.reduce((s, m) => s + lineTotal(m), 0);

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
    if (!taskTitle.trim()) {
      taskInputRef.current?.focus();
      return;
    }
    setTaskError(null);
    const res = await addTask(job.id, businessId, taskTitle);
    if (!res.ok) {
      setTaskError(res.error || 'Could not add the task.');
      return;
    }
    setTaskTitle('');
    refresh();
  }

  // --- files ---
  async function onFilesChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    const fd = new FormData();
    Array.from(list).forEach((f) => fd.append('files', f));
    setUploadBusy(true);
    setUploadError(null);
    const res = await uploadJobFiles(job.id, businessId, fd);
    setUploadBusy(false);
    e.target.value = '';
    if (!res.ok) {
      setUploadError(res.error || 'Upload failed');
      return;
    }
    refresh();
  }
  async function removeFile(f: JobFile) {
    await deleteJobFile(f.id, job.id, f.storage_path);
    setFileEditing(null);
    refresh();
  }
  function openFile(f: JobFile) {
    setFileEditing(f);
    setFileForm({ caption: f.caption ?? '', note: f.note ?? '' });
  }
  async function saveFile() {
    if (!fileEditing) return;
    setBusy(true);
    await updateJobFile(fileEditing.id, job.id, fileForm);
    setBusy(false);
    setFileEditing(null);
    refresh();
  }

  // --- outreach follow-ups ---
  const [paused, setPaused] = useState(followupsPaused);
  async function togglePaused() {
    const next = !paused;
    setPaused(next); // optimistic
    await setFollowupsPaused(job.id, next);
    refresh();
  }

  // --- conversation ---
  async function sendMessage() {
    if (!msgBody.trim()) return;
    setMsgBusy(true);
    setMsgError(null);
    const res = await postJobMessage(job.id, businessId, msgBody);
    setMsgBusy(false);
    if (!res.ok) {
      setMsgError(res.error || 'Could not post the message.');
      return;
    }
    setMsgBody('');
    refresh();
  }

  // --- money ---
  async function draftInvoice() {
    setInvBusy(true);
    const res = await draftInvoiceFromJob(job.id, businessId);
    setInvBusy(false);
    if (res.ok && res.data) router.push(`/money/${res.data.id}`);
    else refresh();
  }

  // --- rooms ---
  function openAddRoom() {
    setRoomEditingId(null);
    setRoom(emptyRoom);
    setError(null);
    setRoomOpen(true);
  }
  function openEditRoom(r: Room) {
    setRoomEditingId(r.id);
    setRoom({
      name: r.name,
      sqft: r.sqft != null ? String(r.sqft) : '',
      dimensions: r.dimensions ?? '',
      budget: r.budget_cents != null ? String(r.budget_cents / 100) : '',
      notes: r.notes ?? '',
    });
    setError(null);
    setRoomOpen(true);
  }
  async function saveRoom() {
    setBusy(true);
    setError(null);
    const res = roomEditingId
      ? await updateRoom(roomEditingId, job.id, room)
      : await addRoom(job.id, businessId, room);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Something went wrong');
      return;
    }
    setRoomOpen(false);
    refresh();
  }

  // --- materials ---
  function openAdd(roomId?: string) {
    setMatEditingId(null);
    setMat({ ...emptyMat, room_id: roomId ?? '' });
    setError(null);
    setMatOpen(true);
  }
  function openEdit(m: Material) {
    setMatEditingId(m.id);
    setMat({
      name: m.name ?? '', vendor: m.vendor ?? '', url: m.url ?? '', image_url: m.image_url ?? '',
      price: m.price_cents != null ? String(m.price_cents / 100) : '',
      sku: m.sku ?? '', dimensions: m.dimensions ?? '', quantity: m.quantity != null ? String(m.quantity) : '',
      lead_time: m.lead_time ?? '', room: m.room ?? '', room_id: m.room_id ?? '', status: m.status, notes: m.notes ?? '',
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
  const unassigned = materials.filter((m) => !m.room_id);

  // --- money: cost / revenue / profit for this job ---
  const invTotal = (inv: JobInvoice) => (inv.items || []).reduce((s, it) => s + it.quantity * it.unit_price_cents, 0);
  const materialsCost = totalSourced;
  const cost = materialsCost + (expensesTotal || 0);
  const invoicedTotal = invoices.reduce((s, inv) => s + invTotal(inv), 0);
  const paidTotal = invoices.filter((i) => i.status === 'paid').reduce((s, inv) => s + invTotal(inv), 0);
  const revenue = invoices.length ? invoicedTotal : job.value_cents ?? 0;
  const profit = revenue - cost;

  async function removeJob() {
    await deleteJob(job.id);
    router.push('/jobs');
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <BackLink fallback="/jobs" />
        <ConfirmButton
          onConfirm={removeJob}
          label="Delete job"
          confirmLabel="Delete for good"
          className="text-xs text-neutral-300 hover:text-[#CF0000] font-semibold"
        />
      </div>

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
      <div className="flex flex-wrap gap-1.5 mb-5">
        {stages.map((s) => {
          const active = s.id === job.stage_id;
          return (
            <button
              key={s.id}
              onClick={() => setStage(s.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition"
              style={
                active
                  ? { backgroundColor: s.color, color: textOn(s.color) }
                  : { backgroundColor: '#fff', color: '#6b7280', border: '1px solid #ece3ca' }
              }
            >
              {s.name}
            </button>
          );
        })}
      </div>

      {/* Budget roll-up */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl bg-white border border-[#ece3ca] px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-neutral-400 font-semibold">Planned budget</div>
          <div className="text-xl font-extrabold mt-0.5">{money(totalPlanned) || '—'}</div>
        </div>
        <div className="rounded-2xl bg-white border border-[#ece3ca] px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-neutral-400 font-semibold">Sourced so far</div>
          <div className="text-xl font-extrabold mt-0.5">{money(totalSourced) || '—'}</div>
        </div>
        <div className="rounded-2xl bg-white border border-[#ece3ca] px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-neutral-400 font-semibold">Remaining</div>
          <div
            className="text-xl font-extrabold mt-0.5"
            style={{ color: totalPlanned && totalSourced > totalPlanned ? '#CF0000' : undefined }}
          >
            {totalPlanned ? money(totalPlanned - totalSourced) : '—'}
          </div>
        </div>
      </div>

      {/* Rooms & planning */}
      <div className="rounded-2xl bg-white border border-[#ece3ca] p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold">Rooms &amp; planning</div>
          <button onClick={openAddRoom} className="rounded-full bg-[#CF0000] text-white font-bold px-4 py-2 text-sm">
            + Add room
          </button>
        </div>
        {rooms.length === 0 ? (
          <p className="text-sm text-neutral-300 py-6 text-center">
            No rooms yet. Add a room to plan footage, budget, and materials for each space.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {rooms.map((r) => {
              const count = materialsInRoom(r.id).length;
              const sourced = sourcedForRoom(r.id);
              const over = r.budget_cents != null && sourced > r.budget_cents;
              return (
                <div key={r.id} className="border border-neutral-100 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <button onClick={() => openEditRoom(r)} className="font-semibold hover:text-[#CF0000] text-left">
                      {r.name}
                    </button>
                    <button
                      onClick={() => openAdd(r.id)}
                      title="Add material to this room"
                      className="text-neutral-300 hover:text-[#CF0000] text-lg leading-none"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {[r.dimensions, r.sqft != null ? `${r.sqft} sq ft` : null].filter(Boolean).join(' · ') || '—'}
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="text-[11px] text-neutral-400">Sourced</div>
                      <div className="text-sm font-semibold" style={{ color: over ? '#CF0000' : undefined }}>
                        {money(sourced) || '$0'}
                        {r.budget_cents != null && (
                          <span className="text-neutral-400 font-normal"> / {money(r.budget_cents)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-neutral-400">{count} item{count === 1 ? '' : 's'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
              ref={taskInputRef}
              value={taskTitle}
              onChange={(e) => { setTaskTitle(e.target.value); if (taskError) setTaskError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && onAddTask()}
              placeholder="Add a task…"
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#CF0000]"
            />
            <button onClick={onAddTask} className="rounded-lg bg-[#CF0000] text-white px-3 text-sm font-bold">
              +
            </button>
          </div>
          {taskError && <p className="text-xs text-[#b00000] mt-2">{taskError}</p>}
        </div>

        {/* Materials */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#ece3ca] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold">Materials &amp; sourcing</div>
            <button onClick={() => openAdd()} className="rounded-full bg-[#CF0000] text-white font-bold px-4 py-2 text-sm">
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
                const label = roomLabel(m);
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
                        {[m.vendor, label].filter(Boolean).join(' · ') || '—'}
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-sm font-semibold">{money(m.price_cents) || '—'}</span>
                        <select
                          value={m.status}
                          onChange={(e) => setMaterialStatus(m.id, job.id, e.target.value).then(refresh)}
                          className="text-[11px] font-semibold rounded-full px-2 py-0.5 outline-none cursor-pointer"
                          style={{ backgroundColor: st.color, color: textOn(st.color) }}
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
          {rooms.length > 0 && unassigned.length > 0 && (
            <p className="text-xs text-neutral-400 mt-3">
              {unassigned.length} item{unassigned.length === 1 ? '' : 's'} not assigned to a room.
            </p>
          )}
        </div>
      </div>

      {/* Files & photos */}
      <div className="rounded-2xl bg-white border border-[#ece3ca] p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold">Files &amp; photos</div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={onFilesChosen}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadBusy}
              className="rounded-full bg-[#CF0000] text-white font-bold px-4 py-2 text-sm disabled:opacity-60"
            >
              {uploadBusy ? 'Uploading…' : '+ Upload'}
            </button>
          </div>
        </div>
        {uploadError && <p className="text-sm text-[#b00000] mb-3">{uploadError}</p>}
        {files.length === 0 ? (
          <p className="text-sm text-neutral-300 py-6 text-center">
            No files yet. Upload plans, site photos, and design assets — up to 25 MB each.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {files.map((f) => {
              const isImg = (f.mime || '').startsWith('image/') && f.url;
              return (
                <button
                  key={f.id}
                  onClick={() => openFile(f)}
                  title="Rename, add a note, or delete"
                  className="group text-left block border border-neutral-100 rounded-xl overflow-hidden hover:border-[#CF0000]"
                >
                  {isImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.url!} alt={f.caption || f.name || ''} className="w-full aspect-square object-cover bg-neutral-50" />
                  ) : (
                    <div className="w-full aspect-square bg-[#FFF6E1] flex items-center justify-center text-2xl">📄</div>
                  )}
                  <div className="p-2">
                    <div className="text-xs font-semibold truncate">{f.caption || f.name || 'File'}</div>
                    {f.note ? (
                      <div className="text-[10px] text-neutral-400 truncate">{f.note}</div>
                    ) : (
                      <div className="text-[10px] text-neutral-300">{fileSize(f.size_bytes)}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* File editor slide-over: name it, add a note, open, or delete */}
      {fileEditing && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog">
          <div className="absolute inset-0 bg-black/30" onClick={() => setFileEditing(null)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold">Photo details</h2>
              <button onClick={() => setFileEditing(null)} className="text-neutral-400 hover:text-neutral-700">✕</button>
            </div>
            {(fileEditing.mime || '').startsWith('image/') && fileEditing.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileEditing.url} alt={fileEditing.caption || fileEditing.name || ''} className="w-full rounded-xl mb-3 bg-neutral-50" />
            ) : (
              <div className="w-full aspect-video bg-[#FFF6E1] rounded-xl mb-3 flex items-center justify-center text-4xl">📄</div>
            )}
            <div className="text-xs text-neutral-400 mb-3 flex items-center justify-between">
              <span className="truncate">{fileEditing.name} · {fileSize(fileEditing.size_bytes)}</span>
              {fileEditing.url && <a href={fileEditing.url} target="_blank" rel="noreferrer" className="text-[#CF0000] font-semibold shrink-0 ml-2">Open ↗</a>}
            </div>
            <div className="space-y-3">
              <input
                value={fileForm.caption}
                onChange={(e) => setFileForm({ ...fileForm, caption: e.target.value })}
                placeholder="Name this photo (e.g. Before — water damage)"
                className={input}
              />
              <textarea
                value={fileForm.note}
                onChange={(e) => setFileForm({ ...fileForm, note: e.target.value })}
                placeholder="Add a note about this photo…"
                rows={4}
                className={input}
              />
              <div className="flex gap-2">
                <button onClick={saveFile} disabled={busy} className="flex-1 rounded-full bg-[#CF0000] text-white font-bold py-2.5 disabled:opacity-60">
                  {busy ? 'Saving…' : 'Save'}
                </button>
                <ConfirmButton
                  onConfirm={() => removeFile(fileEditing)}
                  label="Delete"
                  confirmLabel="Delete for good"
                  className="rounded-full border border-neutral-200 text-neutral-500 px-4 py-2.5 hover:text-[#CF0000]"
                  armedClassName="rounded-full bg-[#CF0000] text-white px-4 py-2.5 text-sm font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Money */}
      <div className="rounded-2xl bg-white border border-[#ece3ca] p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold">Money</div>
          {canInvoice && (
            <button onClick={draftInvoice} disabled={invBusy} className="rounded-full bg-[#CF0000] text-white font-bold px-4 py-2 text-sm disabled:opacity-60">
              {invBusy ? 'Drafting…' : '+ Draft invoice'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl border border-neutral-100 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-neutral-400 font-semibold">Cost</div>
            <div className="text-xl font-extrabold mt-0.5 tabular-nums">{money(cost) || '$0'}</div>
            <div className="text-[11px] text-neutral-400">materials + expenses</div>
          </div>
          <div className="rounded-xl border border-neutral-100 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-neutral-400 font-semibold">Revenue</div>
            <div className="text-xl font-extrabold mt-0.5 tabular-nums">{money(revenue) || '$0'}</div>
            <div className="text-[11px] text-neutral-400">{invoices.length ? `${money(paidTotal) || '$0'} paid` : 'quoted'}</div>
          </div>
          <div className="rounded-xl border border-neutral-100 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-neutral-400 font-semibold">Profit</div>
            <div className="text-xl font-extrabold mt-0.5 tabular-nums" style={{ color: profit < 0 ? '#CF0000' : '#067a63' }}>{money(profit) || '$0'}</div>
            <div className="text-[11px] text-neutral-400">revenue − cost</div>
          </div>
        </div>
        {invoices.length > 0 ? (
          <ul className="divide-y divide-neutral-50">
            {invoices.map((inv) => (
              <li key={inv.id} className="py-2">
                <Link href={`/money/${inv.id}`} className="flex items-center justify-between text-sm hover:text-[#CF0000]">
                  <span className="font-semibold">{inv.number || 'Invoice'}</span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums">{money(invTotal(inv))}</span>
                    <span className="text-xs text-neutral-400 capitalize">{inv.status}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-300">
            {canInvoice ? 'No invoice yet — draft one from this job’s materials in one click.' : 'No invoice yet.'}
          </p>
        )}
      </div>

      {/* Follow-ups — automated quote nudges + review request for this job */}
      <div className="rounded-2xl bg-white border border-[#ece3ca] p-5 mt-6">
        <div className="flex items-center justify-between mb-1">
          <div className="font-bold">Follow-ups</div>
          <button
            onClick={togglePaused}
            className={`text-xs font-bold rounded-full px-3 py-1 border ${paused ? 'border-neutral-200 text-neutral-500 hover:text-neutral-700' : 'border-[#1E9E6A] text-[#1E9E6A]'}`}
          >
            {paused ? 'Auto follow-ups paused — resume' : 'Auto follow-ups on — pause for this job'}
          </button>
        </div>
        <p className="text-xs text-neutral-400 mb-3">
          {quotedAt
            ? `Quote sent ${new Date(quotedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — the Vault nudges unbooked quotes at 3, 7, and 14 days. `
            : 'Set a value on this job to start the quote follow-up clock. '}
          <a href="/settings" className="text-[#CF0000] font-semibold">Turn the automations on in Settings.</a>
        </p>
        {followups.length > 0 ? (
          <ul className="divide-y divide-neutral-50">
            {followups.map((fu) => {
              const label =
                fu.kind === 'review'
                  ? 'Review request'
                  : `Quote nudge · ${fu.step === 1 ? '3-day' : fu.step === 2 ? '7-day' : '14-day'}`;
              return (
                <li key={fu.id} className="py-2 flex items-center gap-3 text-sm">
                  <span>{fu.kind === 'review' ? '⭐' : '💬'}</span>
                  <span className="flex-1 font-medium">{label}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${fu.status === 'sent' ? 'bg-[#E7F6EF] text-[#1E9E6A]' : 'bg-[#FDECEC] text-[#CF0000]'}`}>
                    {fu.status === 'sent' ? 'Sent' : 'Failed'}
                  </span>
                  <span className="text-xs text-neutral-400">{new Date(fu.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-neutral-300">No follow-ups sent yet — they&apos;ll appear here automatically.</p>
        )}
      </div>

      {/* Calls — the receptionist calls that belong to this job */}
      {calls.length > 0 && (
        <div className="rounded-2xl bg-white border border-[#ece3ca] p-5 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold">Calls</div>
            <span className="text-xs text-neutral-400">The call{calls.length === 1 ? '' : 's'} that created this job</span>
          </div>
          <div className="space-y-2">
            {calls.map((c, i) => (
              <CallCard key={c.id} call={c} defaultOpen={i === 0} />
            ))}
          </div>
        </div>
      )}

      {/* Conversation */}
      <div className="rounded-2xl bg-white border border-[#ece3ca] p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold">Conversation</div>
          <span className="text-xs text-neutral-400">Keep the team in the loop — no scattered texts</span>
        </div>
        {messages.length > 0 && (
          <div className="space-y-3 mb-4">
            {messages.map((m) => (
              <div key={m.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FFF6E1] grid place-items-center text-xs font-bold text-[#CF0000] shrink-0">
                  {(m.author_name || '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{m.author_name || 'Someone'}</span>
                    <span className="text-[11px] text-neutral-400">
                      {new Date(m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                    {m.source === 'slack' && <span className="text-[10px] text-neutral-400">via Slack</span>}
                  </div>
                  <p className="text-sm text-neutral-700 whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={msgBody}
            onChange={(e) => setMsgBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendMessage(); }}
            placeholder="Write a note to the team…  (⌘/Ctrl+Enter to send)"
            rows={2}
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#CF0000] resize-none"
          />
          <button onClick={sendMessage} disabled={msgBusy} className="rounded-lg bg-[#CF0000] text-white px-4 text-sm font-bold disabled:opacity-60 self-stretch">
            {msgBusy ? '…' : 'Send'}
          </button>
        </div>
        {msgError && <p className="text-xs text-[#b00000] mt-2">{msgError}</p>}
        <p className="text-[11px] text-neutral-400 mt-2">Internal team log for this job — the customer never sees this.</p>
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
                <select value={mat.room_id} onChange={(e) => setMat({ ...mat, room_id: e.target.value })} className={input}>
                  <option value="">— No room —</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
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
                  <ConfirmButton
                    onConfirm={() => deleteMaterial(matEditingId, job.id).then(() => { setMatOpen(false); refresh(); })}
                    label="Delete"
                    confirmLabel="Delete for good"
                    className="rounded-full border border-neutral-200 text-neutral-500 px-4 py-2.5 hover:text-[#CF0000]"
                    armedClassName="rounded-full bg-[#CF0000] text-white px-4 py-2.5 text-sm font-bold"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room slide-over */}
      {roomOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog">
          <div className="absolute inset-0 bg-black/30" onClick={() => setRoomOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold">{roomEditingId ? 'Edit room' : 'Add room'}</h2>
              <button onClick={() => setRoomOpen(false)} className="text-neutral-400 hover:text-neutral-700">✕</button>
            </div>
            <div className="space-y-3">
              <input value={room.name} onChange={(e) => setRoom({ ...room, name: e.target.value })} placeholder="Room name (e.g. Primary bedroom)" className={input} />
              <div className="grid grid-cols-2 gap-3">
                <input value={room.dimensions} onChange={(e) => setRoom({ ...room, dimensions: e.target.value })} placeholder={`Dimensions (12' x 15')`} className={input} />
                <input value={room.sqft} onChange={(e) => setRoom({ ...room, sqft: e.target.value })} placeholder="Sq ft" className={input} />
              </div>
              <input value={room.budget} onChange={(e) => setRoom({ ...room, budget: e.target.value })} placeholder="Budget ($)" className={input} />
              <textarea value={room.notes} onChange={(e) => setRoom({ ...room, notes: e.target.value })} placeholder="Notes" rows={3} className={input} />
              {error && <p className="text-sm text-[#b00000]">{error}</p>}
              <div className="flex gap-2">
                <button onClick={saveRoom} disabled={busy} className="flex-1 rounded-full bg-[#CF0000] text-white font-bold py-2.5 disabled:opacity-60">
                  {busy ? 'Saving…' : roomEditingId ? 'Save' : 'Add room'}
                </button>
                {roomEditingId && (
                  <ConfirmButton
                    onConfirm={() => deleteRoom(roomEditingId, job.id).then(() => { setRoomOpen(false); refresh(); })}
                    label="Delete"
                    confirmLabel="Delete room"
                    className="rounded-full border border-neutral-200 text-neutral-500 px-4 py-2.5 hover:text-[#CF0000]"
                    armedClassName="rounded-full bg-[#CF0000] text-white px-4 py-2.5 text-sm font-bold"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
