// Service for sending already-composed email messages.
import {
  EmailRepository,
  type EmailDeliverySettings,
  type EmailMessage,
} from '../repositories/email-repository.js';

export type SendEmailInput = EmailMessage & {
  deliveryName: string;
};

export class EmailService {
  constructor(private readonly emailRepository = new EmailRepository()) {}

  getConfiguredFromAddress(): string | null {
    return this.emailRepository.configuredFromAddress();
  }

  async sendEmail({ deliveryName, ...message }: SendEmailInput): Promise<void> {
    await this.emailRepository.sendEmail(message, deliveryName);
  }

  async sendEmailUsingSettings(
    { deliveryName, ...message }: SendEmailInput,
    settings: EmailDeliverySettings,
  ): Promise<void> {
    await this.emailRepository.sendEmail(message, deliveryName, settings);
  }
}
