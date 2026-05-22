import { describe, expect, it, vi } from 'vitest';

vi.mock('./db.js', () => ({
  getSelect: vi.fn(),
}));

import { getSelect } from './db.js';
import { formatSelectStreakText, streakGraphForConfiguredWindow } from './habit-presentation.js';

const user = 'tester';
const habit = 'mood';
const eligible = ['good'];

describe('formatSelectStreakText', () => {
  it('pluralizes day count', () => {
    expect(formatSelectStreakText(0)).toBe('0 days');
    expect(formatSelectStreakText(1)).toBe('1 day');
    expect(formatSelectStreakText(3)).toBe('3 days');
  });
});

describe('streakGraphForConfiguredWindow', () => {
  it('omits an unlogged UTC today from current streak length', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = '2025-05-21';
    vi.mocked(getSelect).mockImplementation((_u, _h, date) => {
      if (date === '2025-05-20') return 'good';
      if (date === '2025-05-19') return 'good';
      return null;
    });

    const streak = streakGraphForConfiguredWindow(user, habit, viewDate, eligible, at);

    expect(streak.streakText).toBe('2 days');
    expect(streak.data[viewDate]?.value).toBeNull();
  });

  it('counts today when it has a streak-eligible selection', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = '2025-05-21';
    vi.mocked(getSelect).mockImplementation((_u, _h, date) => (date === viewDate ? 'good' : null));

    const streak = streakGraphForConfiguredWindow(user, habit, viewDate, eligible, at);

    expect(streak.streakText).toBe('1 day');
  });

  it('treats an unlogged past view date as breaking the streak', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = '2025-05-15';
    vi.mocked(getSelect).mockImplementation((_u, _h, date) =>
      date === '2025-05-14' ? 'good' : null,
    );

    const streak = streakGraphForConfiguredWindow(user, habit, viewDate, eligible, at);

    expect(streak.streakText).toBe('0 days');
  });

  it('omits unlogged today when view date is ahead of UTC (client tz offset)', () => {
    const at = new Date('2026-05-20T22:00:00.000Z');
    const viewDate = '2026-05-21';
    const tzOffsetMinutes = -120;
    vi.mocked(getSelect).mockImplementation((_u, _h, date) => {
      if (date === '2026-05-20' || date === '2026-05-19' || date === '2026-05-18') return 'none';
      return null;
    });

    const streak = streakGraphForConfiguredWindow(
      user,
      habit,
      viewDate,
      ['none'],
      at,
      tzOffsetMinutes,
    );

    expect(streak.streakText).toBe('3 days');
  });
});
