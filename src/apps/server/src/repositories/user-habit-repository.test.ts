import { dayFromString } from '@habsum/types/common/day';
import { yamlString } from '@habsum/types/common/misc';
import { describe, expect, it, vi } from 'vitest';
import YAMLConfig from '../utils/yaml-config/yaml-config.js';
import { UserHabitRepository } from './user-habit-repository.js';

const date = dayFromString('2026-10-31');
const userConfig = new YAMLConfig(
  yamlString(`habits:
  mood:
    type: single_select
    options: [good, bad]
  steps:
    type: summation
  journal:
    type: text
`),
).parse();
const userConfigService = { loadUserConfig: () => userConfig };

function seedHabits(repository: UserHabitRepository, value: string, total: number) {
  repository.applyHabitMutation({ kind: 'set_select', habit: 'mood', date, value });
  repository.applyHabitMutation({ kind: 'set_text', habit: 'journal', date, text: value });
  repository.applyHabitMutation({
    kind: 'add_total',
    habit: 'steps',
    date,
    total,
    createdAt: '2026-10-31 10:00:00',
  });
}

describe('UserHabitRepository user scope', () => {
  it.each(['all', 'day'] as const)('isolates reads and writes for %s queries', (scope) => {
    const users = [
      { userId: `habit-repository-first-${scope}`, value: 'good', total: 10 },
      { userId: `habit-repository-second-${scope}`, value: 'bad', total: 20 },
    ].map((user) => ({
      ...user,
      repository: new UserHabitRepository(user.userId, userConfigService),
    }));

    for (const { repository, value, total } of users) {
      seedHabits(repository, value, total);
    }

    for (const { repository, userId, value, total } of users) {
      expect(repository.getDataMetadata()).toEqual({
        familiarName: userId,
        firstRecordedDate: date,
      });
      expect(repository.getDataExport()).toMatchObject({
        dailySelects: [{ habit: 'mood', date, value }],
        summationEvents: [{ habit: 'steps', date, amount: total }],
        texts: [{ habit: 'journal', date, text: value }],
      });
      const query =
        scope === 'all'
          ? repository.getHabitHistoryDataQuery({
              habitNames: ['mood', 'steps', 'journal'],
              viewDate: date,
            })
          : repository.getHabitListDataQuery({ viewDate: date, today: date });
      expect(repository.loadHydratedHabits(query)).toMatchObject([
        { name: 'mood', values: [{ date, value }] },
        { name: 'steps', totals: [{ date, total }], events: [{ date, amount: total }] },
        { name: 'journal', texts: [{ date, text: value }] },
      ]);
    }
  });

  it('scopes config changes and event deletion to the constructor user', () => {
    const first = new UserHabitRepository('habit-repository-mutations-first', userConfigService);
    const second = new UserHabitRepository('habit-repository-mutations-second', userConfigService);
    seedHabits(first, 'good', 10);
    seedHabits(second, 'good', 20);
    const secondData = second.getDataExport();

    first.applyConfigMutation({ kind: 'rename_habit', from: 'mood', to: 'feeling' });
    first.applyConfigMutation({
      kind: 'rename_select_value',
      habit: 'feeling',
      from: 'good',
      to: 'great',
    });
    expect(first.getDataExport().dailySelects).toMatchObject([
      { habit: 'feeling', value: 'great' },
    ]);
    first.applyConfigMutation({ kind: 'delete_select_value', habit: 'feeling', value: 'great' });
    expect(first.getDataExport().dailySelects).toEqual([]);

    expect(
      first.applyHabitMutation({
        kind: 'delete_event',
        habit: 'steps',
        date,
        eventId: secondData.summationEvents[0]!.id,
      }),
    ).toBe(false);
    expect(
      first.applyHabitMutation({
        kind: 'delete_event',
        habit: 'steps',
        date,
        eventId: first.getDataExport().summationEvents[0]!.id,
      }),
    ).toBe(true);
    expect(first.getDataExport().summationEvents).toEqual([]);
    expect(second.getDataExport()).toEqual(secondData);
  });

  it('loads config once per instance and uses it for list and history queries', () => {
    const updatedConfig = { ...userConfig, habits: [] };
    const loadUserConfig = vi
      .fn()
      .mockReturnValueOnce(userConfig)
      .mockReturnValueOnce(updatedConfig);
    const configService = { loadUserConfig };
    const repository = new UserHabitRepository('configured-user', configService);

    expect(repository.userConfig).toBe(userConfig);
    expect(repository.getHabitListDataQuery({ viewDate: date, today: date })).toEqual({
      viewDate: date,
      habits: [
        { name: 'mood', type: 'single_select', range: { start: date, end: date } },
        { name: 'steps', type: 'summation', range: { start: date, end: date } },
        { name: 'journal', type: 'text', range: { start: date, end: date } },
      ],
    });
    expect(
      repository.getHabitHistoryDataQuery({ habitNames: ['journal', 'mood'], viewDate: date }),
    ).toEqual({
      viewDate: date,
      habits: [
        { name: 'journal', type: 'text', range: 'all' },
        { name: 'mood', type: 'single_select', range: 'all' },
      ],
    });
    expect(loadUserConfig).toHaveBeenCalledExactlyOnceWith('configured-user');

    const nextRepository = new UserHabitRepository('configured-user', configService);
    expect(nextRepository.getHabitListDataQuery({ viewDate: date, today: date }).habits).toEqual(
      [],
    );
    expect(repository.userConfig).toBe(userConfig);
    expect(loadUserConfig).toHaveBeenCalledTimes(2);
  });

  it('rejects history requests for habits missing from the loaded config', () => {
    const repository = new UserHabitRepository('configured-user', userConfigService);
    expect(() =>
      repository.getHabitHistoryDataQuery({ habitNames: ['missing'], viewDate: date }),
    ).toThrow('habit not configured: missing');
  });

  it('rejects users without config', () => {
    expect(() => new UserHabitRepository('missing-user', { loadUserConfig: () => null })).toThrow(
      'user not found',
    );
  });
});
