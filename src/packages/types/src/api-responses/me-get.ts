import type { ProductEntitlement } from '../common/entitlement.js';
import type { DayWithTime } from '../common/day.js';

/** Logged-out payload for `GET /auth/me` (no session cookie). */
export type MeGetLoggedOut = {
  username: null;
  displayName: null;
  email: null;
  theme: 'dark';
  createdAt: null;
  entitlements: [];
};

/** Authenticated payload for `GET /auth/me`. */
export type MeGetLoggedIn = {
  /** Login id / YAML config id (same key as `PATCH /users/:user` body for renames). */
  username: string;
  /** Friendly name when set; `null` if unset. */
  displayName: string | null;
  /** Contact email when set; `null` if unset. */
  email: string | null;
  /** UI theme key (e.g. `light`, `dark`). */
  theme: string;
  /**
   * Account row creation time: UTC calendar date + time (`YYYY-MM-DD HH:MM:SS`).
   */
  createdAt: DayWithTime;
  /**
   * Granted capabilities: `BETA_TESTER` when enabled on the account in the server DB; `DEVELOPER`
   * when the account may access developer tools.
   */
  entitlements: ProductEntitlement[];
};

/**
 * GET /auth/me — current session from HttpOnly cookie (`MeGetLoggedOut` when unauthenticated).
 */
export type MeGetResponse = MeGetLoggedOut | MeGetLoggedIn;
