'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createInvoice, addExpense, deleteExpense } from './actions';
import { textOn } from '@/lib/colors';

export type Option = { id: string; name: string | null };
export type Invoice = {
  id: string;
  number: string | null;
  status: string;
  due_at: string | null;
  created_at: string;
  contact: { name: string | null } | null;
  job: { title: string | null; service: string | null } | null;
  items: { quantity: number; unit_price_cents: number }[];
};
export type Expense = {
  id: string;
  description: string | null;
  amount_cents: number;
  category: string | null;
  spent_at: string;
  job: { title: string | null; service: string | null } | null;
};

const input = 'w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-[15px] outline-none focus:border-[#CF0000]';

function money(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function invoiceTotal(inv: Invoice) {
  return (inv.items || []).reduce((s, it) => s + it.quantity * it.unit_price_cents, 0);
}
const STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#6b7280' },
  sent: { label: 'Sent', color: '#9a6b00' },
  paid: { label: 'Paid', color: '#067a63' },
  void: { label: 'Void', color: '#b91c1c' },
};

export default function MoneyClient({
  businessId,
  invoices,
  expenses,
  contacts,
  jobs,
}: {
  businessId: string;
  invoices: Invoice[];
  expenses: Expense[];
  contacts: Option[];
  jobs: Option[];
}) {
  const router = useRouter();
  const [invOpen, setInvOpen] = useState(false);
  const [expOpen, setExpOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';

  const outstanding = invoices
    .filter((i) => i.status === 'draft' || i.status === 'sent')
    .reduce((s, i) => s + invoiceTotal(i), 0);
  const overdue = invoices
    .filter((i) => i.status === 'sent' && i.due_at && i.due_at < today)
    .reduce((s, i) => s + invoiceTotal(i), 0);
  const collectedMonth = invoices
    .filter((i) => i.status === 'paid' && i.created_at.slice(0, 10) >= monthStart)
    .reduce((s, i) => s + invoiceTotal(i), 0);
  const expensesMonth = expenses.filter((e) => e.spent_at >= monthStart).reduce((s, e) => s + e.amount_cents, 0);

  const metrics = [
    { label: 'Outstanding', value: money(outstanding) },
    { label: 'Overdue', value: money(overdue), danger: overdue > 0 },
    { label: 'Collected this month', value: money(collectedMonth) },
    { label: 'Expenses this month', value: money(expensesMonth) },
  ];

  async function newInvoice(form: FormData) {
    setBusy(true);
    setError(null);
    const res = await createInvoice(businessId, {
      contact_id: String(form.get('contact_id') || ''),
      job_id: String(form.get('job_id') || ''),
      due_at: String(form.get('due_at') || ''),
    });
    setBusy(false);
    if (!res.ok) return setError(res.error || 'Something went wrong');
    setInvOpen(false);
    if (res.id) router.push(`/money/${res.id}`);
    else router.refresh();
  }

  async function newExpense(form: FormData) {
    setBusy(true);
    setError(null);
    const res = await addExpense(businessId, {
      description: String(form.get('description') || ''),
      amount: String(form.get('amount') || ''),
      category: String(form.get('category') || ''),
      job_id: String(form.get('job_id') || ''),
      spent_at: String(form.get('spent_at') || ''),
    });
    setBusy(false);
    if (!res.ok) return setError(res.error || 'Something went wrong');
    setExpOpen(false);
    router.refresh();
  }

  const card = 'rounded-2xl bg-white border border-[#ece3ca]';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Money</h1>
          <p className="text-neutral-500 text-sm">Invoices, expenses, and what you&apos;re owed.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setExpOpen(true); setError(null); }} className="rounded-full border border-[#ece3ca] bg-white px-4 py-2.5 text-sm font-semibold text-neutral-600">
            + Expense
          </button>
          <button onClick={() => { setInvOpen(true); setError(null); }} className="rounded-full bg-[#CF0000] text-white font-bold px-5 py-2.5">
            + Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {metrics.map((m) => (
          <div key={m.label} className={`${card} p-5`}>
            <div className="text-2xl font-extrabold tabular-nums" style={{ color: m.danger ? '#CF0000' : undefined }}>{m.value}</div>
            <div className="text-sm text-neutral-500 mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoices */}
        <div className="lg:col-span-2">
          <div className="font-bold mb-3">Invoices</div>
          <div className={`${card} overflow-hidden`}>
            {invoices.length === 0 ? (
              <div className="p-10 text-center text-neutral-400 text-sm">No invoices yet. Draft one from a job in one click.</div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {invoices.map((inv) => {
                    const st = STATUS[inv.status] || STATUS.draft;
                    const overdueRow = inv.status === 'sent' && inv.due_at && inv.due_at < today;
                    return (
                      <tr key={inv.id} className="border-b border-neutral-50 hover:bg-[#FFFBF0]">
                        <td className="px-5 py-3">
                          <Link href={`/money/${inv.id}`} className="font-semibold hover:text-[#CF0000]">
                            {inv.number || 'Draft'}
                          </Link>
                          <div className="text-xs text-neutral-400">{inv.contact?.name || inv.job?.title || inv.job?.service || '—'}</div>
                        </td>
                        <td className="px-5 py-3 font-semibold tabular-nums">{money(invoiceTotal(inv))}</td>
                        <td className="px-5 py-3">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: overdueRow ? '#CF0000' : st.color, color: textOn(overdueRow ? '#CF0000' : st.color) }}>
                            {overdueRow ? 'Overdue' : st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Expenses */}
        <div>
          <div className="font-bold mb-3">Recent expenses</div>
          <div className={`${card} overflow-hidden`}>
            {expenses.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 text-sm">No expenses logged.</div>
            ) : (
              <ul className="divide-y divide-neutral-50">
                {expenses.slice(0, 12).map((e) => (
                  <li key={e.id} className="px-4 py-2.5 flex items-center justify-between group">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{e.description || 'Expense'}</div>
                      <div className="text-xs text-neutral-400">
                        {[e.category, e.job?.title || e.job?.service].filter(Boolean).join(' · ') || e.spent_at}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold tabular-nums">{money(e.amount_cents)}</span>
                      <button onClick={() => deleteExpense(e.id).then(() => router.refresh())} className="text-neutral-200 group-hover:text-[#CF0000] text-xs">✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* New invoice slide-over */}
      {invOpen && (
        <Slideover title="New invoice" onClose={() => setInvOpen(false)}>
          <form action={newInvoice} className="space-y-3">
            <label className="block text-sm font-semibold">From a job (auto-fills line items)</label>
            <select name="job_id" className={input}>
              <option value="">— No job —</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
            </select>
            <label className="block text-sm font-semibold">Customer</label>
            <select name="contact_id" className={input}>
              <option value="">— From job / none —</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name || 'Unnamed'}</option>)}
            </select>
            <label className="block text-sm font-semibold">Due date</label>
            <input type="date" name="due_at" className={input} />
            {error && <p className="text-sm text-[#b00000]">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-full bg-[#CF0000] text-white font-bold py-2.5 disabled:opacity-60">
              {busy ? 'Creating…' : 'Create draft'}
            </button>
          </form>
        </Slideover>
      )}

      {/* New expense slide-over */}
      {expOpen && (
        <Slideover title="Log expense" onClose={() => setExpOpen(false)}>
          <form action={newExpense} className="space-y-3">
            <input name="description" placeholder="What was it for?" className={input} />
            <div className="grid grid-cols-2 gap-3">
              <input name="amount" placeholder="Amount ($)" className={input} />
              <input type="date" name="spent_at" defaultValue={today} className={input} />
            </div>
            <input name="category" placeholder="Category (materials, gas, tools…)" className={input} />
            <label className="block text-sm font-semibold">Job (optional)</label>
            <select name="job_id" className={input}>
              <option value="">— No job —</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
            </select>
            {error && <p className="text-sm text-[#b00000]">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-full bg-[#CF0000] text-white font-bold py-2.5 disabled:opacity-60">
              {busy ? 'Saving…' : 'Log expense'}
            </button>
          </form>
        </Slideover>
      )}
    </div>
  );
}

function Slideover({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
