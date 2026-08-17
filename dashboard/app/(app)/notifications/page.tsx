import { createClient } from '@/lib/supabase/server';
import { getUserAndBusiness } from '@/lib/data';
import NotificationsClient, { type Notification } from './notifications-client';

export default async function Page() {
  const { business } = await getUserAndBusiness();
  if (!business) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(200);

  return <NotificationsClient initial={(data as Notification[]) || []} />;
}
