/**
 * Product entitlements granted per account (session and `GET /users/me`).
 * Wire values are stable API contract strings.
 */
export const ProductEntitlement = {
  BETA_TESTER: 'BETA_TESTER',
  DEVELOPER: 'DEVELOPER',
  /** Account marked as a demo user by an administrator. */
  DEMO_USER: 'DEMO_USER',
  /** No rows yet in a persisted habit activity table for this account. */
  NEW_USER: 'NEW_USER',
} as const;

export type ProductEntitlement = (typeof ProductEntitlement)[keyof typeof ProductEntitlement];
