/** GET /auth/status — public login readiness for the active database. */
export type AuthStatusGetResponse = {
  hasUsers: boolean;
};
