/** GET /auth/reset-password?token= — validate a password-reset link token. */
export type PasswordResetTokenPurpose = 'reset' | 'invite';

export type ResetPasswordValidateResponse = {
  ok: true;
  purpose: PasswordResetTokenPurpose;
  /** Set for invite tokens when the account has a display name. */
  displayName?: string | null;
};
