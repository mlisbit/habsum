import { describe, expect, it } from 'vitest';
import {
  getPasswordResetTokenHash,
  getPasswordResetUrl,
  hashPassword,
  isPasswordHashed,
  verifyPassword,
} from '@habsum/utils/password';

describe('password-hash', () => {
  it('hashes and verifies a password', () => {
    const stored = hashPassword('secret123');
    expect(isPasswordHashed(stored)).toBe(true);
    expect(verifyPassword('secret123', stored)).toBe(true);
    expect(verifyPassword('wrong', stored)).toBe(false);
  });

  it('uses distinct salts for the same password', () => {
    const a = hashPassword('same');
    const b = hashPassword('same');
    expect(a).not.toBe(b);
    expect(verifyPassword('same', a)).toBe(true);
    expect(verifyPassword('same', b)).toBe(true);
  });

  it('supports legacy plain-text passwords during migration', () => {
    expect(isPasswordHashed('plain')).toBe(false);
    expect(verifyPassword('plain', 'plain')).toBe(true);
    expect(verifyPassword('other', 'plain')).toBe(false);
  });
});

describe('password-reset helpers', () => {
  it('hashes reset tokens deterministically', () => {
    expect(getPasswordResetTokenHash('token')).toBe(getPasswordResetTokenHash('token'));
    expect(getPasswordResetTokenHash('token')).not.toBe(getPasswordResetTokenHash('other'));
  });

  it('builds a reset URL without a duplicate slash', () => {
    expect(getPasswordResetUrl('a token', 'https://example.com/')).toBe(
      'https://example.com/reset-password?token=a%20token',
    );
  });
});
