/** GET /auth/reset-password?token= — validate a password-reset link token. */
export type ResetPasswordValidateResponse = {
  ok: true;
};
