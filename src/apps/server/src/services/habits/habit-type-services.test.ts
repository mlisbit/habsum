import { dayFromString } from '@habsum/types/common/day';
import { describe, expect, it } from 'vitest';
import type { HabitMutation } from '../../repositories/habit-repository.js';
import type { HydratedHabitData } from '../../types/habit.types.js';
import type { HabitDef } from '../../types/userConfig.js';
import { createHabitTypeService } from './habit-type-service-factory.js';
import type { HabitMutationRepository } from './habit-type-service.js';
import { SingleSelectHabitService } from './single-select-habit-service.js';
import { SummationHabitService } from './summation-habit-service.js';

const date = dayFromString('2026-07-23');

function mutationRecorder(result = true): {
  repository: HabitMutationRepository;
  mutations: HabitMutation[];
} {
  const mutations: HabitMutation[] = [];
  return {
    repository: {
      applyHabitMutation(mutation) {
        mutations.push(mutation);
        return result;
      },
    },
    mutations,
  };
}

describe('habit type services', () => {
  it('creates a single-select service that owns selection history and mutations', () => {
    const { repository, mutations } = mutationRecorder();
    const definition: HabitDef<'single_select'> = {
      name: 'mood',
      type: 'single_select',
      repeat: ['thursday'],
      insights: [],
      settings: {
        options: ['good', 'bad'],
        theme: 'sunset',
      },
    };
    const service = createHabitTypeService(definition, repository);
    const habitData: HydratedHabitData = {
      name: definition.name,
      type: 'single_select',
      dataStart: date,
      dataEnd: date,
      values: [{ date, value: 'good' }],
    };

    expect(service).toBeInstanceOf(SingleSelectHabitService);
    expect(service.historyDates(habitData)).toEqual([date]);
    expect(service.historyHabit(habitData, date)).toEqual({
      name: 'mood',
      type: 'single_select',
      details: {
        options: ['good', 'bad'],
        theme: 'sunset',
        value: 'good',
      },
    });

    service.applyPatch({ user: 'user', date, body: { value: 'bad' } });

    expect(mutations).toEqual([
      { kind: 'set_select', user: 'user', habit: 'mood', date, value: 'bad' },
    ]);
  });

  it('creates a summation service that owns total history and mutations', () => {
    const { repository, mutations } = mutationRecorder();
    const definition: HabitDef<'summation'> = {
      name: 'push ups',
      type: 'summation',
      repeat: ['thursday'],
      insights: [],
      settings: { goal: 100 },
    };
    const service = createHabitTypeService(definition, repository);
    const habitData: HydratedHabitData = {
      name: definition.name,
      type: 'summation',
      dataStart: date,
      dataEnd: date,
      totals: [{ date, total: 12 }],
      events: [{ id: 7, date, amount: 12, createdAt: '2026-07-23 09:30:00' }],
    };

    expect(service).toBeInstanceOf(SummationHabitService);
    expect(service.historyDates(habitData)).toEqual([date]);
    expect(service.historyHabit(habitData, date)).toEqual({
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
    });

    service.applyPatch({
      user: 'user',
      date,
      body: { total: '5', clientCreatedAt: '2026-07-23 10:00:00' },
    });

    expect(mutations).toEqual([
      {
        kind: 'add_total',
        user: 'user',
        habit: 'push ups',
        date,
        total: 5,
        createdAt: '2026-07-23 10:00:00',
      },
    ]);
  });
});
