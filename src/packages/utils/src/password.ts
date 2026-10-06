import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const TEMPORARY_PASSWORD_ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SCRYPT_PREFIX = '$scrypt$v1$';
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };

/** Raw entropy for a password-reset link token. */
export const PASSWORD_RESET_TOKEN_BYTES = 32;

/** Password-reset link lifetime. */
export const PASSWORD_RESET_TOKEN_TTL_SECONDS = 15 * 60;

/** Generates a one-time login password for admin-provisioned accounts. */
export function generateTemporaryPassword(length = 14): string {
  const bytes = randomBytes(length);
  let output = '';
  for (let index = 0; index < length; index += 1) {
    output += TEMPORARY_PASSWORD_ALPHABET[bytes[index]! % TEMPORARY_PASSWORD_ALPHABET.length]!;
  }
  return output;
}

export function isPasswordHashed(stored: string): boolean {
  return stored.startsWith(SCRYPT_PREFIX);
}

/** Returns a salted scrypt password hash for persistent storage. */
export function hashPassword(plain: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = scryptSync(plain, salt, KEY_LENGTH, SCRYPT_OPTIONS);
  return `${SCRYPT_PREFIX}${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

/** Compares a plain password to a stored hash or a legacy plain-text password. */
export function verifyPassword(plain: string, stored: string): boolean {
  if (!isPasswordHashed(stored)) {
    return plain === stored;
  }

  const rest = stored.slice(SCRYPT_PREFIX.length);
  const separator = rest.indexOf('$');
  if (separator <= 0) return false;

  const saltBase64 = rest.slice(0, separator);
  const hashBase64 = rest.slice(separator + 1);
  if (!saltBase64 || !hashBase64) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltBase64, 'base64url');
    expected = Buffer.from(hashBase64, 'base64url');
  } catch {
    return false;
  }

  const actual = scryptSync(plain, salt, expected.length, SCRYPT_OPTIONS);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function generatePasswordResetToken(): string {
  return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('base64url');
}

export function getPasswordResetTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

export function getPasswordResetUrl(token: string, webappUrl?: string): string {
  const base = (webappUrl?.trim() || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}
