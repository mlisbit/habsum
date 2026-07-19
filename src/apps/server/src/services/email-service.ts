// Service for sending already-composed email messages.
import { EmailRepository, type EmailMessage } from '../repositories/email-repository.js';

export type SendEmailInput = EmailMessage & {
  deliveryName: string;
};

export class EmailService {
  constructor(private readonly emailRepository = new EmailRepository()) {}

  async sendEmail({ deliveryName, ...message }: SendEmailInput): Promise<void> {
    await this.emailRepository.sendEmail(message, deliveryName);
  }
}
