import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ResendEmailSettings } from './email-settings-repository.js';

type SettingsSnapshot = {
  accountSignup: boolean;
  emailSettings: ResendEmailSettings | null;
  tables: string[];
};

function initializeDatabase(path: string): SettingsSnapshot {
  const repositoryUrl = new URL('./application-settings-repository.ts', import.meta.url).href;
  const emailRepositoryUrl = new URL('./email-settings-repository.ts', import.meta.url).href;
  const databaseUrl = new URL('./_private/db.ts', import.meta.url).href;
  const output = execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '--eval',
      `import { ApplicationSettingsRepository } from ${JSON.stringify(repositoryUrl)};
       import { EmailSettingsRepository } from ${JSON.stringify(emailRepositoryUrl)};
       import { db } from ${JSON.stringify(databaseUrl)};
       console.log(JSON.stringify({
         accountSignup: new ApplicationSettingsRepository().isAccountSignupEnabled(),
         emailSettings: new EmailSettingsRepository().getResendSettings(),
         tables: db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '%settings'")
           .all().map(table => table.name),
       }));
       db.close();`,
    ],
    { env: { ...process.env, HABSUM_DB: path }, encoding: 'utf8' },
  );
  return JSON.parse(output) as SettingsSnapshot;
}

describe('application settings storage', () => {
  let directory: string;
  let path: string;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'habsum-application-settings-'));
    path = join(directory, 'habsum.db');
  });
  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  it('defaults signup to disabled and preserves signup and email across server initialization', () => {
    expect(initializeDatabase(path)).toEqual({
      accountSignup: false,
      emailSettings: null,
      tables: ['application_settings'],
    });
    const database = new Database(path);
    try {
      database.exec(`UPDATE application_settings SET
        account_signup = 1, email_provider = 'resend', email_api_key = 're_saved',
        email_from_email = 'saved@example.com', email_updated_at = 123 WHERE id = 1`);
    } finally {
      database.close();
    }

    expect(initializeDatabase(path)).toEqual({
      accountSignup: true,
      emailSettings: {
        provider: 'resend',
        apiKey: 're_saved',
        fromEmail: 'saved@example.com',
        updatedAt: 123,
      },
      tables: ['application_settings'],
    });
  });

  it.each([
    { name: 'both existing tables', signup: true, email: true, populated: true },
    { name: 'signup settings only', signup: true, email: false, populated: true },
    { name: 'email settings only', signup: false, email: true, populated: true },
    { name: 'empty settings tables', signup: true, email: true, populated: false },
  ])('migrates $name and removes the old tables', ({ signup, email, populated }) => {
    const database = new Database(path);
    try {
      if (signup) {
        database.exec(`CREATE TABLE registration_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1), account_signup INTEGER NOT NULL DEFAULT 0
        )`);
        if (populated) database.exec('INSERT INTO registration_settings VALUES (1, 1)');
      }
      if (email) {
        database.exec(`CREATE TABLE email_settings (
          provider TEXT PRIMARY KEY, api_key TEXT NOT NULL,
          from_email TEXT NOT NULL, updated_at INTEGER NOT NULL
        )`);
        if (populated) {
          database.exec(
            "INSERT INTO email_settings VALUES ('resend', 're_existing', 'sender@example.com', 456)",
          );
        }
      }
    } finally {
      database.close();
    }

    expect(initializeDatabase(path)).toEqual({
      accountSignup: signup && populated,
      emailSettings:
        email && populated
          ? {
              provider: 'resend',
              apiKey: 're_existing',
              fromEmail: 'sender@example.com',
              updatedAt: 456,
            }
          : null,
      tables: ['application_settings'],
    });
  });
});
