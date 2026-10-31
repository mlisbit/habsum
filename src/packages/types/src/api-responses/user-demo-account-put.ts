import type { ProductEntitlement } from '../common/entitlement.js';

/** PUT /users/demo-account?name=... — administrator sets the account's demo status in demo mode. */
export type UserDemoAccountPutRequest = { demoUser: boolean };

export type UserDemoAccountPutResponse = {
  ok: true;
  user: string;
  demoUser: boolean;
  entitlements: ProductEntitlement[];
};
