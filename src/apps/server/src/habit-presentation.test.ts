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

  it('pluralizes week count', () => {
    expect(formatSelectStreakText(0, true)).toBe('0 weeks');
    expect(formatSelectStreakText(1, true)).toBe('1 week');
    expect(formatSelectStreakText(2, true)).toBe('2 weeks');
  });
});

describe('streakGraphForConfiguredWindow', () => {
  it('defaults to daily streak when frequency is omitted', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = '2025-05-21';
    vi.mocked(getSelect).mockImplementation((_u, _h, date) =>
      date === '2025-05-20' || date === '2025-05-19' ? 'good' : null,
    );

    const streak = streakGraphForConfiguredWindow(user, habit, viewDate, eligible, at);

    expect(streak.streakText).toBe('2 days');
    expect(streak.data[viewDate]?.label).toBeUndefined();
  });

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

describe('streakGraphForConfiguredWindow (weekly frequency)', () => {
  it('returns week range labels and progress for 3d/1w', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = '2025-05-21';
    vi.mocked(getSelect).mockImplementation((_u, _h, date) => {
      if (date === '2025-05-19' || date === '2025-05-20' || date === '2025-05-21') return 'good';
      if (date === '2025-05-12' || date === '2025-05-13' || date === '2025-05-14') return 'good';
      return null;
    });

    const streak = streakGraphForConfiguredWindow(
      user,
      habit,
      viewDate,
      eligible,
      at,
      undefined,
      '3d/1w',
    );

    const viewWeekStart = '2025-05-19';
    expect(streak.data[viewWeekStart]?.label).toMatch(/–/);
    expect(streak.data[viewWeekStart]?.value).toBe('3/3');
    expect(streak.data[viewWeekStart]?.include).toBe(true);
    expect(streak.streakText).toBe('2 weeks');
  });

  it('omits the in-progress view week from streak length when under target', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = '2025-05-21';
    vi.mocked(getSelect).mockImplementation((_u, _h, date) => {
      if (date === '2025-05-12' || date === '2025-05-13' || date === '2025-05-14') return 'good';
      if (date === '2025-05-20') return 'good';
      return null;
    });

    const streak = streakGraphForConfiguredWindow(
      user,
      habit,
      viewDate,
      eligible,
      at,
      undefined,
      '3d/1w',
    );

    expect(streak.data['2025-05-19']?.value).toBe('1/3');
    expect(streak.data['2025-05-19']?.include).toBeNull();
    expect(streak.streakText).toBe('1 week');
  });
});

describe('streakGraphForConfiguredWindow (show_longest)', () => {
  it('includes longestStreak for daily habits when enabled', () => {
    const viewDate = '2025-05-21';
    vi.mocked(getSelect).mockImplementation((_u, _h, date) => {
      if (date === '2025-05-10' || date === '2025-05-11') return 'good';
      if (date === '2025-05-18' || date === '2025-05-19' || date === '2025-05-20') return 'good';
      return null;
    });

    const streak = streakGraphForConfiguredWindow(
      user,
      habit,
      viewDate,
      eligible,
      new Date(`${viewDate}T12:00:00.000Z`),
      undefined,
      undefined,
      true,
      '2025-05-01',
    );

    expect(streak.longestStreak).toEqual({
      text: '3 days (current)',
      range: expect.stringMatching(/–/),
    });
  });

  it('does not mark longest as current when a longer past streak exists', () => {
    const viewDate = '2025-05-21';
    vi.mocked(getSelect).mockImplementation((_u, _h, date) => {
      if (
        date === '2025-05-01' ||
        date === '2025-05-02' ||
        date === '2025-05-03' ||
        date === '2025-05-04'
      )
        return 'good';
      if (date === '2025-05-20') return 'good';
      return null;
    });

    const streak = streakGraphForConfiguredWindow(
      user,
      habit,
      viewDate,
      eligible,
      new Date(`${viewDate}T12:00:00.000Z`),
      undefined,
      undefined,
      true,
      '2025-05-01',
    );

    expect(streak.longestStreak?.text).toBe('4 days');
    expect(streak.streakText).toBe('1 day');
  });

  it('omits longestStreak when show_longest is disabled', () => {
    const viewDate = '2025-05-21';
    vi.mocked(getSelect).mockImplementation((_u, _h, date) =>
      date === '2025-05-20' ? 'good' : null,
    );

    const streak = streakGraphForConfiguredWindow(
      user,
      habit,
      viewDate,
      eligible,
      new Date(`${viewDate}T12:00:00.000Z`),
      undefined,
      undefined,
      false,
      '2025-05-01',
    );

    expect(streak.longestStreak).toBeUndefined();
  });
});
