'use client';

import { useState } from 'react';

/**
 * A destructive-action button that confirms inline (two-step) instead of using
 * window.confirm() — which is silently blocked in embedded/preview browsers.
 * First click arms it; a second click on "Confirm" runs onConfirm.
 */
export default function ConfirmButton({
  onConfirm,
  label = 'Delete',
  confirmLabel = 'Confirm',
  className = '',
  armedClassName,
  title,
}: {
  onConfirm: () => void | Promise<void>;
  label?: React.ReactNode;
  confirmLabel?: string;
  className?: string;
  armedClassName?: string;
  title?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!armed) {
    return (
      <button type="button" title={title} onClick={() => setArmed(true)} className={className}>
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <button
        type="button"
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        className={armedClassName || 'rounded-full bg-[#CF0000] text-white px-3 py-1 text-xs font-bold disabled:opacity-60'}
      >
        {busy ? '…' : confirmLabel}
      </button>
      <button type="button" onClick={() => setArmed(false)} className="text-xs text-neutral-400 hover:text-neutral-700">
        Cancel
      </button>
    </span>
  );
}
