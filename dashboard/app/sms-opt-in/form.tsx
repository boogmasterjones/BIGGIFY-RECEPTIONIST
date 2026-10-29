'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { submitOptIn, type OptInResult } from './actions';
import { CONSENT_TEXT } from './consent';

const field = 'w-full rounded-[10px] border border-[#d9d2bf] bg-white px-4 py-3 text-[16px] text-[#0d1224] outline-none focus:border-[#CF0000] focus:ring-2 focus:ring-[#CF0000]/20';
const label = 'block text-[14px] font-semibold text-[#2a3049] mb-1.5';

export function OptInForm() {
  const [result, setResult] = useState<OptInResult | null>(null);
  const [pending, start] = useTransition();

  if (result?.ok) {
    return (
      <div className="rounded-[14px] border border-[#cfe7d6] bg-[#eefaf1] px-6 py-5">
        <p className="text-[18px] font-bold text-[#145a32] mb-1">{result.consented ? 'You are opted in.' : 'Got it, no texts.'}</p>
        <p className="text-[15px] text-[#2a3049]">
          {result.consented
            ? 'You will get customer care texts from BIGGIFY LLC as described. Reply STOP to any message to opt out, or HELP for help.'
            : 'We saved your number without text message consent. You can opt in any time by sending this form again with the box checked.'}
        </p>
      </div>
    );
  }

  return (
    <form
      className="rounded-[14px] border border-[#ece3ca] bg-white px-6 py-6 shadow-[0_6px_24px_-18px_rgba(20,16,80,.4)]"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(async () => setResult(await submitOptIn(data)));
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={label}>Your name</label>
          <input id="name" name="name" className={field} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="phone" className={label}>Mobile phone number</label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="(941) 555-0123" className={field} />
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor="business" className={label}>Business you dealt with (optional)</label>
        <input id="business" name="business" className={field} placeholder="For example: Rock Solid Tile" />
      </div>
      {/* Honeypot: hidden from people, filled by bots. */}
      <div className="hidden" aria-hidden>
        <label htmlFor="company-website">Company website</label>
        <input id="company-website" name="company-website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-[10px] border border-[#f3d6d6] border-l-4 border-l-[#CF0000] bg-[#fdf2f2] px-4 py-4">
        <input id="consent" name="consent" type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#CF0000]" />
        <label htmlFor="consent" className="text-[15px] leading-relaxed text-[#2a3049]">
          {CONSENT_TEXT} <Link href="/privacy" className="text-[#CF0000] underline">Privacy Policy</Link> and{' '}
          <Link href="/terms" className="text-[#CF0000] underline">Terms of Service</Link>.
        </label>
      </div>
      <p className="mt-3 text-[13px] text-[#6b7390]">The box is optional. Leave it unchecked and we will save your number without sending texts.</p>
      {result && !result.ok && <p className="mt-3 text-[14px] font-semibold text-[#b00020]">{result.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex min-h-[50px] items-center justify-center rounded-full bg-gradient-to-r from-[#e11a1a] via-[#cf0000] to-[#a30000] px-7 text-[15px] font-bold text-white shadow-[0_12px_30px_-10px_rgba(207,0,0,.45)] disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Submit'}
      </button>
    </form>
  );
}
