import { describe, expect, it } from 'vitest';
import {
  configEditHabitQueryValue,
  configEditHabitUrl,
  findHabitNameByConfigEditId,
  readConfigEditHabitId,
  withConfigEditHabitId,
} from '../habit-id';

describe('config edit habit query param', () => {
  it('maps habit names to dasherized ids', () => {
    expect(configEditHabitQueryValue('push ups')).toBe('push-ups');
  });

  it('reads and writes the habit query param', () => {
    expect(readConfigEditHabitId('?yaml=1')).toBeNull();
    expect(readConfigEditHabitId('?habit=push-ups&yaml=1')).toBe('push-ups');
    expect(withConfigEditHabitId('?yaml=1', 'push-ups')).toBe('?yaml=1&habit=push-ups');
    expect(withConfigEditHabitId('?habit=push-ups', null)).toBe('');
  });

  it('finds a habit name from the query id', () => {
    const habits = [{ name: 'push ups' }, { name: 'pull ups' }];
    expect(findHabitNameByConfigEditId(habits, 'push-ups')).toBe('push ups');
    expect(findHabitNameByConfigEditId(habits, 'missing')).toBeNull();
  });

  it('builds the settings config edit url', () => {
    expect(configEditHabitUrl('user2', 'push ups')).toBe(
      '/users/user2/settings/config?habit=push-ups',
    );
  });
});
