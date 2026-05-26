/**
 * Product entitlements granted per account (session and `GET /auth/me`).
 * Wire values are stable API contract strings.
 */
export const ProductEntitlement = {
  BETA_TESTER: 'BETA_TESTER',
  DEVELOPER: 'DEVELOPER',
  /** No rows yet in `habit_daily_selects` or `habit_summation_events` for this account. */
  NEW_USER: 'NEW_USER',
} as const;

export type ProductEntitlement = (typeof ProductEntitlement)[keyof typeof ProductEntitlement];
