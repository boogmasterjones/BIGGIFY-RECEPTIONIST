'use client';

import { useActionState } from 'react';
import { updateBusiness, type SaveState } from './actions';
import type { Business } from '@/lib/data';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-semibold mb-1.5">{label}</div>
      {hint && <div className="text-xs text-neutral-400 mb-1.5">{hint}</div>}
      {children}
    </label>
  );
}

const input =
  'w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-[15px] outline-none focus:border-[#CF0000]';

export default function SettingsForm({ business }: { business: Business }) {
  const bound = updateBusiness.bind(null, business.id);
  const [state, formAction, pending] = useActionState<SaveState, FormData>(bound, null);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <section className="rounded-2xl bg-white border border-[#ece3ca] p-6 space-y-5">
        <div className="font-bold text-lg">Business</div>
        <Field label="Business name">
          <input name="name" defaultValue={business.name} className={input} required />
        </Field>
        <Field label="Trade" hint="What kind of business this is, e.g. 'HVAC and heating/cooling'.">
          <input name="trade" defaultValue={business.trade ?? ''} className={input} />
        </Field>
        <Field label="Hours">
          <input name="hours" defaultValue={business.hours ?? ''} className={input} />
        </Field>
      </section>

      <section className="rounded-2xl bg-white border border-[#ece3ca] p-6 space-y-5">
        <div className="font-bold text-lg">What the AI books</div>
        <Field
          label="Services offered"
          hint="One per line. The receptionist only books these — anything else it flags as out of scope."
        >
          <textarea
            name="services"
            defaultValue={business.services.join('\n')}
            rows={5}
            className={input + ' font-mono text-sm'}
          />
        </Field>
        <Field label="Service area" hint="Where you work, e.g. 'the greater Tampa area'.">
          <input name="service_area" defaultValue={business.service_area ?? ''} className={input} />
        </Field>
      </section>

      <section className="rounded-2xl bg-white border border-[#ece3ca] p-6 space-y-5">
        <div className="font-bold text-lg">Receptionist</div>
        <Field label="Voice" hint="ConversationRelay voice, e.g. en-US-Journey-O.">
          <input name="voice" defaultValue={business.voice} className={input} />
        </Field>
        <Field label="Custom greeting (optional)" hint="Leave blank to use the default missed-call greeting.">
          <input name="greeting" defaultValue={business.greeting ?? ''} className={input} />
        </Field>
      </section>

      <section className="rounded-2xl bg-white border border-[#ece3ca] p-6 space-y-5">
        <div className="font-bold text-lg">New-lead alerts</div>
        <Field label="Alert email">
          <input name="owner_alert_email" defaultValue={business.owner_alert_email ?? ''} className={input} />
        </Field>
        <Field label="Alert phone">
          <input name="owner_alert_phone" defaultValue={business.owner_alert_phone ?? ''} className={input} />
        </Field>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#CF0000] text-white font-bold px-6 py-2.5 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        {state?.ok && <span className="text-sm text-emerald-600">Saved ✓</span>}
        {state?.error && <span className="text-sm text-[#b00000]">{state.error}</span>}
      </div>
    </form>
  );
}
