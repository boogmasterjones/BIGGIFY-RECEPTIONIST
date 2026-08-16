// Email notifications via SMTP (Gmail by default). In non-live mode (no
// SMTP_USER / SMTP_PASS) it just logs — so the receptionist never crashes on a
// missing key and you can see exactly what would have been sent.
//
// Gmail setup: turn on 2-Step Verification on the sending Google account, then
// create an App Password (Google Account -> Security -> App passwords) and put
// it in SMTP_PASS. SMTP_USER is the full Gmail address.

import nodemailer from 'nodemailer';
import { config } from './config.js';

const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
// Optional overrides for non-Gmail SMTP.
const smtpHost = process.env.SMTP_HOST || '';
const smtpPort = Number(process.env.SMTP_PORT) || 0;

export const isEmailLive = Boolean(smtpUser && smtpPass);

let transporter = null;
if (isEmailLive) {
  transporter = smtpHost
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort || 587,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      })
    : nodemailer.createTransport({ service: 'gmail', auth: { user: smtpUser, pass: smtpPass } });
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
