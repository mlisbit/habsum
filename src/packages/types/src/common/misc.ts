import type { DayWithTime } from './day.js';
import type { ProductEntitlement } from './entitlement.js';

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

export type LogoutResponse = { ok: true };

export type UserSessionResponse = {
  /** Login id; aligned with `GET /auth/me` (`MeGetLoggedIn.username`). */
  username: string;
  admin: boolean;
  displayName: string | null;
  email: string | null;
  theme: string;
  /** Account creation time as UTC day + time. */
  createdAt: DayWithTime;
  /** Same entitlement list as `GET /auth/me` (see `MeGetLoggedIn['entitlements']`). */
  entitlements: ProductEntitlement[];
};

export type UserConfigGetResponse = { text: string };

export type UserConfigPutResponse = { ok: true; user: string };

export type PurgeUserDataResponse = { ok: true; user: string };
