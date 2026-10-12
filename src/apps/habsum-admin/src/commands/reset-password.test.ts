import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPasswordResetTokenHash, hashPassword, verifyPassword } from '@habsum/utils/password';
import { Database } from 'bun:sqlite';
import resetPassword from './reset-password.ts';

const temporaryDirectories: string[] = [];

function getTestDatabasePath(): string {
  const directory = mkdtempSync(join(tmpdir(), 'habsum-admin-test-'));
  temporaryDirectories.push(directory);

  const databasePath = join(directory, 'habsum.db');
  const database = new Database(databasePath);
  database.exec(`
    CREATE TABLE users (
      username TEXT PRIMARY KEY,
      pin TEXT NOT NULL
    );
    CREATE TABLE password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_at INTEGER NOT NULL,
      purpose TEXT NOT NULL DEFAULT 'reset'
    );
  `);
  database
    .query<never, [string, string]>('INSERT INTO users (username, pin) VALUES (?, ?)')
    .run('alice', hashPassword('old password'));
  database.close();

  return databasePath;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('resetPassword', () => {
  test('prompts for an omitted username', async () => {
    const databasePath = getTestDatabasePath();
    const prompts: string[] = [];
    await resetPassword(undefined, {
      databasePath,
      readUsername: async (question) => {
        prompts.push(question);
        return ' alice ';
      },
      readPassword: async () => 'new secret',
      writeLine: () => {},
    });
    expect(prompts).toEqual(['Username: ']);
    const database = new Database(databasePath);
    try {
      const row = database
        .query<{ pin: string }, []>("SELECT pin FROM users WHERE username = 'alice'")
        .get()!;
      expect(verifyPassword('new secret', row.pin)).toBe(true);
    } finally {
      database.close();
    }
  });

  test('updates the password and invalidates existing reset links', async () => {
    const databasePath = getTestDatabasePath();
    const database = new Database(databasePath);
    database.exec(`
      INSERT INTO password_reset_tokens
        (user_id, token_hash, expires_at, created_at, purpose)
      VALUES ('alice', 'old-token-hash', 2000, 900, 'reset')
    `);
    database.close();

    const output: string[] = [];
    await resetPassword('alice', {
      databasePath,
      readPassword: async () => 'new password',
      getNowSeconds: () => 1000,
      writeLine: (line) => output.push(line),
    });

    const updatedDatabase = new Database(databasePath, { readonly: true });
    try {
      const user = updatedDatabase
        .query<{ pin: string }, []>("SELECT pin FROM users WHERE username = 'alice'")
        .get();
      const existingToken = updatedDatabase
        .query<
          { usedAt: number | null },
          []
        >("SELECT used_at AS usedAt FROM password_reset_tokens WHERE token_hash = 'old-token-hash'")
        .get();

      expect(user).not.toBeNull();
      expect(verifyPassword('new password', user!.pin)).toBe(true);
      expect(existingToken?.usedAt).toBe(1000);
      expect(output).toEqual(['Password updated for alice.']);
    } finally {
      updatedDatabase.close();
    }
  });

  test('creates a valid reset link when the password is omitted', async () => {
    const databasePath = getTestDatabasePath();
    const output: string[] = [];

    await resetPassword('alice', {
      databasePath,
      webappUrl: 'https://example.com/',
      readPassword: async () => '  ',
      getToken: () => 'reset-token',
      getNowSeconds: () => 1000,
      writeLine: (line) => output.push(line),
    });

    const database = new Database(databasePath, { readonly: true });
    try {
      const token = database
        .query<{ tokenHash: string; expiresAt: number; createdAt: number; purpose: string }, []>(
          `
          SELECT
            token_hash AS tokenHash,
            expires_at AS expiresAt,
            created_at AS createdAt,
            purpose
          FROM password_reset_tokens
        `,
        )
        .get();

      expect(token).toEqual({
        tokenHash: getPasswordResetTokenHash('reset-token'),
        expiresAt: 1900,
        createdAt: 1000,
        purpose: 'reset',
      });
      expect(output).toEqual([
        'Password reset link for alice (expires in 15 minutes):',
        'https://example.com/reset-password?token=reset-token',
      ]);
    } finally {
      database.close();
    }
  });

  test('rejects an unknown account before prompting', async () => {
    const databasePath = getTestDatabasePath();
    let prompted = false;

    await expect(
      resetPassword('missing', {
        databasePath,
        readPassword: async () => {
          prompted = true;
          return 'password';
        },
      }),
    ).rejects.toThrow('user account not found: missing');
    expect(prompted).toBe(false);
  });
});
