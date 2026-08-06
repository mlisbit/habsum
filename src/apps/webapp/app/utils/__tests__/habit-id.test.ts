import { describe, expect, it } from 'vitest';
import { dayFromString } from '@habsum/types/common/day';
import {
  configEditHabitQueryValue,
  configEditHabitUrl,
  findHabitNameByConfigEditId,
  habitDetailUrl,
  readConfigEditHabitId,
  readShowAddModal,
  withConfigEditHabitId,
  withShowAddModal,
} from '../habit-id';

describe('config edit habit query param', () => {
  it('maps habit names to dasherized ids', () => {
    expect(configEditHabitQueryValue('push ups')).toBe('push-ups');
  });

  it('reads and writes the habit query param', () => {
    expect(readConfigEditHabitId('?tab=stats')).toBeNull();
    expect(readConfigEditHabitId('?habit=push-ups&tab=stats')).toBe('push-ups');
    expect(withConfigEditHabitId('?tab=stats', 'push-ups')).toBe('?tab=stats&habit=push-ups');
    expect(withConfigEditHabitId('?habit=push-ups', null)).toBe('');
  });

  it('reads and writes the showAddModal query param', () => {
    expect(readShowAddModal('')).toBe(false);
    expect(readShowAddModal('?tab=stats')).toBe(false);
    expect(readShowAddModal('?showAddModal=1')).toBe(true);
    expect(readShowAddModal('?showAddModal=true')).toBe(true);
    expect(withShowAddModal('?tab=stats', true)).toBe('?tab=stats&showAddModal=1');
    expect(withShowAddModal('?showAddModal=1', false)).toBe('');
  });

  it('finds a habit name from the query id', () => {
    const habits = [{ name: 'push ups' }, { name: 'pull ups' }];
    expect(findHabitNameByConfigEditId(habits, 'push-ups')).toBe('push ups');
    expect(findHabitNameByConfigEditId(habits, 'missing')).toBeNull();
  });

  it('builds the settings config edit url', () => {
    expect(configEditHabitUrl('user2', 'push ups')).toBe(
      '/users/user2/settings/habits?habit=push-ups',
    );
  });

  it('builds a habit detail url for the selected view date', () => {
    expect(habitDetailUrl('user2', 'push ups', dayFromString('2026-08-06'))).toBe(
      '/users/user2/habits/detail?filter=push-ups&date=2026-08-06',
    );
  });
});
