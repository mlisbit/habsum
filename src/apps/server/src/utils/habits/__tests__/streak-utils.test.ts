import { describe, expect, it, vi } from 'vitest';
import { dayFromString, type Day } from '@habsum/types/common/day';
import type { StreakDatum, StreakGraphData } from '@habsum/types/common/streak';

const habitReaderMocks = vi.hoisted(() => ({
  getSeries: vi.fn(),
  getSelect: vi.fn(),
  getFirstSelectDate: vi.fn(),
}));

const { getSelect, getSeries } = habitReaderMocks;
import {
  formatSelectStreakText,
  summationStreakGraphForConfiguredWindow as buildSummationStreakGraphForConfiguredWindow,
  streakGraphForConfiguredWindow as buildStreakGraphForConfiguredWindow,
} from '../streak-utils.js';

const user = 'tester';
const habit = 'mood';
const eligible = ['good'];

function streakGraphForConfiguredWindow(
  user: string,
  habitName: string,
  viewDate: Day,
  streakEligibleOptions: readonly string[],
  at: Date = new Date(),
  tzOffsetMinutes?: number,
  streakFrequency?: string,
  showLongest = false,
  firstDate: Day | null = null,
  selectableValues: readonly string[] = streakEligibleOptions,
) {
  return buildStreakGraphForConfiguredWindow(
    user,
    habitName,
    viewDate,
    streakEligibleOptions,
    at,
    tzOffsetMinutes,
    streakFrequency,
    showLongest,
    firstDate,
    selectableValues,
    habitReaderMocks,
  );
}

function summationStreakGraphForConfiguredWindow(
  user: string,
  habitName: string,
  viewDate: Day,
  streakEligibleOptions: readonly string[],
  at: Date = new Date(),
  tzOffsetMinutes?: number,
  streakFrequency?: string,
  showLongest = false,
  firstDate: Day | null = null,
) {
  return buildSummationStreakGraphForConfiguredWindow(
    user,
    habitName,
    viewDate,
    streakEligibleOptions,
    at,
    tzOffsetMinutes,
    streakFrequency,
    showLongest,
    firstDate,
    habitReaderMocks,
  );
}

