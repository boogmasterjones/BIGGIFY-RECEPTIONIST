'use client';

import { useActionState } from 'react';
import { updateStripeKeys, type SaveState } from './actions';
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
  'w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-[15px] outline-none focus:border-[#CF0000] font-mono text-sm';

export default function StripeForm({ business }: { business: Business }) {
  const bound = updateStripeKeys.bind(null, business.id);
  const [state, formAction, pending] = useActionState<SaveState, FormData>(bound, null);

  return (
    <form action={formAction} className="rounded-2xl bg-white border border-[#ece3ca] p-6 space-y-5 max-w-2xl">
      <div className="font-bold text-lg">Stripe Payment Collection</div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        🔐 <strong>Your customers pay securely through Stripe's checkout.</strong> You never handle card data. Payments go directly to your Stripe account.
      </div>

      <Field
        label="Stripe Secret Key"
        hint="From https://dashboard.stripe.com/apikeys — starts with sk_live_ or sk_test_"
      >
        <input
          name="stripe_secret_key"
          type="password"
          defaultValue={business.stripe_secret_key ?? ''}
          placeholder="sk_live_..."
          className={input}
        />
      </Field>

      <Field
        label="Stripe Publishable Key"
        hint="From the same API keys page — starts with pk_live_ or pk_test_"
      >
        <input
          name="stripe_publishable_key"
          type="password"
          defaultValue={business.stripe_publishable_key ?? ''}
          placeholder="pk_live_..."
          className={input}
        />
      </Field>

      <div className="text-xs text-neutral-500">
        <strong>Don't have a Stripe account?</strong>{' '}
        <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer" className="text-[#CF0000] underline">
          Sign up free
        </a>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#CF0000] text-white font-bold px-6 py-2.5 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save Stripe keys'}
        </button>
        {state?.ok && <span className="text-sm text-emerald-600">Saved ✓</span>}
        {state?.error && <span className="text-sm text-[#b00000]">{state.error}</span>}
      </div>
    </form>
  );
}
