// Compatibility wrapper for password reset email sending; new code should use EmailService.
import { EmailService } from './services/email-service.js';

export async function sendPasswordResetEmail(
  username: string,
  email: string,
  resetToken: string,
): Promise<void> {
  return new EmailService().sendPasswordResetEmail(username, email, resetToken);
}
