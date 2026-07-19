// Repository that owns habit DB access and interim habit hydration.
import { dayFromString, type Day } from '@habsum/types/common/day';
import {
  addToTotal,
  deleteDailySelect,
  deleteDailySelectValue,
  deleteSummationEvent,
  deleteSummationEventsForDay,
  getAllDailySelectsForUser,
  getAllSummationEventsForUser,
  getDailySelectSeriesForUser,
  getHabitHydrationMetadata,
  getSummationEventSeriesForUser,
  renameDailySelectValue,
  renameHabitData,
  setSelect,
  setTotal,
} from './_private/db.js';
import { habitApiTodayKey } from '../server-time.js';
import { habitInsightDataRange } from './_private/habit-data-range.js';
import type { HabitDataRange, InterimHabit, InterimHabitsData } from '../types/habit.types.js';
import type { UserConfig } from '../types/userConfig.js';

type HabitDataScope = 'configured' | 'all';

type GetHabitsInput = {
  config: UserConfig;
  date: Day;
  at?: Date;
  tzOffsetMinutes?: number;
  dataScope?: HabitDataScope;
};

export type HabitMutation =
  | { kind: 'set_select'; user: string; habit: string; date: Day; value: string }
  | { kind: 'clear_select'; user: string; habit: string; date: Day }
  | {
      kind: 'add_total' | 'set_total';
      user: string;
      habit: string;
      date: Day;
      total: number;
      createdAt: string;
    }
  | { kind: 'clear_total'; user: string; habit: string; date: Day }
  | { kind: 'delete_event'; user: string; habit: string; date: Day; eventId: number };

export type HabitConfigMutation =
  | { kind: 'delete_select_value'; user: string; habit: string; value: string }
  | { kind: 'rename_select_value'; user: string; habit: string; from: string; to: string }
  | { kind: 'rename_habit'; user: string; from: string; to: string };

function selectValuesFromSeries(rows: Array<{ date: string; value: string }>) {
  return rows.map((row) => ({
    date: dayFromString(row.date),
    value: row.value,
  }));
}

function eventsFromRows(
  rows: Array<{ id: number; date: string; amount: number; createdAt: string }>,
) {
  return rows.map(({ id, date, amount, createdAt }) => ({
    id,
    date: dayFromString(date),
    amount,
    createdAt,
  }));
}

function totalsFromEvents(events: Array<{ date: Day; amount: number }>) {
  const totals = new Map<Day, number>();
  for (const event of events) {
    totals.set(event.date, (totals.get(event.date) ?? 0) + event.amount);
  }
  return Array.from(totals, ([date, total]) => ({ date, total }));
}

function rangeForDates(fallback: Day, dates: Day[]) {
  return {
    start: dates[0] ?? fallback,
    end: dates.at(-1) ?? fallback,
  };
}

function encompassingRange(ranges: HabitDataRange[]): HabitDataRange | null {
  if (ranges.length === 0) return null;
  return ranges.reduce((result, range) => ({
    start: range.start < result.start ? range.start : result.start,
    end: range.end > result.end ? range.end : result.end,
  }));
}

function dateIsInRange(date: string, range: HabitDataRange): boolean {
  return date >= range.start && date <= range.end;
}

export class HabitRepository {
  applyConfigMutation(mutation: HabitConfigMutation): void {
    switch (mutation.kind) {
      case 'delete_select_value':
        deleteDailySelectValue(mutation.user, mutation.habit, mutation.value);
        return;
      case 'rename_select_value':
        renameDailySelectValue(mutation.user, mutation.habit, mutation.from, mutation.to);
        return;
      case 'rename_habit':
        renameHabitData(mutation.user, mutation.from, mutation.to);
    }
  }

  applyHabitMutation(mutation: HabitMutation): boolean {
    const { user, habit, date } = mutation;
    switch (mutation.kind) {
      case 'set_select':
        setSelect(user, habit, date, mutation.value);
        return true;
      case 'clear_select':
        deleteDailySelect(user, habit, date);
        return true;
      case 'add_total':
        addToTotal(user, habit, date, mutation.total, mutation.createdAt);
        return true;
      case 'set_total':
        setTotal(user, habit, date, mutation.total, mutation.createdAt);
        return true;
      case 'clear_total':
        deleteSummationEventsForDay(user, habit, date);
        return true;
      case 'delete_event':
        return deleteSummationEvent(user, habit, date, mutation.eventId);
    }
  }

  getDataExport(user: string) {
    return {
      dailySelects: getAllDailySelectsForUser(user),
      summationEvents: getAllSummationEventsForUser(user),
    };
  }

  getHabits({
    config,
    date,
    at = new Date(),
    tzOffsetMinutes,
    dataScope = 'configured',
  }: GetHabitsInput): InterimHabitsData {
    const today = habitApiTodayKey(at, tzOffsetMinutes);
    const { firstDate, displayName: rawDisplayName } = getHabitHydrationMetadata(config.user);
    const typedFirstDate = firstDate == null ? null : dayFromString(firstDate);
    const displayName = rawDisplayName?.trim();
    const familiarName = displayName?.split(/\s+/)[0] || config.user;
    const configuredRanges = new Map(
      config.habits.map((habit) => [
        habit.name,
        habitInsightDataRange(habit, date, today, typedFirstDate),
      ]),
    );
    const hydrationRange = encompassingRange(Array.from(configuredRanges.values()));
    const hasSelectHabits = config.habits.some((habit) => habit.type === 'single_select');
    const hasSummationHabits = config.habits.some((habit) => habit.type === 'summation');
    const selectRows = !hasSelectHabits
      ? []
      : dataScope === 'all'
        ? getAllDailySelectsForUser(config.user)
        : hydrationRange
          ? getDailySelectSeriesForUser(config.user, hydrationRange.start, hydrationRange.end)
          : [];
    const eventRows = !hasSummationHabits
      ? []
      : dataScope === 'all'
        ? getAllSummationEventsForUser(config.user)
        : hydrationRange
          ? getSummationEventSeriesForUser(config.user, hydrationRange.start, hydrationRange.end)
          : [];
    const habits = config.habits.map((habit): InterimHabit => {
      const configuredRange = configuredRanges.get(habit.name)!;
      if (habit.type === 'single_select') {
        const values = selectValuesFromSeries(
          selectRows.filter(
            (row) =>
              row.habit === habit.name &&
              (dataScope === 'all' || dateIsInRange(row.date, configuredRange)),
          ),
        );
        const range =
          dataScope === 'all'
            ? rangeForDates(
                date,
                values.map((row) => row.date),
              )
            : configuredRange;
        return {
          type: 'single_select',
          config: habit,
          dataStart: range.start,
          dataEnd: range.end,
          values,
        };
      }

      const events = eventsFromRows(
        eventRows.filter(
          (row) =>
            row.habit === habit.name &&
            (dataScope === 'all' || dateIsInRange(row.date, configuredRange)),
        ),
      );
      const range =
        dataScope === 'all'
          ? rangeForDates(
              date,
              events.map((event) => event.date),
            )
          : configuredRange;
      return {
        type: 'summation',
        config: habit,
        dataStart: range.start,
        dataEnd: range.end,
        totals: totalsFromEvents(events),
        events,
      };
    });

    return {
      user: config.user,
      familiarName,
      date,
      today,
      firstDate: typedFirstDate,
      config,
      habits,
    };
  }
}
