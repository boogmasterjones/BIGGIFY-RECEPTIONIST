'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CallCard from '@/components/call-card';
import BackLink from '@/components/back-link';
import { textOn } from '@/lib/colors';
import { updateContact } from '../actions';

export type Contact = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  source: string;
  created_at: string;
};
export type JobRow = { id: string; title: string | null; service: string | null; created_at: string; stage: { name: string | null; color: string | null } | null };
export type ApptRow = { id: string; starts_at: string; status: string };
export type CallRow = {
  id: string;
  from_number: string | null;
  started_at: string | null;
  ended_at: string | null;
  outcome: string | null;
  transcript: { role: string; text: string }[] | null;
};
export type InvoiceRow = { id: string; number: string | null; status: string; items: { quantity: number; unit_price_cents: number }[] };

function money(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function invTotal(inv: InvoiceRow) {
  return (inv.items || []).reduce((s, it) => s + it.quantity * it.unit_price_cents, 0);
}
function date(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export default function ContactDetail({
  contact,
  jobs,
  appts,
  calls,
  invoices,
}: {
  contact: Contact;
  jobs: JobRow[];
  appts: ApptRow[];
  calls: CallRow[];
  invoices: InvoiceRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(form: FormData) {
    setBusy(true);
    setError(null);
    const res = await updateContact(contact.id, {
      name: String(form.get('name') || ''),
      phone: String(form.get('phone') || ''),
      email: String(form.get('email') || ''),
      address: String(form.get('address') || ''),
      tags: String(form.get('tags') || ''),
      notes: String(form.get('notes') || ''),
    });
    setBusy(false);
    if (!res.ok) return setError(res.error || 'Something went wrong');
    setOpen(false);
    router.refresh();
  }

  const editInput = 'w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-[15px] outline-none focus:border-[#CF0000]';

  const lifetime = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + invTotal(i), 0);
  const outstanding = invoices.filter((i) => i.status === 'draft' || i.status === 'sent').reduce((s, i) => s + invTotal(i), 0);

  const stats = [
    { label: 'Jobs', value: String(jobs.length) },
    { label: 'Lifetime value', value: money(lifetime) },
    { label: 'Outstanding', value: money(outstanding) },
  ];
  const card = 'rounded-2xl bg-white border border-[#ece3ca]';

  return (
    <div>
      <BackLink fallback="/contacts" />

      <div className="flex items-center gap-4 mt-2 mb-6">
        <div className="w-14 h-14 rounded-full bg-[#FFF6E1] grid place-items-center text-xl font-extrabold text-[#CF0000] shrink-0">
          {(contact.name || '?').slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight truncate">{contact.name || 'Unnamed'}</h1>
          <div className="text-neutral-500 text-sm">
            {[contact.phone, contact.email].filter(Boolean).join(' · ') || 'No contact info'}
            {' · '}
            <span className="text-neutral-400">{contact.source === 'ai_call' ? 'from an AI call' : 'added manually'}</span>
          </div>
        </div>
        <button onClick={() => { setError(null); setOpen(true); }} className="ml-auto shrink-0 rounded-full border border-[#ece3ca] bg-white px-4 py-2 text-sm font-bold text-neutral-600 hover:text-[#CF0000] hover:border-[#e0d4b0]">
          Edit
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className={`${card} p-5`}>
            <div className="text-2xl font-extrabold tabular-nums">{s.value}</div>
            <div className="text-sm text-neutral-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Jobs */}
          <div className={`${card} p-5`}>
            <div className="font-bold mb-3">Jobs</div>
            {jobs.length ? (
              <ul className="divide-y divide-neutral-50">
                {jobs.map((j) => (
                  <li key={j.id} className="py-2.5">
                    <Link href={`/jobs/${j.id}`} className="flex items-center justify-between text-sm hover:text-[#CF0000]">
                      <span className="truncate">
                        <span className="font-semibold">{j.title || j.service || 'Job'}</span>
                        <span className="text-neutral-400"> · {date(j.created_at)}</span>
                      </span>
                      {j.stage?.name && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full shrink-0 ml-2" style={{ backgroundColor: j.stage.color || '#9aa0b4', color: textOn(j.stage.color || '#9aa0b4') }}>
                          {j.stage.name}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">No jobs yet.</p>
            )}
          </div>

          {/* Invoices */}
          <div className={`${card} p-5`}>
            <div className="font-bold mb-3">Invoices</div>
            {invoices.length ? (
              <ul className="divide-y divide-neutral-50">
                {invoices.map((inv) => (
                  <li key={inv.id} className="py-2.5">
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
              <p className="text-sm text-neutral-400">No invoices yet.</p>
            )}
          </div>

          {/* Calls — expand any one to read the full transcript */}
          <div className={`${card} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold">Calls</div>
              {calls.length > 0 && <span className="text-xs text-neutral-400">{calls.length} on record</span>}
            </div>
            {calls.length ? (
              <div className="space-y-2">
                {calls.map((c, i) => (
                  <CallCard key={c.id} call={c} defaultOpen={i === 0} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No calls logged.</p>
            )}
          </div>

          {contact.notes && (
            <div className={`${card} p-5`}>
              <div className="font-bold mb-2">Notes</div>
              <p className="text-sm text-neutral-600 whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}
        </div>

        {/* Activity */}
        <div className="space-y-6">
          <div className={`${card} p-5`}>
            <div className="font-bold mb-3">Appointments</div>
            {appts.length ? (
              <ul className="space-y-2.5">
                {appts.map((a) => (
                  <li key={a.id} className="text-sm flex items-center justify-between">
                    <span>{date(a.starts_at)}</span>
                    <span className="text-xs text-neutral-400 capitalize">{a.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">None.</p>
            )}
          </div>

        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-extrabold">Edit contact</h2>
              <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-700">✕</button>
            </div>
            <form action={save} className="space-y-3">
              <input name="name" defaultValue={contact.name ?? ''} placeholder="Name" className={editInput} />
              <div className="grid grid-cols-2 gap-3">
                <input name="phone" defaultValue={contact.phone ?? ''} placeholder="Phone" className={editInput} />
                <input name="email" defaultValue={contact.email ?? ''} placeholder="Email" className={editInput} />
              </div>
              <input name="address" defaultValue={contact.address ?? ''} placeholder="Address" className={editInput} />
              <input name="tags" defaultValue={(contact.tags || []).join(', ')} placeholder="Tags (comma-separated)" className={editInput} />
              <textarea name="notes" defaultValue={contact.notes ?? ''} placeholder="Notes" rows={4} className={editInput} />
              {error && <p className="text-sm text-[#b00000]">{error}</p>}
              <button type="submit" disabled={busy} className="w-full rounded-full bg-[#CF0000] text-white font-bold py-2.5 disabled:opacity-60">
                {busy ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
