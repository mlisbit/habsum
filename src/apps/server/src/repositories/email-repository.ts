// Repository for Resend email delivery configuration and client interaction.
import { Resend } from 'resend';
import { EmailSettingsRepository } from './email-settings-repository.js';

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailDeliverySettings = {
  apiKey: string;
  fromEmail: string;
};

export class EmailRepository {
  constructor(private readonly emailSettingsRepository = new EmailSettingsRepository()) {}

  configuredFromAddress(): string | null {
    return this.emailSettingsRepository.getResendSettings()?.fromEmail ?? null;
  }

  async sendEmail(
    message: EmailMessage,
    deliveryName: string,
    settingsOverride?: EmailDeliverySettings,
  ): Promise<void> {
    const settings = settingsOverride ?? this.emailSettingsRepository.getResendSettings();
    if (!settings?.apiKey) {
      const errorMessage = 'Resend API key is not configured';
      console.error(`[habsum] ${errorMessage}; ${deliveryName} was not sent`);
      throw new Error(errorMessage);
    }

    if (!settings.fromEmail) {
      const errorMessage = 'Resend sender email is not configured';
      console.error(`[habsum] ${errorMessage}; ${deliveryName} was not sent`);
      throw new Error(errorMessage);
    }

    const resend = new Resend(settings.apiKey);
    const { error } = await resend.emails.send({
      from: settings.fromEmail,
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
