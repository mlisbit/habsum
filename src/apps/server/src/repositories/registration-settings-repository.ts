import migrateRegistrationSettings from '../utils/migrate-registration-settings.js';
import { db } from './_private/db.js';

migrateRegistrationSettings(db);

export class RegistrationSettingsRepository {
  isAccountSignupEnabled(): boolean {
    return (
      db
        .prepare<
          [],
          { account_signup: number }
        >('SELECT account_signup FROM registration_settings WHERE id = 1')
        .get()?.account_signup === 1
    );
  }

  setAccountSignupEnabled(enabled: boolean): void {
    db.prepare('UPDATE registration_settings SET account_signup = ? WHERE id = 1').run(
      enabled ? 1 : 0,
    );
  }
}
