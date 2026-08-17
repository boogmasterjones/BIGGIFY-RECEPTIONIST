'use client';

import Link from 'next/link';
import { useState } from 'react';

export type CallTurn = { role: string; text: string };
export type CallLite = {
  id: string;
  from_number?: string | null;
  outcome: string | null;
  started_at: string | null;
  ended_at?: string | null;
  transcript: CallTurn[] | null;
};

const OUTCOME: Record<string, { label: string; color: string }> = {
  booked: { label: 'Booked', color: '#1E9E6A' },
  qualified: { label: 'Booked', color: '#1E9E6A' },
  message: { label: 'Message', color: '#2f74d0' },
  callback_requested: { label: 'Callback', color: '#E0A32B' },
  canceled: { label: 'Canceled', color: '#9aa0b4' },
  booking_failed: { label: 'Needs review', color: '#CF0000' },
};
export function outcomeChip(o: string | null) {
  if (!o) return { label: 'Call', color: '#c3bba6' };
  return OUTCOME[o] || { label: o.replace(/_/g, ' '), color: '#9aa0b4' };
}

function duration(a?: string | null, b?: string | null) {
  if (!a || !b) return null;
  const s = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000);
  if (s <= 0) return null;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function whenLabel(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** The conversation as a chat thread — receptionist in brand-red bubbles, caller in neutral. */
export function TranscriptThread({ turns, size = 'sm' }: { turns: CallTurn[]; size?: 'sm' | 'lg' }) {
  const lg = size === 'lg';
  return (
    <div className={lg ? 'space-y-4' : 'space-y-3'}>
      {turns.map((t, i) => {
        const isCaller = t.role === 'caller';
        return (
          <div key={i} className={`flex ${isCaller ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col ${lg ? 'max-w-[78%]' : 'max-w-[85%]'}`}>
              <div className={`font-bold uppercase tracking-wide mb-1 ${lg ? 'text-[11px]' : 'text-[10px]'} ${isCaller ? 'text-neutral-400 text-right' : 'text-[#CF0000]'}`}>
                {isCaller ? 'Caller' : 'Receptionist'}
              </div>
              <div
                className={`rounded-2xl leading-relaxed ${lg ? 'px-4 py-2.5 text-[15px]' : 'px-3 py-2 text-[13.5px]'} ${
                  isCaller ? 'bg-[#F1F0EC] text-neutral-800 rounded-br-md' : 'bg-[#CF0000] text-white rounded-bl-md'
                }`}
              >
                {t.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** A collapsible call summary that expands to reveal the transcript inline. */
export default function CallCard({ call, defaultOpen = false }: { call: CallLite; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const turns = Array.isArray(call.transcript) ? call.transcript : [];
  const chip = outcomeChip(call.outcome);
  const dur = duration(call.started_at, call.ended_at);

  return (
    <div className="rounded-xl border border-[#ece3ca] overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-[#FFFBF0] text-left transition-colors">
        <span className="text-base leading-none">📞</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{whenLabel(call.started_at)}</div>
          <div className="text-xs text-neutral-400">
            {turns.length ? `${turns.length} messages` : 'No transcript'}
            {dur ? ` · ${dur}` : ''}
          </div>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: chip.color }}>
          {chip.label}
        </span>
        <span className={`text-neutral-300 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
      </button>
      {open && (
        <div className="border-t border-neutral-100 p-3.5 bg-[#FFFDF7]">
          {turns.length ? (
            <TranscriptThread turns={turns} />
          ) : (
            <p className="text-sm text-neutral-400 text-center py-3">No transcript captured for this call.</p>
          )}
          <Link href={`/calls/${call.id}`} className="inline-block mt-3 text-xs font-bold text-[#CF0000] hover:underline">
            Open full call →
          </Link>
        </div>
      )}
    </div>
  );
}
