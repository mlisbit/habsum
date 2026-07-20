/** POST /users/:user/new-password — set a login password when `forcePasswordReset` is active. */
export type UserNewPasswordRequest = {
  newPassword: string;
};

export type UserNewPasswordResponse = { ok: true };
