import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { config, isCalcomLive, isSmsLive } from './config.js';
import { isEmailLive, emailMode, sendEmail } from './email.js';
import { WELCOME_GREETING, greetingFor } from './prompt.js';
import { CallSession } from './claude.js';
import { getAvailableSlots } from './calcom.js';
import { createLead, updateLead, getLead, allLeads } from './store.js';
import { alertOwner } from './twilioSms.js';
import { surveyPage, thankYouPage, dashboardPage, testChatPage } from './pages.js';
import { isSupabaseLive, lookupBusinessByNumber, envBusiness, logCall, upsertContactByPhone, updateCall } from './supabase.js';
import { startOutreachScheduler, runOutreachSweep } from './outreach.js';
import { syncCreateAppointment, syncUpdateAppointment, syncDeleteAppointment } from './calendar-sync.js';
import { createPaymentLink, handleWebhook } from './stripe.js';

// Resolve which business a call is for by the dialed number, falling back to
// the single-business env config.
async function resolveBusiness(toNumber) {
  if (isSupabaseLive) {
    const biz = await lookupBusinessByNumber(toNumber);
    if (biz) return biz;
  }
  return envBusiness();
}

const app = express();
// Stripe webhook needs raw body, so capture it before JSON parsing
app.use((req, res, next) => {
  if (req.path === '/api/stripe/webhook') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..', 'public'))); // serves /logo.png

// --- Health check ---
app.get('/', (_req, res) => {
  res.type('text').send(
    `Biggify AI receptionist is running.\n` +
    `DB: ${isSupabaseLive ? 'live (multi-tenant)' : 'MOCK (env single-business)'}\n` +
    `Cal.com: ${isCalcomLive ? 'live' : 'MOCK'} | SMS: ${isSmsLive ? 'live' : 'MOCK'} | Email: ${emailMode}\n` +
    `Alert email: ${config.business.ownerAlertEmail || '(not set)'}\n` +
    `Diagnostics: /test-email  /test-cal`
  );
});

// --- Email diagnostic: visit /test-email to send yourself a test alert ---
app.get('/test-email', async (_req, res) => {
  const to = config.business.ownerAlertEmail;
  if (!to) return res.type('text').send('OWNER_ALERT_EMAIL is not set. Add it in your env vars.');
  if (!isEmailLive) {
    return res.type('text').send(
      'Email is in MOCK mode (not sending). Recommended: set RESEND_API_KEY (from resend.com) ' +
      'for reliable HTTP email. Then redeploy and try again.'
    );
  }
  const result = await sendEmail(to, 'Biggify test email', 'This is a test from your Biggify receptionist. If you got this, email alerts work.');
  res.type('text').send(
    result.ok
      ? `Sent to ${to} via ${result.via || 'email'}. Check your inbox (and spam).`
      : `Failed (${emailMode}): ${result.error}`
  );
});

// --- Cal.com diagnostic: visit /test-cal to check calendar booking is wired ---
app.get('/test-cal', async (_req, res) => {
  if (!isCalcomLive) {
    return res.type('text').send(
      'Cal.com is in MOCK mode (fake slots, no real bookings). Set CALCOM_API_KEY and ' +
      'CALCOM_EVENT_TYPE_ID in your env vars, then redeploy.'
    );
  }
  try {
    const slots = await getAvailableSlots(3);
    if (!slots.length) return res.type('text').send('Cal.com connected, but returned no open slots — check the event type availability.');
    res.type('text').send('Cal.com is LIVE. Next open times:\n' + slots.map((s) => '- ' + s.humanTime).join('\n'));
  } catch (e) {
    res.type('text').send(`Cal.com error: ${e.message} — check CALCOM_API_KEY and CALCOM_EVENT_TYPE_ID.`);
  }
});

// Manually run the outreach sweep (quote follow-ups + review requests) so you can
// test it without waiting for the hourly timer.
app.get('/run-outreach', async (_req, res) => {
  if (!isSupabaseLive) return res.type('text').send('Outreach needs the DB live (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).');
  const out = await runOutreachSweep();
  res.type('text').send(`Outreach sweep done. Quote follow-ups sent: ${out.quote ?? 0} · Review requests sent: ${out.review ?? 0}` + (isSmsLive ? '' : '\n(SMS is in MOCK mode — messages were logged, not sent. Set Twilio creds to send for real.)'));
});

// --- Calendar sync: dashboard → Cal.com ---
app.post('/api/calendar/create', async (req, res) => {
  const { businessId, apptId, startsAt, name, phone, notes } = req.body;
  if (!businessId || !apptId) return res.status(400).json({ error: 'businessId and apptId required' });
  const calBookingId = await syncCreateAppointment(apptId, { businessId, startsAt, name, phone, notes });
  res.json({ ok: !!calBookingId, calBookingId });
});

app.put('/api/calendar/:apptId', async (req, res) => {
  const { businessId, calBookingId, startsAt, name, phone, notes } = req.body;
  if (!businessId || !req.params.apptId) return res.status(400).json({ error: 'businessId required' });
  const newCalBookingId = await syncUpdateAppointment(req.params.apptId, calBookingId, { businessId, startsAt, name, phone, notes });
  res.json({ ok: !!newCalBookingId, calBookingId: newCalBookingId });
});

app.delete('/api/calendar/:apptId', async (req, res) => {
  const { businessId, calBookingId } = req.body;
  if (!businessId || !calBookingId) return res.status(400).json({ error: 'businessId and calBookingId required' });
  const ok = await syncDeleteAppointment(businessId, calBookingId);
  res.json({ ok });
});

// --- Stripe payment collection ---
app.post('/api/stripe/create-payment-link', async (req, res) => {
  const { businessId, invoiceId, amountCents, description, customerEmail, customerName } = req.body;
  if (!businessId || !invoiceId || !amountCents) return res.status(400).json({ error: 'businessId, invoiceId, amountCents required' });
  const result = await createPaymentLink(businessId, invoiceId, { amountCents, description, customerEmail, customerName });
  res.json(result);
});

app.post('/api/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const body = req.rawBody; // need to capture raw body before JSON parsing
  const result = await handleWebhook(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  res.status(result.ok ? 200 : 400).json(result);
});

// Payment success redirect (after customer pays)
app.get('/payment-success', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>Payment Received</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h1>✓ Payment Received</h1>
        <p>Thank you! Your payment has been processed successfully.</p>
        <p>The business will confirm the details shortly.</p>
        <a href="/" style="color: #CF0000;">Back to home</a>
      </body>
    </html>
  `);
});

// --- Twilio voice webhook: returns TwiML that connects the call to ConversationRelay ---
app.post('/incoming-call', async (req, res) => {
  console.log(`[incoming-call] request received, To=${req.body?.To}`);
  try {
    // Twilio posts the dialed number as "To" — use it to pick the business so the
    // greeting/voice match the tenant this number belongs to.
    const business = await resolveBusiness(req.body.To);
    const wsUrl = (config.publicUrl.replace(/^http/, 'ws') || 'ws://localhost:' + config.port) + '/ws';
    const greeting = escapeXml(greetingFor(business));
    const voice = business.voice || config.voice;
    const provider = business.ttsProvider || config.ttsProvider || ttsProviderFor(voice);
    const ttsAttr = provider ? ` ttsProvider="${escapeXml(provider)}"` : '';
    // Barge-in settings matter more than anything else here. Twilio's defaults
    // (interruptSensitivity="high", backchannel counted as speech, DTMF able to
    // interrupt) mean a cough, a "mm-hmm", or road noise cuts the agent off in
    // the middle of a sentence — the caller hears a half-finished phrase and
    // then silence. Only clear speech should ever stop us talking.
    const twiml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Response>` +
      `<Connect>` +
      `<ConversationRelay url="${wsUrl}" welcomeGreeting="${greeting}" voice="${escapeXml(voice)}"${ttsAttr}` +
      ` interruptible="speech"` +
      ` welcomeGreetingInterruptible="speech"` +
      ` interruptSensitivity="${escapeXml(config.interruptSensitivity)}"` +
      ` ignoreBackchannel="${config.ignoreBackchannel ? 'true' : 'false'}"` +
      ` eotThreshold="${escapeXml(config.eotThreshold)}" />` +
      `</Connect>` +
      `</Response>`;
    console.log(`[incoming-call] resolved business=${business.name}, wsUrl=${wsUrl}`);
    res.type('text/xml').send(twiml);
  } catch (err) {
    console.error('[incoming-call] ERROR:', err.stack || err.message);
    res.status(500).type('text/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, we hit a technical issue. Please try again shortly.</Say></Response>`
    );
  }
});

