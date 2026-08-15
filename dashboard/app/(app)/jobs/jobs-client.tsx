'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createJob,
  updateJob,
  setJobStatus,
  deleteJob,
  type JobStatus,
} from './actions';

export type Job = {
  id: string;
  contact_id: string | null;
  service: string | null;
  description: string | null;
  status: JobStatus;
  value_cents: number | null;
  source: string;
  created_at: string;
  contact: { id: string; name: string | null } | null;
};

export type ContactOption = { id: string; name: string | null };

const STATUSES: { value: JobStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'lost', label: 'Lost' },
];

const statusColor: Record<JobStatus, string> = {
  new: 'bg-[#eef0ff] text-[#4a3fd6]',
  scheduled: 'bg-[#fff5e6] text-[#9a6b00]',
  in_progress: 'bg-[#e6f3ff] text-[#0369a1]',
  done: 'bg-[#e6fbf4] text-[#067a63]',
  canceled: 'bg-neutral-100 text-neutral-500',
  lost: 'bg-[#ffe9e9] text-[#b02020]',
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
}: {
  businessId: string;
  initial: Job[];
  contacts: ContactOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      contact_id: String(form.get('contact_id') || ''),
      service: String(form.get('service') || ''),
      description: String(form.get('description') || ''),
      status: String(form.get('status') || 'new') as JobStatus,
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

  async function changeStatus(id: string, status: JobStatus) {
    await setJobStatus(id, status);
    router.refresh();
  }

  async function remove(j: Job) {
    if (!confirm('Delete this job?')) return;
    await deleteJob(j.id);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Jobs</h1>
          <p className="text-neutral-500">Your lead &amp; work pipeline — new to done.</p>
        </div>
        <button onClick={startAdd} className="rounded-full bg-[#CF0000] text-white font-bold px-5 py-2.5">
          + Add job
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-[#ece3ca] overflow-hidden">
        {initial.length === 0 ? (
          <div className="p-10 text-center text-neutral-400">
            No jobs yet. Add one, or they&apos;ll appear here as the AI books calls.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Service</th>
                <th className="px-5 py-3 font-semibold">Value</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {initial.map((j) => (
                <tr key={j.id} className="border-b border-neutral-50 hover:bg-[#FFFBF0]">
                  <td className="px-5 py-3">
                    <button onClick={() => startEdit(j)} className="font-semibold hover:text-[#CF0000]">
                      {j.contact?.name || 'No contact'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-neutral-600">{j.service || '—'}</td>
                  <td className="px-5 py-3 text-neutral-600">{money(j.value_cents)}</td>
                  <td className="px-5 py-3">
                    <select
                      value={j.status}
                      onChange={(e) => changeStatus(j.id, e.target.value as JobStatus)}
                      className={`text-[12px] font-semibold rounded-full px-2.5 py-1 border-0 outline-none cursor-pointer ${statusColor[j.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => remove(j)} className="text-neutral-300 hover:text-[#CF0000] text-sm">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
              <label className="block text-sm font-semibold">Status</label>
              <select name="status" defaultValue={editing?.status ?? 'new'} className={input}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
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
