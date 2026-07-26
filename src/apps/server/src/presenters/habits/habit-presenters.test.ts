import { dayFromString } from '@habsum/types/common/day';
import { describe, expect, it } from 'vitest';
import type { HydratedHabitData } from '../../types/habit.types.js';
import type { HabitDef } from '../../types/userConfig.js';
import { SingleSelectHabitPresenter } from './single-select-habit-presenter.js';
import { SummationHabitPresenter } from './summation-habit-presenter.js';

const viewingDate = dayFromString('2026-07-23');

describe('habit presenters', () => {
  it('presents the single-select value for the viewing date', () => {
    const definition: HabitDef<'single_select'> = {
      name: 'mood',
      type: 'single_select',
      repeat: ['thursday'],
      insights: [],
      settings: {
        options: ['yes', 'no'],
        theme: 'checkbox',
      },
    };
    const habitData: Extract<HydratedHabitData, { type: 'single_select' }> = {
      name: definition.name,
      type: 'single_select',
      dataStart: viewingDate,
      dataEnd: viewingDate,
      values: [{ date: viewingDate, value: 'yes' }],
    };

    const habit = new SingleSelectHabitPresenter(definition, habitData, {
      viewingDate,
      today: viewingDate,
    }).present();

    expect(habit).toEqual({
      name: 'mood',
      type: 'single_select',
      details: {
        options: ['yes', 'no'],
        theme: 'checkbox',
        value: 'yes',
      },
    });
  });

  it('formats raw heatmap insights in the history widget', () => {
    const definition: HabitDef<'single_select'> = {
      name: 'mood',
      type: 'single_select',
      repeat: [],
      insights: ['current_streak', 'longest_streak'],
      streak_options: {
        options: ['good'],
        frequency: '7d',
      },
      settings: {
        options: ['good', 'bad'],
      },
    };
    const habitData: Extract<HydratedHabitData, { type: 'single_select' }> = {
      name: definition.name,
      type: 'single_select',
      dataStart: dayFromString('2026-07-21'),
      dataEnd: viewingDate,
      values: [
        { date: dayFromString('2026-07-21'), value: 'good' },
        { date: dayFromString('2026-07-22'), value: 'good' },
      ],
    };

    const habit = new SingleSelectHabitPresenter(definition, habitData, {
      viewingDate,
      today: viewingDate,
      includeWidgets: true,
    }).present();

    expect(habit.widgets?.[0]?.body).toEqual([
      {
        kind: 'insights',
        insights: [
          {
            header: 'Current streak',
            description: '2 days',
          },
          {
            header: 'Longest streak',
            description: '2 days',
            hover: expect.stringMatching(/–.*\nIncludes good/),
          },
        ],
      },
    ]);

    const currentOnlyDefinition: HabitDef<'single_select'> = {
      ...definition,
      insights: ['current_streak'],
    };
    const currentOnlyHabit = new SingleSelectHabitPresenter(currentOnlyDefinition, habitData, {
      viewingDate,
      today: viewingDate,
      includeWidgets: true,
    }).present();

    expect(currentOnlyHabit.widgets?.[0]?.body).toEqual([
      {
        kind: 'insights',
        insights: [
          {
            header: 'Current streak',
            description: '2 days',
          },
        ],
      },
    ]);
  });

  it('returns recorded single-select history events within the requested range', () => {
    const definition: HabitDef<'single_select'> = {
      name: 'mood',
      type: 'single_select',
      repeat: [],
      insights: [],
      settings: {
        options: ['good', 'bad'],
      },
    };
    const habitData: Extract<HydratedHabitData, { type: 'single_select' }> = {
      name: definition.name,
      type: 'single_select',
      dataStart: dayFromString('2026-07-21'),
      dataEnd: viewingDate,
      values: [
        { date: dayFromString('2026-07-21'), value: 'bad' },
        { date: viewingDate, value: 'good' },
      ],
    };

    const events = new SingleSelectHabitPresenter(definition, habitData, {
      viewingDate,
      today: viewingDate,
    }).getHistoryEvents(dayFromString('2026-07-22'), viewingDate);

    expect(events).toEqual([
      {
        day: viewingDate,
        habit: {
          name: 'mood',
          type: 'single_select',
          details: {
            options: ['good', 'bad'],
            value: 'good',
          },
        },
      },
    ]);
  });

  it('only includes summation events when the context requests them', () => {
    const definition: HabitDef<'summation'> = {
      name: 'push ups',
      type: 'summation',
      repeat: ['thursday'],
      insights: [],
      settings: { goal: 100 },
    };
    const habitData: Extract<HydratedHabitData, { type: 'summation' }> = {
      name: definition.name,
      type: 'summation',
      dataStart: viewingDate,
      dataEnd: viewingDate,
      totals: [{ date: viewingDate, total: 12 }],
      events: [
        {
          id: 7,
          date: viewingDate,
          amount: 12,
          createdAt: '2026-07-23 09:30:00',
        },
      ],
    };

    const listHabit = new SummationHabitPresenter(definition, habitData, {
      viewingDate,
      today: viewingDate,
    }).present();
    const historyHabit = new SummationHabitPresenter(definition, habitData, {
      viewingDate,
      today: viewingDate,
      includeEvents: true,
    }).present();

    expect(listHabit.details.events).toBeUndefined();
    expect(historyHabit.details.events).toEqual([
      {
        id: 7,
        amount: 12,
        createdAt: { day: '2026-07-23', time: '09:30:00' },
      },
    ]);
  });

  it('builds summation widgets only when the context requests them', () => {
    const definition: HabitDef<'summation'> = {
      name: 'push ups',
      type: 'summation',
      repeat: ['thursday'],
      insights: [],
      settings: { goal: 100 },
    };
    const habitData: Extract<HydratedHabitData, { type: 'summation' }> = {
      name: definition.name,
      type: 'summation',
      dataStart: viewingDate,
      dataEnd: viewingDate,
      totals: [{ date: viewingDate, total: 12 }],
      events: [],
    };

    const habit = new SummationHabitPresenter(definition, habitData, {
      viewingDate,
      today: viewingDate,
      includeWidgets: true,
    }).present();

    expect(habit.widgets).toEqual([
      {
        title: 'Goal',
        titleValue: '12 / 100',
        body: [{ kind: 'progress', value: 12, max: 100 }],
      },
    ]);
  });

  it('returns recorded summation history events with their event details', () => {
    const definition: HabitDef<'summation'> = {
      name: 'push ups',
      type: 'summation',
      repeat: [],
      insights: [],
      settings: { goal: 100 },
    };
    const habitData: Extract<HydratedHabitData, { type: 'summation' }> = {
      name: definition.name,
      type: 'summation',
      dataStart: viewingDate,
      dataEnd: viewingDate,
      totals: [{ date: viewingDate, total: 12 }],
      events: [
        {
          id: 7,
          date: viewingDate,
          amount: 12,
          createdAt: '2026-07-23 09:30:00',
        },
      ],
    };

    const events = new SummationHabitPresenter(definition, habitData, {
      viewingDate,
      today: viewingDate,
    }).getHistoryEvents(viewingDate, viewingDate);

    expect(events).toEqual([
      {
        day: viewingDate,
        habit: {
          name: 'push ups',
          type: 'summation',
          details: {
            goal: 100,
            total: 12,
            events: [
              {
                id: 7,
                amount: 12,
                createdAt: { day: '2026-07-23', time: '09:30:00' },
              },
            ],
          },
        },
      },
    ]);
  });
});
