'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createJob, updateJob, setJobStage, deleteJob } from './actions';

export type Stage = { id: string; name: string; color: string; position: number };
export type ContactOption = { id: string; name: string | null };
export type Job = {
  id: string;
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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stageById = new Map(stages.map((s) => [s.id, s]));

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

  async function changeStage(id: string, stageId: string) {
    await setJobStage(id, stageId);
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
          <p className="text-neutral-500">
            Your pipeline — customize the stages in{' '}
            <a href="/settings" className="text-[#CF0000] underline">
              Settings
            </a>
            .
          </p>
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
                <th className="px-5 py-3 font-semibold">Stage</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {initial.map((j) => {
                const stage = j.stage_id ? stageById.get(j.stage_id) : null;
                return (
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
                        value={j.stage_id ?? ''}
                        onChange={(e) => changeStage(j.id, e.target.value)}
                        className="text-[12px] font-semibold rounded-full px-2.5 py-1 outline-none cursor-pointer text-white"
                        style={{ backgroundColor: stage?.color ?? '#9aa0b4' }}
                      >
                        {stages.map((s) => (
                          <option key={s.id} value={s.id} className="text-neutral-900 bg-white">
                            {s.name}
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
                );
              })}
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
