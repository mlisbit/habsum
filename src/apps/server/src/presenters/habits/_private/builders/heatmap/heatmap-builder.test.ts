import { describe, expect, it, vi } from 'vitest';
import { dayFromString, type Day } from '@habsum/types/common/day';
import type { StreakDatum, StreakGraphData } from '@habsum/types/common/streak';
import { fromDateKey, toDateKey } from '@habsum/utils/date';
import type { HydratedHabitData } from '../../../../../types/habit.types.js';
import type { HabitDef } from '../../../../../types/userConfig.js';
import { SingleSelectHeatmapBuilder } from './single-select-heatmap-builder.js';
import { SummationHeatmapBuilder } from './summation-heatmap-builder.js';

const habitDataFixtureMocks = vi.hoisted(() => ({
  getFixtureTotals: vi.fn(),
  getFixtureSelection: vi.fn(),
}));

const { getFixtureSelection, getFixtureTotals } = habitDataFixtureMocks;

const user = 'tester';
const habit = 'mood';
const eligible = ['good'];

function addDaysUtc(date: Day, delta: number): Day {
  return toDateKey(new Date(fromDateKey(date, 0).getTime() + delta * 86_400_000), 0);
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
  selectableValues: readonly string[] = streakEligibleOptions,
) {
  const hydratedHabit = getHydratedSingleSelectData(user, habitName, viewDate);
  const userRowConfig: HabitDef<'single_select'> = {
    name: habitName,
    type: 'single_select',
    repeat: [],
    insights: [],
    settings: { options: [...selectableValues] },
  };
  const builder = new SingleSelectHeatmapBuilder(hydratedHabit, userRowConfig, {
    viewingDate: viewDate,
    today,
  });
  return builder.build({
    eligibleOptions: streakEligibleOptions,
    frequency: streakFrequency,
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
) {
  const hydratedHabit = getHydratedSummationData(user, habitName, viewDate);
  const userRowConfig: HabitDef<'summation'> = {
    name: habitName,
    type: 'summation',
    repeat: [],
    insights: [],
    settings: { goal: null },
  };
  const builder = new SummationHeatmapBuilder(hydratedHabit, userRowConfig, {
    viewingDate: viewDate,
    today,
  });
  return builder.build({
    eligibleOptions: streakEligibleOptions,
    frequency: streakFrequency,
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

  it('leaves an unlogged UTC today empty', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getFixtureSelection).mockImplementation((_u, _h, date) => {
      if (date === '2025-05-20') return 'good';
      if (date === '2025-05-19') return 'good';
      return null;
    });

    const streak = getTestSingleSelectStreakGraph(user, habit, viewDate, eligible, at);

    expect(streakDatumForDate(streak, viewDate)?.value).toBeNull();
    expect(streakDatumForDate(streak, viewDate)?.fill).toBeUndefined();
    expect(streakDatumForDate(streak, dayFromString('2025-05-22'))).toBeUndefined();
  });

  it('fills today when it has an eligible selection', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getFixtureSelection).mockImplementation((_u, _h, date) =>
      date === viewDate ? 'good' : null,
    );

    const streak = getTestSingleSelectStreakGraph(user, habit, viewDate, eligible, at);

    expect(streakDatumForDate(streak, viewDate)?.fill).toBe(5);
  });

  it('uses a nonzero fill for logged selections outside the streak config', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getFixtureSelection).mockImplementation((_u, _h, date) =>
      date === viewDate ? 'bad' : null,
    );

    const streak = getTestSingleSelectStreakGraph(user, habit, viewDate, eligible, at);

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
      ['none', 'light', 'moderate', 'heavy'],
    );

    expect(streakDatumForDate(streak, dayFromString('2025-05-18'))?.fill).toBe(5);
    expect(streakDatumForDate(streak, dayFromString('2025-05-19'))?.fill).toBe(3);
    expect(streakDatumForDate(streak, dayFromString('2025-05-20'))?.fill).toBe(-4);
    expect(streakDatumForDate(streak, dayFromString('2025-05-21'))?.fill).toBe(-5);
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
  });

  it('shows partial progress for an incomplete viewing week', () => {
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
  });
});

describe('getTestSummationStreakGraph', () => {
  it('scales summation fills against the graph values', () => {
    const at = new Date('2025-05-21T12:00:00.000Z');
    const viewDate = dayFromString('2025-05-21');
    vi.mocked(getFixtureTotals).mockImplementation((_u, _h, startDate) => {
      if (startDate === '2025-05-21') return [{ date: startDate, total: 12 }];
      if (startDate === '2025-05-20') return [{ date: startDate, total: 5 }];
      if (startDate === '2025-05-19') return [{ date: startDate, total: 10 }];
      return [];
    });

    const streak = getTestSummationStreakGraph(user, 'push ups', viewDate, ['10'], at);

    expect(streakDatumForDate(streak, viewDate)?.value).toBe('12');
    expect(streakDatumForDate(streak, viewDate)?.fill).toBe(5);
    expect(streakDatumForDate(streak, dayFromString('2025-05-20'))?.fill).toBe(2);
  });
});
