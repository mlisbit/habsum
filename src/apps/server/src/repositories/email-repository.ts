// Repository for Resend email delivery configuration and client interaction.
import { Resend } from 'resend';

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export class EmailRepository {
  configuredFromAddress(): string | null {
    return process.env.RESEND_FROM?.trim() || null;
  }

  async sendEmail(message: EmailMessage, deliveryName: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      const errorMessage = 'RESEND_API_KEY is not configured';
      console.error(`[habsum] ${errorMessage}; ${deliveryName} was not sent`);
      throw new Error(errorMessage);
    }

    const from = this.configuredFromAddress();
    if (!from) {
      const errorMessage = 'RESEND_FROM is not configured';
      console.error(`[habsum] ${errorMessage}; ${deliveryName} was not sent`);
      throw new Error(errorMessage);
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (error) {
      console.error(`[habsum] Resend rejected ${deliveryName}:`, error);
      throw new Error(error.message);
    }
  }
}
