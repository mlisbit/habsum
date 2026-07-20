import { describe, expect, it } from 'vitest';
import { hashPassword, isPasswordHashed, verifyPassword } from './password-utils.js';

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
