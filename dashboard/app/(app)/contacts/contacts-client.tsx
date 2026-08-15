'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createContact, updateContact, deleteContact } from './actions';

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

const input =
  'w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-[15px] outline-none focus:border-[#CF0000]';

export default function ContactsClient({
  businessId,
  initial,
}: {
  businessId: string;
  initial: Contact[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startAdd() {
    setEditing(null);
    setError(null);
    setOpen(true);
  }
  function startEdit(c: Contact) {
    setEditing(c);
    setError(null);
    setOpen(true);
  }

  async function save(form: FormData) {
    setBusy(true);
    setError(null);
    const payload = {
      name: String(form.get('name') || ''),
      phone: String(form.get('phone') || ''),
      email: String(form.get('email') || ''),
      address: String(form.get('address') || ''),
      notes: String(form.get('notes') || ''),
      tags: String(form.get('tags') || ''),
    };
    const res = editing
      ? await updateContact(editing.id, payload)
      : await createContact(businessId, payload);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Something went wrong');
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function remove(c: Contact) {
    if (!confirm(`Delete ${c.name || 'this contact'}?`)) return;
    await deleteContact(c.id);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Contacts</h1>
          <p className="text-neutral-500">Every customer — added by hand or captured by the AI.</p>
        </div>
        <button
          onClick={startAdd}
          className="rounded-full bg-[#CF0000] text-white font-bold px-5 py-2.5"
        >
          + Add contact
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-[#ece3ca] overflow-hidden">
        {initial.length === 0 ? (
          <div className="p-10 text-center text-neutral-400">
            No contacts yet. Add one, or they&apos;ll appear here as the AI takes calls.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wide text-neutral-400 border-b border-neutral-100">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Source</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {initial.map((c) => (
                <tr key={c.id} className="border-b border-neutral-50 hover:bg-[#FFFBF0]">
                  <td className="px-5 py-3">
                    <button onClick={() => startEdit(c)} className="font-semibold hover:text-[#CF0000]">
                      {c.name || 'Unnamed'}
                    </button>
                    {c.address && <div className="text-neutral-400 text-xs">{c.address}</div>}
                  </td>
                  <td className="px-5 py-3 text-neutral-600">{c.phone || '—'}</td>
                  <td className="px-5 py-3 text-neutral-600">{c.email || '—'}</td>
                  <td className="px-5 py-3">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FFF6E1] text-neutral-500">
                      {c.source === 'ai_call' ? 'AI call' : 'manual'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => remove(c)}
                      className="text-neutral-300 hover:text-[#CF0000] text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-over form */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-extrabold">{editing ? 'Edit contact' : 'Add contact'}</h2>
              <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-700">
                ✕
              </button>
            </div>
            <form action={save} className="space-y-3">
              <input name="name" defaultValue={editing?.name ?? ''} placeholder="Name" className={input} />
              <input name="phone" defaultValue={editing?.phone ?? ''} placeholder="Phone" className={input} />
              <input name="email" defaultValue={editing?.email ?? ''} placeholder="Email" className={input} />
              <input name="address" defaultValue={editing?.address ?? ''} placeholder="Address" className={input} />
              <input name="tags" defaultValue={editing?.tags?.join(', ') ?? ''} placeholder="Tags (comma-separated)" className={input} />
              <textarea name="notes" defaultValue={editing?.notes ?? ''} placeholder="Notes" rows={4} className={input} />
              {error && <p className="text-sm text-[#b00000]">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-[#CF0000] text-white font-bold py-2.5 disabled:opacity-60"
              >
                {busy ? 'Saving…' : editing ? 'Save changes' : 'Add contact'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
