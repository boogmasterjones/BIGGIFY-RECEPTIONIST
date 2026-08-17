'use client';

/**
 * One-shot confetti burst from a screen point (Biggify red/gold/white).
 * Self-contained: spins up its own full-screen canvas, animates, and tears
 * itself down. No-ops under prefers-reduced-motion.
 */
export function burst(x: number, y: number) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999;pointer-events:none';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const cx = canvas.getContext('2d');
  if (!cx) {
    canvas.remove();
    return;
  }

  const colors = ['#CF0000', '#F03030', '#E0A32B', '#ffffff', '#A60000'];
  type P = { x: number; y: number; vx: number; vy: number; g: number; s: number; c: string; life: number; rot: number; vr: number };
  const parts: P[] = [];
  for (let i = 0; i < 100; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 4 + Math.random() * 7;
    parts.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 4,
      g: 0.22 + Math.random() * 0.12,
      s: 4 + Math.random() * 5,
      c: colors[i % colors.length],
      life: 1,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
    });
  }

  let raf = 0;
  function frame() {
    if (!cx) return;
    cx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.012;
      if (p.life <= 0 || p.y > canvas.height + 40) {
        parts.splice(i, 1);
        continue;
      }
      cx.save();
      cx.globalAlpha = Math.max(0, p.life);
      cx.translate(p.x, p.y);
      cx.rotate(p.rot);
      cx.fillStyle = p.c;
      cx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      cx.restore();
    }
    if (parts.length) {
      raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(raf);
      canvas.remove();
    }
  }
  raf = requestAnimationFrame(frame);
}
