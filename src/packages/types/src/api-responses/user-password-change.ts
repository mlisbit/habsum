/** POST /users/:user/password — change the login password; session cookie unchanged. */
export type UserPasswordChangeRequest = {
  currentPassword: string;
  newPassword: string;
};

export type UserPasswordChangeResponse = { ok: true };
