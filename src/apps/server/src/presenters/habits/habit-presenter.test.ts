import { describe, expect, it, vi } from 'vitest';
import { dayFromString, type Day } from '@habsum/types/common/day';
import type { Habit } from '@habsum/types/common/habit';
import type { StreakDatum, StreakGraphData } from '@habsum/types/common/streak';
import { fromDateKey, toDateKey } from '@habsum/utils/date';
import type { HydratedHabitData } from '../../types/habit.types.js';
import type { HabitDef } from '../../types/userConfig.js';
import { HabitPresenter, type HabitPresentationContext } from './habit-presenter.js';

const habitDataFixtureMocks = vi.hoisted(() => ({
  getFixtureTotals: vi.fn(),
  getFixtureSelection: vi.fn(),
}));

const { getFixtureSelection, getFixtureTotals } = habitDataFixtureMocks;

const user = 'tester';
const habit = 'mood';
const eligible = ['good'];

class HabitPresenterHarness extends HabitPresenter<HabitDef, HydratedHabitData, Habit> {
  getRecordedDates(): Day[] {
    return this.habitData.type === 'single_select'
      ? this.habitData.values.map((row) => row.date)
      : this.habitData.totals.map((row) => row.date);
  }

  getHistoryEvents() {
    return [];
  }

  present(): Habit {
    throw new Error('not used by streak tests');
  }

  getGraph(options: {
    eligibleOptions: readonly string[];
    frequency?: string;
    includeLongest?: boolean;
    selectableValues?: readonly string[];
  }) {
    return this.getStreakGraph(options);
  }
}

function addDaysUtc(date: Day, delta: number): Day {
  return toDateKey(new Date(fromDateKey(date, 0).getTime() + delta * 86_400_000), 0);
}

function getPresenterHarness(
  habitData: HydratedHabitData,
  context: HabitPresentationContext,
): HabitPresenterHarness {
  const definition: HabitDef =
    habitData.type === 'single_select'
      ? {
          name: habitData.name,
          type: 'single_select',
          repeat: [],
          insights: [],
          settings: { options: [] },
        }
      : {
          name: habitData.name,
          type: 'summation',
          repeat: [],
          insights: [],
          settings: { goal: null },
        };
  return new HabitPresenterHarness(definition, habitData, context);
}

function getHydratedSingleSelectData(
  user: string,
  habitName: string,
  viewDate: Day,
): Extract<HydratedHabitData, { type: 'single_select' }> {
  const dataStart = addDaysUtc(viewDate, -1_000);
  const dataEnd = addDaysUtc(viewDate, 10);
  const values: Array<{ date: Day; value: string }> = [];
  for (let date = dataStart; date <= dataEnd; date = addDaysUtc(date, 1)) {
    const value = getFixtureSelection(user, habitName, date);
    if (value != null) values.push({ date, value });
  }
  return { name: habitName, type: 'single_select', dataStart, dataEnd, values };
}

function getHydratedSummationData(
  user: string,
  habitName: string,
  viewDate: Day,
): Extract<HydratedHabitData, { type: 'summation' }> {
  const dataStart = addDaysUtc(viewDate, -1_000);
  const dataEnd = addDaysUtc(viewDate, 10);
  const totals: Array<{ date: Day; total: number }> = [];
  for (let date = dataStart; date <= dataEnd; date = addDaysUtc(date, 1)) {
    const [row] = getFixtureTotals(user, habitName, date, date);
    if (row) totals.push(row);
  }
  return { name: habitName, type: 'summation', dataStart, dataEnd, totals, events: [] };
}

function getTestSingleSelectStreakGraph(
  user: string,
  habitName: string,
  viewDate: Day,
  streakEligibleOptions: readonly string[],
  at: Date = new Date(),
  today: Day = toDateKey(at, 0),
  streakFrequency?: string,
  showLongest = false,
  firstDate: Day | null = null,
  selectableValues: readonly string[] = streakEligibleOptions,
) {
  void firstDate;
  const presenter = getPresenterHarness(getHydratedSingleSelectData(user, habitName, viewDate), {
    viewingDate: viewDate,
    today,
  });
  return presenter.getGraph({
    eligibleOptions: streakEligibleOptions,
    frequency: streakFrequency,
    includeLongest: showLongest,
    selectableValues,
  });
}

function getTestSummationStreakGraph(
  user: string,
  habitName: string,
  viewDate: Day,
  streakEligibleOptions: readonly string[],
  at: Date = new Date(),
  today: Day = toDateKey(at, 0),
  streakFrequency?: string,
  showLongest = false,
  firstDate: Day | null = null,
) {
  void firstDate;
  const presenter = getPresenterHarness(getHydratedSummationData(user, habitName, viewDate), {
    viewingDate: viewDate,
    today,
  });
  return presenter.getGraph({
    eligibleOptions: streakEligibleOptions,
    frequency: streakFrequency,
    includeLongest: showLongest,
  });
}

function streakDatumForDate(streak: StreakGraphData, date: Day): StreakDatum | undefined {
  return streak.data.flat().find((datum) => datum.date === date);
}

