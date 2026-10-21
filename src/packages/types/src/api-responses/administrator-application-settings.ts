export type AdministratorApplicationSettings = {
  accountSignup: boolean;
  demoUser: { username: string; password: string };
};

export type AdministratorApplicationSettingsPutRequest = {
  accountSignup: boolean;
  demoUser?: AdministratorApplicationSettings['demoUser'];
};
