import { isDevelopment } from './env.js';

function passwordResetUrl(resetToken: string): string {
  const base = (process.env.HABSUM_WEBAPP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(resetToken)}`;
}

/** Sends a password-reset email. No-op until outbound mail is configured. */
export async function sendPasswordResetEmail(
  username: string,
  email: string,
  resetToken: string,
): Promise<void> {
  if (!isDevelopment()) return;

  console.log(`[habsum] password reset for ${username} (${email})`);
  console.log(`[habsum]   token: ${resetToken}`);
  console.log(`[habsum]   url:   ${passwordResetUrl(resetToken)}`);
}
