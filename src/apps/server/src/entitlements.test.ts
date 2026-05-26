import { describe, expect, it } from 'vitest';
import { ProductEntitlement } from '@habsum/types/common/entitlement';
import { db, ensureUserPins } from './db.js';
import { entitlementsForUser } from './entitlements.js';

describe('entitlementsForUser', () => {
  it('grants NEW_USER when the account has no habit events', () => {
    const username = 'entitlements-new-user-test';
    ensureUserPins([username]);
    db.prepare('DELETE FROM habit_summation_events WHERE user = ?').run(username);
    db.prepare('DELETE FROM habit_daily_selects WHERE user = ?').run(username);

    expect(entitlementsForUser(username)).toContain(ProductEntitlement.NEW_USER);
  });

  it('omits NEW_USER after a daily selection is stored', () => {
    const username = 'entitlements-returning-user-test';
    ensureUserPins([username]);
    db.prepare('DELETE FROM habit_summation_events WHERE user = ?').run(username);
    db.prepare('DELETE FROM habit_daily_selects WHERE user = ?').run(username);
    db.prepare(
      `INSERT INTO habit_daily_selects (user, habit, date, value, updated_at)
       VALUES (?, 'test-habit', '2020-01-01', 'yes', datetime('now'))`,
    ).run(username);

    expect(entitlementsForUser(username)).not.toContain(ProductEntitlement.NEW_USER);
  });
});
