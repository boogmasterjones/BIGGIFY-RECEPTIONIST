'use server';

import { revalidatePath } from 'next/cache';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { runStageAutomations, runTaskAutomations } from '@/lib/automation';
import { createInvoice } from '@/app/(app)/money/actions';

// Draft an invoice from this job (pulls its materials as line items).
export async function draftInvoiceFromJob(jobId: string, businessId: string): Promise<Result<{ id: string }>> {
  const res = await createInvoice(businessId, { job_id: jobId });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, data: { id: res.id as string } };
}

export type Result<T = unknown> = { ok: boolean; error?: string; data?: T };

function touch(jobId: string) {
  revalidatePath(`/jobs/${jobId}`);
}

// ---- Comms: conversation thread on the job ----
export async function postJobMessage(jobId: string, businessId: string, body: string): Promise<Result> {
  if (!body.trim()) return { ok: false, error: 'Empty message' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let authorName: string | null = null;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle();
    authorName = (profile?.full_name as string) || (profile?.email as string) || null;
  }
  const { error } = await supabase.from('job_messages').insert({
    job_id: jobId,
    business_id: businessId,
    author_id: user?.id ?? null,
    author_name: authorName,
    body: body.trim(),
  });
  if (error) return { ok: false, error: error.message };
  touch(jobId);
  return { ok: true };
}

// ---- Job-level ----
export async function updateJobMeta(
  jobId: string,
  patch: { title?: string; stage_id?: string; description?: string }
): Promise<Result> {
  const supabase = await createClient();
  const clean: Record<string, unknown> = {};
  if (patch.title !== undefined) clean.title = patch.title.trim() || null;
  if (patch.stage_id !== undefined) clean.stage_id = patch.stage_id || null;
  if (patch.description !== undefined) clean.description = patch.description.trim() || null;
  const { error } = await supabase.from('jobs').update(clean).eq('id', jobId);
  if (error) return { ok: false, error: error.message };
  if (patch.stage_id) await runStageAutomations(jobId, patch.stage_id);
  touch(jobId);
  return { ok: true };
}

