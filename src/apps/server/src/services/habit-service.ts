// Service layer for user-scoped habit HTTP requests and response orchestration.
import type { HabitsResponse } from '@habsum/types/api-responses/habits-get';
import type { HistoryGetResponse } from '@habsum/types/api-responses/history-get';
import type { PatchHabitResponse } from '@habsum/types/api-responses/habit-patch';
import { dayFromString, type Day } from '@habsum/types/common/day';
import type { Habit } from '@habsum/types/common/habit';
import { dasherize } from '@habsum/utils/strings';
import { HabitResultBuilder } from '../builders/habit-result-builder.js';
import { HabitFactory } from '../factories/habit-factory.js';
import {
  parseClientCreatedAtIso,
  parseTzOffsetMinutes,
  resolveHabitApiDateQuery,
} from '../server-time.js';
import {
  emptyHabitForHistory,
  minDate,
  parseHabitFilter,
  type PatchBody,
} from './habit-service.utils.js';
import { mapSummationEventsToApi } from '../summation-event-api.js';
import { HabitRepository } from '../repositories/habit-repository.js';
import type { InterimHabit } from '../types/habit.types.js';
import { HABIT_REPEAT_DAYS, type HabitDef, type UserConfig } from '../types/userConfig.js';

type HabitListQuery = {
  date?: string;
  tzOffsetMinutes?: string;
};

type HabitHistoryQuery = {
  date?: string;
  filter?: string;
  habitId?: string;
};

type GetHabitsInput = {
  config: UserConfig;
  query?: HabitListQuery;
  at?: Date;
};

type GetHabitHistoryInput = {
  user: string;
  config: UserConfig;
  query?: HabitHistoryQuery;
  at?: Date;
};

type HabitServiceResult<T> = {
  status: number;
  body: T | { error: string };
};

type PatchHabitInput = {
  user: string;
  config: UserConfig;
  body?: PatchBody;
  at?: Date;
};

/** Maps a branded `YYYY-MM-DD` day to the repeat-rule weekday name. */
function repeatDayForDateKey(date: Day): string {
  const dayIndex = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return HABIT_REPEAT_DAYS[dayIndex === 0 ? 6 : dayIndex - 1];
}

/** Returns whether a habit's repeat rule includes the supplied calendar day. */
function habitRepeatsOnDate(habit: HabitDef, date: Day): boolean {
  return habit.repeat.includes(repeatDayForDateKey(date));
}

/** Collects every branded day represented by a hydrated interim habit. */
function interimHabitDates(habit: InterimHabit): Day[] {
  return habit.type === 'single_select'
    ? habit.values.map((row) => row.date)
    : habit.totals.map((row) => row.date);
}

/** Projects one day of hydrated interim data into the public habit shape. */
function habitFromInterimDay(habit: InterimHabit, day: Day): Habit {
  const habitDef = habit.config;
  if (habit.type === 'single_select') {
    return {
      name: habitDef.name,
      type: 'single_select',
      goal: habitDef.goal,
      options: habitDef.options ?? [],
      ...(habitDef.theme ? { theme: habitDef.theme } : {}),
      value: habit.values.find((row) => row.date === day)?.value ?? null,
    } satisfies Habit;
  }

  return {
    name: habitDef.name,
    type: 'summation',
    goal: habitDef.goal ?? null,
    total: habit.totals.find((row) => row.date === day)?.total ?? null,
    events: mapSummationEventsToApi(habit.events.filter((event) => event.date === day)),
    ...(habitDef.summationOptions ? { summationOptions: habitDef.summationOptions } : {}),
  } satisfies Habit;
}

export class HabitService {
  constructor(private readonly repository = new HabitRepository()) {}

  getHabits({ config, query = {}, at = new Date() }: GetHabitsInput): HabitsResponse {
    const date = resolveHabitApiDateQuery(query.date, at);
    const tzOffsetMinutes = parseTzOffsetMinutes(query.tzOffsetMinutes);
    const data = this.repository.getHabits({ config, date, at, tzOffsetMinutes });
    const visibleData = {
      ...data,
      habits: data.habits.filter((habit) => habitRepeatsOnDate(habit.config, date)),
    };
    const habits = new HabitFactory({ data: visibleData, at, tzOffsetMinutes })
      .builders()
      .map((builder) => builder.build());

    return new HabitResultBuilder({
      data: visibleData,
      habits,
      familiarName: visibleData.familiarName,
      at,
      tzOffsetMinutes,
    }).build();
  }

