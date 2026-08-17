'use client';

import Link from 'next/link';

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
export type CallRow = { id: string; started_at: string | null; outcome: string | null };
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
      <Link href="/contacts" className="text-sm text-neutral-400 hover:text-neutral-700">← Contacts</Link>

      <div className="flex items-center gap-4 mt-2 mb-6">
        <div className="w-14 h-14 rounded-full bg-[#FFF6E1] grid place-items-center text-xl font-extrabold text-[#CF0000]">
          {(contact.name || '?').slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{contact.name || 'Unnamed'}</h1>
          <div className="text-neutral-500 text-sm">
            {[contact.phone, contact.email].filter(Boolean).join(' · ') || 'No contact info'}
            {' · '}
            <span className="text-neutral-400">{contact.source === 'ai_call' ? 'from an AI call' : 'added manually'}</span>
          </div>
        </div>
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
                        <span className="text-[11px] px-2 py-0.5 rounded-full text-white shrink-0 ml-2" style={{ backgroundColor: j.stage.color || '#9aa0b4' }}>
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

          <div className={`${card} p-5`}>
            <div className="font-bold mb-3">Calls</div>
            {calls.length ? (
              <ul className="space-y-2.5">
                {calls.map((c) => (
                  <li key={c.id} className="text-sm flex items-center justify-between">
                    <span>{date(c.started_at)}</span>
                    <span className="text-xs text-neutral-400 capitalize">{c.outcome || 'call'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">No calls logged.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
