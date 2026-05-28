import { isDevelopment } from './env.js';
import { Resend } from 'resend';

function inviteSetupUrl(setupToken: string): string {
  const base = (process.env.HABSUM_WEBAPP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(setupToken)}`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function inviteEmailContent(
  displayName: string,
  setupUrl: string,
): {
  subject: string;
  html: string;
  text: string;
} {
  const safeDisplayName = escapeHtml(displayName);
  return {
    subject: "You're invited to Habsum",
    html: `<p>Hi ${safeDisplayName},</p>
<p>You've been invited to Habsum — a habit tracking app for building routines that last.</p>
<p><a href="${setupUrl}">Set up your account</a></p>
<p>This link expires in 7 days.</p>`,
    text: `Hi ${displayName},

You've been invited to Habsum — a habit tracking app for building routines that last.

Set up your account: ${setupUrl}

This link expires in 7 days.`,
  };
}

function logInviteEmailPreview(email: string, displayName: string, setupUrl: string): void {
  const content = inviteEmailContent(displayName, setupUrl);
  console.log('[habsum] --- invite email (dev preview) ---');
  console.log(`[habsum] from:    ${process.env.RESEND_FROM?.trim() ?? '(not set)'}`);
  console.log(`[habsum] to:      ${email}`);
  console.log(`[habsum] subject: ${content.subject}`);
  console.log(`[habsum] url:     ${setupUrl}`);
  console.log('[habsum] body:');
  for (const line of content.text.split('\n')) {
    console.log(`[habsum]   ${line}`);
  }
  console.log('[habsum] --- end invite email preview ---');
}

/** Sends a new-user invite email via Resend when configured. */
export async function sendInviteEmail(
  email: string,
  displayName: string,
  setupToken: string,
): Promise<void> {
  const setupUrl = inviteSetupUrl(setupToken);
  const content = inviteEmailContent(displayName, setupUrl);

  if (isDevelopment()) {
    logInviteEmailPreview(email, displayName, setupUrl);
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    const message = 'RESEND_API_KEY is not configured';
    console.error(`[habsum] ${message}; invite email was not sent`);
    throw new Error(message);
  }

  const from = process.env.RESEND_FROM?.trim();
  if (!from) {
    const message = 'RESEND_FROM is not configured';
    console.error(`[habsum] ${message}; invite email was not sent`);
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
    console.error('[habsum] Resend rejected invite email:', error);
    throw new Error(error.message);
  }

  if (isDevelopment()) {
    console.log(`[habsum] invite email sent via Resend to ${email}`);
  }
}
