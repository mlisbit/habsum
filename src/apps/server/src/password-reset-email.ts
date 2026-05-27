import { PASSWORD_RESET_TOKEN_TTL_SECONDS } from './constants.js';
import { getUserProfile } from './db.js';
import { isDevelopment } from './env.js';
import { Resend } from 'resend';

function passwordResetUrl(resetToken: string): string {
  const base = (process.env.HABSUM_WEBAPP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(resetToken)}`;
}

function passwordResetGreetingName(username: string): string {
  const displayName = getUserProfile(username).displayName?.trim();
  return displayName || username;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function passwordResetEmailContent(
  resetUrl: string,
  greetingName: string,
): {
  subject: string;
  html: string;
  text: string;
} {
  const ttlMinutes = Math.round(PASSWORD_RESET_TOKEN_TTL_SECONDS / 60);
  const safeGreetingName = escapeHtml(greetingName);
  return {
    subject: 'Reset your Habsum password',
    html: `<p>Hello ${safeGreetingName},</p>
<p>We received a request to reset your Habsum password.</p>
<p><a href="${resetUrl}">Reset your password</a></p>
<p>This link expires in ${ttlMinutes} minutes. If you did not request this, you can ignore this email.</p>`,
    text: `Hello ${greetingName},

We received a request to reset your Habsum password.

Reset your password: ${resetUrl}

This link expires in ${ttlMinutes} minutes. If you did not request this, you can ignore this email.`,
  };
}

function logPasswordResetEmailPreview(
  username: string,
  email: string,
  resetToken: string,
  resetUrl: string,
): void {
  const greetingName = passwordResetGreetingName(username);
  const content = passwordResetEmailContent(resetUrl, greetingName);
  console.log('[habsum] --- password reset email (dev preview) ---');
  console.log(`[habsum] from:    ${process.env.RESEND_FROM?.trim() ?? '(not set)'}`);
  console.log(`[habsum] to:      ${email}`);
  console.log(`[habsum] subject: ${content.subject}`);
  console.log(`[habsum] token:   ${resetToken}`);
  console.log(`[habsum] url:     ${resetUrl}`);
  console.log('[habsum] body:');
  for (const line of content.text.split('\n')) {
    console.log(`[habsum]   ${line}`);
  }
  console.log('[habsum] --- end password reset email preview ---');
}

/** Sends a password-reset email via Resend when configured. */
export async function sendPasswordResetEmail(
  username: string,
  email: string,
  resetToken: string,
): Promise<void> {
  const resetUrl = passwordResetUrl(resetToken);
  const greetingName = passwordResetGreetingName(username);
  const content = passwordResetEmailContent(resetUrl, greetingName);

  if (isDevelopment()) {
    logPasswordResetEmailPreview(username, email, resetToken, resetUrl);
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    const message = 'RESEND_API_KEY is not configured';
    console.error(`[habsum] ${message}; password reset email was not sent`);
    throw new Error(message);
  }

  const from = process.env.RESEND_FROM?.trim();
  if (!from) {
    const message = 'RESEND_FROM is not configured';
    console.error(`[habsum] ${message}; password reset email was not sent`);
    throw new Error(message);
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });

  if (error) {
    console.error('[habsum] Resend rejected password reset email:', error);
    throw new Error(error.message);
  }

  if (isDevelopment()) {
    console.log(`[habsum] password reset email sent via Resend to ${email}`);
  }
}
