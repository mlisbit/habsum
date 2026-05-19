/** POST /users/:user/new-password — set login PIN when `forcePasswordReset` is active. */
export type UserNewPasswordRequest = {
  newPin: string;
};

export type UserNewPasswordResponse = { ok: true };
