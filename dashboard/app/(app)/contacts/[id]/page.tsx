import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserAndBusiness } from '@/lib/data';
import ContactDetail, { type Contact, type JobRow, type ApptRow, type CallRow, type InvoiceRow } from './contact-detail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { business } = await getUserAndBusiness();
  if (!business) return null;

  const supabase = await createClient();
  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .eq('business_id', business.id)
    .maybeSingle();
  if (!contact) notFound();

  const [{ data: jobs }, { data: appts }, { data: calls }, { data: invoices }] = await Promise.all([
    supabase.from('jobs').select('id, title, service, created_at, stage:job_stages(name,color)').eq('contact_id', id).order('created_at', { ascending: false }),
    supabase.from('appointments').select('id, starts_at, status').eq('contact_id', id).order('starts_at', { ascending: false }).limit(10),
    supabase.from('calls').select('id, from_number, started_at, ended_at, outcome, transcript').eq('contact_id', id).order('started_at', { ascending: false }).limit(10),
    supabase.from('invoices').select('id, number, status, items:invoice_items(quantity,unit_price_cents)').eq('contact_id', id).order('created_at', { ascending: false }),
  ]);

  return (
    <ContactDetail
      contact={contact as Contact}
      jobs={(jobs as unknown as JobRow[]) || []}
      appts={(appts as ApptRow[]) || []}
      calls={(calls as CallRow[]) || []}
      invoices={(invoices as unknown as InvoiceRow[]) || []}
    />
  );
}
