export type SecurityFieldKey = 'currentPassword' | 'newPassword' | 'confirmPassword';

export type SecurityErrorMap = Partial<Record<SecurityFieldKey, string[]>>;

type SecurityPasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function addError(errors: SecurityErrorMap, key: SecurityFieldKey, message: string): void {
  const list = errors[key];
  if (list) list.push(message);
  else errors[key] = [message];
}

export function validateSecurityPasswordSave(input: SecurityPasswordPayload): SecurityErrorMap {
  const errors: SecurityErrorMap = {};
  const cur = input.currentPassword.trim();
  const next = input.newPassword.trim();
  const again = input.confirmPassword.trim();

  if (!cur || !next || !again) {
    addError(errors, 'currentPassword', 'Fill in all password fields.');
    return errors;
  }

  if (next !== again) {
    addError(errors, 'newPassword', 'New password and confirmation do not match.');
    addError(errors, 'confirmPassword', 'New password and confirmation do not match.');
  }

  return errors;
}

export function securityServerErrorToFieldMap(serverMessage: string): SecurityErrorMap {
  const m = serverMessage.trim();
  const out: SecurityErrorMap = {};

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
