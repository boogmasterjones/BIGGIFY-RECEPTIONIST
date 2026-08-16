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

// Render (and many container hosts) have no outbound IPv6. Gmail's SMTP often
// resolves to an IPv6 address first, which then fails with ENETUNREACH. Prefer
// IPv4 globally so name lookups return reachable addresses.
dns.setDefaultResultOrder('ipv4first');

const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
// Optional overrides for non-Gmail SMTP.
const smtpHost = process.env.SMTP_HOST || '';
const smtpPort = Number(process.env.SMTP_PORT) || 0;

export const isEmailLive = Boolean(smtpUser && smtpPass);

// Fail fast instead of hanging if SMTP is slow/misconfigured, and force IPv4
// (family: 4) so we never try an unreachable IPv6 route.
const base = { family: 4, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000 };

let transporter = null;
if (isEmailLive) {
  transporter = nodemailer.createTransport({
    host: smtpHost || 'smtp.gmail.com',
    port: smtpPort || 587,
    secure: (smtpPort || 587) === 465, // 587 uses STARTTLS
    auth: { user: smtpUser, pass: smtpPass },
    ...base,
  });
}

// Sends a plain-text email. Returns { ok, ... }. Never throws.
export async function sendEmail(to, subject, text) {
  if (!to) return { ok: false, reason: 'no recipient' };
  if (!isEmailLive) {
    console.log(`[email:mock] -> ${to} | ${subject}\n${text}\n`);
    return { ok: true, mocked: true };
  }
  try {
    const info = await transporter.sendMail({
      from: `"${config.business.name} via Biggify" <${smtpUser}>`,
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
