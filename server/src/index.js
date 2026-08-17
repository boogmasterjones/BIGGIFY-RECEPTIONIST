import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { config, isCalcomLive, isSmsLive } from './config.js';
import { isEmailLive, sendEmail } from './email.js';
import { WELCOME_GREETING } from './prompt.js';
import { CallSession } from './claude.js';
import { getAvailableSlots } from './calcom.js';
import { createLead, updateLead, getLead, allLeads } from './store.js';
import { alertOwner } from './twilioSms.js';
import { surveyPage, thankYouPage, dashboardPage, testChatPage } from './pages.js';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public'))); // serves /logo.png

// --- Health check ---
app.get('/', (_req, res) => {
  res.type('text').send(
    `Biggify AI receptionist is running.\n` +
    `Cal.com: ${isCalcomLive ? 'live' : 'MOCK'} | SMS: ${isSmsLive ? 'live' : 'MOCK'} | Email: ${isEmailLive ? 'live' : 'MOCK'}\n` +
    `Alert email: ${config.business.ownerAlertEmail || '(not set)'}\n` +
    `Dashboard: /dashboard`
  );
});

// --- Email diagnostic: visit /test-email to send yourself a test alert ---
app.get('/test-email', async (_req, res) => {
  const to = config.business.ownerAlertEmail;
  if (!to) return res.type('text').send('OWNER_ALERT_EMAIL is not set. Add it in your env vars.');
  if (!isEmailLive) {
    return res.type('text').send(
      'Email is in MOCK mode (not actually sending). Set SMTP_USER and SMTP_PASS ' +
      '(Gmail app password) in your env vars, then redeploy.'
    );
  }
  const result = await sendEmail(to, 'Biggify test email', 'This is a test from your Biggify receptionist. If you got this, email alerts work.');
  res.type('text').send(result.ok ? `Sent to ${to}. Check your inbox (and spam).` : `Failed: ${result.error}`);
});

// --- Twilio voice webhook: returns TwiML that connects the call to ConversationRelay ---
app.post('/incoming-call', (req, res) => {
  const wsUrl = (config.publicUrl.replace(/^http/, 'ws') || 'ws://localhost:' + config.port) + '/ws';
  const greeting = escapeXml(WELCOME_GREETING);
  const ttsAttr = config.ttsProvider ? ` ttsProvider="${escapeXml(config.ttsProvider)}"` : '';
  const twiml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Response>` +
    `<Connect>` +
    `<ConversationRelay url="${wsUrl}" welcomeGreeting="${greeting}" voice="${escapeXml(config.voice)}"${ttsAttr} interruptible="true" />` +
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
    session = new CallSession(lead.id);
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
      // Pre-fetch availability now so the AI can offer times on its first reply
      // without a Cal.com + extra model round-trip mid-call.
      let slots = null;
      try { slots = await getAvailableSlots(2); } catch (e) { console.error('[call] slot prefetch:', e.message); }
      session = new CallSession(lead.id, slots);
      console.log(`[call] setup ${msg.callSid} from ${msg.from} -> lead ${lead.id}`);
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

  ws.on('close', () => { cancelInflight(); console.log('[call] connection closed'); });
});

function escapeXml(s = '') {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
}

server.listen(config.port, () => {
  console.log(`Biggify receptionist listening on :${config.port}`);
  console.log(`  Cal.com: ${isCalcomLive ? 'LIVE' : 'mock'} | SMS: ${isSmsLive ? 'LIVE' : 'mock'} | Email: ${isEmailLive ? 'LIVE' : 'mock'}`);
  if (!config.publicUrl) console.log('  ⚠ PUBLIC_URL not set — set it to your ngrok/deploy URL for Twilio + survey links.');
});
