// Email notifications. Primary path is Resend (an HTTP email API over port 443)
// because cloud hosts like Render routinely block/timeout outbound SMTP ports —
// HTTP always works. SMTP (Gmail) is kept as a fallback. If neither is
// configured it logs in mock mode so the receptionist never crashes.
//
// Resend setup: sign up at resend.com, create an API key -> RESEND_API_KEY.
//   - To send to ANY address, verify your domain in Resend and set
//     EMAIL_FROM=alerts@yourdomain.com.
//   - Without a verified domain you can only send to your own Resend account
//     email, using the default from address (onboarding@resend.dev).

import nodemailer from 'nodemailer';
import dns from 'node:dns';
import { config } from './config.js';

const dnsp = dns.promises;

const resendKey = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
const smtpHost = process.env.SMTP_HOST || '';
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const SMTP_HOST = smtpHost || 'smtp.gmail.com';

export const emailMode = resendKey ? 'resend' : smtpUser && smtpPass ? 'smtp' : 'mock';
export const isEmailLive = emailMode !== 'mock';

// ---- Resend: a single HTTPS POST, no ports to get blocked ----
async function sendViaResend(to, subject, text, fromName) {
  const from = `${fromName || 'Biggify'} via Biggify <${EMAIL_FROM}>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, text }),
    signal: AbortSignal.timeout(10000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || json?.error?.message || `Resend HTTP ${res.status}`);
  return json?.id || 'sent';
}

// ---- SMTP fallback (nodemailer, forced IPv4) ----
const base = { connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000 };
let transporter = null;
async function getTransporter() {
  if (transporter) return transporter;
  let connectHost = SMTP_HOST;
  try {
    const [ipv4] = await dnsp.resolve4(SMTP_HOST);
    if (ipv4) connectHost = ipv4;
  } catch (e) {
    console.error('[email] resolve4 failed, using hostname:', e.message);
  }
  transporter = nodemailer.createTransport({
    host: connectHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { servername: SMTP_HOST },
    ...base,
  });
  return transporter;
}

// Sends a plain-text email. Returns { ok, ... }. Never throws.
export async function sendEmail(to, subject, text, fromName = '') {
  if (!to) return { ok: false, reason: 'no recipient' };
  if (!isEmailLive) {
    console.log(`[email:mock] -> ${to} | ${subject}\n${text}\n`);
    return { ok: true, mocked: true };
  }
  try {
    if (resendKey) {
      const id = await sendViaResend(to, subject, text, fromName);
      return { ok: true, id, via: 'resend' };
    }
    const tx = await getTransporter();
    const info = await tx.sendMail({
      from: `"${fromName || config.business.name} via Biggify" <${smtpUser}>`,
      to,
      subject,
      text,
    });
    return { ok: true, id: info.messageId, via: 'smtp' };
  } catch (err) {
    console.error('[email] send failed:', err.message);
    return { ok: false, error: err.message };
  }
}
