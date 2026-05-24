import { describe, expect, it } from 'vitest';
import {
  ensureUserPins,
  getSelect,
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
    expect(getSelect(to, 'mood', '2025-01-01')).toBe('good');
    expect(getSelect(from, 'mood', '2025-01-01')).toBeNull();
  });
});
