/** POST /auth/reset-password — set a new login password using a reset token. */
export type ResetPasswordRequest = {
  token: string;
  newPin: string;
};

export type ResetPasswordResponse = {
  ok: true;
};