describe('getTestSingleSelectStreakGraph', () => {
  it('defaults to daily streak when frequency is omitted', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getFixtureSelection).mockImplementation((_u, _h, date) =>
      date === '2025-05-20' || date === '2025-05-19' ? 'good' : null,
    );

    const streak = getTestSingleSelectStreakGraph(user, habit, viewDate, eligible, at);

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
    vi.mocked(getFixtureSelection).mockImplementation((_u, _h, date) =>
      date === '2025-05-18' ? 'good' : null,
    );

    const streak = getTestSingleSelectStreakGraph(user, habit, viewDate, eligible, at);
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
    vi.mocked(getFixtureSelection).mockImplementation((_u, _h, date) => {
      if (date === '2025-05-20') return 'good';
      if (date === '2025-05-19') return 'good';
      return null;
    });

    const streak = getTestSingleSelectStreakGraph(user, habit, viewDate, eligible, at);

    expect(streak.currentText).toBe('2 days');
    expect(streakDatumForDate(streak, viewDate)?.value).toBeNull();
    expect(streakDatumForDate(streak, viewDate)?.fill).toBeUndefined();
    expect(streakDatumForDate(streak, dayFromString('2025-05-22'))).toBeUndefined();
  });

  it('counts today when it has a streak-eligible selection', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getFixtureSelection).mockImplementation((_u, _h, date) =>
      date === viewDate ? 'good' : null,
    );

    const streak = getTestSingleSelectStreakGraph(user, habit, viewDate, eligible, at);

    expect(streak.currentText).toBe('1 day');
    expect(streakDatumForDate(streak, viewDate)?.fill).toBe(5);
  });

  it('uses a nonzero fill for logged selections outside the streak config', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getFixtureSelection).mockImplementation((_u, _h, date) =>
      date === viewDate ? 'bad' : null,
    );

    const streak = getTestSingleSelectStreakGraph(user, habit, viewDate, eligible, at);

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
    vi.mocked(getFixtureSelection).mockImplementation(
      (_u, _h, date) => valuesByDate.get(date) ?? null,
    );

    const streak = getTestSingleSelectStreakGraph(
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
    vi.mocked(getFixtureSelection).mockImplementation((_u, _h, date) =>
      date === '2025-05-14' ? 'good' : null,
    );

    const streak = getTestSingleSelectStreakGraph(user, habit, viewDate, eligible, at);

    expect(streak.currentText).toBe('0 days');
  });

  it('omits an unlogged view date when the client identifies it as today', () => {
    const at = new Date('2026-05-20T22:00:00.000Z');
    const viewDate = dayFromString('2026-05-21');
    vi.mocked(getFixtureSelection).mockImplementation((_u, _h, date) => {
      if (date === '2026-05-20' || date === '2026-05-19' || date === '2026-05-18') return 'none';
      return null;
    });

    const streak = getTestSingleSelectStreakGraph(user, habit, viewDate, ['none'], at, viewDate);

    expect(streak.currentText).toBe('3 days');
  });
});

describe('getTestSingleSelectStreakGraph (weekly frequency)', () => {
  it('returns week range labels and progress for 3d/1w', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getFixtureSelection).mockImplementation((_u, _h, date) => {
      if (date === '2025-05-19' || date === '2025-05-20' || date === '2025-05-21') return 'good';
      if (date === '2025-05-12' || date === '2025-05-13' || date === '2025-05-14') return 'good';
      return null;
    });

    const streak = getTestSingleSelectStreakGraph(
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
    vi.mocked(getFixtureSelection).mockImplementation((_u, _h, date) => {
      if (date === '2025-05-12' || date === '2025-05-13' || date === '2025-05-14') return 'good';
      if (date === '2025-05-20') return 'good';
      return null;
    });

    const streak = getTestSingleSelectStreakGraph(
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
    vi.mocked(getFixtureSelection).mockImplementation((_u, _h, date) =>
      date === '2025-05-20' ? 'bad' : null,
    );

    const streak = getTestSingleSelectStreakGraph(
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

describe('getTestSummationStreakGraph', () => {
  it('counts summation days that hit the configured goal', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getFixtureTotals).mockImplementation((_u, _h, startDate) => {
      if (startDate === '2025-05-21') return [{ date: startDate, total: 12 }];
      if (startDate === '2025-05-20') return [{ date: startDate, total: 5 }];
      if (startDate === '2025-05-19') return [{ date: startDate, total: 10 }];
      return [];
    });

    const streak = getTestSummationStreakGraph(user, 'push ups', viewDate, ['10'], at);

    expect(streak.currentText).toBe('1 day');
    expect(streakDatumForDate(streak, viewDate)?.value).toBe('12');
    expect(streakDatumForDate(streak, viewDate)?.fill).toBe(5);
    expect(streakDatumForDate(streak, dayFromString('2025-05-20'))?.fill).toBe(2);
  });
});

describe('getTestSingleSelectStreakGraph (show_longest)', () => {
  it('includes longestStreak for daily habits when enabled', () => {
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getFixtureSelection).mockImplementation((_u, _h, date) => {
      if (date === '2025-05-10' || date === '2025-05-11') return 'good';
      if (date === '2025-05-18' || date === '2025-05-19' || date === '2025-05-20') return 'good';
      return null;
    });

    const streak = getTestSingleSelectStreakGraph(
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
    vi.mocked(getFixtureSelection).mockImplementation((_u, _h, date) => {
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

    const streak = getTestSingleSelectStreakGraph(
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
    vi.mocked(getFixtureSelection).mockImplementation((_u, _h, date) => {
      if (date === '2025-05-12' || date === '2025-05-13' || date === '2025-05-14') return 'good';
      return null;
    });

    const streak = getTestSingleSelectStreakGraph(
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
    vi.mocked(getFixtureSelection).mockImplementation((_u, _h, date) =>
      date === '2025-05-20' ? 'good' : null,
    );

    const streak = getTestSingleSelectStreakGraph(
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
