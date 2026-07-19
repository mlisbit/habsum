import { describe, expect, it } from 'vitest';
import {
  ensureUserPins,
  getDailySelectSeriesForUser,
  getSummationDayTotal,
  renameUserPin,
  setSelect,
  setTotal,
} from './db.js';

describe('renameUserPin', () => {
  it('migrates habit summation and select data to the new username', () => {
    const from = 'rename-from-user';
    const to = 'rename-to-user';
    ensureUserPins([from]);

    setTotal(from, 'push ups', '2025-01-01', 10, "datetime('now')");
    setSelect(from, 'mood', '2025-01-01', 'good');

    renameUserPin(from, to);

    expect(getSummationDayTotal(to, 'push ups', '2025-01-01')).toBe(10);
    expect(getSummationDayTotal(from, 'push ups', '2025-01-01')).toBeNull();
    expect(
      getDailySelectSeriesForUser(to, '2025-01-01', '2025-01-01').map(({ habit, date, value }) => ({
        habit,
        date,
        value,
      })),
    ).toEqual([{ habit: 'mood', date: '2025-01-01', value: 'good' }]);
    expect(getDailySelectSeriesForUser(from, '2025-01-01', '2025-01-01')).toEqual([]);
  });
});
