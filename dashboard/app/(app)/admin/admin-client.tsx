'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBusiness, updateBusinessAdmin, addPhoneNumber, deletePhoneNumber, type BusinessInput } from './actions';

export type AdminBusiness = {
  id: string;
  name: string;
  trade: string | null;
  services: string[];
  service_area: string | null;
  hours: string | null;
  timezone: string;
  voice: string;
  greeting: string | null;
  owner_alert_email: string | null;
  owner_alert_phone: string | null;
  cal_api_key: string | null;
  cal_event_type_id: string | null;
  plan: string;
  features: Record<string, boolean>;
};
export type PhoneRow = { e164: string; label: string | null; business_id: string };

const input = 'w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-[15px] outline-none focus:border-[#CF0000]';
const FEATURES = ['receptionist', 'contacts', 'jobs', 'appointments', 'calendar', 'calendar_sync', 'notifications', 'invoicing', 'statistics'];

export default function AdminClient({ businesses, phones }: { businesses: AdminBusiness[]; phones: PhoneRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBusiness | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newNum, setNewNum] = useState<Record<string, string>>({});

  const phonesFor = (id: string) => phones.filter((p) => p.business_id === id);

  function startAdd() { setEditing(null); setError(null); setOpen(true); }
  function startEdit(b: AdminBusiness) { setEditing(b); setError(null); setOpen(true); }

  async function save(form: FormData) {
    setBusy(true);
    setError(null);
    const features: Record<string, boolean> = {};
    FEATURES.forEach((k) => (features[k] = form.get(`f_${k}`) === 'on'));
    const payload: BusinessInput = {
      name: String(form.get('name') || ''),
      trade: String(form.get('trade') || ''),
      services: String(form.get('services') || ''),
      service_area: String(form.get('service_area') || ''),
      hours: String(form.get('hours') || ''),
      timezone: String(form.get('timezone') || ''),
      voice: String(form.get('voice') || ''),
      greeting: String(form.get('greeting') || ''),
      owner_alert_email: String(form.get('owner_alert_email') || ''),
      owner_alert_phone: String(form.get('owner_alert_phone') || ''),
      cal_api_key: String(form.get('cal_api_key') || ''),
      cal_event_type_id: String(form.get('cal_event_type_id') || ''),
      plan: String(form.get('plan') || ''),
      features,
    };
    const res = editing ? await updateBusinessAdmin(editing.id, payload) : await createBusiness(payload);
    setBusy(false);
    if (!res.ok) return setError(res.error || 'Something went wrong');
    setOpen(false);
    router.refresh();
  }

  async function addNum(businessId: string) {
    const val = (newNum[businessId] || '').trim();
    if (!val) return;
    const res = await addPhoneNumber(businessId, val, '');
    if (!res.ok) return alert(res.error);
    setNewNum((m) => ({ ...m, [businessId]: '' }));
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Biggify Admin</h1>
          <p className="text-neutral-500 text-sm">Onboard clients — create a business, map their number, set their config.</p>
        </div>
        <button onClick={startAdd} className="rounded-full bg-[#CF0000] text-white font-bold px-5 py-2.5">+ New client</button>
      </div>

      <div className="space-y-4">
        {businesses.map((b) => {
          const nums = phonesFor(b.id);
          const on = FEATURES.filter((k) => b.features?.[k]);
          return (
            <div key={b.id} className="rounded-2xl bg-white border border-[#ece3ca] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-extrabold text-lg">{b.name}</div>
                  <div className="text-sm text-neutral-500">{b.trade || '—'} · <span className="text-neutral-400">{b.plan}</span></div>
                </div>
                <button onClick={() => startEdit(b)} className="text-sm text-neutral-400 hover:text-[#CF0000]">Edit</button>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {on.map((k) => (
                  <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-[#FFF6E1] text-neutral-500">{k}</span>
                ))}
                {on.length === 0 && <span className="text-xs text-neutral-400">No features enabled</span>}
              </div>

              <div className="mt-4 border-t border-neutral-100 pt-3">
                <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Phone numbers → this business</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {nums.map((p) => (
                    <span key={p.e164} className="inline-flex items-center gap-2 text-sm rounded-full border border-neutral-200 pl-3 pr-2 py-1">
                      {p.e164}
                      <button onClick={() => deletePhoneNumber(p.e164).then(() => router.refresh())} className="text-neutral-300 hover:text-[#CF0000] text-xs">✕</button>
                    </span>
                  ))}
                  {nums.length === 0 && <span className="text-xs text-neutral-400">No numbers mapped</span>}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newNum[b.id] || ''}
                    onChange={(e) => setNewNum((m) => ({ ...m, [b.id]: e.target.value }))}
                    placeholder="+19417594411"
                    className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-[#CF0000]"
                  />
                  <button onClick={() => addNum(b.id)} className="rounded-lg bg-neutral-900 text-white px-3 text-sm font-bold">Map</button>
                </div>
              </div>

              {b.cal_event_type_id && <div className="text-[11px] text-neutral-400 mt-3">Cal.com event {b.cal_event_type_id} · alerts → {b.owner_alert_email || '(none)'}</div>}
            </div>
          );
        })}
        {businesses.length === 0 && <div className="rounded-2xl bg-white border border-[#ece3ca] p-10 text-center text-neutral-400">No businesses yet.</div>}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-extrabold">{editing ? `Edit ${editing.name}` : 'New client'}</h2>
              <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-700">✕</button>
            </div>
            <form action={save} className="space-y-3">
              <input name="name" defaultValue={editing?.name ?? ''} placeholder="Business name" className={input} />
              <input name="trade" defaultValue={editing?.trade ?? ''} placeholder="Trade (e.g. tile installation)" className={input} />
              <textarea name="services" defaultValue={editing?.services?.join(', ') ?? ''} placeholder="Services (comma-separated)" rows={2} className={input} />
              <div className="grid grid-cols-2 gap-3">
                <input name="hours" defaultValue={editing?.hours ?? ''} placeholder="Hours" className={input} />
                <input name="service_area" defaultValue={editing?.service_area ?? ''} placeholder="Service area" className={input} />
              </div>
              <textarea name="greeting" defaultValue={editing?.greeting ?? ''} placeholder="Custom greeting (optional)" rows={2} className={input} />
              <div className="grid grid-cols-2 gap-3">
                <input name="owner_alert_email" defaultValue={editing?.owner_alert_email ?? ''} placeholder="Owner alert email" className={input} />
                <input name="owner_alert_phone" defaultValue={editing?.owner_alert_phone ?? ''} placeholder="Owner alert phone" className={input} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input name="cal_api_key" defaultValue={editing?.cal_api_key ?? ''} placeholder="Cal.com API key" className={input} />
                <input name="cal_event_type_id" defaultValue={editing?.cal_event_type_id ?? ''} placeholder="Cal.com event type ID" className={input} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input name="timezone" defaultValue={editing?.timezone ?? 'America/New_York'} placeholder="Timezone" className={input} />
                <input name="voice" defaultValue={editing?.voice ?? ''} placeholder="Voice" className={input} />
                <input name="plan" defaultValue={editing?.plan ?? 'full'} placeholder="Plan" className={input} />
              </div>

              <div className="border-t border-neutral-100 pt-3">
                <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Features (what they pay for)</div>
                <div className="grid grid-cols-2 gap-y-1.5">
                  {FEATURES.map((k) => {
                    const def = editing ? !!editing.features?.[k] : ['receptionist', 'contacts', 'jobs', 'appointments', 'calendar', 'calendar_sync', 'notifications'].includes(k);
                    return (
                      <label key={k} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name={`f_${k}`} defaultChecked={def} className="w-4 h-4 accent-[#CF0000]" />
                        {k}
                      </label>
                    );
                  })}
                </div>
              </div>

              {error && <p className="text-sm text-[#b00000]">{error}</p>}
              <button type="submit" disabled={busy} className="w-full rounded-full bg-[#CF0000] text-white font-bold py-2.5 disabled:opacity-60">
                {busy ? 'Saving…' : editing ? 'Save changes' : 'Create client'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
