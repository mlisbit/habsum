import { describe, expect, it } from 'vitest';
import { isPasswordHashed } from '@habsum/utils/password';
import {
  createInitialAdminUser,
  db,
  isUserPasswordValid,
  setUserPassword,
  updateLoginPassword,
} from './db.js';

describe('user password storage', () => {
  it('stores hashed passwords and validates plain passwords', () => {
    const username = 'password-hash-test-user';
    setUserPassword(username, 'my-secret');

    expect(isUserPasswordValid(username, 'my-secret')).toBe(true);
    expect(isUserPasswordValid(username, 'wrong')).toBe(false);
  });

  it('hashes passwords set via updateLoginPassword and createInitialAdminUser', () => {
    const updated = 'password-update-test-user';
    setUserPassword(updated, 'initial-secret');
    expect(updateLoginPassword(updated, 'updated-secret')).toBe(true);
    expect(isUserPasswordValid(updated, 'updated-secret')).toBe(true);

    const admin = 'password-admin-test-user';
    createInitialAdminUser(admin, 'admin-secret');
    expect(isUserPasswordValid(admin, 'admin-secret')).toBe(true);
  });

  it('re-hashes legacy plain-text passwords on successful verification', () => {
    const username = 'password-legacy-migrate-user';
    setUserPassword(username, 'legacy-plain');
    db.prepare('UPDATE users SET pin = ? WHERE username = ?').run('legacy-plain', username);

    expect(isPasswordHashed('legacy-plain')).toBe(false);
    expect(isUserPasswordValid(username, 'legacy-plain')).toBe(true);

    const row = db
      .prepare('SELECT pin AS passwordHash FROM users WHERE username = ?')
      .get(username) as {
      passwordHash: string;
    };
    expect(isPasswordHashed(row.passwordHash)).toBe(true);
  });
});
