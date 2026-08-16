import { createClient } from '@/lib/supabase/server';
import { getUserAndBusiness } from '@/lib/data';
import AppointmentsClient, { type Appointment, type Option } from './appointments-client';

export default async function Page() {
  const { business } = await getUserAndBusiness();
  if (!business) return null;

  const supabase = await createClient();
  const [{ data: appts }, { data: contacts }, { data: jobs }] = await Promise.all([
    supabase
      .from('appointments')
      .select('*, contact:contacts(id, name), job:jobs(id, title, service)')
      .eq('business_id', business.id)
      .order('starts_at'),
    supabase.from('contacts').select('id, name').eq('business_id', business.id).order('name'),
    supabase.from('jobs').select('id, title, service').eq('business_id', business.id).order('created_at', { ascending: false }),
  ]);

  const jobOptions: Option[] = (jobs || []).map((j) => ({
    id: j.id as string,
    name: (j.title as string) || (j.service as string) || 'Job',
  }));

  return (
    <AppointmentsClient
      businessId={business.id}
      timezone={business.timezone}
      initial={(appts as unknown as Appointment[]) || []}
      contacts={(contacts as Option[]) || []}
      jobs={jobOptions}
    />
  );
}
