// Email notifications via SMTP (Gmail by default). In non-live mode (no
// SMTP_USER / SMTP_PASS) it just logs — so the receptionist never crashes on a
// missing key and you can see exactly what would have been sent.
//
// Gmail setup: turn on 2-Step Verification on the sending Google account, then
// create an App Password (Google Account -> Security -> App passwords) and put
// it in SMTP_PASS. SMTP_USER is the full Gmail address.

import nodemailer from 'nodemailer';
import dns from 'node:dns';
import { config } from './config.js';

const dnsp = dns.promises;

const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
// Optional overrides for non-Gmail SMTP.
const smtpHost = process.env.SMTP_HOST || '';
const smtpPort = Number(process.env.SMTP_PORT) || 0;
const HOST = smtpHost || 'smtp.gmail.com';
const PORT = smtpPort || 587;

export const isEmailLive = Boolean(smtpUser && smtpPass);

const base = { connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000 };

// Render (and many container hosts) have NO outbound IPv6, yet Gmail's SMTP
// resolves to an IPv6 address first (ENETUNREACH). Setting family:4 wasn't
// enough, so we resolve the host to an IPv4 address ourselves and connect to
// that IP directly — validating TLS against the real hostname via `servername`.
let transporter = null;
async function getTransporter() {
  if (transporter) return transporter;
  let connectHost = HOST;
  try {
    const [ipv4] = await dnsp.resolve4(HOST);
    if (ipv4) connectHost = ipv4;
  } catch (e) {
    console.error('[email] resolve4 failed, using hostname:', e.message);
  }
  transporter = nodemailer.createTransport({
    host: connectHost,
    port: PORT,
    secure: PORT === 465, // 587 uses STARTTLS
    auth: { user: smtpUser, pass: smtpPass },
    tls: { servername: HOST }, // cert is for the hostname, not the raw IP
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
    const tx = await getTransporter();
    const info = await tx.sendMail({
      from: `"${fromName || config.business.name} via Biggify" <${smtpUser}>`,
      to,
      subject,
      text,
    });
    return { ok: true, id: info.messageId };
  } catch (err) {
    console.error('[email] send failed:', err.message);
    return { ok: false, error: err.message };
  }
}
