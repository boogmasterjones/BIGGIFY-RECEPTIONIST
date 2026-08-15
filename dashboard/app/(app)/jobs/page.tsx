import { createClient } from '@/lib/supabase/server';
import { getUserAndBusiness } from '@/lib/data';
import JobsClient, { type Job, type ContactOption } from './jobs-client';

export default async function Page() {
  const { business } = await getUserAndBusiness();
  if (!business) return null;

  const supabase = await createClient();
  const [{ data: jobs }, { data: contacts }] = await Promise.all([
    supabase
      .from('jobs')
      .select('*, contact:contacts(id, name)')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false }),
    supabase.from('contacts').select('id, name').eq('business_id', business.id).order('name'),
  ]);

  return (
    <JobsClient
      businessId={business.id}
      initial={(jobs as unknown as Job[]) || []}
      contacts={(contacts as ContactOption[]) || []}
    />
  );
}
