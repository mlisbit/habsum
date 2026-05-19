import { listUsers } from './config.js';
import { isForbiddenUsername } from './forbidden-usernames.js';
import { isSafeConfigUserId } from './request-helpers.js';

const MAX_USERNAME_LEN = 64;

/** Derives a YAML-safe username stem from the email local part. */
export function usernameBaseFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim().toLowerCase() ?? '';
  let base = local.replace(/[^a-z0-9._-]+/g, '').replace(/^\.+|\.+$/g, '');
  if (!base) base = 'user';
  if (base.length > MAX_USERNAME_LEN) base = base.slice(0, MAX_USERNAME_LEN);
  return base;
}

function isUsernameAvailable(candidate: string, taken: Set<string>): boolean {
  if (!isSafeConfigUserId(candidate)) return false;
  if (isForbiddenUsername(candidate)) return false;
  if (taken.has(candidate)) return false;
  return true;
}

/** Picks a unique config username for a new account with this email. */
export function allocateUsernameForEmail(email: string): string | null {
  const taken = new Set(listUsers());
  let base = usernameBaseFromEmail(email);
  if (!isUsernameAvailable(base, taken)) {
    base = isForbiddenUsername(base) || !isSafeConfigUserId(base) ? 'user' : base;
  }

  if (isUsernameAvailable(base, taken)) return base;

  for (let n = 2; n < 10_000; n++) {
    const suffix = String(n);
    const maxBase = MAX_USERNAME_LEN - suffix.length;
    const candidate = `${base.slice(0, maxBase)}${suffix}`;
    if (isUsernameAvailable(candidate, taken)) return candidate;
  }

  return null;
}
