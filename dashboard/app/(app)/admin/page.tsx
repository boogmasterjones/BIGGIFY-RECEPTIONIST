import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserAndBusiness } from '@/lib/data';
import AdminClient, { type AdminBusiness, type PhoneRow } from './admin-client';

export default async function Page() {
  const { isSuperAdmin } = await getUserAndBusiness();
  if (!isSuperAdmin) redirect('/');

  const supabase = await createClient();
  const [{ data: businesses }, { data: phones }] = await Promise.all([
    supabase.from('businesses').select('*').order('created_at', { ascending: false }),
    supabase.from('phone_numbers').select('e164, label, business_id'),
  ]);

  return (
    <AdminClient
      businesses={(businesses as AdminBusiness[]) || []}
      phones={(phones as PhoneRow[]) || []}
    />
  );
}
