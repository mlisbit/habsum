import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import getUserAccounts from './get-user-accounts.ts';
import getUserAccountsOutput from './get-user-accounts-output.ts';

function getTestDatabase(): Database {
  const database = new Database(':memory:');
  database.exec(`
    CREATE TABLE users (
      username TEXT PRIMARY KEY,
      admin INTEGER NOT NULL DEFAULT 0,
      beta_tester INTEGER NOT NULL DEFAULT 1,
      demo_user INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE habit_summation_events (user TEXT NOT NULL);
    CREATE TABLE habit_daily_selects (user TEXT NOT NULL);
    CREATE TABLE habit_text (user TEXT NOT NULL);
  `);
  return database;
}

describe('getUserAccounts', () => {
  test('includes DEMO_USER for marked accounts', () => {
    const database = getTestDatabase();
    try {
      database.exec("INSERT INTO users (username, demo_user) VALUES ('demo', 1)");
      expect(getUserAccounts(database)).toEqual([
        { username: 'demo', entitlements: ['NEW_USER', 'BETA_TESTER', 'DEMO_USER'] },
      ]);
    } finally {
      database.close();
    }
  });

  test('supports databases created before the demo flag was added', () => {
    const database = getTestDatabase();
    try {
      database.exec('ALTER TABLE users DROP COLUMN demo_user');
      database.exec("INSERT INTO users (username) VALUES ('legacy')");
      expect(getUserAccounts(database)).toEqual([
        { username: 'legacy', entitlements: ['NEW_USER', 'BETA_TESTER'] },
      ]);
    } finally {
      database.close();
    }
  });

  test('lists accounts with entitlements matching the server rules', () => {
    const database = getTestDatabase();
    try {
      database.exec(`
        INSERT INTO users (username, admin, beta_tester) VALUES
          ('zeta', 0, 0),
          ('Admin', 1, 1),
          ('beta', 0, 1);
        INSERT INTO habit_daily_selects (user) VALUES ('zeta');
        INSERT INTO habit_summation_events (user) VALUES ('beta');
      `);

      expect(getUserAccounts(database)).toEqual([
        {
          username: 'Admin',
          entitlements: ['NEW_USER', 'BETA_TESTER', 'DEVELOPER'],
        },
        { username: 'beta', entitlements: ['BETA_TESTER'] },
        { username: 'zeta', entitlements: [] },
      ]);
    } finally {
      database.close();
    }
  });
});

describe('getUserAccountsOutput', () => {
  test('formats accounts as a readable table', () => {
    expect(
      getUserAccountsOutput([
        { username: 'Admin', entitlements: ['NEW_USER', 'DEVELOPER'] },
        { username: 'zeta', entitlements: [] },
      ]),
    ).toBe(`USERNAME  ENTITLEMENTS
Admin     NEW_USER, DEVELOPER
zeta      (none)`);
  });

  test('describes an empty account list', () => {
    expect(getUserAccountsOutput([])).toBe('No user accounts found.');
  });
});
