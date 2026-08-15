import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserAndBusiness } from '@/lib/data';
import JobDetail, { type Job, type Stage, type Task, type Material } from './job-detail';

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

  const [{ data: stages }, { data: tasks }, { data: materials }] = await Promise.all([
    supabase.from('job_stages').select('id, name, color, position').eq('business_id', business.id).order('position'),
    supabase.from('job_tasks').select('*').eq('job_id', id).order('position'),
    supabase.from('job_materials').select('*').eq('job_id', id).order('position'),
  ]);

  return (
    <JobDetail
      businessId={business.id}
      job={job as unknown as Job}
      stages={(stages as Stage[]) || []}
      tasks={(tasks as Task[]) || []}
      materials={(materials as Material[]) || []}
    />
  );
}
