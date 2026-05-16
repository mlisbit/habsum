/** JSON error body for 4xx/5xx responses that include `{ error: string }` */
export type ApiErrorBody = { error: string };

export type HealthResponse = { ok: true };

/** Current wall-clock info from the API process (habsum server). */
export type ServerTimeResponse = {
  iso: string;
  timezone: string;
};

export type ListUsersResponse = { users: string[] };

export type CreateUserRequest = { pin?: string };

export type CreateUserResponse = { ok: true; user: string };

export type LoginUserRequest = { pin?: string };

export type LoginUserResponse = { ok: true; user: string };

/** Current browser session resolved from HttpOnly cookie (no cookie → `user: null`). */
export type AuthMeResponse = { user: string | null };

export type LogoutResponse = { ok: true };

export type UserSessionResponse = { user: string; admin: boolean };

export type UserConfigGetResponse = { text: string };

export type UserConfigPutResponse = { ok: true; user: string };

export type PurgeUserDataResponse = { ok: true; user: string };
