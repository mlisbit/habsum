// Service layer for user-scoped habit HTTP requests and response orchestration.
import type { HabitsResponse } from '@habsum/types/api-responses/habits-get';
import type { HistoryGetResponse } from '@habsum/types/api-responses/history-get';
import type { PatchHabitResponse } from '@habsum/types/api-responses/habit-patch';
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
  habitHistoryForConfiguredPeriod,
  habitWidgets,
  historyWidget,
  emptyHabitForHistory,
  minDate,
  parseHabitFilter,
  progressWidget,
  streakGraphForConfiguredWindow,
  summationStreakGraphForConfiguredWindow,
  type PatchBody,
} from '../habit-presentation.js';
import { mapSummationEventsToApi } from '../summation-event-api.js';
import { HabitRepository } from '../repositories/habit-repository.js';
import type { InterimHabitHistoryRow } from '../types/habit.types.js';
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

function repeatDayForDateKey(date: string): string {
  const dayIndex = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return HABIT_REPEAT_DAYS[dayIndex === 0 ? 6 : dayIndex - 1];
}

function habitRepeatsOnDate(habit: HabitDef, date: string): boolean {
  return habit.repeat.includes(repeatDayForDateKey(date));
}

function habitFromHistoryRow(habitDef: HabitDef, row: InterimHabitHistoryRow): Habit {
  if (row.type === 'single_select') {
    return {
      name: habitDef.name,
      type: 'single_select',
      goal: habitDef.goal,
      options: habitDef.options ?? [],
      ...(habitDef.theme ? { theme: habitDef.theme } : {}),
      value: row.value,
    } satisfies Habit;
  }

  return {
    name: habitDef.name,
    type: 'summation',
    goal: habitDef.goal ?? null,
    total: row.total,
    events: mapSummationEventsToApi(row.events),
    ...(habitDef.summationOptions ? { summationOptions: habitDef.summationOptions } : {}),
  } satisfies Habit;
}

export class HabitService {
  constructor(private readonly repository = new HabitRepository()) {}