// --- Branded SMS survey form ---
app.get('/survey/:id', (req, res) => {
  const lead = getLead(req.params.id);
  if (!lead) return res.status(404).send('Survey not found or expired.');
  res.send(surveyPage(lead));
});

app.post('/api/survey/:id', async (req, res) => {
  const lead = getLead(req.params.id);
  if (!lead) return res.status(404).send('Survey not found.');
  const { address, issue, urgency, notes } = req.body;
  updateLead(lead.id, {
    survey: { address, issue, urgency, notes, completedAt: new Date().toISOString() },
    status: lead.status === 'new' ? 'callback_requested' : lead.status,
  });
  await alertOwner(getLead(lead.id)); // re-alert with full survey context
  res.send(thankYouPage());
});

// --- Branded dashboard ---
app.get('/dashboard', (_req, res) => res.send(dashboardPage(allLeads())));

// --- Browser test chat (talk to the receptionist by typing; no phone needed) ---
const chatSessions = new Map(); // browser id -> CallSession
app.get('/test', (_req, res) => res.send(testChatPage(WELCOME_GREETING)));
app.post('/api/chat', async (req, res) => {
  const { id, text } = req.body || {};
  if (!id || !text) return res.status(400).json({ error: 'id and text required' });
  let session = chatSessions.get(id);
  if (!session) {
    const lead = createLead({ callSid: id, from: '+15555550123', to: config.twilio.phoneNumber || 'test-line' });
    session = new CallSession(envBusiness(), lead.id);
    chatSessions.set(id, session);
  }
  try {
    const reply = await session.handleUtterance(text);
    res.json({ reply });
  } catch (err) {
    console.error('[chat] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- HTTP server + WebSocket for ConversationRelay ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  let session = null;
  let inflight = null; // { controller, promise } for the reply being spoken
  let spokenText = ''; // exactly what we handed the TTS for the current reply
  let speaking = false; // has any audio gone out for the current reply yet?
  let pendingInterrupt = null; // { heard } — a barge-in waiting on its transcript

  const send = (msg) => { try { ws.send(JSON.stringify(msg)); } catch { /* socket closed */ } };

  // Cancel the in-flight reply (used on barge-in) and wait for it to unwind so
  // the next turn starts from a clean state.
  async function cancelInflight() {
    if (!inflight) return;
    const cur = inflight;
    cur.controller.abort();
    try { await cur.promise; } catch { /* aborted */ }
    if (inflight === cur) inflight = null;
  }

  // A barge-in that produced no transcript was noise, not speech — but the TTS
  // has already stopped mid-sentence. Speak the part the caller never heard
  // instead of leaving them in silence waiting on a half-finished phrase.
  function resumeAfterFalseBargeIn() {
    const heard = pendingInterrupt?.heard || '';
    pendingInterrupt = null;
    const rest = unspokenRemainder(spokenText, heard);
    if (!rest) return;
    console.log(`[call] false barge-in — finishing: "${rest.slice(0, 60)}"`);
    send({ type: 'text', token: rest, last: true });
    if (session?.ended) send({ type: 'end', handoffData: 'completed' });
  }

  async function runPrompt(text) {
    await cancelInflight(); // if the caller interrupted, drop the old reply
    pendingInterrupt = null;
    const controller = new AbortController();
    spokenText = '';
    speaking = false;
    const promise = (async () => {
      await session.handleUtterance(
        text,
        (chunk) => {
          if (controller.signal.aborted) return;
          spokenText += chunk;
          speaking = true;
          send({ type: 'text', token: chunk, last: false });
        },
        controller.signal
      );
      if (!controller.signal.aborted) {
        send({ type: 'text', token: '', last: true });
        if (session.ended) send({ type: 'end', handoffData: 'completed' });
      }
    })();
    inflight = { controller, promise };
    try {
      await promise;
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error('[call] error:', err.message);
        send({ type: 'text', token: 'Sorry, I hit a snag. One moment.', last: true });
      }
    } finally {
      if (inflight?.controller === controller) inflight = null;
    }
  }

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'setup') {
      const lead = createLead({ callSid: msg.callSid, from: msg.from, to: msg.to });
      // Which tenant is this call for? (by the dialed number)
      const business = await resolveBusiness(msg.to);
      // Log the call + upsert the caller as a contact in Supabase (best-effort).
      const [dbCallId, dbContactId] = await Promise.all([
        logCall({ businessId: business.id, callSid: msg.callSid, from: msg.from, to: msg.to }),
        upsertContactByPhone({ businessId: business.id, phone: msg.from }),
      ]);
      updateLead(lead.id, { businessId: business.id, dbCallId, dbContactId });
      // Pre-fetch this business's availability so the AI can offer times on its
      // first reply without a Cal.com + extra model round-trip mid-call.
      let slots = null;
      try { slots = await getAvailableSlots(2, business.cal, business.timezone); } catch (e) { console.error('[call] slot prefetch:', e.message); }
      session = new CallSession(business, lead.id, slots);
      // ConversationRelay is about to speak the welcome greeting for us. Track
      // it as the current utterance so a false barge-in during the greeting
      // gets finished like any other reply — it ends in the question the whole
      // call hinges on ("callback, or leave a message?"), and losing it to a
      // cough stalls the call before it starts.
      spokenText = session.greeting || '';
      speaking = Boolean(spokenText);
      console.log(`[call] setup ${msg.callSid} to ${msg.to} -> ${business.name} (lead ${lead.id})`);
      return;
    }

    // Caller (maybe) barged in. Stop talking, but don't touch the conversation
    // history yet — we can't tell real speech from noise until the follow-up
    // 'prompt' arrives, and rewriting history on noise is what makes the AI
    // re-explain itself for no reason.
    if (msg.type === 'interrupt') {
      // Nothing has been spoken for this turn yet, so there is nothing to barge
      // in on — this is just noise while we're still thinking. Let the reply
      // finish; if the caller really is talking, their transcript lands as a
      // 'prompt' and runPrompt cancels this reply anyway.
      if (!speaking) return;
      await cancelInflight();
      pendingInterrupt = { heard: msg.utteranceUntilInterrupt || '' };
      return;
    }

    if (msg.type === 'prompt' && msg.last && session) {
      const text = (msg.voicePrompt || '').trim();
      if (!text) {
        // Empty transcript = there was no real speech to transcribe (noise, a
        // breath, a cough). Don't ask the model to respond to nothing — that
        // produced confused "actually, let me wait..." lines. Instead finish
        // the sentence the caller got cut off in.
        if (pendingInterrupt) resumeAfterFalseBargeIn();
        else console.log('[call] empty prompt — ignoring');
        return;
      }
      // Real words: now we know the barge-in was genuine, so trim the last
      // reply to what the caller actually heard before answering them.
      if (pendingInterrupt) {
        const { heard } = pendingInterrupt;
        pendingInterrupt = null;
        if (heard) session.markInterrupted(heard);
      }
      await runPrompt(text);
      return;
    }

    if (msg.type === 'error') {
      console.error('[relay] error:', msg.description);
    }
  });

  ws.on('close', () => {
    cancelInflight();
    // Stamp the call as ended in Supabase + save the transcript (best-effort).
    const lead = session ? getLead(session.leadId) : null;
    if (lead?.dbCallId) {
      const transcript = session ? session.transcript() : null;
      updateCall(lead.dbCallId, {
        ended_at: new Date().toISOString(),
        outcome: lead.status,
        transcript: transcript && transcript.length ? transcript : null,
      });
    }
    console.log('[call] connection closed');
  });
});

