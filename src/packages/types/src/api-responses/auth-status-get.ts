/** GET /auth/status — initial web signup redirect for the active database. */
export type AuthStatusGetResponse = {
  redirectPath: '/welcome' | null;
};
