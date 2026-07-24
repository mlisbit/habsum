// Domain operations for reading habit data and applying habit mutations.
import { dayFromString, type Day } from '@habsum/types/common/day';
import type { Habit } from '@habsum/types/common/habit';
import { dasherize } from '@habsum/utils/strings';
import {
  getHabitApiDate,
  getHabitApiToday,
  getTzOffsetMinutes,
} from '../utils/server-time-utils.js';
import { HabitRepository } from '../repositories/habit-repository.js';
import type { HabitListViewContext, PatchBody } from '../types/habit.types.js';
import type { UserConfig } from '../types/userConfig.js';
import ServiceError from '../utils/classes/service-error.js';
import getHabitFilter from '../utils/get-habit-filter.js';
import getHabitHistoryDataQuery from '../utils/get-habit-history-data-query.js';
import getHabitListDataQuery from '../utils/get-habit-list-data-query.js';
import getHabitTypeService from '../utils/habits/get-habit-type-service.js';
import getMinDate from '../utils/get-min-date.js';
import isHabitRepeatedOnDate from '../utils/habits/is-habit-repeated-on-date.js';
import { HabitDataService } from './habit-data-service.js';
import { HabitPresentationService } from './habit-presentation-service.js';
import type { HabitTypeService } from './habits/habit-type-service.js';

type HabitHistoryQuery = {
  date?: string;
  filter?: string;
  habitId?: string;
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

export class HabitService {
  constructor(
    private readonly repository = new HabitRepository(),
    private readonly dataService = new HabitDataService(repository),
    private readonly presentationService = new HabitPresentationService(),
  ) {}

  getHabitHistory({ user, config, query = {}, at = new Date() }: GetHabitHistoryInput) {
    const habitIds = getHabitFilter(query.filter ?? query.habitId);
    if (habitIds.length === 0) throw new ServiceError('bad_request', 'filter is required');

    const inspectDate = getHabitApiDate(query.date, at);
    const habitDefs = [];
    for (const habitId of habitIds) {
      const habitDef = config.habits.find((h) => dasherize(h.name) === habitId);
      if (!habitDef) {
        throw new ServiceError('not_found', `habit not configured: ${habitId}`);
      }
      habitDefs.push(habitDef);
    }

    const historyData = this.dataService.loadSnapshot(
      getHabitHistoryDataQuery({
        user,
        habits: habitDefs,
        viewDate: inspectDate,
      }),
    );
    const typeServices = new Map(
      habitDefs.map((habitDef) => [habitDef.name, getHabitTypeService(habitDef, this.repository)]),
    );
    const habitsByDate = new Map<Day, Habit[]>();
    for (const habitData of historyData.habits) {
      const typeService = typeServices.get(habitData.name);
      if (!typeService) {
        throw new Error(`missing habit type service for "${habitData.name}"`);
      }
      for (const day of typeService.historyDates(habitData)) {
        const habit = typeService.historyHabit(habitData, day);
        habitsByDate.set(day, [...(habitsByDate.get(day) ?? []), habit]);
      }
    }

    for (const [day, habits] of habitsByDate) {
      const habitsForDay = new Map(habits.map((habit) => [habit.name, habit]));
      habitsByDate.set(
        day,
        habitDefs
          .filter((habitDef) => isHabitRepeatedOnDate(habitDef, day))
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
      .filter((habitDef) => isHabitRepeatedOnDate(habitDef, inspectDate))
      .map(
        (habitDef) =>
          inspectMap?.get(habitDef.name) ?? typeServices.get(habitDef.name)!.emptyHistoryHabit(),
      );

    return {
      user,
      habits: Object.fromEntries(
        config.habits.map((habitDef) => [dasherize(habitDef.name), habitDef.name]),
      ),
      firstDate: getMinDate(
        historyData.habits.flatMap((habitData) => {
          const typeService = typeServices.get(habitData.name);
          if (!typeService) {
            throw new Error(`missing habit type service for "${habitData.name}"`);
          }
          return typeService.historyDates(habitData);
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
    const dateString = typeof body.date === 'string' ? body.date : null;
    if (dateString == null) {
      throw new ServiceError('bad_request', 'body.date is required (YYYY-MM-DD)');
    }

    let day: Day;
    try {
      day = dayFromString(dateString);
    } catch {
      throw new ServiceError('bad_request', 'body.date is required (YYYY-MM-DD)');
    }

    const { habit } = body;
    if (typeof habit !== 'string' || habit.length === 0) {
      throw new ServiceError('bad_request', 'habit is required');
    }

    const known = config.habits.find((h) => h.name === habit);
    if (!known) {
      throw new ServiceError('not_found', `habit "${habit}" not configured`);
    }

    const tzOffsetMinutes = getTzOffsetMinutes(body.tzOffsetMinutes);
    const typeService = getHabitTypeService(known, this.repository);
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
    const context: HabitListViewContext = {
      viewDate: date,
      today: getHabitApiToday(at, tzOffsetMinutes),
      requestedAt: at,
      tzOffsetMinutes,
    };
    const data = this.dataService.loadSnapshot(getHabitListDataQuery({ config, context }));
    const habitData = data.habits.find((candidate) => candidate.name === habit);
    if (!habitData) throw new Error(`failed to hydrate configured habit "${habit}"`);
    const result = this.presentationService.presentHabit({
      config,
      context,
      data,
      habitName: habit,
    });

    return typeService.buildPatchResponse({
      data,
      date,
      result,
      habitData,
    });
  }
}
