import { ProductEntitlement } from '@habsum/types/common/entitlement';
import { getFirstDate, isUserAdmin, isUserBetaTester } from './db.js';

/** Product entitlements for API responses (`/auth/me`, session, etc.). */
export function entitlementsForUser(username: string): ProductEntitlement[] {
  const out: ProductEntitlement[] = [];
  if (getFirstDate(username) === null) out.push(ProductEntitlement.NEW_USER);
  if (isUserBetaTester(username)) out.push(ProductEntitlement.BETA_TESTER);
  if (isUserAdmin(username)) out.push(ProductEntitlement.DEVELOPER);
  return out;
}
