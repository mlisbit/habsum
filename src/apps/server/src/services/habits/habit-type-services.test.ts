import { dayFromString } from '@habsum/types/common/day';
import { describe, expect, it } from 'vitest';
import type { HabitMutation } from '../../repositories/habit-repository.js';
import type { HabitDef } from '../../types/userConfig.js';
import type { HabitMutationRepository } from './habit-type-service.js';
import { SingleSelectHabitService } from './single-select-habit-service.js';
import { SummationHabitService } from './summation-habit-service.js';
import { TextHabitService } from './text-habit-service.js';

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
  it('keeps selection mutations in the single-select service', () => {
    const { repository, mutations } = mutationRecorder();
    const definition: HabitDef<'single_select'> = {
      name: 'mood',
      type: 'single_select',
      repeat: ['thursday'],
      insights: [],
      settings: {
        options: ['good', 'bad'],
      },
    };
    const service = new SingleSelectHabitService(definition, repository);
    service.applyPatch({ user: 'user', date, body: { value: 'bad' } });

    expect(mutations).toEqual([
      { kind: 'set_select', user: 'user', habit: 'mood', date, value: 'bad' },
    ]);
  });

  it('keeps total mutations in the summation service', () => {
    const { repository, mutations } = mutationRecorder();
    const definition: HabitDef<'summation'> = {
      name: 'push ups',
      type: 'summation',
      repeat: ['thursday'],
      insights: [],
      settings: { goal: 100 },
    };
    const service = new SummationHabitService(definition, repository);
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

  it('keeps daily text mutations in the text service', () => {
    const { repository, mutations } = mutationRecorder();
    const definition: HabitDef<'text'> = {
      name: 'journal',
      type: 'text',
      repeat: ['thursday'],
      insights: [],
      settings: {},
    };
    const service = new TextHabitService(definition, repository);
    service.applyPatch({ user: 'user', date, body: { text: 'A thought for today.' } });

    expect(mutations).toEqual([
      {
        kind: 'set_text',
        user: 'user',
        habit: 'journal',
        date,
        text: 'A thought for today.',
      },
    ]);

    service.applyPatch({ user: 'user', date, body: { text: '' } });
    expect(mutations.at(-1)).toEqual({
      kind: 'clear_text',
      user: 'user',
      habit: 'journal',
      date,
    });
  });
});
