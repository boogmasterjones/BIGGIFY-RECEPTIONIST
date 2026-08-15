import { createClient } from '@/lib/supabase/server';
import { getUserAndBusiness } from '@/lib/data';
import JobsClient, { type Job, type ContactOption, type Stage } from './jobs-client';

export default async function Page() {
  const { business } = await getUserAndBusiness();
  if (!business) return null;

  const supabase = await createClient();
  const [{ data: jobs }, { data: contacts }, { data: stages }] = await Promise.all([
    supabase
      .from('jobs')
      .select('*, contact:contacts(id, name)')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false }),
    supabase.from('contacts').select('id, name').eq('business_id', business.id).order('name'),
    supabase
      .from('job_stages')
      .select('id, name, color, position')
      .eq('business_id', business.id)
      .order('position'),
  ]);

  return (
    <JobsClient
      businessId={business.id}
      initial={(jobs as unknown as Job[]) || []}
      contacts={(contacts as ContactOption[]) || []}
      stages={(stages as Stage[]) || []}
    />
  );
}
