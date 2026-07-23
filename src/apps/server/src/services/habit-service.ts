// Domain operations for reading habit data and applying habit mutations.
import { dayFromString, type Day } from '@habsum/types/common/day';
import type { Habit } from '@habsum/types/common/habit';
import { dasherize } from '@habsum/utils/strings';
import { HabitResultBuilder } from '../builders/habit-result-builder.js';
import { HabitFactory } from '../factories/habit-factory.js';
import { parseTzOffsetMinutes, resolveHabitApiDateQuery } from '../server-time.js';
import { minDate, parseHabitFilter, type PatchBody } from './habit-service.utils.js';
import { HabitRepository } from '../repositories/habit-repository.js';
import { HABIT_REPEAT_DAYS, type HabitDef, type UserConfig } from '../types/userConfig.js';
import { ServiceError } from '../service-error.js';
import { createHabitTypeService } from './habits/habit-type-service-factory.js';
import type { HabitTypeService } from './habits/habit-type-service.js';

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

export class HabitService {
  constructor(private readonly repository = new HabitRepository()) {}

  getHabits({ config, query = {}, at = new Date() }: GetHabitsInput) {
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

  getHabitHistory({ user, config, query = {}, at = new Date() }: GetHabitHistoryInput) {
    const habitIds = parseHabitFilter(query.filter ?? query.habitId);
    if (habitIds.length === 0) throw new ServiceError('bad_request', 'filter is required');

    const inspectDate = resolveHabitApiDateQuery(query.date, at);
    const habitDefs = [];
    for (const habitId of habitIds) {
      const habitDef = config.habits.find((h) => dasherize(h.name) === habitId);
      if (!habitDef) {
        throw new ServiceError('not_found', `habit not configured: ${habitId}`);
      }
      habitDefs.push(habitDef);
    }

    const historyData = this.repository.getHabits({
      config: { ...config, habits: habitDefs },
      date: inspectDate,
      at,
      dataScope: 'all',
    });
    const typeServices = new Map(
      habitDefs.map((habitDef) => [
        habitDef.name,
        createHabitTypeService(habitDef, this.repository),
      ]),
    );
    const habitsByDate = new Map<Day, Habit[]>();
    for (const interimHabit of historyData.habits) {
      const typeService = typeServices.get(interimHabit.config.name);
      if (!typeService) {
        throw new Error(`missing habit type service for "${interimHabit.config.name}"`);
      }
      for (const day of typeService.historyDates(interimHabit)) {
        const habit = typeService.historyHabit(interimHabit, day);
        habitsByDate.set(day, [...(habitsByDate.get(day) ?? []), habit]);
      }
    }

    for (const [day, habits] of habitsByDate) {
      const habitsForDay = new Map(habits.map((habit) => [habit.name, habit]));
      habitsByDate.set(
        day,
        habitDefs
          .filter((habitDef) => habitRepeatsOnDate(habitDef, day))
          .map(
            (habitDef) =>
              habitsForDay.get(habitDef.name) ??
              typeServices.get(habitDef.name)!.emptyHistoryHabit(),
          ),
      );
    }

    const inspectDayHabits = habitsByDate.get(inspectDate);
    const inspectMap = inspectDayHabits ? new Map(inspectDayHabits.map((h) => [h.name, h])) : null;
    const data: Habit[] = habitDefs
      .filter((habitDef) => habitRepeatsOnDate(habitDef, inspectDate))
      .map(
        (habitDef) =>
          inspectMap?.get(habitDef.name) ?? typeServices.get(habitDef.name)!.emptyHistoryHabit(),
      );

    return {
      user,
      habits: Object.fromEntries(
        config.habits.map((habitDef) => [dasherize(habitDef.name), habitDef.name]),
      ),
      firstDate: minDate(
        historyData.habits.flatMap((interimHabit) => {
          const typeService = typeServices.get(interimHabit.config.name);
          if (!typeService) {
            throw new Error(`missing habit type service for "${interimHabit.config.name}"`);
          }
          return typeService.historyDates(interimHabit);
        }),
      ),
      data,
      history: {
        user: Array.from(habitsByDate.entries())
          .map(([day, habits]) => ({ day, habits }))
          .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0)),
      },
      serverTime: at.toISOString(),
    };
  }

  patchHabit({ user, config, body = {}, at = new Date() }: PatchHabitInput) {
    const date =
      typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
    if (date == null) {
      throw new ServiceError('bad_request', 'body.date is required (YYYY-MM-DD)');
    }
    const day = dayFromString(date);

    const { habit } = body;
    if (typeof habit !== 'string' || habit.length === 0) {
      throw new ServiceError('bad_request', 'habit is required');
    }

    const known = config.habits.find((h) => h.name === habit);
    if (!known) {
      throw new ServiceError('not_found', `habit "${habit}" not configured`);
    }

    const tzOffsetMinutes = parseTzOffsetMinutes(body.tzOffsetMinutes);
    const typeService = createHabitTypeService(known, this.repository);
    typeService.applyPatch({ user, date: day, body });

    return this.updatedHabit({
      config,
      date: day,
      habit,
      at,
      tzOffsetMinutes,
      typeService,
    });
  }

  private updatedHabit({
    config,
    date,
    habit,
    at,
    tzOffsetMinutes,
    typeService,
  }: {
    config: UserConfig;
    date: Day;
    habit: string;
    at: Date;
    tzOffsetMinutes?: number;
    typeService: HabitTypeService;
  }) {
    const data = this.repository.getHabits({ config, date, at, tzOffsetMinutes });
    const habitIndex = data.habits.findIndex((candidate) => candidate.config.name === habit);
    const interimHabit = data.habits[habitIndex];
    const builder = new HabitFactory({ data, at, tzOffsetMinutes }).builders()[habitIndex];
    if (!interimHabit || !builder) throw new Error(`failed to hydrate configured habit "${habit}"`);

    return typeService.buildPatchResponse({
      data,
      date,
      result: builder.build(),
      interimHabit,
    });
  }
}
