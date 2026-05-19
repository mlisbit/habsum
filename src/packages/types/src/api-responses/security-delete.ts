/** DELETE /users/:user/security/sessions/:token */
export type SecuritySessionDeleteResponse = { ok: true };

/** DELETE /users/:user/security/sessions — revoke all sessions except the current cookie. */
export type SecuritySessionsDeleteOthersResponse = { ok: true; revoked: number };
