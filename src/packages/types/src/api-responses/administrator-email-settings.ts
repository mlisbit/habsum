export type AdministratorEmailSettingsResponse = {
  provider: 'resend';
  apiKey: string;
  fromEmail: string;
  updatedAt: number | null;
};

export type AdministratorEmailSettingsPutRequest = {
  provider: 'resend';
  fromEmail: string;
  /** Omit or send an empty string to retain an already-configured key. */
  apiKey?: string;
};

export type AdministratorEmailTestResponse = {
  ok: true;
  recipient: string;
};
