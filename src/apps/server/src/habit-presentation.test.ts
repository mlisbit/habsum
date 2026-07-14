import { describe, expect, it, vi } from 'vitest';
import { dayFromString } from '@habsum/types/common/day';
import type { StreakDatum, StreakGraphData } from '@habsum/types/common/streak';

vi.mock('./db.js', () => ({
  getSeries: vi.fn(),
  getSelect: vi.fn(),
  getSummationDayTotal: vi.fn(),
}));

import { getSelect, getSeries, getSummationDayTotal } from './db.js';
import {
  formatSelectStreakText,
  habitHistoryForConfiguredPeriod,
  historyGraphScaleTop,
  historyWidget,
  progressWidget,
  streakWidget,
  summationStreakGraphForConfiguredWindow,
  streakGraphForConfiguredWindow,
} from './habit-presentation.js';

const user = 'tester';
const habit = 'mood';
const eligible = ['good'];

function streakDatumForDate(streak: StreakGraphData, date: string): StreakDatum | undefined {
  return streak.data.flat().find((datum) => datum.date === date);
}

describe('historyGraphScaleTop', () => {
  it('uses the goal when it exceeds logged totals in the period', () => {
    expect(historyGraphScaleTop([4], 5)).toBe(5);
  });

  it('uses the max logged total when it exceeds the goal', () => {
    expect(historyGraphScaleTop([175], 100)).toBe(175);
  });

  it('falls back to 1 when there is no data and no goal', () => {
    expect(historyGraphScaleTop([], null)).toBe(1);
  });
});

describe('habitHistoryForConfiguredPeriod', () => {
  it('pads up to three days after a past view date and outlines the view date', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = '2025-05-18';
    vi.mocked(getSeries).mockReturnValue([
      { date: '2025-05-18', total: 2 },
      { date: '2025-05-20', total: 5 },
    ]);

    const history = habitHistoryForConfiguredPeriod(user, habit, viewDate, null, '1w', null, at);

    expect(getSeries).toHaveBeenCalledWith(user, habit, '2025-05-15', '2025-05-21');
    expect(Object.keys(history.data.user.graphData)).toEqual([
      '2025-05-15',
      '2025-05-16',
      '2025-05-17',
      '2025-05-18',
      '2025-05-19',
      '2025-05-20',
      '2025-05-21',
    ]);
    expect(history.data.user.graphData[viewDate]?.outline).toBe(true);
    expect(history.data.user.graphData[viewDate]?.dimmed).toBeUndefined();
    expect(history.data.user.graphData['2025-05-19']?.dimmed).toBe(true);
    expect(history.data.user.graphData['2025-05-20']?.dimmed).toBe(true);
    expect(history.data.user.graphData['2025-05-21']?.dimmed).toBe(true);
    expect(history.data.user.graphData['2025-05-21']?.outline).toBeUndefined();
  });
});

describe('historyWidget', () => {
  it('shows average per day for the graph window and explains missing days', () => {
    const history = {
      data: {
        user: {
          graphData: {
            '2025-05-15': { value: null, top: 5, hoverLabel: 'Thu' },
            '2025-05-16': { value: 2, top: 5, hoverLabel: 'Fri' },
            '2025-05-17': { value: null, top: 5, hoverLabel: 'Sat' },
            '2025-05-18': { value: 4, top: 5, hoverLabel: 'Sun' },
            '2025-05-19': { value: null, top: 5, hoverLabel: 'Mon' },
            '2025-05-20': { value: null, top: 5, hoverLabel: 'Tue' },
            '2025-05-21': { value: null, top: 5, hoverLabel: 'Wed' },
          },
        },
      },
    };

    const widget = historyWidget(history, 5);

    expect(widget.titleValue).toBe('3/day average since May 15');
    expect(widget.titleValueHoverText).toBe(
      'Average excludes 5 days with no data and uses 2 days with logged data.',
    );
    expect(widget.body[0]).toMatchObject({
      kind: 'barGraph',
      lines: [{ value: 5, label: 'Daily goal: 5' }],
    });
  });

  it('includes missing days as zero when configured', () => {
    const widget = historyWidget(
      {
        data: {
          user: {
            graphData: {
              '2025-05-15': { value: null, top: 5, hoverLabel: 'Thu' },
              '2025-05-16': { value: 2, top: 5, hoverLabel: 'Fri' },
              '2025-05-17': { value: null, top: 5, hoverLabel: 'Sat' },
              '2025-05-18': { value: 4, top: 5, hoverLabel: 'Sun' },
              '2025-05-19': { value: null, top: 5, hoverLabel: 'Mon' },
              '2025-05-20': { value: null, top: 5, hoverLabel: 'Tue' },
              '2025-05-21': { value: null, top: 5, hoverLabel: 'Wed' },
            },
          },
        },
      },
      5,
      true,
    );

    expect(widget.titleValue).toBe('1/day average since May 15');
    expect(widget.titleValueHoverText).toBeUndefined();
    expect(widget.body[0]).toMatchObject({
      kind: 'barGraph',
      lines: [{ value: 5, label: 'Daily goal: 5' }],
    });
  });

  it('labels average range through the outlined view date for past windows', () => {
    const widget = historyWidget(
      {
        data: {
          user: {
            graphData: {
              '2025-05-15': { value: null, top: 5, hoverLabel: 'Thu' },
              '2025-05-16': { value: 2, top: 5, hoverLabel: 'Fri' },
              '2025-05-17': { value: null, top: 5, hoverLabel: 'Sat' },
              '2025-05-18': { value: 4, top: 5, hoverLabel: 'Sun', outline: true },
              '2025-05-19': { value: null, top: 5, hoverLabel: 'Mon', dimmed: true },
              '2025-05-20': { value: null, top: 5, hoverLabel: 'Tue', dimmed: true },
              '2025-05-21': { value: null, top: 5, hoverLabel: 'Wed', dimmed: true },
            },
          },
        },
      },
      5,
    );

    expect(widget.titleValue).toBe('3/day average from May 15 to May 18');
  });
});

