import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserAndBusiness } from '@/lib/data';
import JobDetail, { type Job, type Stage, type Task, type Material, type Room, type JobFile, type Message, type JobInvoice, type Followup } from './job-detail';
import type { CallLite } from '@/components/call-card';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { business } = await getUserAndBusiness();
  if (!business) return null;

  const supabase = await createClient();
  const { data: job } = await supabase
    .from('jobs')
    .select('*, contact:contacts(id, name, phone, email)')
    .eq('id', id)
    .eq('business_id', business.id)
    .maybeSingle();
  if (!job) notFound();

  const [{ data: stages }, { data: tasks }, { data: materials }, { data: rooms }, { data: fileRows }, { data: messages }, { data: expenseRows }, { data: invoices }, { data: calls }, { data: followups }] =
    await Promise.all([
      supabase.from('job_stages').select('id, name, color, position').eq('business_id', business.id).order('position'),
      supabase.from('job_tasks').select('*').eq('job_id', id).order('position'),
      supabase.from('job_materials').select('*').eq('job_id', id).order('position'),
      supabase.from('job_rooms').select('*').eq('job_id', id).order('position'),
      supabase.from('job_files').select('*').eq('job_id', id).order('created_at', { ascending: false }),
      supabase.from('job_messages').select('*').eq('job_id', id).order('created_at'),
      supabase.from('expenses').select('amount_cents').eq('job_id', id),
      supabase.from('invoices').select('id, number, status, items:invoice_items(quantity,unit_price_cents)').eq('job_id', id).order('created_at', { ascending: false }),
      supabase.from('calls').select('id, from_number, started_at, ended_at, outcome, transcript').eq('job_id', id).order('started_at', { ascending: false }),
      supabase.from('job_followups').select('id, kind, step, status, created_at').eq('job_id', id).order('created_at', { ascending: false }),
    ]);

  const expensesTotal = ((expenseRows as { amount_cents: number }[]) || []).reduce((s, e) => s + (e.amount_cents || 0), 0);

  // Sign URLs for the private bucket so thumbnails/links work.
  let files: JobFile[] = [];
  if (fileRows && fileRows.length > 0) {
    const paths = fileRows.map((f) => f.storage_path as string);
    const { data: signed } = await supabase.storage.from('job-files').createSignedUrls(paths, 3600);
    files = fileRows.map((f, i) => ({ ...(f as JobFile), url: signed?.[i]?.signedUrl ?? null }));
  }

  return (
    <JobDetail
      businessId={business.id}
      job={job as unknown as Job}
      stages={(stages as Stage[]) || []}
      tasks={(tasks as Task[]) || []}
      materials={(materials as Material[]) || []}
      rooms={(rooms as Room[]) || []}
      files={files}
      messages={(messages as Message[]) || []}
      expensesTotal={expensesTotal}
      invoices={(invoices as unknown as JobInvoice[]) || []}
      calls={(calls as unknown as CallLite[]) || []}
      followups={(followups as unknown as Followup[]) || []}
      followupsPaused={!!(job as { followups_paused?: boolean }).followups_paused}
      quotedAt={(job as { quoted_at?: string | null }).quoted_at ?? null}
      canInvoice={!!business.features.invoicing}
    />
  );
}
