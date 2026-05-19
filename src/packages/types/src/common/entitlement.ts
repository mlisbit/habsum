/**
 * Product entitlements granted per account (session and `GET /auth/me`).
 * Wire values are stable API contract strings.
 */
export const ProductEntitlement = {
  BETA_TESTER: 'BETA_TESTER',
  DEVELOPER: 'DEVELOPER',
} as const;

export type ProductEntitlement = (typeof ProductEntitlement)[keyof typeof ProductEntitlement];
