/** POST /users/ouc — admin creates an operate-under login session for another user. */
export type CreateOucSessionResponse = {
  ok: true;
  user: string;
  /** Full session id (held in the popup window's sessionStorage, not a shared cookie). */
  token: string;
};

/** POST /auth/ouc — validate an operate-under token before the client stores it locally. */
export type OucLoginRequest = { token: string };

export type OucLoginResponse = { ok: true; user: string };