function streakDatumForDate(streak: StreakGraphData, date: Day): StreakDatum | undefined {
  return streak.data.flat().find((datum) => datum.date === date);
}

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
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getSelect).mockImplementation((_u, _h, date) =>
      date === '2025-05-20' || date === '2025-05-19' ? 'good' : null,
    );

    const streak = streakGraphForConfiguredWindow(user, habit, viewDate, eligible, at);

    expect(streak.currentText).toBe('2 days');
    expect(streak.data).toHaveLength(53);
    expect(streak.data.every((week) => week.length >= 1 && week.length <= 7)).toBe(true);
    expect(streak.data[0]?.[0]?.date).toBe('2024-05-19');
    expect(streak.data[0]?.at(-1)?.date).toBe('2024-05-25');
    expect(streak.data.at(-1)?.map((datum) => datum.date)).toEqual([
      '2025-05-18',
      '2025-05-19',
      '2025-05-20',
      '2025-05-21',
    ]);
    expect(streakDatumForDate(streak, viewDate)?.label).toBeUndefined();
    expect(streakDatumForDate(streak, viewDate)?.outline).toBeUndefined();
    expect(streak.data.flat()).toHaveLength(368);
  });

  it('pads up to today after a past view date and outlines the view date', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-18');
    vi.mocked(getSelect).mockImplementation((_u, _h, date) =>
      date === '2025-05-18' ? 'good' : null,
    );

    const streak = streakGraphForConfiguredWindow(user, habit, viewDate, eligible, at);
    const keys = streak.data
      .flat()
      .map((datum) => datum.date)
      .sort();

    expect(keys.at(-1)).toBe('2025-05-21');
    expect(streakDatumForDate(streak, viewDate)?.outline).toBe(true);
    expect(streakDatumForDate(streak, viewDate)?.dimmed).toBeUndefined();
    expect(streakDatumForDate(streak, dayFromString('2025-05-19'))?.dimmed).toBe(true);
    expect(streakDatumForDate(streak, dayFromString('2025-05-20'))?.dimmed).toBe(true);
    expect(streakDatumForDate(streak, dayFromString('2025-05-21'))?.dimmed).toBe(true);
    expect(streakDatumForDate(streak, dayFromString('2025-05-21'))?.outline).toBeUndefined();
    expect(streakDatumForDate(streak, dayFromString('2025-05-22'))).toBeUndefined();
  });

  it('omits an unlogged UTC today from current streak length', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getSelect).mockImplementation((_u, _h, date) => {
      if (date === '2025-05-20') return 'good';
      if (date === '2025-05-19') return 'good';
      return null;
    });

    const streak = streakGraphForConfiguredWindow(user, habit, viewDate, eligible, at);

    expect(streak.currentText).toBe('2 days');
    expect(streakDatumForDate(streak, viewDate)?.value).toBeNull();
    expect(streakDatumForDate(streak, viewDate)?.fill).toBeUndefined();
    expect(streakDatumForDate(streak, dayFromString('2025-05-22'))).toBeUndefined();
  });

  it('counts today when it has a streak-eligible selection', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getSelect).mockImplementation((_u, _h, date) => (date === viewDate ? 'good' : null));

    const streak = streakGraphForConfiguredWindow(user, habit, viewDate, eligible, at);

    expect(streak.currentText).toBe('1 day');
    expect(streakDatumForDate(streak, viewDate)?.fill).toBe(5);
  });

  it('uses a nonzero fill for logged selections outside the streak config', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getSelect).mockImplementation((_u, _h, date) => (date === viewDate ? 'bad' : null));

    const streak = streakGraphForConfiguredWindow(user, habit, viewDate, eligible, at);

    expect(streak.currentText).toBe('0 days');
    expect(streakDatumForDate(streak, viewDate)?.value).toBe('bad');
    expect(streakDatumForDate(streak, viewDate)?.fill).toBe(-5);
  });

  it('distributes selectable positions and makes non-streak options negative', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    const valuesByDate = new Map([
      ['2025-05-18', 'none'],
      ['2025-05-19', 'light'],
      ['2025-05-20', 'moderate'],
      ['2025-05-21', 'heavy'],
    ]);
    vi.mocked(getSelect).mockImplementation((_u, _h, date) => valuesByDate.get(date) ?? null);

    const streak = streakGraphForConfiguredWindow(
      user,
      habit,
      viewDate,
      ['none', 'light'],
      at,
      undefined,
      undefined,
      false,
      null,
      ['none', 'light', 'moderate', 'heavy'],
    );

    expect(streakDatumForDate(streak, dayFromString('2025-05-18'))?.fill).toBe(5);
    expect(streakDatumForDate(streak, dayFromString('2025-05-19'))?.fill).toBe(3);
    expect(streakDatumForDate(streak, dayFromString('2025-05-20'))?.fill).toBe(-4);
    expect(streakDatumForDate(streak, dayFromString('2025-05-21'))?.fill).toBe(-5);
  });

  it('treats an unlogged past view date as breaking the streak', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-15');
    vi.mocked(getSelect).mockImplementation((_u, _h, date) =>
      date === '2025-05-14' ? 'good' : null,
    );

    const streak = streakGraphForConfiguredWindow(user, habit, viewDate, eligible, at);

    expect(streak.currentText).toBe('0 days');
  });

  it('omits unlogged today when view date is ahead of UTC (client tz offset)', () => {
    const at = new Date('2026-05-20T22:00:00.000Z');
    const viewDate = dayFromString('2026-05-21');
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

    expect(streak.currentText).toBe('3 days');
  });
});

