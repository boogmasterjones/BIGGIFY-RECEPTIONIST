'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export type Command = { id: string; label: string; icon: string; href: string; group?: string };

export default function CommandPalette({
  open,
  onClose,
  commands,
}: {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return commands;
    return commands.filter((c) => (c.label + ' ' + (c.group || '')).toLowerCase().includes(s));
  }, [q, commands]);

  useEffect(() => {
    setSel(0);
  }, [q]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-sel="true"]') as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  function run(c?: Command) {
    if (!c) return;
    onClose();
    router.push(c.href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center pt-[14vh] bg-black/30 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Command palette"
        className="w-[min(560px,92vw)] rounded-2xl bg-white border border-[#ece3ca] shadow-2xl overflow-hidden animate-[palIn_.16s_cubic-bezier(.16,1,.3,1)]"
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSel((s) => Math.min(filtered.length - 1, s + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSel((s) => Math.max(0, s - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              run(filtered[sel]);
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
          placeholder="Jump to… or search"
          className="w-full text-[16px] px-5 py-4 outline-none border-b border-neutral-100 placeholder:text-neutral-400"
        />
        <div ref={listRef} className="max-h-[320px] overflow-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-neutral-400">Nothing matches “{q}”.</div>
          ) : (
            filtered.map((c, i) => (
              <button
                key={c.id}
                data-sel={i === sel}
                onMouseEnter={() => setSel(i)}
                onClick={() => run(c)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[14px] ${
                  i === sel ? 'bg-[#FDECEC]' : 'hover:bg-[#FFFBF0]'
                }`}
              >
                <span className="w-7 h-7 rounded-lg bg-[#FCEFCF] grid place-items-center text-[15px] shrink-0">{c.icon}</span>
                <span className="flex-1">{c.label}</span>
                {c.group && <span className={`text-[11px] font-semibold ${i === sel ? 'text-[#CF0000]' : 'text-neutral-300'}`}>{c.group}</span>}
              </button>
            ))
          )}
        </div>
      </div>
      <style>{`@keyframes palIn{from{transform:translateY(-8px) scale(.98);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}
