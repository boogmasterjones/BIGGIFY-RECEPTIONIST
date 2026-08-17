import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserAndBusiness } from '@/lib/data';
import InvoiceDetail, { type Invoice, type Item } from './invoice-detail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { business } = await getUserAndBusiness();
  if (!business) return null;

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, contact:contacts(name, email, phone), job:jobs(id, title, service)')
    .eq('id', id)
    .eq('business_id', business.id)
    .maybeSingle();
  if (!invoice) notFound();

  const { data: items } = await supabase.from('invoice_items').select('*').eq('invoice_id', id).order('position');

  return (
    <InvoiceDetail
      businessId={business.id}
      businessName={business.name}
      invoice={invoice as unknown as Invoice}
      items={(items as Item[]) || []}
    />
  );
}
