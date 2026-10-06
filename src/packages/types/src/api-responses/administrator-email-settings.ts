export type AdministratorEmailSettingsResponse = {
  provider: 'resend';
  apiKey: string;
  fromEmail: string;
  updatedAt: number | null;
};

export type AdministratorEmailSettingsPutRequest = {
  provider: 'resend';
  fromEmail: string;
  apiKey: string;
};

export type AdministratorEmailTestRequest = {
  provider: 'resend';
  apiKey: string;
  fromEmail: string;
};

export type AdministratorEmailTestResponse = {
  ok: true;
  recipient: string;
};
