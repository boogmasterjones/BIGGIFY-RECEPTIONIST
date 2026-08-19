// Stripe integration for payment collection
// Each business has their own Stripe account (Option A: no Stripe Connect)

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function supabase() {
  const url = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return url && serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;
}

// Get a business's Stripe credentials
async function getStripeCreds(businessId) {
  const db = supabase();
  if (!db || !businessId) return null;
  try {
    const { data } = await db
      .from('businesses')
      .select('stripe_secret_key, stripe_publishable_key')
      .eq('id', businessId)
      .maybeSingle();
    if (!data?.stripe_secret_key) return null;
    return {
      secretKey: data.stripe_secret_key,
      publishableKey: data.stripe_publishable_key,
    };
  } catch (e) {
    console.error('[stripe] getStripeCreds:', e.message);
    return null;
  }
}

// Create a payment link for an invoice
export async function createPaymentLink(businessId, invoiceId, { amountCents, description, customerEmail, customerName }) {
  const creds = await getStripeCreds(businessId);
  if (!creds?.secretKey) {
    return { ok: false, error: 'Stripe not configured for this business' };
  }

  try {
    const stripe = new Stripe(creds.secretKey);
    const link = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: description || 'Invoice Payment',
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.PUBLIC_URL || 'https://biggify-receptionist.onrender.com'}/payment-success`,
        },
      },
      customer_email: customerEmail || undefined,
      metadata: { businessId, invoiceId },
      // Disable Managed Payments for MVP (avoids tax code requirement)
      // @ts-ignore
      managed_payments: { enabled: false },
    });

    // Store the payment link ID in the invoice
    const db = supabase();
    if (db) {
      await db
        .from('invoices')
        .update({ stripe_payment_link_id: link.id })
        .eq('id', invoiceId)
        .eq('business_id', businessId);
    }

    return {
      ok: true,
      linkId: link.id,
      url: link.url,
    };
  } catch (err) {
    console.error('[stripe] createPaymentLink:', err.message);
    return { ok: false, error: err.message };
  }
}

// Handle Stripe webhook (payment received, etc.)
export async function handleWebhook(body, sig, businessSecret) {
  try {
    // Verify the webhook came from Stripe using the business's webhook secret
    // (In production, Stripe gives you a unique webhook secret per endpoint)
    const stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY || ''); // temp — will use business secret
    const event = stripe.webhooks.constructEvent(body, sig, businessSecret || process.env.STRIPE_WEBHOOK_SECRET);

    const db = supabase();
    if (!db) return { ok: true }; // DB not live, just ack the webhook

    // Handle different event types
    if (event.type === 'charge.succeeded') {
      const charge = event.data.object;
      const { businessId, invoiceId } = charge.metadata || {};
      if (!invoiceId) return { ok: true };

      const amountPaidCents = charge.amount;
      // Get the invoice to check what's owed
      const { data: invoice } = await db
        .from('invoices')
        .select('amount_total_cents, amount_paid_cents')
        .eq('id', invoiceId)
        .eq('business_id', businessId)
        .maybeSingle();

      if (!invoice) return { ok: true };

      const totalPaid = (invoice.amount_paid_cents || 0) + amountPaidCents;
      const isPaid = totalPaid >= invoice.amount_total_cents;
      const isPartial = totalPaid > 0 && totalPaid < invoice.amount_total_cents;

      // Update invoice
      await db
        .from('invoices')
        .update({
          amount_paid_cents: totalPaid,
          status: isPaid ? 'paid' : isPartial ? 'partially_paid' : 'unpaid',
        })
        .eq('id', invoiceId);

      // Create notification
      await db.from('notifications').insert({
        business_id: businessId,
        type: isPaid ? 'invoice_paid' : 'payment_received',
        title: isPaid ? 'Invoice paid!' : `Payment received (${totalPaid / 100}/${invoice.amount_total_cents / 100})`,
        body: `Invoice payment received via Stripe`,
      });

      console.log(`[stripe] Payment received: invoice ${invoiceId}, ${amountPaidCents / 100} USD`);
    }

    return { ok: true };
  } catch (err) {
    console.error('[stripe] webhook error:', err.message);
    return { ok: false, error: err.message };
  }
}

// Check payment link status (for polling from dashboard if needed)
export async function getPaymentLinkStatus(businessId, linkId) {
  const creds = await getStripeCreds(businessId);
  if (!creds?.secretKey) return null;

  try {
    const stripe = new Stripe(creds.secretKey);
    const link = await stripe.paymentLinks.retrieve(linkId);
    return link;
  } catch (err) {
    console.error('[stripe] getPaymentLinkStatus:', err.message);
    return null;
  }
}
