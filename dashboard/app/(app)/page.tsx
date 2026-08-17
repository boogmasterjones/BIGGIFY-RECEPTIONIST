import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUserAndBusiness } from '@/lib/data';

/* eslint-disable @typescript-eslint/no-explicit-any */

async function count(table: string, businessId: string, extra?: (q: any) => any) {
  const supabase = await createClient();
  let q: any = supabase.from(table).select('*', { count: 'exact', head: true }).eq('business_id', businessId);
  if (extra) q = extra(q);
  const { count } = await q;
  return count ?? 0;
}

function ago(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function whenLabel(iso: string) {
  const d = new Date(iso);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = new Date();
  const diff = Math.round((day - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dayStr = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${dayStr} · ${time}`;
}

const NOTE_ICON: Record<string, string> = {
  new_lead: '📞',
  new_message: '✉️',
  appointment_booked: '📅',
  callback_requested: '↩️',
  job_updated: '🧰',
  invoice_drafted: '🧾',
  default: '🔔',
};

export default async function Home() {
  const { business } = await getUserAndBusiness();
  if (!business) return null;
  const f = business.features || {};
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const nowIso = new Date().toISOString();

  const [callsWeek, bookedWeek, upcoming, jobsTotal, notes, nextAppts, stages, jobStageRows, recentJobs] =
    await Promise.all([
      f.receptionist ? count('calls', business.id, (q) => q.gte('started_at', weekAgo)) : Promise.resolve(0),
      f.receptionist ? count('calls', business.id, (q) => q.gte('started_at', weekAgo).eq('outcome', 'booked')) : Promise.resolve(0),
      count('appointments', business.id, (q) => q.gte('starts_at', nowIso)),
      count('jobs', business.id),
      f.notifications
        ? supabase.from('notifications').select('type,title,body,read_at,created_at').eq('business_id', business.id).order('created_at', { ascending: false }).limit(6)
        : Promise.resolve({ data: [] as any[] }),
      supabase.from('appointments').select('starts_at, contact:contacts(name), job:jobs(title,service)').eq('business_id', business.id).gte('starts_at', nowIso).order('starts_at').limit(5),
      supabase.from('job_stages').select('id,name,color,position').eq('business_id', business.id).order('position'),
      supabase.from('jobs').select('stage_id').eq('business_id', business.id).limit(1000),
      supabase.from('jobs').select('id, service, title, created_at, contact:contacts(name), stage:job_stages(name,color)').eq('business_id', business.id).order('created_at', { ascending: false }).limit(5),
    ]);

  const noteList = (notes.data as any[]) || [];
  const unread = noteList.filter((n) => !n.read_at);
  const stageList = (stages.data as any[]) || [];
  const stageCounts = new Map<string, number>();
  for (const r of (jobStageRows.data as any[]) || []) {
    if (r.stage_id) stageCounts.set(r.stage_id, (stageCounts.get(r.stage_id) || 0) + 1);
  }

  const metrics = [
    { label: 'Calls this week', value: callsWeek, show: !!f.receptionist },
    { label: 'Booked this week', value: bookedWeek, show: !!f.receptionist },
    { label: 'Upcoming', value: upcoming, show: !!f.appointments || !!f.calendar },
    { label: 'Active jobs', value: jobsTotal, show: !!f.jobs },
  ].filter((m) => m.show);

  const card = 'rounded-2xl bg-white border border-[#ece3ca]';

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">{business.name}</h1>
      <p className="text-neutral-500 mb-6">Here&apos;s your business at a glance.</p>

      {/* Metrics */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
          {metrics.map((m) => (
            <div key={m.label} className={`${card} p-5`}>
              <div className="text-3xl font-extrabold text-[#CF0000] tabular-nums">{m.value}</div>
              <div className="text-sm text-neutral-500 mt-1">{m.label}</div>
            </div>
          ))}
        </div>
      )}
      {f.receptionist && callsWeek > 0 && (
        <p className="text-sm text-neutral-500 mb-8">
          Your receptionist handled <b className="text-neutral-700">{callsWeek}</b> call{callsWeek === 1 ? '' : 's'} and booked{' '}
          <b className="text-neutral-700">{bookedWeek}</b> this week.
        </p>
      )}
      {(!f.receptionist || callsWeek === 0) && <div className="mb-8" />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: needs attention + jobs in motion */}
        <div className="lg:col-span-2 space-y-6">
          {f.notifications && (
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold">Needs your attention</div>
                <Link href="/notifications" className="text-xs text-[#CF0000] font-semibold">View all →</Link>
              </div>
              {noteList.length === 0 ? (
                <p className="text-sm text-neutral-400 py-4 text-center">You&apos;re all caught up. New calls and messages will show up here.</p>
              ) : (
                <ul className="divide-y divide-neutral-50">
                  {noteList.map((n, i) => (
                    <li key={i} className="py-2.5 flex items-start gap-3">
                      <span className="text-base leading-none mt-0.5">{NOTE_ICON[n.type] || NOTE_ICON.default}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {!n.read_at && <span className="w-1.5 h-1.5 rounded-full bg-[#CF0000] shrink-0" />}
                          <span className={`text-sm truncate ${n.read_at ? 'text-neutral-600' : 'font-semibold'}`}>{n.title}</span>
                        </div>
                        {n.body && <div className="text-xs text-neutral-400 truncate">{n.body}</div>}
                      </div>
                      <span className="text-xs text-neutral-300 shrink-0">{ago(n.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {f.jobs && (
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <div className="font-bold">Jobs in motion</div>
                <Link href="/jobs" className="text-xs text-[#CF0000] font-semibold">All jobs →</Link>
              </div>
              {stageList.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {stageList.map((s) => (
                    <div key={s.id} className="flex items-center gap-1.5 text-xs rounded-full border border-neutral-100 pl-2 pr-2.5 py-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || '#9aa0b4' }} />
                      <span className="text-neutral-500">{s.name}</span>
                      <span className="font-bold tabular-nums">{stageCounts.get(s.id) || 0}</span>
                    </div>
                  ))}
                </div>
              )}
              {(recentJobs.data as any[])?.length ? (
                <ul className="divide-y divide-neutral-50">
                  {(recentJobs.data as any[]).map((j) => (
                    <li key={j.id} className="py-2">
                      <Link href={`/jobs/${j.id}`} className="flex items-center justify-between text-sm hover:text-[#CF0000]">
                        <span className="truncate">
                          <span className="font-semibold">{j.title || j.contact?.name || 'Job'}</span>
                          {j.service && <span className="text-neutral-400"> · {j.service}</span>}
                        </span>
                        {j.stage?.name && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full text-white shrink-0 ml-2" style={{ backgroundColor: j.stage.color || '#9aa0b4' }}>
                            {j.stage.name}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-400">No jobs yet — they&apos;ll appear as calls come in.</p>
              )}
            </div>
          )}
        </div>

        {/* Right: what's next */}
        <div className="space-y-6">
          {(f.appointments || f.calendar) && (
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold">Next up</div>
                <Link href="/appointments" className="text-xs text-[#CF0000] font-semibold">Calendar →</Link>
              </div>
              {(nextAppts.data as any[])?.length ? (
                <ul className="space-y-3">
                  {(nextAppts.data as any[]).map((a, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="w-1 rounded-full bg-[#CF0000]/70 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{a.contact?.name || a.job?.title || a.job?.service || 'Appointment'}</div>
                        <div className="text-xs text-neutral-400">{whenLabel(a.starts_at)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-400 py-2">Nothing scheduled yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
