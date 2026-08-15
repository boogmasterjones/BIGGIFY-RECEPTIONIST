import http from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';

import { config, isCalcomLive, isSmsLive } from './config.js';
import { WELCOME_GREETING } from './prompt.js';
import { CallSession } from './claude.js';
import { createLead, updateLead, getLead, allLeads } from './store.js';
import { alertOwner } from './twilioSms.js';
import { surveyPage, thankYouPage, dashboardPage, testChatPage } from './pages.js';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// --- Health check ---
app.get('/', (_req, res) => {
  res.type('text').send(
    `Biggify AI receptionist is running.\n` +
    `Cal.com: ${isCalcomLive ? 'live' : 'MOCK'} | SMS: ${isSmsLive ? 'live' : 'MOCK'}\n` +
    `Dashboard: /dashboard`
  );
});

// --- Twilio voice webhook: returns TwiML that connects the call to ConversationRelay ---
app.post('/incoming-call', (req, res) => {
  const wsUrl = (config.publicUrl.replace(/^http/, 'ws') || 'ws://localhost:' + config.port) + '/ws';
  const greeting = escapeXml(WELCOME_GREETING);
  const twiml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Response>` +
    `<Connect>` +
    `<ConversationRelay url="${wsUrl}" welcomeGreeting="${greeting}" voice="${escapeXml(config.voice)}" />` +
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
  let busy = false;

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'setup') {
      const lead = createLead({ callSid: msg.callSid, from: msg.from, to: msg.to });
      session = new CallSession(lead.id);
      console.log(`[call] setup ${msg.callSid} from ${msg.from} -> lead ${lead.id}`);
      return;
    }

    if (msg.type === 'prompt' && msg.last && session && !busy) {
      busy = true;
      try {
        const reply = await session.handleUtterance(msg.voicePrompt || '');
        ws.send(JSON.stringify({ type: 'text', token: reply, last: true }));
      } catch (err) {
        console.error('[call] error:', err.message);
        ws.send(JSON.stringify({ type: 'text', token: 'Sorry, I hit a snag. One moment.', last: true }));
      } finally {
        busy = false;
      }
      return;
    }

    if (msg.type === 'error') {
      console.error('[relay] error:', msg.description);
    }
  });

  ws.on('close', () => console.log('[call] connection closed'));
});

function escapeXml(s = '') {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
}

server.listen(config.port, () => {
  console.log(`Biggify receptionist listening on :${config.port}`);
  console.log(`  Cal.com: ${isCalcomLive ? 'LIVE' : 'mock'} | SMS: ${isSmsLive ? 'LIVE' : 'mock'}`);
  if (!config.publicUrl) console.log('  ⚠ PUBLIC_URL not set — set it to your ngrok/deploy URL for Twilio + survey links.');
});
