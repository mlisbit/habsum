import { dayFromString } from '@habsum/types/common/day';
import { describe, expect, it } from 'vitest';
import type { HydratedHabitData } from '../types/habit.types.js';
import { HABIT_REPEAT_DAYS, type UserConfig } from '../types/userConfig.js';
import { HistoryPagePresenter } from './history-page-presenter.js';

describe('HistoryPagePresenter', () => {
  it('merges presenter history events by day and fills missing habits', () => {
    const firstDay = dayFromString('2026-07-22');
    const viewingDate = dayFromString('2026-07-23');
    const requestedAt = new Date('2026-07-23T12:00:00.000Z');
    const config: UserConfig = {
      user: 'tester',
      includeAbsentDaysInAverage: false,
      habits: [
        {
          name: 'mood',
          type: 'single_select',
          repeat: [...HABIT_REPEAT_DAYS],
          insights: [],
          settings: {
            options: [
              { label: 'good', sentiment: 'positive' },
              { label: 'bad', sentiment: 'negative' },
            ],
          },
        },
        {
          name: 'push ups',
          type: 'summation',
          repeat: [...HABIT_REPEAT_DAYS],
          insights: [],
          settings: { goal: 20 },
        },
      ],
    };
    const hydratedHabits: HydratedHabitData[] = [
      {
        name: 'mood',
        type: 'single_select',
        dataStart: firstDay,
        dataEnd: viewingDate,
        values: [{ date: firstDay, value: 'good' }],
      },
      {
        name: 'push ups',
        type: 'summation',
        dataStart: firstDay,
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
      },
    ];

    const result = new HistoryPagePresenter({
      user: 'tester',
      userConfig: config,
      habitDefinitions: config.habits,
      hydratedHabits,
      viewingDate,
      today: viewingDate,
      requestedAt,
    }).present();

    expect(result.firstDate).toBe(firstDay);
    expect(result.data).toEqual([
      {
        name: 'mood',
        type: 'single_select',
        details: {
          options: ['good', 'bad'],
          value: null,
        },
      },
      {
        name: 'push ups',
        type: 'summation',
        details: {
          goal: 20,
          total: 12,
          events: [
            {
              id: 7,
              amount: 12,
              createdAt: { day: viewingDate, time: '09:30:00' },
            },
          ],
        },
      },
    ]);
    expect(result.history.user).toEqual([
      {
        day: firstDay,
        habits: [
          {
            name: 'mood',
            type: 'single_select',
            details: {
              options: ['good', 'bad'],
              value: 'good',
            },
          },
          {
            name: 'push ups',
            type: 'summation',
            details: {
              goal: 20,
              total: null,
              events: [],
            },
          },
        ],
      },
      {
        day: viewingDate,
        habits: result.data,
      },
    ]);
  });
});