// ---- Tasks ----
export async function addTask(jobId: string, businessId: string, title: string): Promise<Result> {
  if (!title.trim()) return { ok: false, error: 'Task needs a title' };
  const supabase = await createClient();
  const { data: max } = await supabase
    .from('job_tasks')
    .select('position')
    .eq('job_id', jobId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (max?.position ?? -1) + 1;
  const { error } = await supabase
    .from('job_tasks')
    .insert({ job_id: jobId, business_id: businessId, title: title.trim(), position });
  if (error) return { ok: false, error: error.message };
  touch(jobId);
  return { ok: true };
}

export async function toggleTask(id: string, jobId: string, done: boolean): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('job_tasks').update({ done }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  if (done) await runTaskAutomations(jobId); // all tasks done → auto-advance
  touch(jobId);
  return { ok: true };
}

export async function deleteTask(id: string, jobId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('job_tasks').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  touch(jobId);
  return { ok: true };
}

// ---- Files (Supabase Storage: 'job-files' bucket) ----
export async function uploadJobFiles(
  jobId: string,
  businessId: string,
  formData: FormData
): Promise<Result> {
  const supabase = await createClient();
  const files = formData
    .getAll('files')
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: 'No files selected' };

  for (const file of files) {
    if (file.size > 25 * 1024 * 1024) {
      return { ok: false, error: `"${file.name}" is over the 25 MB limit.` };
    }
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${businessId}/${jobId}/${crypto.randomUUID()}-${safe}`;
    const { error: upErr } = await supabase.storage
      .from('job-files')
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (upErr) return { ok: false, error: upErr.message };
    const { error: insErr } = await supabase.from('job_files').insert({
      job_id: jobId,
      business_id: businessId,
      name: file.name,
      storage_path: path,
      mime: file.type || null,
      size_bytes: file.size,
    });
    if (insErr) return { ok: false, error: insErr.message };
  }
  touch(jobId);
  return { ok: true };
}

export async function updateJobFile(
  id: string,
  jobId: string,
  input: { caption?: string; note?: string }
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('job_files')
    .update({ caption: input.caption?.trim() || null, note: input.note?.trim() || null })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  touch(jobId);
  return { ok: true };
}

export async function deleteJobFile(id: string, jobId: string, storagePath: string): Promise<Result> {
  const supabase = await createClient();
  await supabase.storage.from('job-files').remove([storagePath]);
  const { error } = await supabase.from('job_files').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  touch(jobId);
  return { ok: true };
}

// ---- Rooms ----
export type RoomInput = {
  name?: string;
  sqft?: string;
  dimensions?: string;
  budget?: string; // dollars
  notes?: string;
};

function parseRoom(input: RoomInput) {
  const sqft = parseFloat((input.sqft || '').replace(/[^0-9.]/g, ''));
  const budget = parseFloat((input.budget || '').replace(/[^0-9.]/g, ''));
  return {
    name: input.name?.trim() || 'Untitled room',
    sqft: Number.isFinite(sqft) ? sqft : null,
    dimensions: input.dimensions?.trim() || null,
    budget_cents: Number.isFinite(budget) ? Math.round(budget * 100) : null,
    notes: input.notes?.trim() || null,
  };
}

export async function addRoom(jobId: string, businessId: string, input: RoomInput): Promise<Result> {
  if (!input.name?.trim()) return { ok: false, error: 'Room needs a name' };
  const supabase = await createClient();
  const { data: max } = await supabase
    .from('job_rooms')
    .select('position')
    .eq('job_id', jobId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (max?.position ?? -1) + 1;
  const { error } = await supabase
    .from('job_rooms')
    .insert({ job_id: jobId, business_id: businessId, position, ...parseRoom(input) });
  if (error) return { ok: false, error: error.message };
  touch(jobId);
  return { ok: true };
}

export async function updateRoom(id: string, jobId: string, input: RoomInput): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('job_rooms').update(parseRoom(input)).eq('id', id);
  if (error) return { ok: false, error: error.message };
  touch(jobId);
  return { ok: true };
}

export async function deleteRoom(id: string, jobId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('job_rooms').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  touch(jobId);
  return { ok: true };
}

// ---- Materials ----
export type MaterialInput = {
  name?: string;
  vendor?: string;
  url?: string;
  image_url?: string;
  price?: string; // dollars
  sku?: string;
  dimensions?: string;
  quantity?: string;
  lead_time?: string;
  room?: string;
  room_id?: string;
  status?: string;
  notes?: string;
};

function parseMaterial(input: MaterialInput) {
  const price = parseFloat((input.price || '').replace(/[^0-9.]/g, ''));
  const qty = parseInt((input.quantity || '').replace(/[^0-9]/g, ''), 10);
  return {
    name: input.name?.trim() || null,
    vendor: input.vendor?.trim() || null,
    url: input.url?.trim() || null,
    image_url: input.image_url?.trim() || null,
    price_cents: Number.isFinite(price) ? Math.round(price * 100) : null,
    sku: input.sku?.trim() || null,
    dimensions: input.dimensions?.trim() || null,
    quantity: Number.isFinite(qty) ? qty : null,
    lead_time: input.lead_time?.trim() || null,
    room: input.room?.trim() || null,
    room_id: input.room_id ? input.room_id : null,
    status: input.status?.trim() || 'proposed',
    notes: input.notes?.trim() || null,
  };
}

export async function addMaterial(jobId: string, businessId: string, input: MaterialInput): Promise<Result> {
  const supabase = await createClient();
  const { data: max } = await supabase
    .from('job_materials')
    .select('position')
    .eq('job_id', jobId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (max?.position ?? -1) + 1;
  const { error } = await supabase
    .from('job_materials')
    .insert({ job_id: jobId, business_id: businessId, position, ...parseMaterial(input) });
  if (error) return { ok: false, error: error.message };
  touch(jobId);
  return { ok: true };
}

export async function updateMaterial(id: string, jobId: string, input: MaterialInput): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('job_materials').update(parseMaterial(input)).eq('id', id);
  if (error) return { ok: false, error: error.message };
  touch(jobId);
  return { ok: true };
}

export async function setMaterialStatus(id: string, jobId: string, status: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('job_materials').update({ status }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  touch(jobId);
  return { ok: true };
}

export async function deleteMaterial(id: string, jobId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('job_materials').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  touch(jobId);
  return { ok: true };
}

// ---- AI: crawl a product link and extract material details ----
export type ExtractedMaterial = {
  name: string;
  vendor: string;
  price: string;
  image_url: string;
  sku: string;
  dimensions: string;
};

export async function aiExtractMaterial(url: string): Promise<Result<ExtractedMaterial>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'AI autofill needs ANTHROPIC_API_KEY set in the dashboard env.' };
  }
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: 'Enter a full product URL (https://…).' };

  let html = '';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(15000),
    });
    html = await res.text();
  } catch {
    return { ok: false, error: 'Could not load that page (it may block automated access).' };
  }

  // Pull useful meta hints, then strip to readable text.
  const meta = (prop: string) =>
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)`, 'i'))?.[1] || '';
  const ogImage = meta('og:image');
  const ogTitle = meta('og:title') || html.match(/<title[^>]*>([^<]+)/i)?.[1] || '';
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 12000);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.DASHBOARD_CLAUDE_MODEL || 'claude-sonnet-5'; // fast for a UI autofill

  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content:
            `Extract product details from this page. URL: ${url}\n` +
            `og:title: ${ogTitle}\nog:image: ${ogImage}\n\n` +
            `Page text:\n${text}\n\n` +
            `Return the product name, vendor/brand, price in dollars (e.g. "1299.99"), a full absolute image URL, SKU/model number, and dimensions. Use "" for anything you can't find. Prefer og:image for image_url.`,
        },
      ],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              vendor: { type: 'string' },
              price: { type: 'string' },
              image_url: { type: 'string' },
              sku: { type: 'string' },
              dimensions: { type: 'string' },
            },
            required: ['name', 'vendor', 'price', 'image_url', 'sku', 'dimensions'],
            additionalProperties: false,
          },
        },
      },
    } as Anthropic.MessageCreateParamsNonStreaming);

    const textBlock = msg.content.find((b) => b.type === 'text') as { text: string } | undefined;
    const parsed = JSON.parse(textBlock?.text || '{}') as ExtractedMaterial;
    if (ogImage && !parsed.image_url) parsed.image_url = ogImage;
    return { ok: true, data: parsed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Extraction failed.' };
  }
}
