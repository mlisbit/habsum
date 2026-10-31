import type { ProductEntitlement } from '../common/entitlement.js';
import type { DayWithTime } from '../common/day.js';

/** Logged-out payload for `GET /users/me` (no session cookie). */
export type MeGetLoggedOut = {
  username: null;
  displayName: null;
  email: null;
  /** `null` follows the OS color scheme. */
  theme: null;
  createdAt: null;
  entitlements: [];
};

/** Authenticated payload for `GET /users/me`. */
export type MeGetLoggedIn = {
  /** Login id / YAML config id (same key as `PATCH /users/:user` body for renames). */
  username: string;
  /** Whether the account may perform administrator-only operations. */
  admin: boolean;
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
   * Granted capabilities: `ADMIN` when the account has administrator access;
   * `NEW_USER` when the account has not logged any
   * daily selection, summation, or text entries yet; `DEMO_USER` when marked as a demo account.
   */
  entitlements: ProductEntitlement[];
  /** Whether the request uses an operate-under session. */
  isOucSession: boolean;
};

/**
 * GET /users/me — current session from HttpOnly cookie (`MeGetLoggedOut` when unauthenticated).
 */
export type MeGetResponse = MeGetLoggedOut | MeGetLoggedIn;
