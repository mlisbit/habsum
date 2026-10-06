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
    SELECT provider, api_key, from_email, updated_at
    FROM email_settings
    WHERE provider = 'resend'
  `,
);

const setResendSettingsStatement = db.prepare<{
  apiKey: string;
  fromEmail: string;
  updatedAt: number;
}>(
  `
    INSERT INTO email_settings (provider, api_key, from_email, updated_at)
    VALUES ('resend', @apiKey, @fromEmail, @updatedAt)
    ON CONFLICT(provider) DO UPDATE SET
      api_key = excluded.api_key,
      from_email = excluded.from_email,
      updated_at = excluded.updated_at
  `,
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
}
