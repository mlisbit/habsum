import type { ProductEntitlement } from '../common/entitlement.js';
import type { DayWithTime } from '../common/day.js';

/** Logged-out payload for `GET /auth/me` (no session cookie). */
export type MeGetLoggedOut = {
  username: null;
  displayName: null;
  email: null;
  /** `null` follows the OS color scheme. */
  theme: null;
  createdAt: null;
  entitlements: [];
};

/** Authenticated payload for `GET /auth/me`. */
export type MeGetLoggedIn = {
  /** Login id / YAML config id (same key as `PATCH /users/:user` body for renames). */
  username: string;
  /** Friendly name when set; `null` if unset. */
  displayName: string | null;
  /** Login email (unique); also accepted on the login form instead of username. */
  email: string;
  /** UI theme (`light`, `dark`); `null` follows the OS color scheme. */
  theme: string | null;
  /**
   * Account row creation time: UTC calendar date + time (`YYYY-MM-DD HH:MM:SS`).
   */
  createdAt: DayWithTime;
  /**
   * Granted capabilities: `BETA_TESTER` when enabled on the account in the server DB; `DEVELOPER`
   * when the account may access developer tools; `NEW_USER` when the account has not logged any
   * daily selection or summation events yet.
   */
  entitlements: ProductEntitlement[];
  /** First 8 characters of the session id (e.g. `OUC_a1b2` for operate-under sessions). */
  sessionTokenPrefix: string;
};

/**
 * GET /auth/me — current session from HttpOnly cookie (`MeGetLoggedOut` when unauthenticated).
 */
export type MeGetResponse = MeGetLoggedOut | MeGetLoggedIn;
