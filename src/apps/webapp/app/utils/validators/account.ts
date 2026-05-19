import type { UsersPatchRequest } from '@habsum/types/api-responses/users-patch';

export type AccountFieldKey =
  | keyof UsersPatchRequest
  | 'currentPassword'
  | 'newPassword'
  | 'confirmPassword';

/** Same shape as `validateAccountSave` results — field keys to one or more messages. */
export type AccountErrorMap = Partial<Record<AccountFieldKey, string[]>>;

type AccountSavePayload = UsersPatchRequest & {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

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
 * Client-side validation for account Save. Pass the full draft as `UsersPatchRequest` fields plus
 * password strings. Returns a map of field keys to message arrays, or an empty object when valid.
 * Reserved/forbidden usernames are enforced only by the API, not here.
 */
export function validateAccountSave(input: AccountSavePayload): AccountErrorMap {
  const errors: AccountErrorMap = {};

  if ((input.username ?? '').trim() === '') {
    addError(errors, 'username', 'Username cannot be empty.');
  }

  const emailVal = input.email;
  if (emailVal != null && String(emailVal).trim() !== '' && !isPlausibleEmail(String(emailVal))) {
    addError(errors, 'email', 'Enter a valid email or leave the field empty.');
  }

  if (input.theme != null && input.theme !== 'light' && input.theme !== 'dark') {
    addError(errors, 'theme', 'Choose a valid theme.');
  }

  const cur = input.currentPassword.trim();
  const next = input.newPassword.trim();
  const again = input.confirmPassword.trim();
  const passwordDirty = cur !== '' || next !== '' || again !== '';

  if (passwordDirty) {
    if (!cur || !next || !again) {
      addError(
        errors,
        'currentPassword',
        'Fill in all password fields to change your password, or clear those fields.',
      );
    } else if (next !== again) {
      addError(errors, 'newPassword', 'New password and confirmation do not match.');
      addError(errors, 'confirmPassword', 'New password and confirmation do not match.');
    }
  }

  return errors;
}

/**
 * Maps API `error` strings (from `PATCH /users/:user`, `POST .../password`, etc.) to account fields.
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

  if (m === 'email must be a string or null') {
    addError(out, 'email', m);
    return out;
  }

  if (m === 'current password is required' || m === 'current password is incorrect') {
    addError(out, 'currentPassword', m);
    return out;
  }

  if (
    m === 'new password is required' ||
    m === 'new password must be different from the current one'
  ) {
    addError(out, 'newPassword', m);
    return out;
  }

  return out;
}
