import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Temporary password generation

const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Generates a one-time login password for admin-provisioned accounts. */
export function generateTemporaryPassword(length = 14): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length]!;
  }
  return out;
}

// Password hashing

const SCRYPT_PREFIX = '$scrypt$v1$';
const SALT_LEN = 16;
const KEY_LEN = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };

export function isPasswordHashed(stored: string): boolean {
  return stored.startsWith(SCRYPT_PREFIX);
}

/** Returns a salted scrypt hash suitable for storing in `users.pin`. */
export function hashPassword(plain: string): string {
  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(plain, salt, KEY_LEN, SCRYPT_OPTIONS);
  return `${SCRYPT_PREFIX}${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

/** Compares a plain password to a stored hash (or legacy plain-text pin). */
export function verifyPassword(plain: string, stored: string): boolean {
  if (!isPasswordHashed(stored)) {
    return plain === stored;
  }

  const rest = stored.slice(SCRYPT_PREFIX.length);
  const sep = rest.indexOf('$');
  if (sep <= 0) return false;

  const saltB64 = rest.slice(0, sep);
  const hashB64 = rest.slice(sep + 1);
  if (!saltB64 || !hashB64) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltB64, 'base64url');
    expected = Buffer.from(hashB64, 'base64url');
  } catch {
    return false;
  }

  const actual = scryptSync(plain, salt, expected.length, SCRYPT_OPTIONS);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
