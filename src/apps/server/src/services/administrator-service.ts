import type {
  AdministratorEmailSettingsPutRequest,
  AdministratorEmailSettingsResponse,
  AdministratorEmailTestResponse,
} from '@habsum/types/api-responses/administrator-email-settings';
import { EmailSettingsRepository } from '../repositories/email-settings-repository.js';
import { UserAndAuthRepository } from '../repositories/user-and-auth-repository.js';
import ServiceError from '../utils/classes/service-error.js';
import { isPlausibleEmail } from '../utils/request-utils.js';
import { EmailService } from './email-service.js';

export class AdministratorService {
  constructor(
    private readonly emailSettingsRepository = new EmailSettingsRepository(),
    private readonly emailService = new EmailService(),
    private readonly userAndAuthRepository = new UserAndAuthRepository(),
  ) {}

  getEmailSettings(): AdministratorEmailSettingsResponse {
    const settings = this.emailSettingsRepository.getResendSettings();
    return {
      provider: 'resend',
      apiKey: settings?.apiKey ?? '',
      fromEmail: settings?.fromEmail ?? '',
      updatedAt: settings?.updatedAt ?? null,
    };
  }

  updateEmailSettings(body: AdministratorEmailSettingsPutRequest | undefined) {
    if (body?.provider !== 'resend') {
      throw new ServiceError('bad_request', 'provider must be resend');
    }
    if (typeof body.fromEmail !== 'string' || !isPlausibleEmail(body.fromEmail.trim())) {
      throw new ServiceError('bad_request', 'invalid email address');
    }
    if (body.apiKey !== undefined && typeof body.apiKey !== 'string') {
      throw new ServiceError('bad_request', 'apiKey must be a string');
    }

    const existing = this.emailSettingsRepository.getResendSettings();
    const submittedApiKey = body.apiKey?.trim() ?? '';
    const apiKey = submittedApiKey || existing?.apiKey || '';
    if (!apiKey) {
      throw new ServiceError('bad_request', 'Resend API key is required');
    }

    this.emailSettingsRepository.setResendSettings({
      apiKey,
      fromEmail: body.fromEmail.trim(),
      updatedAt: Math.floor(Date.now() / 1000),
    });
    return this.getEmailSettings();
  }

  async sendTestEmail(username: string): Promise<AdministratorEmailTestResponse> {
    const recipient = this.userAndAuthRepository.getUserProfile(username).email?.trim() ?? '';
    if (!isPlausibleEmail(recipient)) {
      throw new ServiceError('bad_request', 'your account does not have a valid email address');
    }

    try {
      await this.emailService.sendEmail({
        deliveryName: 'administrator test email',
        to: recipient,
        subject: 'Habsum test email',
        html: '<p>This test email was sent from the Habsum Administrator settings page.</p>',
        text: 'This test email was sent from the Habsum Administrator settings page.',
      });
    } catch (error) {
      throw new ServiceError(
        'unavailable',
        error instanceof Error ? error.message : 'failed to send test email',
      );
    }

    return { ok: true, recipient };
  }
}
