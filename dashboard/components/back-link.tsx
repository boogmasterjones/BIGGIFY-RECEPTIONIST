'use client';

import { useRouter } from 'next/navigation';

/**
 * Goes back one step in history (so Contact → Job → Back returns to the Contact,
 * not the Jobs list). Falls back to a fixed route when there's no history to
 * pop (e.g. the page was opened directly or via a deep link).
 */
export default function BackLink({ fallback, label = 'Back' }: { fallback: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="text-sm text-neutral-400 hover:text-neutral-700"
    >
      ← {label}
    </button>
  );
}
