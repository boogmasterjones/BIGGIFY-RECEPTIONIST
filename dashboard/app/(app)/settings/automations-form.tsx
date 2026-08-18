'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateAutomations } from './actions';
import type { Business } from '@/lib/data';

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-[#CF0000]' : 'bg-neutral-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

export default function AutomationsForm({ business }: { business: Business }) {
  const router = useRouter();
  const [quote, setQuote] = useState(!!business.quote_followups_enabled);
  const [review, setReview] = useState(!!business.review_requests_enabled);
  const [reviewUrl, setReviewUrl] = useState(business.review_url ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await updateAutomations(business.id, {
      quote_followups_enabled: quote,
      review_requests_enabled: review,
      review_url: reviewUrl,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error || 'Could not save');
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  const row = 'flex items-start gap-4 py-4';
  return (
    <div className="rounded-2xl bg-white border border-[#ece3ca] p-6">
      <div className="font-bold text-lg mb-1">Automations</div>
      <p className="text-sm text-neutral-500 mb-2">
        Hands-off customer texts. Off by default — turn on only what you want sent.
      </p>

      <div className="divide-y divide-neutral-100">
        <div className={row}>
          <div className="flex-1">
            <div className="font-semibold">Quote Follow-Up Vault</div>
            <p className="text-sm text-neutral-500 mt-0.5">
              Automatically texts anyone who got a quote but didn&apos;t book — a nudge at 3, 7, and 14 days.
              Stops the moment they book, or you mark the job done, lost, or paused.
            </p>
          </div>
          <Toggle on={quote} onClick={() => setQuote((v) => !v)} />
        </div>

        <div className={row}>
          <div className="flex-1">
            <div className="font-semibold">5-Star Autopilot</div>
            <p className="text-sm text-neutral-500 mt-0.5">
              Texts every customer a review request right after their job is marked done — when they&apos;re happiest.
            </p>
            {review && (
              <input
                value={reviewUrl}
                onChange={(e) => setReviewUrl(e.target.value)}
                placeholder="Your review link (e.g. Google review URL)"
                className="mt-3 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-[15px] outline-none focus:border-[#CF0000]"
              />
            )}
          </div>
          <Toggle on={review} onClick={() => setReview((v) => !v)} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="rounded-full bg-[#CF0000] text-white font-bold px-5 py-2.5 disabled:opacity-60">
          {busy ? 'Saving…' : 'Save automations'}
        </button>
        {saved && <span className="text-sm text-[#1E9E6A] font-semibold">Saved ✓</span>}
        {error && <span className="text-sm text-[#b00000]">{error}</span>}
      </div>
      <p className="text-[11px] text-neutral-400 mt-3">
        Texts go out from your business number and include a “Reply STOP to opt out” line. Only turn these on for customers who expect to hear from you.
      </p>
    </div>
  );
}
