import { createClient } from '@/lib/supabase/server';
import { getUserAndBusiness } from '@/lib/data';
import MoneyClient, { type Invoice, type Expense, type Option } from './money-client';

export default async function Page() {
  const { business } = await getUserAndBusiness();
  if (!business) return null;
  const supabase = await createClient();

  const [{ data: invoices }, { data: expenses }, { data: contacts }, { data: jobs }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, contact:contacts(name), job:jobs(title,service), items:invoice_items(quantity,unit_price_cents)')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false }),
    supabase.from('expenses').select('*, job:jobs(title,service)').eq('business_id', business.id).order('spent_at', { ascending: false }).limit(100),
    supabase.from('contacts').select('id, name').eq('business_id', business.id).order('name'),
    supabase.from('jobs').select('id, title, service').eq('business_id', business.id).order('created_at', { ascending: false }),
  ]);

  const jobOptions: Option[] = (jobs || []).map((j) => ({
    id: j.id as string,
    name: (j.title as string) || (j.service as string) || 'Job',
  }));

  return (
    <MoneyClient
      businessId={business.id}
      invoices={(invoices as unknown as Invoice[]) || []}
      expenses={(expenses as unknown as Expense[]) || []}
      contacts={(contacts as Option[]) || []}
      jobs={jobOptions}
    />
  );
}