  getHabits({ config, query = {}, at = new Date() }: GetHabitsInput): HabitsResponse {
    const date = resolveHabitApiDateQuery(query.date, at);
    const tzOffsetMinutes = parseTzOffsetMinutes(query.tzOffsetMinutes);
    const data = this.repository.getHabits({ config, date, at, tzOffsetMinutes });
    const familiarName = this.repository.getFamiliarName(config.user);
    const habits = new HabitFactory({ data, at, tzOffsetMinutes })
      .builders()
      .map((builder) => builder.build());

    return new HabitResultBuilder({ data, habits, familiarName, at, tzOffsetMinutes }).build();
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

    const habitsByDate = new Map<string, Habit[]>();
    for (const habitDef of habitDefs) {
      for (const row of this.repository.habitRowsForHistory(user, habitDef)) {
        const habit = habitFromHistoryRow(habitDef, row);
        habitsByDate.set(row.day, [...(habitsByDate.get(row.day) ?? []), habit]);
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
        firstDate: minDate(
          habitDefs.map((habitDef) => this.repository.habitFirstDate(user, habitDef.name)),
        ),
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
        this.repository.clearDailySelect(user, habit, date);
        return {
          status: 200,
          body: this.singleSelectPatchResponse({
            user,
            date,
            habit,
            value: null,
            known,
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

      const next = this.repository.setDailySelect(user, habit, date, value);
      return {
        status: 200,
        body: this.singleSelectPatchResponse({
          user,
          date,
          habit,
          value: next,
          known,
          at,
          tzOffsetMinutes,
        }),
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
      const removed = this.repository.deleteSummationEvent(user, habit, date, eventId);
      if (!removed) {
        return { status: 404, body: { error: 'summation event not found' } };
      }
      const events = this.repository.getSummationEvents(user, habit, date);
      const nextTotal = this.repository.getSummationDayTotal(user, habit, date);
      return {
        status: 200,
        body: this.summationPatchResponse({
          user,
          date,
          habit,
          total: nextTotal,
          events,
          known,
          config,
          at,
          tzOffsetMinutes,
        }),
      };
    }

    if (mode === 'clear') {
      this.repository.clearSummationDay(user, habit, date);
      return {
        status: 200,
        body: this.summationPatchResponse({
          user,
          date,
          habit,
          total: null,
          events: [],
          known,
          config,
          at,
          tzOffsetMinutes,
        }),
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

    let next: number | null;
    let events = this.repository.getSummationEvents(user, habit, date);
    if (mode === 'add') {
      const result = this.repository.addToTotal(user, habit, date, numericTotal, createdAtSql);
      next = result.total;
      events = result.event ? [...events, result.event] : events;
    } else if (mode === 'set') {
      next = this.repository.setTotal(user, habit, date, numericTotal, createdAtSql);
      events = this.repository.getSummationEvents(user, habit, date);
    } else {
      return { status: 400, body: { error: `unknown action "${mode}"` } };
    }

    return {
      status: 200,
      body: this.summationPatchResponse({
        user,
        date,
        habit,
        total: next,
        events,
        known,
        config,
        at,
        tzOffsetMinutes,
      }),
    };
  }

  private singleSelectPatchResponse({
    user,
    date,
    habit,
    value,
    known,
    at,
    tzOffsetMinutes,
  }: {
    user: string;
    date: string;
    habit: string;
    value: string | null;
    known: UserConfig['habits'][number];
    at: Date;
    tzOffsetMinutes?: number;
  }): PatchHabitResponse {
    const opts = known.options ?? [];
    const firstDate = this.repository.firstDate(user);
    const heatmap = known.history?.displays.includes('heatmap')
      ? streakGraphForConfiguredWindow(
          user,
          habit,
          date,
          known.streak?.options ?? [],
          at,
          tzOffsetMinutes,
          undefined,
          false,
          firstDate,
          opts,
        )
      : null;
    const streak = known.streak
      ? streakGraphForConfiguredWindow(
          user,
          habit,
          date,
          known.streak.options,
          at,
          tzOffsetMinutes,
          known.streak.frequency,
          known.streak.show_longest === true,
          firstDate,
          opts,
        )
      : null;
    const widgets = habitWidgets([
      heatmap || streak ? historyWidget(null, known.goal, false, heatmap, streak) : null,
    ]);
    return {
      user,
      date,
      habit,
      value,
      type: 'single_select',
      options: opts,
      ...(known.theme ? { theme: known.theme } : {}),
      ...(widgets.length > 0 ? { widgets } : {}),
    };
  }

  private summationPatchResponse({
    user,
    date,
    habit,
    total,
    events,
    known,
    config,
    at,
    tzOffsetMinutes,
  }: {
    user: string;
    date: string;
    habit: string;
    total: number | null;
    events: Parameters<typeof mapSummationEventsToApi>[0];
    known: UserConfig['habits'][number];
    config: UserConfig;
    at: Date;
    tzOffsetMinutes?: number;
  }): PatchHabitResponse {
    const firstDate = this.repository.firstDate(user);
    const history = known.history?.displays.includes('weekly_history')
      ? habitHistoryForConfiguredPeriod(
          user,
          known.name,
          date,
          firstDate,
          known.history.period,
          known.goal,
          at,
          tzOffsetMinutes,
        )
      : null;
    const heatmap =
      known.history?.displays.includes('heatmap') && known.goal != null
        ? summationStreakGraphForConfiguredWindow(
            user,
            known.name,
            date,
            [String(known.goal)],
            at,
            tzOffsetMinutes,
            undefined,
            false,
            firstDate,
          )
        : null;
    const streak = known.streak
      ? summationStreakGraphForConfiguredWindow(
          user,
          habit,
          date,
          known.streak.options,
          at,
          tzOffsetMinutes,
          known.streak.frequency,
          known.streak.show_longest === true,
          firstDate,
        )
      : null;
    const widgets = habitWidgets([
      progressWidget(total, known.goal),
      history || heatmap || streak
        ? historyWidget(history, known.goal, config.includeAbsentDaysInAverage, heatmap, streak)
        : null,
    ]);

    return {
      user,
      date,
      habit,
      total,
      events: mapSummationEventsToApi(events),
      type: 'summation',
      goal: known.goal,
      ...(widgets.length > 0 ? { widgets } : {}),
    };
  }
}
