'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ConfirmButton from '@/components/confirm-button';
import {
  createAppointment,
  updateAppointment,
  setAppointmentStatus,
  deleteAppointment,
  type AppointmentInput,
} from './actions';

export type Option = { id: string; name: string | null };
export type Appointment = {
  id: string;
  contact_id: string | null;
  job_id: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  notes: string | null;
  contact: { id: string; name: string | null } | null;
  job: { id: string; title: string | null; service: string | null } | null;
};

const input =
  'w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-[15px] outline-none focus:border-[#CF0000]';

const APPT_STATUS: { value: string; label: string; color: string }[] = [
  { value: 'scheduled', label: 'Scheduled', color: '#6b7280' },
  { value: 'confirmed', label: 'Confirmed', color: '#067a63' },
  { value: 'completed', label: 'Completed', color: '#4a3fd6' },
  { value: 'canceled', label: 'Canceled', color: '#b91c1c' },
];
const statusColor = (s: string) => APPT_STATUS.find((x) => x.value === s)?.color ?? '#6b7280';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: number) {
  return n.toString().padStart(2, '0');
}
function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** ISO string -> value for <input type="datetime-local"> in local time. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const emptyForm: AppointmentInput = {
  contact_id: '', job_id: '', starts_at: '', ends_at: '', status: 'scheduled', notes: '',
};

export default function AppointmentsClient({
  businessId,
  timezone,
  initial,
  contacts,
  jobs,
}: {
  businessId: string;
  timezone: string;
  initial: Appointment[];
  contacts: Option[];
  jobs: Option[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // local datetime-local strings for the two time inputs
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [form, setForm] = useState<AppointmentInput>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of initial) {
      const k = dateKey(new Date(a.starts_at));
      (map.get(k) ?? map.set(k, []).get(k)!).push(a);
    }
    return map;
  }, [initial]);

  // Build a 6-week grid starting from the Sunday on/before the 1st.
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [view]);

  function refresh() {
    router.refresh();
  }
  function prevMonth() {
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  }
  function nextMonth() {
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));
  }
  function goToday() {
    setView({ y: today.getFullYear(), m: today.getMonth() });
  }

  function openAdd(day?: Date) {
    setEditingId(null);
    setForm(emptyForm);
    const base = day ?? new Date();
    const s = new Date(base);
    s.setHours(9, 0, 0, 0);
    setStart(toLocalInput(s.toISOString()));
    setEnd('');
    setError(null);
    setOpen(true);
  }

  // Opened via the ⌘K "New appointment" command (/appointments?new=1)
  useEffect(() => {
    if (params.get('new') === '1') {
      openAdd();
      router.replace('/appointments');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, router]);
  function openEdit(a: Appointment) {
    setEditingId(a.id);
    setForm({
      contact_id: a.contact_id ?? '', job_id: a.job_id ?? '',
      status: a.status, notes: a.notes ?? '',
    });
    setStart(toLocalInput(a.starts_at));
    setEnd(a.ends_at ? toLocalInput(a.ends_at) : '');
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (!start) {
      setError('Pick a date and time.');
      return;
    }
    setBusy(true);
    setError(null);
    const payload: AppointmentInput = {
      ...form,
      starts_at: new Date(start).toISOString(),
      ends_at: end ? new Date(end).toISOString() : '',
    };
    const res = editingId ? await updateAppointment(editingId, payload, businessId) : await createAppointment(businessId, payload);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Something went wrong');
      return;
    }
    setOpen(false);
    refresh();
  }
  async function remove() {
    if (!editingId) return;
    await deleteAppointment(editingId, businessId);
    setOpen(false);
    refresh();
  }

  const todayKey = dateKey(today);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Appointments</h1>
          <p className="text-neutral-500 text-sm">
            {MONTHS[view.m]} {view.y} · <span className="text-neutral-400">{timezone}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-[#ece3ca] bg-white">
            <button onClick={prevMonth} className="px-3 py-1.5 text-neutral-500 hover:text-[#CF0000]">‹</button>
            <button onClick={goToday} className="px-3 py-1.5 text-sm font-semibold border-x border-[#ece3ca]">Today</button>
            <button onClick={nextMonth} className="px-3 py-1.5 text-neutral-500 hover:text-[#CF0000]">›</button>
          </div>
          <button onClick={() => openAdd()} className="rounded-full bg-[#CF0000] text-white font-bold px-5 py-2.5">
            + Add
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-[#ece3ca] overflow-hidden">
        {/* weekday header */}
        <div className="grid grid-cols-7 border-b border-neutral-100">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-2 text-[11px] uppercase tracking-wide text-neutral-400 font-semibold text-center">
              {w}
            </div>
          ))}
        </div>
        {/* day grid */}
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === view.m;
            const key = dateKey(d);
            const appts = byDay.get(key) ?? [];
            const isToday = key === todayKey;
            return (
              <div
                key={i}
                onClick={() => openAdd(d)}
                className={`min-h-[96px] border-b border-r border-neutral-100 p-1.5 cursor-pointer transition hover:bg-[#FFFBF0] ${
                  inMonth ? '' : 'bg-neutral-50/50'
                }`}
              >
                <div className="flex justify-end">
                  <span
                    className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-[#CF0000] text-white' : inMonth ? 'text-neutral-600' : 'text-neutral-300'
                    }`}
                  >
                    {d.getDate()}
                  </span>
                </div>
                <div className="space-y-1 mt-0.5">
                  {appts.slice(0, 3).map((a) => (
                    <button
                      key={a.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(a);
                      }}
                      className={`w-full text-left rounded px-1.5 py-0.5 text-[11px] font-medium text-white truncate ${
                        a.status === 'canceled' ? 'line-through opacity-70' : ''
                      }`}
                      style={{ backgroundColor: statusColor(a.status) }}
                    >
                      {timeLabel(a.starts_at)} {a.contact?.name || a.job?.title || a.job?.service || 'Appt'}
                    </button>
                  ))}
                  {appts.length > 3 && (
                    <div className="text-[10px] text-neutral-400 px-1">+{appts.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slide-over */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-extrabold">{editingId ? 'Edit appointment' : 'New appointment'}</h2>
              <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-700">✕</button>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-semibold">Customer</label>
              <select value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })} className={input}>
                <option value="">— No contact —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name || 'Unnamed'}</option>
                ))}
              </select>

              <label className="block text-sm font-semibold">Job (optional)</label>
              <select value={form.job_id} onChange={(e) => setForm({ ...form, job_id: e.target.value })} className={input}>
                <option value="">— No job —</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">Starts</label>
                  <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={input} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Ends (optional)</label>
                  <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={input} />
                </div>
              </div>

              <label className="block text-sm font-semibold">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={input}>
                {APPT_STATUS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>

              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={3} className={input} />
              {error && <p className="text-sm text-[#b00000]">{error}</p>}
              <div className="flex gap-2">
                <button onClick={save} disabled={busy} className="flex-1 rounded-full bg-[#CF0000] text-white font-bold py-2.5 disabled:opacity-60">
                  {busy ? 'Saving…' : editingId ? 'Save' : 'Add appointment'}
                </button>
                {editingId && (
                  <ConfirmButton
                    onConfirm={remove}
                    label="Delete"
                    confirmLabel="Delete for good"
                    className="rounded-full border border-neutral-200 text-neutral-500 px-4 hover:text-[#CF0000]"
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
