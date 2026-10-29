import { dayFromString, type Day } from '@habsum/types/common/day';
import { describe, expect, it } from 'vitest';
import type { HydratedHabitData } from '../../../../../types/habit.types.js';
import type { HabitDef } from '../../../../../types/userConfig.js';
import { SingleSelectInsightsBuilder } from './single-select-insights-builder.js';
import { SummationInsightsBuilder } from './summation-insights-builder.js';

function getSingleSelectInsights({
  values,
  viewingDate,
  today = viewingDate,
  eligibleOptions = ['good'],
  frequency,
}: {
  values: Array<{ date: Day; value: string }>;
  viewingDate: Day;
  today?: Day;
  eligibleOptions?: readonly string[];
  frequency?: string;
}) {
  const definition: HabitDef<'single_select'> = {
    name: 'mood',
    type: 'single_select',
    repeat: [],
    insights: [],
    settings: {
      options: ['good', 'bad', 'none'].map((label) => ({
        label,
        sentiment: label === 'good' ? 'positive' : 'negative',
      })),
    },
  };
  const hydratedHabit: Extract<HydratedHabitData, { type: 'single_select' }> = {
    name: definition.name,
    type: 'single_select',
    dataStart: values.at(0)?.date ?? viewingDate,
    dataEnd: viewingDate,
    values,
  };
  return new SingleSelectInsightsBuilder(hydratedHabit, definition, {
    viewingDate,
    today,
  }).build({ eligibleOptions, frequency });
}

describe('SingleSelectInsightsBuilder', () => {
  it('returns the current and longest daily streaks', () => {
    const viewingDate = dayFromString('2025-05-21');

    const insights = getSingleSelectInsights({
      viewingDate,
      values: [
        { date: dayFromString('2025-05-19'), value: 'good' },
        { date: dayFromString('2025-05-20'), value: 'good' },
      ],
    });

    expect(insights).toEqual({
      currentStreak: 2,
      longestStreak: {
        start: '2025-05-19',
        end: '2025-05-20',
        values: ['good'],
      },
    });
  });

  it('treats an unlogged past viewing date as breaking the current streak', () => {
    const insights = getSingleSelectInsights({
      viewingDate: dayFromString('2025-05-15'),
      today: dayFromString('2025-05-21'),
      values: [{ date: dayFromString('2025-05-14'), value: 'good' }],
    });

    expect(insights.currentStreak).toBe(0);
    expect(insights.longestStreak).toEqual({
      start: '2025-05-14',
      end: '2025-05-14',
      values: ['good'],
    });
  });

  it('omits an unlogged viewing date identified as today', () => {
    const viewingDate = dayFromString('2026-05-21');
    const insights = getSingleSelectInsights({
      viewingDate,
      eligibleOptions: ['none'],
      values: [
        { date: dayFromString('2026-05-18'), value: 'none' },
        { date: dayFromString('2026-05-19'), value: 'none' },
        { date: dayFromString('2026-05-20'), value: 'none' },
      ],
    });

    expect(insights.currentStreak).toBe(3);
  });

  it('returns weekly streak lengths and ranges', () => {
    const insights = getSingleSelectInsights({
      viewingDate: dayFromString('2025-05-21'),
      frequency: '3d/1w',
      values: [
        { date: dayFromString('2025-05-12'), value: 'good' },
        { date: dayFromString('2025-05-13'), value: 'good' },
        { date: dayFromString('2025-05-14'), value: 'good' },
        { date: dayFromString('2025-05-19'), value: 'good' },
        { date: dayFromString('2025-05-20'), value: 'good' },
        { date: dayFromString('2025-05-21'), value: 'good' },
      ],
    });

    expect(insights).toEqual({
      currentStreak: 2,
      longestStreak: {
        start: '2025-05-12',
        end: '2025-05-25',
        values: ['good'],
      },
    });
  });

  it('omits an incomplete current week from the current streak', () => {
    const insights = getSingleSelectInsights({
      viewingDate: dayFromString('2025-05-21'),
      frequency: '3d/1w',
      values: [
        { date: dayFromString('2025-05-12'), value: 'good' },
        { date: dayFromString('2025-05-13'), value: 'good' },
        { date: dayFromString('2025-05-14'), value: 'good' },
        { date: dayFromString('2025-05-20'), value: 'good' },
      ],
    });

    expect(insights).toEqual({
      currentStreak: 1,
      longestStreak: {
        start: '2025-05-12',
        end: '2025-05-18',
        values: ['good'],
      },
    });
  });

  it('returns a longer past streak independently of the current streak', () => {
    const insights = getSingleSelectInsights({
      viewingDate: dayFromString('2025-05-21'),
      values: [
        { date: dayFromString('2025-05-01'), value: 'good' },
        { date: dayFromString('2025-05-02'), value: 'good' },
        { date: dayFromString('2025-05-03'), value: 'good' },
        { date: dayFromString('2025-05-04'), value: 'good' },
        { date: dayFromString('2025-05-20'), value: 'good' },
      ],
    });

    expect(insights).toEqual({
      currentStreak: 1,
      longestStreak: {
        start: '2025-05-01',
        end: '2025-05-04',
        values: ['good'],
      },
    });
  });
});

describe('SummationInsightsBuilder', () => {
  it('uses numeric thresholds to calculate streaks', () => {
    const viewingDate = dayFromString('2025-05-21');
    const definition: HabitDef<'summation'> = {
      name: 'push ups',
      type: 'summation',
      repeat: [],
      insights: [],
      settings: { goal: 10 },
    };
    const hydratedHabit: Extract<HydratedHabitData, { type: 'summation' }> = {
      name: definition.name,
      type: 'summation',
      dataStart: dayFromString('2025-05-19'),
      dataEnd: viewingDate,
      totals: [
        { date: dayFromString('2025-05-19'), total: 10 },
        { date: dayFromString('2025-05-20'), total: 5 },
        { date: viewingDate, total: 12 },
      ],
      events: [],
    };

    const insights = new SummationInsightsBuilder(hydratedHabit, definition, {
      viewingDate,
      today: viewingDate,
    }).build({ eligibleOptions: ['10'] });

    expect(insights).toEqual({
      currentStreak: 1,
      longestStreak: {
        start: '2025-05-19',
        end: '2025-05-19',
        values: ['10'],
      },
    });
  });
});