describe('progressWidget', () => {
  it('labels summation goals with compact current over goal text', () => {
    expect(progressWidget(2, 5)).toMatchObject({
      title: 'Goal',
      titleValue: '2 / 5',
    });
  });

  it('labels goal-less summation totals as progress', () => {
    expect(progressWidget(null, null)).toEqual({
      title: 'Progress',
      titleValue: 'No data',
      body: [],
    });
    expect(progressWidget(0, null)).toMatchObject({
      title: 'Progress',
      titleValue: '0',
    });
    expect(progressWidget(4, null)).toMatchObject({
      title: 'Progress',
      titleValue: '4',
    });
  });
});

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
    const viewDate = '2025-05-18';
    vi.mocked(getSelect).mockImplementation((_u, _h, date) =>
      date === '2025-05-18' ? 'good' : null,
    );

    const streak = streakGraphForConfiguredWindow(user, habit, viewDate, eligible, at);
    const keys = streak.data
      .flat()
      .map((datum) => datum.date)
      .sort();

    expect(keys.at(-1)).toBe('2025-05-21');
    expect(streakDatumForDate(streak, dayFromString(viewDate))?.outline).toBe(true);
    expect(streakDatumForDate(streak, dayFromString(viewDate))?.dimmed).toBeUndefined();
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
    expect(streakDatumForDate(streak, viewDate)?.fill).toBe(0);
    expect(streakDatumForDate(streak, dayFromString('2025-05-22'))).toBeUndefined();
  });

  it('counts today when it has a streak-eligible selection', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getSelect).mockImplementation((_u, _h, date) => (date === viewDate ? 'good' : null));

    const streak = streakGraphForConfiguredWindow(user, habit, viewDate, eligible, at);

    expect(streak.currentText).toBe('1 day');
    expect(streakDatumForDate(streak, viewDate)?.fill).toBe(10);
  });

  it('uses a nonzero fill for logged selections outside the streak config', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getSelect).mockImplementation((_u, _h, date) => (date === viewDate ? 'bad' : null));

    const streak = streakGraphForConfiguredWindow(user, habit, viewDate, eligible, at);

    expect(streak.currentText).toBe('0 days');
    expect(streakDatumForDate(streak, viewDate)?.value).toBe('bad');
    expect(streakDatumForDate(streak, viewDate)?.fill).toBe(1);
  });

  it('treats an unlogged past view date as breaking the streak', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = '2025-05-15';
    vi.mocked(getSelect).mockImplementation((_u, _h, date) =>
      date === '2025-05-14' ? 'good' : null,
    );

    const streak = streakGraphForConfiguredWindow(user, habit, viewDate, eligible, at);

    expect(streak.currentText).toBe('0 days');
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

    expect(streak.currentText).toBe('3 days');
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

    const viewWeekStart = dayFromString('2025-05-19');
    expect(streakDatumForDate(streak, viewWeekStart)?.label).toMatch(/–/);
    expect(streakDatumForDate(streak, viewWeekStart)?.value).toBe('3/3');
    expect(streakDatumForDate(streak, viewWeekStart)?.fill).toBe(10);
    expect(streak.currentText).toBe('2 weeks');
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

    const viewWeekStart = dayFromString('2025-05-19');
    expect(streakDatumForDate(streak, viewWeekStart)?.value).toBe('1/3');
    expect(streakDatumForDate(streak, viewWeekStart)?.fill).toBe(3);
    expect(streak.currentText).toBe('1 week');
  });

  it('uses a nonzero weekly fill when the week has only non-eligible logs', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = '2025-05-21';
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
    expect(streakDatumForDate(streak, viewWeekStart)?.fill).toBe(1);
    expect(streak.currentText).toBe('0 weeks');
  });
});

describe('summationStreakGraphForConfiguredWindow', () => {
  it('counts summation days that hit the configured goal', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getSummationDayTotal).mockImplementation((_u, _h, date) => {
      if (date === '2025-05-21') return 12;
      if (date === '2025-05-20') return 5;
      if (date === '2025-05-19') return 10;
      return null;
    });

    const streak = summationStreakGraphForConfiguredWindow(user, 'push ups', viewDate, ['10'], at);

    expect(streak.currentText).toBe('1 day');
    expect(streakDatumForDate(streak, viewDate)?.value).toBe('12');
    expect(streakDatumForDate(streak, viewDate)?.fill).toBe(10);
    expect(streakDatumForDate(streak, dayFromString('2025-05-20'))?.fill).toBe(1);
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
      label: 'Longest streak',
      text: '3 days of good (current)',
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

    expect(streak.longestStreak?.text).toBe('4 days of good');
    expect(streak.currentText).toBe('1 day');
    expect(streakWidget(streak).titleValue).toBeUndefined();
    expect(streakWidget(streak).body[0]).toEqual({
      kind: 'pills',
      pills: [
        { label: 'Current streak: 1 day' },
        {
          label: 'Longest streak: 4 days of good',
          hover: 'Thu, May 1 – Sun, May 4',
        },
      ],
    });
  });

  it('labels weekly longest streak with the configured frequency and options', () => {
    const viewDate = '2025-05-21';
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
      '2025-05-01',
    );

    expect(streak.longestStreak?.label).toBe('Longest streak');
    expect(streak.longestStreak?.text).toBe('1 week of 3+ per week: good (current)');
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
