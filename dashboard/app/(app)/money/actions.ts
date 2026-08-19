'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type Result = { ok: boolean; error?: string; id?: string };

function cents(dollars: string | undefined) {
  const n = parseFloat((dollars || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

async function nextNumber(supabase: Awaited<ReturnType<typeof createClient>>, businessId: string) {
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId);
  return `INV-${String((count ?? 0) + 1).padStart(4, '0')}`;
}

// Create a draft invoice. If a job is given, auto-pull its materials as line items.
export async function createInvoice(
  businessId: string,
  input: { contact_id?: string; job_id?: string; due_at?: string }
): Promise<Result> {
  const supabase = await createClient();
  const number = await nextNumber(supabase, businessId);

  // If a job was chosen but no contact, inherit the job's contact.
  let contactId = input.contact_id || null;
  if (input.job_id && !contactId) {
    const { data: job } = await supabase.from('jobs').select('contact_id').eq('id', input.job_id).maybeSingle();
    contactId = (job?.contact_id as string) || null;
  }

  const { data: inv, error } = await supabase
    .from('invoices')
    .insert({
      business_id: businessId,
      job_id: input.job_id || null,
      contact_id: contactId,
      number,
      status: 'draft',
      issued_at: new Date().toISOString().slice(0, 10),
      due_at: input.due_at || null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  // Auto-draft line items from the job's materials + labor.
  if (input.job_id) {
    const { data: job } = await supabase
      .from('jobs')
      .select('value_cents')
      .eq('id', input.job_id)
      .maybeSingle();
    const jobValue = (job?.value_cents as number) || 0;

    const { data: mats } = await supabase
      .from('job_materials')
      .select('name, price_cents, quantity, position')
      .eq('job_id', input.job_id)
      .order('position');

    const materialItems = (mats || [])
      .filter((m) => m.name || m.price_cents)
      .map((m, i) => ({
        invoice_id: inv.id,
        business_id: businessId,
        description: (m.name as string) || 'Item',
        quantity: (m.quantity as number) || 1,
        unit_price_cents: (m.price_cents as number) || 0,
        position: i,
      }));

    const materialTotal = materialItems.reduce((sum, item) => sum + item.quantity * item.unit_price_cents, 0);
    const laborCents = jobValue - materialTotal;

    const allItems = [...materialItems];
    if (laborCents > 0) {
      allItems.push({
        invoice_id: inv.id,
        business_id: businessId,
        description: 'Labor',
        quantity: 1,
        unit_price_cents: laborCents,
        position: materialItems.length,
      });
    }

    if (allItems.length) await supabase.from('invoice_items').insert(allItems);
  }

  revalidatePath('/money');
  return { ok: true, id: inv.id as string };
}

export async function updateInvoice(
  id: string,
  patch: { status?: string; due_at?: string; notes?: string; number?: string }
): Promise<Result> {
  const supabase = await createClient();
  const clean: Record<string, unknown> = {};
  if (patch.status !== undefined) clean.status = patch.status;
  if (patch.due_at !== undefined) clean.due_at = patch.due_at || null;
  if (patch.notes !== undefined) clean.notes = patch.notes.trim() || null;
  if (patch.number !== undefined) clean.number = patch.number.trim() || null;
  const { error } = await supabase.from('invoices').update(clean).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/money');
  revalidatePath(`/money/${id}`);
  return { ok: true };
}

export async function deleteInvoice(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/money');
  return { ok: true };
}

export async function addInvoiceItem(
  invoiceId: string,
  businessId: string,
  input: { description?: string; quantity?: string; unit_price?: string }
): Promise<Result> {
  const supabase = await createClient();
  const { data: max } = await supabase
    .from('invoice_items')
    .select('position')
    .eq('invoice_id', invoiceId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const qty = parseFloat((input.quantity || '1').replace(/[^0-9.]/g, ''));
  const { error } = await supabase.from('invoice_items').insert({
    invoice_id: invoiceId,
    business_id: businessId,
    description: input.description?.trim() || 'Item',
    quantity: Number.isFinite(qty) ? qty : 1,
    unit_price_cents: cents(input.unit_price),
    position: (max?.position ?? -1) + 1,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/money/${invoiceId}`);
  return { ok: true };
}

export async function deleteInvoiceItem(id: string, invoiceId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('invoice_items').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/money/${invoiceId}`);
  return { ok: true };
}

export async function addExpense(
  businessId: string,
  input: { description?: string; amount?: string; category?: string; job_id?: string; spent_at?: string }
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('expenses').insert({
    business_id: businessId,
    job_id: input.job_id || null,
    description: input.description?.trim() || null,
    amount_cents: cents(input.amount),
    category: input.category?.trim() || null,
    spent_at: input.spent_at || new Date().toISOString().slice(0, 10),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/money');
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/money');
  return { ok: true };
}

// Request payment: create a Stripe payment link for this invoice
export async function requestPayment(
  businessId: string,
  invoiceId: string,
  invoiceNumber: string | null,
  totalCents: number,
  customerEmail?: string,
  customerName?: string
): Promise<{ ok: boolean; error?: string; url?: string; linkId?: string }> {
  const serverUrl = process.env.VOICE_SERVER_URL || process.env.NEXT_PUBLIC_VOICE_SERVER_URL || 'https://biggify-receptionist.onrender.com';
  try {
    const res = await fetch(`${serverUrl}/api/stripe/create-payment-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId,
        invoiceId,
        amountCents: totalCents,
        description: `Invoice ${invoiceNumber || 'Payment'}`,
        customerEmail: customerEmail || undefined,
        customerName: customerName || undefined,
      }),
    });
    const result = await res.json();
    if (!result.ok) return { ok: false, error: result.error || 'Payment link creation failed' };
    revalidatePath(`/money/${invoiceId}`);
    return { ok: true, url: result.url, linkId: result.linkId };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
