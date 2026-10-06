import {
  ProductEntitlement,
  type ProductEntitlement as ProductEntitlementName,
} from '@habsum/types/common/entitlement';
import type { Database } from 'bun:sqlite';

type UserRow = {
  username: string;
  admin: number;
  betaTester: number;
  hasActivity: number;
};

export type UserAccount = {
  username: string;
  entitlements: ProductEntitlementName[];
};

export default function getUserAccounts(database: Database): UserAccount[] {
  const rows = database
    .query<UserRow, []>(
      `
      SELECT
        users.username,
        users.admin,
        users.beta_tester AS betaTester,
        (
          EXISTS (
            SELECT 1 FROM habit_summation_events
            WHERE habit_summation_events.user = users.username
          )
          OR EXISTS (
            SELECT 1 FROM habit_daily_selects
            WHERE habit_daily_selects.user = users.username
          )
          OR EXISTS (
            SELECT 1 FROM habit_text
            WHERE habit_text.user = users.username
          )
        ) AS hasActivity
      FROM users
      ORDER BY users.username COLLATE NOCASE ASC, users.username ASC
    `,
    )
    .all();

  return rows.map((row) => {
    const entitlements: ProductEntitlementName[] = [];

    if (row.hasActivity === 0) {
      entitlements.push(ProductEntitlement.NEW_USER);
    }
    if (row.betaTester === 1) {
      entitlements.push(ProductEntitlement.BETA_TESTER);
    }
    if (row.admin === 1) {
      entitlements.push(ProductEntitlement.DEVELOPER);
    }

    return { username: row.username, entitlements };
  });
}
