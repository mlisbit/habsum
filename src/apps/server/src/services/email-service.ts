// Service for composing app emails and delegating delivery to the email repository.
import { PASSWORD_RESET_TOKEN_TTL_SECONDS } from '../constants.js';
import { isDevelopment } from '../env.js';
import { EmailRepository } from '../repositories/email-repository.js';
import { UserAndAuthRepository } from '../repositories/user-and-auth-repository.js';

function resetPasswordUrl(token: string): string {
  const base = (process.env.HABSUM_WEBAPP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
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
<p>You've been invited to Habsum - a habit tracking app for building routines that last.</p>
<p><a href="${setupUrl}">Set up your account</a></p>
<p>This link expires in 7 days.</p>`,
    text: `Hi ${displayName},

You've been invited to Habsum - a habit tracking app for building routines that last.

Set up your account: ${setupUrl}

This link expires in 7 days.`,
  };
}

export class EmailService {
  constructor(
    private readonly emailRepository = new EmailRepository(),
    private readonly userAndAuthRepository = new UserAndAuthRepository(),
  ) {}

  async sendPasswordResetEmail(username: string, email: string, resetToken: string): Promise<void> {
    const resetUrl = resetPasswordUrl(resetToken);
    const displayName = this.userAndAuthRepository.getUserProfile(username).displayName?.trim();
    const greetingName = displayName || username;
    const content = passwordResetEmailContent(resetUrl, greetingName);

    if (isDevelopment()) {
      this.logEmailPreview('password reset email', email, resetUrl, content, resetToken);
    }

    await this.emailRepository.sendEmail({ to: email, ...content }, 'password reset email');

    if (isDevelopment()) {
      console.log(`[habsum] password reset email sent via Resend to ${email}`);
    }
  }

  async sendInviteEmail(email: string, displayName: string, setupToken: string): Promise<void> {
    const setupUrl = resetPasswordUrl(setupToken);
    const content = inviteEmailContent(displayName, setupUrl);

    if (isDevelopment()) {
      this.logEmailPreview('invite email', email, setupUrl, content);
    }

    await this.emailRepository.sendEmail({ to: email, ...content }, 'invite email');

    if (isDevelopment()) {
      console.log(`[habsum] invite email sent via Resend to ${email}`);
    }
  }

  private logEmailPreview(
    label: string,
    email: string,
    url: string,
    content: { subject: string; text: string },
    token?: string,
  ): void {
    console.log(`[habsum] --- ${label} (dev preview) ---`);
    console.log(`[habsum] from:    ${this.emailRepository.configuredFromAddress() ?? '(not set)'}`);
    console.log(`[habsum] to:      ${email}`);
    console.log(`[habsum] subject: ${content.subject}`);
    if (token) console.log(`[habsum] token:   ${token}`);
    console.log(`[habsum] url:     ${url}`);
    console.log('[habsum] body:');
    for (const line of content.text.split('\n')) {
      console.log(`[habsum]   ${line}`);
    }
    console.log(`[habsum] --- end ${label} preview ---`);
  }
}
