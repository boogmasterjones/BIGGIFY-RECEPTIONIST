'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addInvoiceItem, deleteInvoiceItem, updateInvoice, deleteInvoice, requestPayment } from '../actions';
import { burst } from '@/components/confetti';
import ConfirmButton from '@/components/confirm-button';
import BackLink from '@/components/back-link';
import { textOn } from '@/lib/colors';

export type Item = { id: string; description: string | null; quantity: number; unit_price_cents: number; position: number };
export type Invoice = {
  id: string;
  number: string | null;
  status: string;
  issued_at: string | null;
  due_at: string | null;
  notes: string | null;
  contact: { name: string | null; email: string | null; phone: string | null } | null;
  job: { id: string; title: string | null; service: string | null } | null;
};

const input = 'rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#CF0000]';
function money(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

const FLOW = ['draft', 'sent', 'paid'];
const STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#6b7280' },
  sent: { label: 'Sent', color: '#9a6b00' },
  paid: { label: 'Paid', color: '#067a63' },
  void: { label: 'Void', color: '#b91c1c' },
};

export default function InvoiceDetail({
  businessId,
  businessName,
  invoice,
  items,
}: {
  businessId: string;
  businessName: string;
  invoice: Invoice;
  items: Item[];
}) {
  const router = useRouter();
  const [desc, setDesc] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [status, setStatusLocal] = useState(invoice.status); // optimistic
  const [paymentLink, setPaymentLink] = useState<{ url: string; linkId: string } | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const total = items.reduce((s, it) => s + it.quantity * it.unit_price_cents, 0);

  async function add() {
    if (!desc.trim() && !price) return;
    await addInvoiceItem(invoice.id, businessId, { description: desc, quantity: qty, unit_price: price });
    setDesc(''); setQty('1'); setPrice('');
    router.refresh();
  }
  async function setStatus(next: string, e?: React.MouseEvent) {
    const wasPaid = status === 'paid';
    setStatusLocal(next); // optimistic — the pill/flow update instantly
    if (next === 'paid' && !wasPaid) {
      const x = e ? e.clientX : window.innerWidth / 2;
      const y = e ? e.clientY : window.innerHeight / 2;
      burst(x, y);
    }
    await updateInvoice(invoice.id, { status: next });
    router.refresh();
  }
  async function setDue(due_at: string) {
    await updateInvoice(invoice.id, { due_at });
    router.refresh();
  }
  async function remove() {
    await deleteInvoice(invoice.id);
    router.push('/money');
  }
  async function requestPaymentLink() {
    if (total === 0) {
      setPaymentError('Invoice total must be greater than $0');
      return;
    }
    setRequesting(true);
    setPaymentError(null);
    const result = await requestPayment(
      businessId,
      invoice.id,
      invoice.number,
      total,
      invoice.contact?.email || undefined,
      invoice.contact?.name || undefined
    );
    setRequesting(false);
    if (!result.ok) {
      setPaymentError(result.error || 'Failed to create payment link');
      return;
    }
    setPaymentLink({ url: result.url!, linkId: result.linkId! });
    // Update status to "sent"
    await updateInvoice(invoice.id, { status: 'sent' });
    setStatusLocal('sent');
    router.refresh();
  }

  const st = STATUS[status] || STATUS.draft;

  return (
    <div>
      <BackLink fallback="/money" />

      <div className="flex items-start justify-between mt-2 mb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{invoice.number || 'Invoice'}</h1>
          <div className="text-neutral-500 text-sm mt-0.5">
            {invoice.contact?.name || 'No customer'}
            {invoice.job && (
              <> · <Link href={`/jobs/${invoice.job.id}`} className="text-[#CF0000]">{invoice.job.title || invoice.job.service || 'Job'}</Link></>
            )}
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: st.color, color: textOn(st.color) }}>{st.label}</span>
      </div>

      {/* status flow + due */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {FLOW.map((s) => (
          <button
            key={s}
            onClick={(e) => setStatus(s, e)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-transform active:scale-95"
            style={status === s
              ? { backgroundColor: STATUS[s].color, color: 'white', borderColor: STATUS[s].color }
              : { background: 'white', color: '#6b7280', borderColor: '#ece3ca' }}
          >
            {s === 'draft' ? 'Draft' : s === 'sent' ? 'Mark sent' : 'Mark paid'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-sm text-neutral-500">
          <span>Due</span>
          <input type="date" defaultValue={invoice.due_at ?? ''} onChange={(e) => setDue(e.target.value)} className={input} />
        </div>
      </div>

      {/* Payment link section */}
      {paymentLink ? (
        <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="text-sm font-semibold text-emerald-900 mb-2">💰 Payment link ready</div>
          <div className="flex items-center gap-2 mb-2">
            <input type="text" readOnly value={paymentLink.url} className="flex-1 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-mono bg-white" />
            <button onClick={() => { navigator.clipboard.writeText(paymentLink.url); }} className="rounded-lg bg-emerald-600 text-white px-3 py-2 text-xs font-bold hover:bg-emerald-700">
              Copy
            </button>
          </div>
          <div className="text-xs text-emerald-700">Share this link with your customer to collect payment. They pay through Stripe's secure checkout.</div>
        </div>
      ) : (
        <div className="mb-6">
          <button
            onClick={requestPaymentLink}
            disabled={requesting || status === 'paid'}
            className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-bold hover:bg-emerald-700 disabled:opacity-60"
          >
            {requesting ? 'Generating…' : '💳 Request Payment'}
          </button>
          {paymentError && <div className="text-xs text-[#b00000] mt-2">{paymentError}</div>}
        </div>
      )}

      <div className="rounded-2xl bg-white border border-[#ece3ca] p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="font-extrabold text-lg">{businessName}</div>
          <div className="text-right text-sm text-neutral-500">
            {invoice.number}<br />
            {invoice.issued_at && <>Issued {invoice.issued_at}<br /></>}
            {invoice.due_at && <>Due {invoice.due_at}</>}
          </div>
        </div>

        <table className="w-full text-sm mb-2">
          <thead>
            <tr className="text-left text-[12px] uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
              <th className="py-2 font-semibold">Description</th>
              <th className="py-2 font-semibold text-right w-16">Qty</th>
              <th className="py-2 font-semibold text-right w-24">Price</th>
              <th className="py-2 font-semibold text-right w-24">Amount</th>
              <th className="w-6"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-neutral-50 group">
                <td className="py-2.5">{it.description}</td>
                <td className="py-2.5 text-right tabular-nums">{it.quantity}</td>
                <td className="py-2.5 text-right tabular-nums">{money(it.unit_price_cents)}</td>
                <td className="py-2.5 text-right tabular-nums font-medium">{money(it.quantity * it.unit_price_cents)}</td>
                <td className="text-right">
                  <button onClick={() => deleteInvoiceItem(it.id, invoice.id).then(() => router.refresh())} className="text-neutral-200 group-hover:text-[#CF0000] text-xs">✕</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-center text-neutral-300 text-sm">No line items yet.</td></tr>
            )}
          </tbody>
        </table>

        {/* add item row */}
        <div className="flex gap-2 items-center py-3 border-b border-neutral-100">
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Add item…" className={`${input} flex-1`} />
          <input value={qty} onChange={(e) => setQty(e.target.value)} className={`${input} w-14 text-right`} />
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$" className={`${input} w-20 text-right`} />
          <button onClick={add} className="rounded-lg bg-[#CF0000] text-white px-3 py-2 text-sm font-bold">+</button>
        </div>

        <div className="flex justify-end mt-4">
          <div className="text-right">
            <div className="text-sm text-neutral-500">Total</div>
            <div className="text-2xl font-extrabold tabular-nums">{money(total)}</div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ConfirmButton onConfirm={remove} label="Delete invoice" confirmLabel="Delete for good" className="text-sm text-neutral-400 hover:text-[#CF0000]" />
      </div>
    </div>
  );
}