function escapeXml(s = '') {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
}

// What's left of `full` once the caller has heard `heard` — the prefix
// ConversationRelay reports it managed to speak before stopping. Counted in
// words rather than sliced by character offset, since the reported prefix comes
// back normalized and exact offsets drift.
function unspokenRemainder(full, heard) {
  const words = (full || '').trim().split(/\s+/).filter(Boolean);
  const heardCount = (heard || '').trim().split(/\s+/).filter(Boolean).length;
  if (!heardCount || heardCount >= words.length) return '';
  const rest = words.slice(heardCount);
  // A single trailing word isn't worth re-speaking — it just sounds like a stutter.
  return rest.length >= 2 ? rest.join(' ') : '';
}

// ConversationRelay defaults ttsProvider to ElevenLabs, whose voice ids look
// nothing like Google's ("en-US-Journey-O") or Amazon's ("Joanna-Neural") — so
// sending one of those with no provider is a mismatch. Infer it from the shape
// of the voice name instead of silently getting the wrong engine.
function ttsProviderFor(voice = '') {
  if (/^[a-z]{2}-[A-Z]{2}-/.test(voice)) return 'Google';
  if (/^Polly\.|-Neural$/.test(voice)) return 'Amazon';
  return ''; // looks like an ElevenLabs voice id — let Twilio's default stand
}

server.listen(config.port, () => {
  console.log(`Biggify receptionist listening on :${config.port}`);
  console.log(`  DB: ${isSupabaseLive ? 'LIVE (multi-tenant)' : 'mock (env)'} | Cal.com: ${isCalcomLive ? 'LIVE' : 'mock'} | SMS: ${isSmsLive ? 'LIVE' : 'mock'} | Email: ${isEmailLive ? 'LIVE' : 'mock'}`);
  if (!config.publicUrl) console.log('  ⚠ PUBLIC_URL not set — set it to your ngrok/deploy URL for Twilio + survey links.');
  // Quote follow-ups + review requests (opt-in per business; no-op unless DB is live).
  startOutreachScheduler();
});
