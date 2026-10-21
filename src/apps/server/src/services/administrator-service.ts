import type { AdministratorApplicationSettings } from '@habsum/types/api-responses/administrator-application-settings';
import { ApplicationSettingsRepository } from '../repositories/application-settings-repository.js';
import type {
  AdministratorEmailSettingsPutRequest,
  AdministratorEmailSettingsResponse,
  AdministratorEmailTestRequest,
  AdministratorEmailTestResponse,
} from '@habsum/types/api-responses/administrator-email-settings';
import type {
  AdministratorDatabaseDeleteRequest,
  AdministratorDatabaseDeleteResponse,
} from '@habsum/types/api-responses/administrator-database';
import { DatabaseRepository } from '../repositories/database-repository.js';
import { EmailSettingsRepository } from '../repositories/email-settings-repository.js';
import ServiceError from '../utils/classes/service-error.js';
import { isPlausibleEmail } from '../utils/request-utils.js';
import { EmailService } from './email-service.js';

export class AdministratorService {
  constructor(
    private readonly emailSettingsRepository = new EmailSettingsRepository(),
    private readonly emailService = new EmailService(),
    private readonly databaseRepository = new DatabaseRepository(),
    private readonly applicationSettingsRepository = new ApplicationSettingsRepository(),
  ) {}

  getApplicationSettings(): AdministratorApplicationSettings {
    return { accountSignup: this.applicationSettingsRepository.isAccountSignupEnabled() };
  }

  updateApplicationSettings(body: AdministratorApplicationSettings | undefined) {
    if (typeof body?.accountSignup !== 'boolean') {
      throw new ServiceError('bad_request', 'accountSignup must be a boolean');
    }
    this.applicationSettingsRepository.setAccountSignupEnabled(body.accountSignup);
    return this.getApplicationSettings();
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
    if (!settings) return { updatedAt: null };
    return {
      emailProvider: {
        name: 'resend',
        ...(settings.apiKey ? { apiKey: settings.apiKey } : {}),
        ...(settings.fromEmail ? { email: settings.fromEmail } : {}),
      },
      updatedAt: settings.updatedAt,
    };
  }

  updateEmailSettings(body: AdministratorEmailSettingsPutRequest | undefined) {
    if (body?.emailProvider == null) {
      this.emailSettingsRepository.deleteResendSettings();
      return this.getEmailSettings();
    }
    if (body.emailProvider.name !== 'resend') {
      throw new ServiceError('bad_request', 'provider must be resend');
    }
    if (body.emailProvider.apiKey !== undefined && typeof body.emailProvider.apiKey !== 'string') {
      throw new ServiceError('bad_request', 'apiKey must be a string');
    }
    if (body.emailProvider.email !== undefined && typeof body.emailProvider.email !== 'string') {
      throw new ServiceError('bad_request', 'email must be a string');
    }

    const apiKey = body.emailProvider.apiKey?.trim() ?? '';
    const fromEmail = body.emailProvider.email?.trim() ?? '';
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
    body: AdministratorEmailTestRequest | undefined,
  ): Promise<AdministratorEmailTestResponse> {
    if (body?.emailProvider?.name !== 'resend') {
      throw new ServiceError('bad_request', 'provider must be resend');
    }
    if (typeof body.recipient !== 'string' || !isPlausibleEmail(body.recipient.trim())) {
      throw new ServiceError('bad_request', 'invalid recipient email address');
    }
    if (typeof body.emailProvider.apiKey !== 'string' || !body.emailProvider.apiKey.trim()) {
      throw new ServiceError('bad_request', 'Resend API key is required');
    }
    if (
      typeof body.emailProvider.email !== 'string' ||
      !isPlausibleEmail(body.emailProvider.email.trim())
    ) {
      throw new ServiceError('bad_request', 'invalid email address');
    }

    try {
      await this.emailService.sendEmailUsingSettings(
        {
          deliveryName: 'administrator test email',
          to: body.recipient.trim(),
          subject: 'Habsum test email',
          html: '<p>This test email was sent from the Habsum Administrator settings page.</p>',
          text: 'This test email was sent from the Habsum Administrator settings page.',
        },
        {
          apiKey: body.emailProvider.apiKey.trim(),
          fromEmail: body.emailProvider.email.trim(),
        },
      );
    } catch (error) {
      throw new ServiceError(
        'unavailable',
        error instanceof Error ? error.message : 'failed to send test email',
      );
    }

    return { ok: true, recipient: body.recipient.trim() };
  }
}
