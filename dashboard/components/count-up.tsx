'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 → value once, on mount, with front-loaded easing
 * (fast start, gentle settle) — the "feels fast" count-up. Honors
 * prefers-reduced-motion and snaps straight to the value when it's 0.
 */
export default function CountUp({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 700,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const [n, setN] = useState(value === 0 ? 0 : value);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || value === 0) {
      setN(value);
      return;
    }
    setN(0);
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setN(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setN(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const text = decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString('en-US');
  return (
    <span className={className}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}
