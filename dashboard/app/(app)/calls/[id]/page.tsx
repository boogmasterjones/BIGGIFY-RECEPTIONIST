import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserAndBusiness } from '@/lib/data';
import { TranscriptThread } from '@/components/call-card';
import BackLink from '@/components/back-link';
import { textOn } from '@/lib/colors';

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
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { business } = await getUserAndBusiness();
  if (!business) return null;

  const supabase = await createClient();
  const { data: call } = await supabase
    .from('calls')
    .select('*, contact:contacts(id, name), job:jobs(id, title, service)')
    .eq('business_id', business.id)
    .eq('id', id)
    .maybeSingle();
  if (!call) notFound();

  const c = call as any;
  const chip = outcomeChip(c.outcome);
  const turns: { role: string; text: string }[] = Array.isArray(c.transcript) ? c.transcript : [];
  const dur = duration(c.started_at, c.ended_at);
  const started = c.started_at
    ? new Date(c.started_at).toLocaleString('en-US', { timeZone: business.timezone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <div>
      <BackLink fallback="/calls" />

      <div className="flex items-start justify-between mt-2 mb-5 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {c.contact?.name ? (
              <Link href={`/contacts/${c.contact.id}`} className="hover:text-[#CF0000]">{c.contact.name}</Link>
            ) : (
              fmtPhone(c.from_number)
            )}
          </h1>
          <div className="text-neutral-500 text-sm mt-0.5">
            {c.contact?.name && <>{fmtPhone(c.from_number)} · </>}
            {started}
            {dur && <> · {dur}</>}
            {c.job && (
              <> · <Link href={`/jobs/${c.job.id}`} className="text-[#CF0000]">{c.job.title || c.job.service || 'Job'}</Link></>
            )}
          </div>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0" style={{ backgroundColor: chip.color, color: textOn(chip.color) }}>
          {chip.label}
        </span>
      </div>

      <div className="rounded-2xl bg-white border border-[#ece3ca] p-5 sm:p-6">
        {turns.length === 0 ? (
          <div className="py-10 text-center text-neutral-400 text-sm">
            No transcript was captured for this call.
          </div>
        ) : (
          <TranscriptThread turns={turns} size="lg" />
        )}
      </div>
    </div>
  );
}
