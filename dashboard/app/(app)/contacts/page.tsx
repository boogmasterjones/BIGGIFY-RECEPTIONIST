import { createClient } from '@/lib/supabase/server';
import { getUserAndBusiness } from '@/lib/data';
import ContactsClient, { type Contact } from './contacts-client';

export default async function Page() {
  const { business } = await getUserAndBusiness();
  if (!business) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('contacts')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false });

  return <ContactsClient businessId={business.id} initial={(data as Contact[]) || []} />;
}
