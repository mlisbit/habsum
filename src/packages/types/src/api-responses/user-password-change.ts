/** POST /users/:user/password — change login PIN; session cookie unchanged. */
export type UserPasswordChangeRequest = {
  currentPin: string;
  newPin: string;
};

export type UserPasswordChangeResponse = { ok: true };
