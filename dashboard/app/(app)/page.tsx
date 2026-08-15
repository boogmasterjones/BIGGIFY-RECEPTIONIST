import { createClient } from '@/lib/supabase/server';
import { getUserAndBusiness } from '@/lib/data';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function count(table: string, businessId: string, extra?: (q: any) => any) {
  const supabase = await createClient();
  let q: any = supabase.from(table).select('*', { count: 'exact', head: true }).eq('business_id', businessId);
  if (extra) q = extra(q);
  const { count } = await q;
  return count ?? 0;
}

export default async function Home() {
  const { business } = await getUserAndBusiness();
  if (!business) return null;

  const [contacts, jobs, upcoming] = await Promise.all([
    count('contacts', business.id),
    count('jobs', business.id),
    count('appointments', business.id, (q) => q.gte('starts_at', new Date().toISOString())),
  ]);

  const supabase = await createClient();
  const { data: recentJobs } = await supabase
    .from('jobs')
    .select('id, service, created_at, contact:contacts(name), stage:job_stages(name, color)')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(6);

  const tiles = [
    { label: 'Contacts', value: contacts, show: !!business.features.contacts },
    { label: 'Jobs', value: jobs, show: !!business.features.jobs },
    { label: 'Upcoming appointments', value: upcoming, show: !!business.features.appointments || !!business.features.calendar },
  ].filter((t) => t.show);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">{business.name}</h1>
      <p className="text-neutral-500 mb-6">Here&apos;s what&apos;s happening.</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-white border border-[#ece3ca] p-5">
            <div className="text-3xl font-extrabold text-[#CF0000]">{t.value}</div>
            <div className="text-sm text-neutral-500 mt-1">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-[#ece3ca] p-5">
        <div className="font-bold mb-3">Recent jobs</div>
        {recentJobs && recentJobs.length > 0 ? (
          <ul className="divide-y divide-neutral-100">
            {recentJobs.map((j: any) => (
              <li key={j.id} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <span className="font-semibold">{j.contact?.name || 'Caller'}</span>
                  <span className="text-neutral-500"> — {j.service || 'Job'}</span>
                </div>
                {j.stage?.name && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: j.stage.color || '#9aa0b4' }}
                  >
                    {j.stage.name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-400">No jobs yet — they&apos;ll appear here as calls come in.</p>
        )}
      </div>
    </div>
  );
}
