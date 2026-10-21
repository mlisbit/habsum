import type {
  AdministratorApplicationSettings,
  AdministratorApplicationSettingsPutRequest,
} from '@habsum/types/api-responses/administrator-application-settings';
import { db } from './_private/db.js';

export class ApplicationSettingsRepository {
  isAccountSignupEnabled(): boolean {
    return (
      db
        .prepare<
          [],
          { account_signup: number }
        >('SELECT account_signup FROM application_settings WHERE id = 1')
        .get()?.account_signup === 1
    );
  }

  setAccountSignupEnabled(enabled: boolean): void {
    db.prepare('UPDATE application_settings SET account_signup = ? WHERE id = 1').run(
      enabled ? 1 : 0,
    );
  }

  getDemoUser(): AdministratorApplicationSettings['demoUser'] {
    return (
      db
        .prepare<
          [],
          AdministratorApplicationSettings['demoUser']
        >('SELECT demo_username AS username, demo_password AS password FROM application_settings WHERE id = 1')
        .get() ?? { username: '', password: '' }
    );
  }

  setApplicationSettings({
    accountSignup,
    demoUser,
  }: AdministratorApplicationSettingsPutRequest): void {
    if (demoUser === undefined) {
      this.setAccountSignupEnabled(accountSignup);
      return;
    }
    db.prepare(
      `UPDATE application_settings SET
      account_signup = ?, demo_username = ?, demo_password = ? WHERE id = 1`,
    ).run(accountSignup ? 1 : 0, demoUser.username, demoUser.password);
  }
}
