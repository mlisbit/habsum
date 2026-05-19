export type NewPasswordFieldKey = 'newPassword' | 'confirmPassword';

export type NewPasswordErrorMap = Partial<Record<NewPasswordFieldKey, string[]>>;

type NewPasswordPayload = {
  newPassword: string;
  confirmPassword: string;
};

function addError(errors: NewPasswordErrorMap, key: NewPasswordFieldKey, message: string): void {
  const list = errors[key];
  if (list) list.push(message);
  else errors[key] = [message];
}

export function validateNewPasswordSave(input: NewPasswordPayload): NewPasswordErrorMap {
  const errors: NewPasswordErrorMap = {};
  const next = input.newPassword.trim();
  const again = input.confirmPassword.trim();

  if (!next || !again) {
    addError(errors, 'newPassword', 'Fill in all password fields.');
    return errors;
  }

  if (next !== again) {
    addError(errors, 'newPassword', 'New password and confirmation do not match.');
    addError(errors, 'confirmPassword', 'New password and confirmation do not match.');
  }

  return errors;
}

export function newPasswordServerErrorToFieldMap(serverMessage: string): NewPasswordErrorMap {
  const m = serverMessage.trim();
  const out: NewPasswordErrorMap = {};

  if (
    m === 'new password is required' ||
    m === 'new password must be different from the current one'
  ) {
    addError(out, 'newPassword', m);
    return out;
  }

  if (m === 'password reset is not required') {
    addError(out, 'newPassword', m);
    return out;
  }

  return out;
}
