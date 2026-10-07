import type {
  AdministratorEmailSettingsPutRequest,
  AdministratorEmailSettingsResponse,
  AdministratorEmailTestRequest,
  AdministratorEmailTestResponse,
} from '@habsum/types/api-responses/administrator-email-settings';
import type {
  AdministratorDatabaseDeleteRequest,
  AdministratorDatabaseDeleteResponse,
  AdministratorDatabaseResponse,
} from '@habsum/types/api-responses/administrator-database';
import { DatabaseRepository } from '../repositories/database-repository.js';
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
    private readonly databaseRepository = new DatabaseRepository(),
  ) {}

  getDatabase(): AdministratorDatabaseResponse {
    return { path: this.databaseRepository.getPath() };
  }

  getDatabaseFile(): Buffer {
    try {
      return this.databaseRepository.getFile();
    } catch (error) {
      throw new ServiceError(
        'internal',
        error instanceof Error ? error.message : 'failed to read database',
      );
    }
  }

  deleteDatabase(
    body: AdministratorDatabaseDeleteRequest | undefined,
  ): AdministratorDatabaseDeleteResponse {
    if (body?.confirmation !== 'delete') {
      throw new ServiceError('bad_request', 'confirmation must be exactly "delete"');
    }

    try {
      this.databaseRepository.delete();
    } catch (error) {
      throw new ServiceError(
        'internal',
        error instanceof Error ? error.message : 'failed to delete database',
      );
    }
    return { ok: true };
  }

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
    if (typeof body.apiKey !== 'string') {
      throw new ServiceError('bad_request', 'apiKey must be a string');
    }
    if (typeof body.fromEmail !== 'string') {
      throw new ServiceError('bad_request', 'fromEmail must be a string');
    }

    const apiKey = body.apiKey.trim();
    const fromEmail = body.fromEmail.trim();
    if (!apiKey && !fromEmail) {
      this.emailSettingsRepository.deleteResendSettings();
      return this.getEmailSettings();
    }
    if (!apiKey) {
      throw new ServiceError('bad_request', 'Resend API key is required');
    }
    if (!fromEmail) {
      throw new ServiceError('bad_request', 'email address is required');
    }
    if (!isPlausibleEmail(fromEmail)) {
      throw new ServiceError('bad_request', 'invalid email address');
    }

    this.emailSettingsRepository.setResendSettings({
      apiKey,
      fromEmail,
      updatedAt: Math.floor(Date.now() / 1000),
    });
    return this.getEmailSettings();
  }

  async sendTestEmail(
    username: string,
    body: AdministratorEmailTestRequest | undefined,
  ): Promise<AdministratorEmailTestResponse> {
    const recipient = this.userAndAuthRepository.getUserProfile(username).email?.trim() ?? '';
    if (!isPlausibleEmail(recipient)) {
      throw new ServiceError('bad_request', 'your account does not have a valid email address');
    }
    if (body?.provider !== 'resend') {
      throw new ServiceError('bad_request', 'provider must be resend');
    }
    if (typeof body.apiKey !== 'string' || !body.apiKey.trim()) {
      throw new ServiceError('bad_request', 'Resend API key is required');
    }
    if (typeof body.fromEmail !== 'string' || !isPlausibleEmail(body.fromEmail.trim())) {
      throw new ServiceError('bad_request', 'invalid email address');
    }

    try {
      await this.emailService.sendEmailUsingSettings(
        {
          deliveryName: 'administrator test email',
          to: recipient,
          subject: 'Habsum test email',
          html: '<p>This test email was sent from the Habsum Administrator settings page.</p>',
          text: 'This test email was sent from the Habsum Administrator settings page.',
        },
        { apiKey: body.apiKey.trim(), fromEmail: body.fromEmail.trim() },
      );
    } catch (error) {
      throw new ServiceError(
        'unavailable',
        error instanceof Error ? error.message : 'failed to send test email',
      );
    }

    return { ok: true, recipient };
  }
}