describe('streakGraphForConfiguredWindow (weekly frequency)', () => {
  it('returns week range labels and progress for 3d/1w', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
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

    const viewWeekStart = dayFromString('2025-05-19');
    expect(streakDatumForDate(streak, viewWeekStart)?.label).toMatch(/–/);
    expect(streakDatumForDate(streak, viewWeekStart)?.value).toBe('3/3');
    expect(streakDatumForDate(streak, viewWeekStart)?.fill).toBe(5);
    expect(streak.currentText).toBe('2 weeks');
  });

  it('omits the in-progress view week from streak length when under target', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
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

    const viewWeekStart = dayFromString('2025-05-19');
    expect(streakDatumForDate(streak, viewWeekStart)?.value).toBe('1/3');
    expect(streakDatumForDate(streak, viewWeekStart)?.fill).toBe(2);
    expect(streak.currentText).toBe('1 week');
  });

  it('uses a nonzero weekly fill when the week has only non-eligible logs', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getSelect).mockImplementation((_u, _h, date) =>
      date === '2025-05-20' ? 'bad' : null,
    );

    const streak = streakGraphForConfiguredWindow(
      user,
      habit,
      viewDate,
      eligible,
      at,
      undefined,
      '3d/1w',
    );

    const viewWeekStart = dayFromString('2025-05-19');
    expect(streakDatumForDate(streak, viewWeekStart)?.value).toBeNull();
    expect(streakDatumForDate(streak, viewWeekStart)?.fill).toBe(-5);
    expect(streak.currentText).toBe('0 weeks');
  });
});

describe('summationStreakGraphForConfiguredWindow', () => {
  it('counts summation days that hit the configured goal', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getSeries).mockImplementation((_u, _h, startDate) => {
      if (startDate === '2025-05-21') return [{ date: startDate, total: 12 }];
      if (startDate === '2025-05-20') return [{ date: startDate, total: 5 }];
      if (startDate === '2025-05-19') return [{ date: startDate, total: 10 }];
      return [];
    });

    const streak = summationStreakGraphForConfiguredWindow(user, 'push ups', viewDate, ['10'], at);

    expect(streak.currentText).toBe('1 day');
    expect(streakDatumForDate(streak, viewDate)?.value).toBe('12');
    expect(streakDatumForDate(streak, viewDate)?.fill).toBe(5);
    expect(streakDatumForDate(streak, dayFromString('2025-05-20'))?.fill).toBe(2);
  });
});

describe('streakGraphForConfiguredWindow (show_longest)', () => {
  it('includes longestStreak for daily habits when enabled', () => {
    const viewDate = dayFromString('2025-05-21');
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
      dayFromString('2025-05-01'),
    );

    expect(streak.longestStreak).toEqual({
      label: 'Longest streak',
      text: '3 days (current)',
      range: expect.stringMatching(/–/),
      qualifier: 'good',
    });
  });

  it('does not mark longest as current when a longer past streak exists', () => {
    const viewDate = dayFromString('2025-05-21');
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
      dayFromString('2025-05-01'),
    );

    expect(streak.longestStreak?.text).toBe('4 days');
    expect(streak.currentText).toBe('1 day');
  });

  it('labels weekly longest streak with the configured frequency and options', () => {
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getSelect).mockImplementation((_u, _h, date) => {
      if (date === '2025-05-12' || date === '2025-05-13' || date === '2025-05-14') return 'good';
      return null;
    });

    const streak = streakGraphForConfiguredWindow(
      user,
      habit,
      viewDate,
      eligible,
      new Date(`${viewDate}T12:00:00.000Z`),
      undefined,
      '3d/1w',
      true,
      dayFromString('2025-05-01'),
    );

    expect(streak.longestStreak?.label).toBe('Longest streak');
    expect(streak.longestStreak?.text).toBe('1 week (current)');
    expect(streak.longestStreak?.qualifier).toBe('3+ per week: good');
  });

  it('omits longestStreak when show_longest is disabled', () => {
    const viewDate = dayFromString('2025-05-21');
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
      dayFromString('2025-05-01'),
    );

    expect(streak.longestStreak).toBeUndefined();
  });
});
