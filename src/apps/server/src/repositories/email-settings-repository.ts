// Repository for persisted email provider configuration.
import { db } from './_private/db.js';

export type ResendEmailSettings = {
  provider: 'resend';
  apiKey: string;
  fromEmail: string;
  updatedAt: number;
};

type ResendEmailSettingsRow = {
  provider: string;
  api_key: string;
  from_email: string;
  updated_at: number;
};

const getResendSettingsStatement = db.prepare<[], ResendEmailSettingsRow>(
  `
    SELECT email_provider AS provider, email_api_key AS api_key,
           email_from_email AS from_email, email_updated_at AS updated_at
    FROM application_settings
    WHERE id = 1 AND email_provider = 'resend'
  `,
);

const setResendSettingsStatement = db.prepare<{
  apiKey: string;
  fromEmail: string;
  updatedAt: number;
}>(
  `
    UPDATE application_settings SET
      email_provider = 'resend',
      email_api_key = @apiKey,
      email_from_email = @fromEmail,
      email_updated_at = @updatedAt
    WHERE id = 1
  `,
);

const deleteResendSettingsStatement = db.prepare(
  `UPDATE application_settings SET
     email_provider = NULL, email_api_key = NULL, email_from_email = NULL, email_updated_at = NULL
   WHERE id = 1`,
);

export class EmailSettingsRepository {
  getResendSettings(): ResendEmailSettings | null {
    const row = getResendSettingsStatement.get();
    if (!row) return null;
    return {
      provider: 'resend',
      apiKey: row.api_key,
      fromEmail: row.from_email,
      updatedAt: row.updated_at,
    };
  }

  setResendSettings(settings: Omit<ResendEmailSettings, 'provider'>): ResendEmailSettings {
    setResendSettingsStatement.run(settings);
    return { provider: 'resend', ...settings };
  }

  deleteResendSettings(): void {
    deleteResendSettingsStatement.run();
  }
}
