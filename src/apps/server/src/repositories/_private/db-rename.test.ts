import { describe, expect, it } from 'vitest';
import {
  getDailySelectSeriesForUser,
  getHabitTextSeriesForUser,
  getSummationDayTotal,
  renameUserAuthRecord,
  setUserPassword,
  setSelect,
  setHabitText,
  setTotal,
} from './db.js';

describe('renameUserAuthRecord', () => {
  it('migrates all habit data to the new username', () => {
    const from = 'rename-from-user';
    const to = 'rename-to-user';
    setUserPassword(from, 'test-password');

    setTotal(from, 'push ups', '2025-01-01', 10, "datetime('now')");
    setSelect(from, 'mood', '2025-01-01', 'good');
    setHabitText(from, 'journal', '2025-01-01', 'A good day.');

    renameUserAuthRecord(from, to);

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
    expect(
      getHabitTextSeriesForUser(to, '2025-01-01', '2025-01-01').map(({ habit, date, text }) => ({
        habit,
        date,
        text,
      })),
    ).toEqual([{ habit: 'journal', date: '2025-01-01', text: 'A good day.' }]);
    expect(getHabitTextSeriesForUser(from, '2025-01-01', '2025-01-01')).toEqual([]);
  });
});
