/** POST /auth/forgot-password — request a password reset email. */
export type ForgotPasswordRequest = {
  email: string;
};

export type ForgotPasswordResponse = {
  ok: true;
  message: string;
  /** Seconds until the user can request another reset email. */
  timeout?: number;
};
