import type { UsersPatchRequest } from '@habsum/types/api-responses/users-patch';

export type AccountFieldKey = keyof UsersPatchRequest;

/** Same shape as `validateAccountSave` results — field keys to one or more messages. */
export type AccountErrorMap = Partial<Record<AccountFieldKey, string[]>>;

type AccountSavePayload = UsersPatchRequest;

function addError(errors: AccountErrorMap, key: AccountFieldKey, message: string): void {
  const list = errors[key];
  if (list) list.push(message);
  else errors[key] = [message];
}

function isPlausibleEmail(value: string): boolean {
  const t = value.trim().toLowerCase();
  if (t === '') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

/**
 * Client-side validation for account Save. Returns a map of field keys to message arrays, or an
 * empty object when valid.
 * Reserved/forbidden usernames are enforced only by the API, not here.
 */
export function validateAccountSave(input: AccountSavePayload): AccountErrorMap {
  const errors: AccountErrorMap = {};

  if ((input.username ?? '').trim() === '') {
    addError(errors, 'username', 'Username cannot be empty.');
  }

  const emailVal = input.email;
  if (emailVal == null || String(emailVal).trim() === '') {
    addError(errors, 'email', 'Email is required.');
  } else if (!isPlausibleEmail(String(emailVal))) {
    addError(errors, 'email', 'Enter a valid email address.');
  }

  if (input.theme != null && input.theme !== 'light' && input.theme !== 'dark') {
    addError(errors, 'theme', 'Choose a valid theme.');
  }

  return errors;
}

/**
 * Maps API `error` strings (from `PATCH /users/:user`, etc.) to account fields.
 * Unknown messages yield an empty map (caller should show a generic toast).
 */
export function accountServerErrorToFieldMap(serverMessage: string): AccountErrorMap {
  const m = serverMessage.trim();
  const out: AccountErrorMap = {};
  const lower = m.toLowerCase();

  if (
    m === 'invalid username' ||
    m === 'invalid user' ||
    m === 'name is unchanged' ||
    m === 'username is unchanged'
  ) {
    addError(out, 'username', m);
    return out;
  }

  if (lower.includes('already exists')) {
    addError(out, 'username', m);
    return out;
  }

  if (m === 'invalid email') {
    addError(out, 'email', m);
    return out;
  }

  if (m === 'email is required') {
    addError(out, 'email', m);
    return out;
  }

  if (m === 'email already in use') {
    addError(out, 'email', m);
    return out;
  }

  if (m === 'invalid theme') {
    addError(out, 'theme', m);
    return out;
  }

  if (m === 'displayName must be a string or null') {
    addError(out, 'displayName', m);
    return out;
  }

  if (m === 'theme must be a string') {
    addError(out, 'theme', m);
    return out;
  }

  if (m === 'email must be a string') {
    addError(out, 'email', m);
    return out;
  }

  return out;
}
