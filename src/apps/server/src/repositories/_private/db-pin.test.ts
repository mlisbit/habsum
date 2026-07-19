import { describe, expect, it } from 'vitest';
import { isPasswordHashed } from '../../utils/password-utils.js';
import {
  createInitialAdminUser,
  db,
  ensureUserPins,
  isUserPinValid,
  setUserPin,
  updateLoginPin,
} from './db.js';

describe('user pin storage', () => {
  it('stores hashed pins and validates plain passwords', () => {
    const username = 'pin-hash-test-user';
    setUserPin(username, 'my-secret');

    expect(isUserPinValid(username, 'my-secret')).toBe(true);
    expect(isUserPinValid(username, 'wrong')).toBe(false);
  });

  it('hashes pins set via updateLoginPin and createInitialAdminUser', () => {
    const updated = 'pin-update-test-user';
    ensureUserPins([updated]);
    expect(updateLoginPin(updated, 'updated-secret')).toBe(true);
    expect(isUserPinValid(updated, 'updated-secret')).toBe(true);

    const admin = 'pin-admin-test-user';
    createInitialAdminUser(admin, 'admin-secret');
    expect(isUserPinValid(admin, 'admin-secret')).toBe(true);
  });

  it('re-hashes legacy plain-text pins on successful verification', () => {
    const username = 'pin-legacy-migrate-user';
    setUserPin(username, 'legacy-plain');
    db.prepare('UPDATE users SET pin = ? WHERE username = ?').run('legacy-plain', username);

    expect(isPasswordHashed('legacy-plain')).toBe(false);
    expect(isUserPinValid(username, 'legacy-plain')).toBe(true);

    const row = db.prepare('SELECT pin FROM users WHERE username = ?').get(username) as {
      pin: string;
    };
    expect(isPasswordHashed(row.pin)).toBe(true);
  });
});
