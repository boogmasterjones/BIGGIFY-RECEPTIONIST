import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUserAndBusiness } from '@/lib/data';

/* eslint-disable @typescript-eslint/no-explicit-any */

const OUTCOME: Record<string, { label: string; color: string }> = {
  booked: { label: 'Booked', color: '#1E9E6A' },
  qualified: { label: 'Booked', color: '#1E9E6A' },
  message: { label: 'Message', color: '#2f74d0' },
  callback_requested: { label: 'Callback', color: '#E0A32B' },
  canceled: { label: 'Canceled', color: '#9aa0b4' },
  booking_failed: { label: 'Needs review', color: '#CF0000' },
};
function outcomeChip(o: string | null) {
  if (!o) return { label: 'No outcome', color: '#c3bba6' };
  return OUTCOME[o] || { label: o.replace(/_/g, ' '), color: '#9aa0b4' };
}

function fmtPhone(p: string | null) {
  if (!p) return 'Unknown caller';
  const d = p.replace(/[^0-9]/g, '');
  if (d.length === 11 && d[0] === '1') return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return p;
}

function duration(a: string | null, b: string | null) {
  if (!a || !b) return null;
  const s = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000);
  if (s <= 0) return null;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function whenLabel(iso: string) {
  const d = new Date(iso);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = new Date();
  const diff = Math.round((day - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dayStr = diff === 0 ? 'Today' : diff === -1 ? 'Yesterday' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${dayStr} · ${time}`;
}

function firstCallerLine(transcript: any): string | null {
  if (!Array.isArray(transcript)) return null;
  const t = transcript.find((x) => x?.role === 'caller');
  return t?.text || null;
}

export default async function Page() {
  const { business } = await getUserAndBusiness();
  if (!business) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('calls')
    .select('id, from_number, outcome, started_at, ended_at, transcript, contact:contacts(name)')
    .eq('business_id', business.id)
    .order('started_at', { ascending: false })
    .limit(200);
  const calls = (data as any[]) || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Calls</h1>
        <p className="text-neutral-500 text-sm">Every call your receptionist answered — with the full transcript.</p>
      </div>

      {calls.length === 0 ? (
        <div className="rounded-2xl bg-white border border-[#ece3ca] p-12 text-center text-neutral-400">
          No calls yet. Every call your AI receptionist answers will show up here with a full transcript.
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-[#ece3ca] overflow-hidden divide-y divide-neutral-50">
          {calls.map((c) => {
            const chip = outcomeChip(c.outcome);
            const dur = duration(c.started_at, c.ended_at);
            const preview = firstCallerLine(c.transcript);
            const hasTranscript = Array.isArray(c.transcript) && c.transcript.length > 0;
            return (
              <Link key={c.id} href={`/calls/${c.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-[#FFFBF0] transition">
                <div className="w-9 h-9 rounded-full bg-[#FFF6E1] grid place-items-center text-base shrink-0">📞</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[15px] truncate">{c.contact?.name || fmtPhone(c.from_number)}</span>
                    {c.contact?.name && <span className="text-xs text-neutral-400 truncate">{fmtPhone(c.from_number)}</span>}
                  </div>
                  <div className="text-xs text-neutral-400 truncate mt-0.5">
                    {preview ? `“${preview}”` : hasTranscript ? 'Transcript available' : 'No transcript'}
                  </div>
                </div>
                <div className="hidden sm:block text-xs text-neutral-400 shrink-0 tabular-nums">{dur ? dur : ''}</div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: chip.color }}>
                    {chip.label}
                  </span>
                  <div className="text-xs text-neutral-400 mt-1">{whenLabel(c.started_at)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
