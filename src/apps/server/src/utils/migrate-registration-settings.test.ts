import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import migrateRegistrationSettings from './migrate-registration-settings.js';

describe('registration settings migration', () => {
  it.each([
    ['enabled', 1],
    ['noVerify', 1],
    ['verify', 1],
    [null, 0],
  ])('preserves legacy signup value %s', (value, enabled) => {
    const database = new Database(':memory:');
    try {
      database.exec('CREATE TABLE feature_flags (key TEXT PRIMARY KEY, value TEXT)');
      database
        .prepare('INSERT INTO feature_flags VALUES (?, ?)')
        .run('enable-user-account-creation', value);
      migrateRegistrationSettings(database);
      expect(database.prepare('SELECT account_signup FROM registration_settings').get()).toEqual({
        account_signup: enabled,
      });
      expect(
        database.prepare("SELECT name FROM sqlite_master WHERE name = 'feature_flags'").get(),
      ).toBeUndefined();
      migrateRegistrationSettings(database);
      expect(database.prepare('SELECT account_signup FROM registration_settings').get()).toEqual({
        account_signup: enabled,
      });
    } finally {
      database.close();
    }
  });

  it('defaults new installations to disabled and preserves later settings on restart', () => {
    const database = new Database(':memory:');
    try {
      migrateRegistrationSettings(database);
      expect(database.prepare('SELECT account_signup FROM registration_settings').get()).toEqual({
        account_signup: 0,
      });
      database.exec('UPDATE registration_settings SET account_signup = 1');
      migrateRegistrationSettings(database);
      expect(database.prepare('SELECT account_signup FROM registration_settings').get()).toEqual({
        account_signup: 1,
      });
    } finally {
      database.close();
    }
  });
});
