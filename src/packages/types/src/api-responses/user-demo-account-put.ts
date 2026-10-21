import type { ProductEntitlement } from '../common/entitlement.js';

/** PUT /users/:user/demo-account — administrator sets the account's demo status in demo mode. */
export type UserDemoAccountPutRequest = { demoUser: boolean };

export type UserDemoAccountPutResponse = {
  ok: true;
  user: string;
  demoUser: boolean;
  entitlements: ProductEntitlement[];
};
