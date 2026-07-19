// Repository that owns habit DB access and interim habit hydration.
import { dayFromString, type Day } from '@habsum/types/common/day';
import {
  addToTotal,
  deleteDailySelect,
  deleteDailySelectValue,
  deleteSummationEvent,
  deleteSummationEventsForDay,
  getAllDailySelectsForUser,
  getAllSelects,
  getAllSummationEventsForUser,
  getAllTotals,
  getFirstDate,
  getHabitFirstDate,
  getSelect,
  getSelectSeries,
  getSeries,
  getSummationDayTotal,
  getSummationEvents,
  getUserProfile,
  renameDailySelectValue,
  renameHabitData,
  setSelect,
  setTotal,
} from './_private/db.js';
import { habitApiTodayKey } from '../server-time.js';
import { habitInsightDataRange } from './_private/habit-data-range.js';
import type {
  HabitDataReader,
  InterimHabit,
  InterimHabitHistoryRow,
  InterimHabitsData,
} from '../types/habit.types.js';
import { HABIT_REPEAT_DAYS, type HabitDef, type UserConfig } from '../types/userConfig.js';

type GetHabitsInput = {
  config: UserConfig;
  date: Day;
  at?: Date;
  tzOffsetMinutes?: number;
};

function repeatDayForDateKey(date: Day): string {
  const dayIndex = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return HABIT_REPEAT_DAYS[dayIndex === 0 ? 6 : dayIndex - 1];
}

function habitRepeatsOnDate(habit: HabitDef, date: Day): boolean {
  return habit.repeat.includes(repeatDayForDateKey(date));
}

function selectValuesFromSeries(rows: Array<{ date: string; value: string }>) {
  return rows.map((row) => ({
    date: dayFromString(row.date),
    value: row.value,
  }));
}

function totalsFromSeries(rows: Array<{ date: string; total: number }>) {
  return rows.map((row) => ({
    date: dayFromString(row.date),
    total: row.total,
  }));
}

export class HabitRepository {
  getFamiliarName(user: string): string {
    const displayName = getUserProfile(user).displayName?.trim();
    if (!displayName) return user;
    return displayName.split(/\s+/)[0] ?? user;
  }

  firstDate(user: string): string | null {
    return getFirstDate(user);
  }

  habitFirstDate(user: string, habit: string): string | null {
    return getHabitFirstDate(user, habit);
  }

  habitDataReader(): HabitDataReader {
    return {
      getSelect,
      getFirstSelectDate(user, habit) {
        const rows = getAllSelects(user, habit);
        if (rows.length === 0) return null;
        return dayFromString(
          rows.reduce((min, row) => (row.date < min ? row.date : min), rows[0]!.date),
        );
      },
      getSummationDayTotal,
      getSeries(user, habit, startDate, endDate) {
        return getSeries(user, habit, startDate, endDate).map((row) => ({
          date: dayFromString(row.date),
          total: row.total,
        }));
      },
    };
  }

  habitRowsForHistory(user: string, habit: HabitDef): InterimHabitHistoryRow[] {
    if (habit.type === 'single_select') {
      return getAllSelects(user, habit.name).map((row) => ({
        day: dayFromString(row.date),
        type: 'single_select',
        habit: habit.name,
        value: row.value,
      }));
    }

    return getAllTotals(user, habit.name).map((row) => ({
      day: dayFromString(row.date),
      type: 'summation',
      habit: habit.name,
      total: row.total,
      events: getSummationEvents(user, habit.name, row.date),
    }));
  }

  clearDailySelect(user: string, habit: string, date: string): void {
    deleteDailySelect(user, habit, date);
  }

  deleteDailySelectValue(user: string, habit: string, value: string): void {
    deleteDailySelectValue(user, habit, value);
  }

  renameDailySelectValue(user: string, habit: string, fromValue: string, toValue: string): void {
    renameDailySelectValue(user, habit, fromValue, toValue);
  }

  renameHabitData(user: string, fromHabit: string, toHabit: string): void {
    renameHabitData(user, fromHabit, toHabit);
  }

  setDailySelect(user: string, habit: string, date: string, value: string): string {
    return setSelect(user, habit, date, value);
  }

  getDailySelect(user: string, habit: string, date: string): string | null {
    return getSelect(user, habit, date);
  }

  getSummationEvents(user: string, habit: string, date: string) {
    return getSummationEvents(user, habit, date);
  }

  getSummationDayTotal(user: string, habit: string, date: string): number | null {
    return getSummationDayTotal(user, habit, date);
  }

  getAllTotals(user: string, habit: string) {
    return getAllTotals(user, habit);
  }

  deleteSummationEvent(user: string, habit: string, date: string, eventId: number): boolean {
    return deleteSummationEvent(user, habit, date, eventId);
  }

  clearSummationDay(user: string, habit: string, date: string): void {
    deleteSummationEventsForDay(user, habit, date);
  }

  addToTotal(user: string, habit: string, date: string, total: number, createdAt: string) {
    return addToTotal(user, habit, date, total, createdAt);
  }

  setTotal(user: string, habit: string, date: string, total: number, createdAt: string): number {
    return setTotal(user, habit, date, total, createdAt);
  }

  getAllDailySelectsForUser(user: string) {
    return getAllDailySelectsForUser(user);
  }

  getAllSummationEventsForUser(user: string) {
    return getAllSummationEventsForUser(user);
  }

  getHabits({ config, date, at = new Date(), tzOffsetMinutes }: GetHabitsInput): InterimHabitsData {
    const today = habitApiTodayKey(at, tzOffsetMinutes);
    const firstDate = getFirstDate(config.user);
    const typedFirstDate = firstDate == null ? null : dayFromString(firstDate);
    const habits = config.habits
      .filter((habit) => habitRepeatsOnDate(habit, date))
      .map((habit): InterimHabit => {
        const range = habitInsightDataRange(habit, date, today, typedFirstDate);
        if (habit.type === 'single_select') {
          return {
            type: 'single_select',
            config: habit,
            dataStart: range.start,
            dataEnd: range.end,
            values: selectValuesFromSeries(
              getSelectSeries(config.user, habit.name, range.start, range.end),
            ),
          };
        }

        return {
          type: 'summation',
          config: habit,
          dataStart: range.start,
          dataEnd: range.end,
          totals: totalsFromSeries(getSeries(config.user, habit.name, range.start, range.end)),
        };
      });

    return {
      user: config.user,
      date,
      today,
      firstDate: typedFirstDate,
      config,
      habits,
    };
  }
}
