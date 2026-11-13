'use client';

import { useEffect } from 'react';

// The homepage's small behaviours, ported from the redesign's site.js: menu, quick reveals, the one-time call signature,
// the before/after sliders and their carousel, card glare, the phone call bar, the late-loaded booking calendar and the
// desktop "Call our receptionist" reveal. Everything here works on the server-rendered markup in app/page.tsx and renders
// nothing itself. Animations always play (owner 2026-10-26).
const RECEPTIONIST = '(941) 401-8288';

export default function HomeBehavior() {
  useEffect(() => {
    const d = document;
    const w = window;
    const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = d) => r.querySelector<T>(s);
    const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = d) => Array.from(r.querySelectorAll<T>(s));
    const root = $('.bz');
    const finePointer = w.matchMedia('(hover:hover) and (pointer:fine)').matches;
    const cleanups: Array<() => void> = [];
    const on = <K extends keyof HTMLElementEventMap>(el: EventTarget, type: K | string, fn: (e: Event) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn, opts);
      cleanups.push(() => el.removeEventListener(type, fn, opts));
    };
    const observers: IntersectionObserver[] = [];
    const io = (cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) => { const o = new IntersectionObserver(cb, opts); observers.push(o); return o; };

    // footer year
    const yr = $('#yr');
    if (yr) yr.textContent = String(new Date().getFullYear());

    // on a desktop, "Call our receptionist" shows the number instead of trying to dial
    const isMobile = /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent) || w.matchMedia('(pointer:coarse)').matches;
    $$<HTMLAnchorElement>('.call-btn').forEach((btn) => {
      on(btn, 'click', (e) => {
        if (isMobile || btn.dataset.revealed) return;
        e.preventDefault();
        btn.dataset.revealed = '1';
        const label = btn.querySelector('.label');
        if (label) label.textContent = RECEPTIONIST; else btn.textContent = RECEPTIONIST;
      });
    });

    // menu
    const menuBtn = $('.menu-btn');
    const panel = $('.menu-panel');
    if (menuBtn && panel) {
      const setMenu = (open: boolean) => { panel.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); root?.classList.toggle('menu-open', open); };
      on(menuBtn, 'click', (e) => { e.stopPropagation(); setMenu(panel.hidden); });
      $$('a', panel).forEach((a) => on(a, 'click', () => setMenu(false)));
      on(d, 'click', (e) => { if (!panel.hidden && !(e.target as Element).closest('header')) setMenu(false); });
      on(d, 'keydown', (e) => { if ((e as KeyboardEvent).key === 'Escape' && !panel.hidden) { setMenu(false); menuBtn.focus(); } });
    }

    // reveals: quick, early, once
    const seen = io((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target as HTMLElement;
      const sibs = el.parentElement ? Array.from(el.parentElement.children).filter((c) => c.classList.contains('rv') && !c.classList.contains('in')) : [];
      el.style.setProperty('--rd', `${Math.min(Math.max(0, sibs.indexOf(el)), 3) * 0.07}s`);
      el.classList.add('in');
      seen.unobserve(el);
    }), { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    $$('.rv, .timeline').forEach((el) => seen.observe(el));

    // the signature: plays once when it is properly on screen, then rests
    const sig = $('[data-callsig]');
    if (sig) {
      const sigSeen = io((entries) => { if (!entries[0].isIntersecting) return; sig.classList.add('play'); sigSeen.disconnect(); }, { threshold: 0.35 });
      sigSeen.observe(sig);
    }

    // the ambient arrows pause when the hero is off screen
    const amb = io((entries) => entries.forEach((en) => en.target.classList.toggle('is-off', !en.isIntersecting)));
    $$('.hero').forEach((h) => amb.observe(h));

    // before/after sliders
    $$('[data-cmp]').forEach((box) => {
      const range = $<HTMLInputElement>('input[type=range]', box);
      if (!range) return;
      const set = (v: string | number) => box.style.setProperty('--pos', `${v}%`);
      on(range, 'input', () => { box.dataset.touched = '1'; set(range.value); });
      set(range.value);
    });
    // one small nudge on the first slider, so people see it moves
    const firstCmp = $('[data-cmp]');
    if (firstCmp) {
      const nudge = io((entries) => {
        if (!entries[0].isIntersecting) return;
        nudge.disconnect();
        let t0: number | null = null;
        const range = $<HTMLInputElement>('input[type=range]', firstCmp);
        const step = (t: number) => {
          if (firstCmp.dataset.touched) return;
          if (t0 === null) t0 = t;
          const p = Math.min(1, (t - t0) / 1500);
          firstCmp.style.setProperty('--pos', `${50 + Math.sin(p * Math.PI * 2) * 14 * (1 - p * 0.35)}%`);
          if (p < 1) w.requestAnimationFrame(step);
          else { firstCmp.style.setProperty('--pos', '50%'); if (range) range.value = '50'; }
        };
        w.setTimeout(() => w.requestAnimationFrame(step), 500);
      }, { threshold: 0.6 });
      nudge.observe(firstCmp);
    }

    // work carousel arrows
    const track = $('[data-car]');
    if (track) {
      const prev = $<HTMLButtonElement>('[data-car-prev]');
      const next = $<HTMLButtonElement>('[data-car-next]');
      const cardStep = () => { const c = track.firstElementChild; return c ? c.getBoundingClientRect().width + 20 : 400; };
      const sync = () => {
        if (!prev || !next) return;
        prev.disabled = track.scrollLeft < 8;
        next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 8;
      };
      if (prev) on(prev, 'click', () => track.scrollBy({ left: -cardStep(), behavior: 'smooth' }));
      if (next) on(next, 'click', () => track.scrollBy({ left: cardStep(), behavior: 'smooth' }));
      on(track, 'scroll', () => w.requestAnimationFrame(sync), { passive: true });
      on(track, 'keydown', (e) => {
        const k = (e as KeyboardEvent).key;
        if (e.target !== track) return; // the sliders keep their own arrow keys
        if (k === 'ArrowRight') { e.preventDefault(); track.scrollBy({ left: cardStep(), behavior: 'smooth' }); }
        if (k === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: -cardStep(), behavior: 'smooth' }); }
      });
      on(w, 'resize', sync);
      sync();
    }

    // card glare + a small tilt (mouse only)
    if (finePointer) {
      $$('.fx').forEach((el) => on(el, 'pointermove', (e) => {
        const r = el.getBoundingClientRect(); const pe = e as PointerEvent;
        el.style.setProperty('--mx', `${(((pe.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(((pe.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
      }));
      $$('[data-tilt]').forEach((el) => {
        const host = (el.closest('.callsig') as HTMLElement | null) ?? el.parentElement;
        if (!host) return;
        on(host, 'pointermove', (e) => {
          const r = el.getBoundingClientRect(); const pe = e as PointerEvent;
          const x = (pe.clientX - r.left) / r.width - 0.5; const y = (pe.clientY - r.top) / r.height - 0.5;
          el.style.transform = `perspective(1100px) rotateY(${(x * 5).toFixed(2)}deg) rotateX(${(-y * 4).toFixed(2)}deg)`;
        });
        on(host, 'pointerleave', () => { el.style.transform = ''; });
      });
    }

    // phone call bar: after the hero, away from the booking calendar and the footer
    const bar = $('[data-callbar]');
    const hero = $('.hero');
    if (bar && hero) {
      bar.hidden = false;
      const state: Record<string, boolean> = { hero: true, contact: false, foot: false };
      const paint = () => bar.classList.toggle('show', !state.hero && !state.contact && !state.foot);
      const watch = (el: Element | null, key: string) => { if (el) io((en) => { state[key] = en[0].isIntersecting; paint(); }).observe(el); };
      watch(hero, 'hero'); watch($('#contact'), 'contact'); watch($('footer'), 'foot');
    }

    // booking calendar: load Calendly only when it is nearly on screen (or when a quote link is tapped)
    const cal = $('.calendly-inline-widget');
    if (cal) {
      let done = false;
      const loadCal = () => {
        if (done) return; done = true;
        if (d.querySelector('script[src*="calendly.com/assets/external/widget.js"]')) return;
        const s = d.createElement('script'); s.src = 'https://assets.calendly.com/assets/external/widget.js'; s.async = true; d.body.appendChild(s);
      };
      const calSeen = io((en) => { if (en[0].isIntersecting) { loadCal(); calSeen.disconnect(); } }, { rootMargin: '900px 0px' });
      calSeen.observe(cal);
      $$('a[href$="#contact"]').forEach((a) => on(a, 'click', loadCal));
    }

    return () => { observers.forEach((o) => o.disconnect()); cleanups.forEach((c) => c()); root?.classList.remove('menu-open'); };
  }, []);
  return null;
}
