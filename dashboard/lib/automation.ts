// The automation engine — the lifecycle rules that let the platform do the
// busywork. Built-in, best-effort (never breaks the triggering action):
//   • Stage change  → notify the team; if it's the FINAL stage, auto-draft an
//     invoice from the job's materials (if one doesn't exist yet).
//   • All tasks done → auto-advance the job one stage forward.
import { createClient } from '@/lib/supabase/server';
import { createInvoice } from '@/app/(app)/money/actions';

async function notify(businessId: string, type: string, title: string, body?: string) {
  const supabase = await createClient();
  await supabase.from('notifications').insert({ business_id: businessId, type, title, body: body || null });
}

export async function runStageAutomations(jobId: string, newStageId: string) {
  try {
    const supabase = await createClient();
    const { data: job } = await supabase.from('jobs').select('business_id, title, service').eq('id', jobId).maybeSingle();
    if (!job) return;
    const businessId = job.business_id as string;
    const jobName = (job.title as string) || (job.service as string) || 'Job';

    const { data: stages } = await supabase
      .from('job_stages').select('id, name, position').eq('business_id', businessId).order('position');
    if (!stages?.length) return;
    const stage = stages.find((s) => s.id === newStageId);
    if (!stage) return;
    const last = stages[stages.length - 1];

    await notify(businessId, 'job_updated', `${jobName} moved to ${stage.name}`);

    // Reached the final stage → auto-draft an invoice (once).
    if (stage.id === last.id) {
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('job_id', jobId);
      if (!count) {
        const res = await createInvoice(businessId, { job_id: jobId });
        if (res.ok) await notify(businessId, 'invoice_drafted', `Invoice drafted for ${jobName}`, 'Auto-drafted from the job’s materials — review and send.');
      }
    }
  } catch (e) {
    console.error('[automation:stage]', (e as Error).message);
  }
}

export async function runTaskAutomations(jobId: string) {
  try {
    const supabase = await createClient();
    const { data: tasks } = await supabase.from('job_tasks').select('done').eq('job_id', jobId);
    if (!tasks?.length || tasks.some((t) => !t.done)) return; // need all done

    const { data: job } = await supabase.from('jobs').select('business_id, stage_id, title, service').eq('id', jobId).maybeSingle();
    if (!job?.stage_id) return;
    const businessId = job.business_id as string;

    const { data: stages } = await supabase
      .from('job_stages').select('id, name, position').eq('business_id', businessId).order('position');
    if (!stages?.length) return;
    const idx = stages.findIndex((s) => s.id === job.stage_id);
    if (idx < 0 || idx >= stages.length - 1) return; // unknown or already final

    const next = stages[idx + 1];
    await supabase.from('jobs').update({ stage_id: next.id }).eq('id', jobId);
    const jobName = (job.title as string) || (job.service as string) || 'Job';
    await notify(businessId, 'job_updated', `${jobName}: all tasks done → ${next.name}`, 'Auto-advanced by Biggify.');
    // Cascade: entering a stage may itself trigger stage automations.
    await runStageAutomations(jobId, next.id);
  } catch (e) {
    console.error('[automation:task]', (e as Error).message);
  }
}
