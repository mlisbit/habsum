export type AdministratorEmailProvider = {
  name: 'resend';
  apiKey?: string;
  email?: string;
};

export type AdministratorEmailSettingsResponse = {
  emailProvider?: AdministratorEmailProvider;
  updatedAt: number | null;
};

export type AdministratorEmailSettingsPutRequest = {
  emailProvider?: AdministratorEmailProvider;
};

export type AdministratorEmailTestRequest = {
  recipient: string;
  emailProvider: {
    name: 'resend';
    apiKey: string;
    email: string;
  };
};

export type AdministratorEmailTestResponse = {
  ok: true;
  recipient: string;
};
