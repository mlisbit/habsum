import { afterEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyPassword } from '@habsum/utils/password';
import addAdmin from './add-admin.ts';

const directories: string[] = [];
function getTestDatabasePath(): string {
  const directory = mkdtempSync(join(tmpdir(), 'habsum-add-admin-'));
  directories.push(directory);
  const path = join(directory, 'habsum.db');
  const database = new Database(path);
  database.exec(`
    CREATE TABLE users (
      username TEXT PRIMARY KEY, pin TEXT NOT NULL, admin INTEGER DEFAULT 0,
      display_name TEXT, theme TEXT, email TEXT, created_at TEXT,
      active_habit_config_version INTEGER
    );
    CREATE TABLE habit_configs (
      user TEXT, version INTEGER, text TEXT,
      PRIMARY KEY (user, version)
    );
  `);
  database.close();
  return path;
}
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('addAdmin', () => {
  test('prompts for an omitted username before the password', async () => {
    const databasePath = getTestDatabasePath();
    const prompts: string[] = [];
    await addAdmin(undefined, {
      databasePath,
      readUsername: async (question) => {
        prompts.push(question);
        return ' bob ';
      },
      readPassword: async (question) => {
        prompts.push(question);
        return 'secret';
      },
      writeLine: () => {},
    });
    expect(prompts).toEqual(['Username: ', 'Password for new administrator: ']);
    const database = new Database(databasePath);
    try {
      expect(database.query('SELECT username, admin FROM users').get()).toEqual({
        username: 'bob',
        admin: 1,
      });
    } finally {
      database.close();
    }
  });

  test('creates an administrator with a hashed password and active empty config', async () => {
    const databasePath = getTestDatabasePath();
    const output: string[] = [];
    await addAdmin(' alice ', {
      databasePath,
      readPassword: async () => 'chosen secret',
      writeLine: (line) => output.push(line),
    });
    const database = new Database(databasePath);
    try {
      const row = database
        .query<
          { pin: string; admin: number; active_habit_config_version: number },
          []
        >('SELECT * FROM users')
        .get()!;
      expect(row.admin).toBe(1);
      expect(row.active_habit_config_version).toBe(1);
      expect(row.pin).not.toBe('chosen secret');
      expect(verifyPassword('chosen secret', row.pin)).toBe(true);
      expect(database.query('SELECT user, version, text FROM habit_configs').get()).toEqual({
        user: 'alice',
        version: 1,
        text: 'habits: {}\n',
      });
      expect(output).toEqual(['Administrator account created for alice.']);
      let prompted = false;
      await expect(
        addAdmin('alice', {
          databasePath,
          readPassword: async () => {
            prompted = true;
            return 'replacement';
          },
        }),
      ).rejects.toThrow('already exists');
      expect(prompted).toBe(false);
      expect(database.query('SELECT pin FROM users').get()).toEqual({ pin: row.pin });
    } finally {
      database.close();
    }
  });

  test.each(['', 'admin', 'ALICE/BOB', 'alice\\bob', 'x'.repeat(201)])(
    'rejects invalid username %s before prompting',
    async (username) => {
      await expect(
        addAdmin(username, {
          readPassword: async () => {
            throw new Error('unexpected prompt');
          },
        }),
      ).rejects.toThrow('invalid username');
    },
  );

  test('rejects a blank password without creating an account', async () => {
    const databasePath = getTestDatabasePath();
    await expect(
      addAdmin('alice', { databasePath, readPassword: async () => ' ' }),
    ).rejects.toThrow('password is required');
    const database = new Database(databasePath);
    try {
      expect(database.query('SELECT * FROM users').all()).toEqual([]);
    } finally {
      database.close();
    }
  });

  test('rolls back the user when config creation fails', async () => {
    const databasePath = getTestDatabasePath();
    const database = new Database(databasePath);
    database.exec(
      "CREATE TRIGGER reject_config BEFORE INSERT ON habit_configs BEGIN SELECT RAISE(ABORT, 'config rejected'); END;",
    );
    try {
      await expect(
        addAdmin('alice', { databasePath, readPassword: async () => 'secret' }),
      ).rejects.toThrow('config rejected');
      expect(database.query('SELECT * FROM users').all()).toEqual([]);
    } finally {
      database.close();
    }
  });
});
