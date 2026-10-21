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
}
