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
        { username: 'demo', entitlements: ['NEW_USER', 'DEMO_USER'] },
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
        { username: 'legacy', entitlements: ['NEW_USER'] },
      ]);
    } finally {
      database.close();
    }
  });

  test('ignores the retired beta flag in legacy databases', () => {
    const database = getTestDatabase();
    try {
      database.exec(`
        ALTER TABLE users ADD COLUMN beta_tester INTEGER NOT NULL DEFAULT 1;
        INSERT INTO users (username, admin) VALUES ('legacy', 1);
      `);
      expect(getUserAccounts(database)).toEqual([
        { username: 'legacy', entitlements: ['NEW_USER', 'ADMIN'] },
      ]);
    } finally {
      database.close();
    }
  });

  test('lists accounts with entitlements matching the server rules', () => {
    const database = getTestDatabase();
    try {
      database.exec(`
        INSERT INTO users (username, admin) VALUES
          ('zeta', 0),
          ('Admin', 1),
          ('regular', 0);
        INSERT INTO habit_daily_selects (user) VALUES ('zeta');
        INSERT INTO habit_summation_events (user) VALUES ('regular');
      `);

      expect(getUserAccounts(database)).toEqual([
        {
          username: 'Admin',
          entitlements: ['NEW_USER', 'ADMIN'],
        },
        { username: 'regular', entitlements: [] },
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
        { username: 'Admin', entitlements: ['NEW_USER', 'ADMIN'] },
        { username: 'zeta', entitlements: [] },
      ]),
    ).toBe(`USERNAME  ENTITLEMENTS
Admin     NEW_USER, ADMIN
zeta      (none)`);
  });

  test('describes an empty account list', () => {
    expect(getUserAccountsOutput([])).toBe('No user accounts found.');
  });
});
