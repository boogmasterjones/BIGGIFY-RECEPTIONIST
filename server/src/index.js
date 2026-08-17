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
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
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

// --- Twilio voice webhook: returns TwiML that connects the call to ConversationRelay ---
app.post('/incoming-call', async (req, res) => {
  // Twilio posts the dialed number as "To" — use it to pick the business so the
  // greeting/voice match the tenant this number belongs to.
  const business = await resolveBusiness(req.body.To);
  const wsUrl = (config.publicUrl.replace(/^http/, 'ws') || 'ws://localhost:' + config.port) + '/ws';
  const greeting = escapeXml(greetingFor(business));
  const voice = business.voice || config.voice;
  const provider = business.ttsProvider || config.ttsProvider;
  const ttsAttr = provider ? ` ttsProvider="${escapeXml(provider)}"` : '';
  const twiml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Response>` +
    `<Connect>` +
    `<ConversationRelay url="${wsUrl}" welcomeGreeting="${greeting}" voice="${escapeXml(voice)}"${ttsAttr} interruptible="true" />` +
    `</Connect>` +
    `</Response>`;
  res.type('text/xml').send(twiml);
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

  // Cancel the in-flight reply (used on barge-in) and wait for it to unwind so
  // the next turn starts from a clean state.
  async function cancelInflight() {
    if (!inflight) return;
    const cur = inflight;
    cur.controller.abort();
    try { await cur.promise; } catch { /* aborted */ }
    if (inflight === cur) inflight = null;
  }

  async function runPrompt(text) {
    await cancelInflight(); // if the caller interrupted, drop the old reply
    const controller = new AbortController();
    const promise = (async () => {
      await session.handleUtterance(
        text,
        (chunk) => {
          if (controller.signal.aborted) return;
          ws.send(JSON.stringify({ type: 'text', token: chunk, last: false }));
        },
        controller.signal
      );
      if (!controller.signal.aborted) {
        ws.send(JSON.stringify({ type: 'text', token: '', last: true }));
        if (session.ended) ws.send(JSON.stringify({ type: 'end', handoffData: 'completed' }));
      }
    })();
    inflight = { controller, promise };
    try {
      await promise;
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error('[call] error:', err.message);
        ws.send(JSON.stringify({ type: 'text', token: 'Sorry, I hit a snag. One moment.', last: true }));
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
      try { slots = await getAvailableSlots(2, business.cal); } catch (e) { console.error('[call] slot prefetch:', e.message); }
      session = new CallSession(business, lead.id, slots);
      console.log(`[call] setup ${msg.callSid} to ${msg.to} -> ${business.name} (lead ${lead.id})`);
      return;
    }

    // Caller barged in — stop talking immediately, and record how much they
    // actually heard so the next reply can bring back anything they missed.
    // A follow-up 'prompt' with their words (if any) arrives right after.
    if (msg.type === 'interrupt') {
      await cancelInflight();
      if (session && msg.utteranceUntilInterrupt) session.markInterrupted(msg.utteranceUntilInterrupt);
      return;
    }

    if (msg.type === 'prompt' && msg.last && session) {
      await runPrompt(msg.voicePrompt || '');
      return;
    }

    if (msg.type === 'error') {
      console.error('[relay] error:', msg.description);
    }
  });

  ws.on('close', () => {
    cancelInflight();
    // Stamp the call as ended in Supabase (best-effort).
    const lead = session ? getLead(session.leadId) : null;
    if (lead?.dbCallId) updateCall(lead.dbCallId, { ended_at: new Date().toISOString(), outcome: lead.status });
    console.log('[call] connection closed');
  });
});

function escapeXml(s = '') {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
}

server.listen(config.port, () => {
  console.log(`Biggify receptionist listening on :${config.port}`);
  console.log(`  DB: ${isSupabaseLive ? 'LIVE (multi-tenant)' : 'mock (env)'} | Cal.com: ${isCalcomLive ? 'LIVE' : 'mock'} | SMS: ${isSmsLive ? 'LIVE' : 'mock'} | Email: ${isEmailLive ? 'LIVE' : 'mock'}`);
  if (!config.publicUrl) console.log('  ⚠ PUBLIC_URL not set — set it to your ngrok/deploy URL for Twilio + survey links.');
});