  getHabitHistory({
    user,
    config,
    query = {},
    at = new Date(),
  }: GetHabitHistoryInput): HabitServiceResult<HistoryGetResponse> {
    const habitIds = parseHabitFilter(query.filter ?? query.habitId);
    if (habitIds.length === 0) return { status: 400, body: { error: 'filter is required' } };

    const inspectDate = resolveHabitApiDateQuery(query.date, at);
    const habitDefs = [];
    for (const habitId of habitIds) {
      const habitDef = config.habits.find((h) => dasherize(h.name) === habitId);
      if (!habitDef) {
        return { status: 404, body: { error: `habit not configured: ${habitId}` } };
      }
      habitDefs.push(habitDef);
    }

    const historyData = this.repository.getHabits({
      config: { ...config, habits: habitDefs },
      date: inspectDate,
      at,
      dataScope: 'all',
    });
    const habitsByDate = new Map<Day, Habit[]>();
    for (const interimHabit of historyData.habits) {
      for (const day of interimHabitDates(interimHabit)) {
        const habit = habitFromInterimDay(interimHabit, day);
        habitsByDate.set(day, [...(habitsByDate.get(day) ?? []), habit]);
      }
    }

    for (const [day, habits] of habitsByDate) {
      const habitsForDay = new Map(habits.map((habit) => [habit.name, habit]));
      habitsByDate.set(
        day,
        habitDefs
          .filter((habitDef) => habitRepeatsOnDate(habitDef, day))
          .map((habitDef) => habitsForDay.get(habitDef.name) ?? emptyHabitForHistory(habitDef)),
      );
    }

    const inspectDayHabits = habitsByDate.get(inspectDate);
    const inspectMap = inspectDayHabits ? new Map(inspectDayHabits.map((h) => [h.name, h])) : null;
    const data: Habit[] = habitDefs
      .filter((habitDef) => habitRepeatsOnDate(habitDef, inspectDate))
      .map((habitDef) => inspectMap?.get(habitDef.name) ?? emptyHabitForHistory(habitDef));

    return {
      status: 200,
      body: {
        user,
        habits: Object.fromEntries(
          config.habits.map((habitDef) => [dasherize(habitDef.name), habitDef.name]),
        ),
        firstDate: minDate(historyData.habits.flatMap(interimHabitDates)),
        data,
        history: {
          user: Array.from(habitsByDate.entries())
            .map(([day, habits]) => ({ day, habits }))
            .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0)),
        },
        serverTime: at.toISOString(),
      },
    };
  }

  patchHabit({
    user,
    config,
    body = {},
    at = new Date(),
  }: PatchHabitInput): HabitServiceResult<PatchHabitResponse> {
    const date =
      typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
    if (date == null) {
      return { status: 400, body: { error: 'body.date is required (YYYY-MM-DD)' } };
    }
    const day = dayFromString(date);

    const { habit, total, action, value, clientCreatedAt } = body;
    if (typeof habit !== 'string' || habit.length === 0) {
      return { status: 400, body: { error: 'habit is required' } };
    }

    const known = config.habits.find((h) => h.name === habit);
    if (!known) {
      return { status: 404, body: { error: `habit "${habit}" not configured` } };
    }

    if (known.type === 'single_select') {
      const tzOffsetMinutes = parseTzOffsetMinutes(body.tzOffsetMinutes);
      const mode = typeof action === 'string' ? action : undefined;
      if (mode === 'clear') {
        this.repository.applyHabitMutation({
          kind: 'clear_select',
          user,
          habit,
          date: day,
        });
        return {
          status: 200,
          body: this.patchResponse({
            config,
            date: day,
            habit,
            at,
            tzOffsetMinutes,
          }),
        };
      }

      if (typeof value !== 'string' || value.length === 0) {
        return { status: 400, body: { error: 'value is required' } };
      }
      const opts = known.options ?? [];
      if (opts.length && !opts.includes(value)) {
        return { status: 400, body: { error: 'invalid option' } };
      }

      this.repository.applyHabitMutation({
        kind: 'set_select',
        user,
        habit,
        date: day,
        value,
      });
      return {
        status: 200,
        body: this.patchResponse({ config, date: day, habit, at, tzOffsetMinutes }),
      };
    }

    const mode = typeof action === 'string' ? action : 'add';
    const tzOffsetMinutes = parseTzOffsetMinutes(body.tzOffsetMinutes);

    if (mode === 'delete_event') {
      const rawId = body.eventId;
      const eventId = typeof rawId === 'number' ? rawId : Number(rawId);
      if (!Number.isInteger(eventId) || eventId <= 0) {
        return { status: 400, body: { error: 'eventId is required (positive integer)' } };
      }
      const removed = this.repository.applyHabitMutation({
        kind: 'delete_event',
        user,
        habit,
        date: day,
        eventId,
      });
      if (!removed) {
        return { status: 404, body: { error: 'summation event not found' } };
      }
      return {
        status: 200,
        body: this.patchResponse({ config, date: day, habit, at, tzOffsetMinutes }),
      };
    }

    if (mode === 'clear') {
      this.repository.applyHabitMutation({ kind: 'clear_total', user, habit, date: day });
      return {
        status: 200,
        body: this.patchResponse({ config, date: day, habit, at, tzOffsetMinutes }),
      };
    }

    const numericTotal = Number(total);
    if (!Number.isFinite(numericTotal)) {
      return { status: 400, body: { error: 'total must be a number' } };
    }

    const createdAtSql = parseClientCreatedAtIso(clientCreatedAt);
    if (createdAtSql == null) {
      return {
        status: 400,
        body: {
          error:
            'body.clientCreatedAt is required for summation add/set (YYYY-MM-DD HH:MM:SS client wall clock)',
        },
      };
    }

    if (mode === 'add') {
      this.repository.applyHabitMutation({
        kind: 'add_total',
        user,
        habit,
        date: day,
        total: numericTotal,
        createdAt: createdAtSql,
      });
    } else if (mode === 'set') {
      this.repository.applyHabitMutation({
        kind: 'set_total',
        user,
        habit,
        date: day,
        total: numericTotal,
        createdAt: createdAtSql,
      });
    } else {
      return { status: 400, body: { error: `unknown action "${mode}"` } };
    }

    return {
      status: 200,
      body: this.patchResponse({ config, date: day, habit, at, tzOffsetMinutes }),
    };
  }

  private patchResponse({
    config,
    date,
    habit,
    at,
    tzOffsetMinutes,
  }: {
    config: UserConfig;
    date: Day;
    habit: string;
    at: Date;
    tzOffsetMinutes?: number;
  }): PatchHabitResponse {
    const data = this.repository.getHabits({ config, date, at, tzOffsetMinutes });
    const habitIndex = data.habits.findIndex((candidate) => candidate.config.name === habit);
    const interimHabit = data.habits[habitIndex];
    const builder = new HabitFactory({ data, at, tzOffsetMinutes }).builders()[habitIndex];
    if (!interimHabit || !builder) throw new Error(`failed to hydrate configured habit "${habit}"`);

    const result = builder.build();
    if (result.type === 'single_select' && interimHabit.type === 'single_select') {
      return {
        user: data.user,
        date,
        habit: result.name,
        value: result.value,
        type: result.type,
        options: result.options,
        ...(result.theme ? { theme: result.theme } : {}),
        ...(result.widgets ? { widgets: result.widgets } : {}),
      };
    }
    if (result.type === 'summation' && interimHabit.type === 'summation') {
      return {
        user: data.user,
        date,
        habit: result.name,
        total: result.total,
        events: mapSummationEventsToApi(interimHabit.events.filter((event) => event.date === date)),
        type: result.type,
        goal: result.goal,
        ...(result.widgets ? { widgets: result.widgets } : {}),
      };
    }
    throw new Error(`hydrated habit type mismatch for "${habit}"`);
  }
}
