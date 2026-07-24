// Repository that owns habit DB access and hydrated habit construction.
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
import type {
  HabitDataMetadata,
  HabitDataQuery,
  HabitDataRange,
  HabitDataRangeRequest,
  HabitDataSelection,
  HydratedHabitData,
} from '../types/habit.types.js';

type LoadHydratedHabitsOptions = {
  firstRecordedDate?: Day | null;
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

function resolveRange(range: HabitDataRangeRequest, firstRecordedDate: Day | null): HabitDataRange {
  if (
    !range.extendToFirstRecordedDate ||
    firstRecordedDate == null ||
    firstRecordedDate >= range.start
  ) {
    return range;
  }
  return { start: firstRecordedDate, end: range.end };
}

function selectionRange(
  selection: HabitDataSelection,
  firstRecordedDate: Day | null,
): HabitDataRange | 'all' {
  return selection.range === 'all' ? 'all' : resolveRange(selection.range, firstRecordedDate);
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

  getDataMetadata(user: string): HabitDataMetadata {
    const { firstDate, displayName: rawDisplayName } = getHabitHydrationMetadata(user);
    const displayName = rawDisplayName?.trim();
    return {
      familiarName: displayName?.split(/\s+/)[0] || user,
      firstRecordedDate: firstDate == null ? null : dayFromString(firstDate),
    };
  }

  loadHydratedHabits(
    query: HabitDataQuery,
    { firstRecordedDate = null }: LoadHydratedHabitsOptions = {},
  ): HydratedHabitData[] {
    const { user, viewDate } = query;
    const ranges = new Map(
      query.habits.map((selection) => [
        selection.name,
        selectionRange(selection, firstRecordedDate),
      ]),
    );
    const finiteRanges = Array.from(ranges.values()).filter(
      (range): range is HabitDataRange => range !== 'all',
    );
    const hydrationRange = encompassingRange(finiteRanges);
    const selectSelections = query.habits.filter((habit) => habit.type === 'single_select');
    const summationSelections = query.habits.filter((habit) => habit.type === 'summation');
    const allSelectData = selectSelections.some((habit) => habit.range === 'all');
    const allSummationData = summationSelections.some((habit) => habit.range === 'all');
    const selectRows =
      selectSelections.length === 0
        ? []
        : allSelectData
          ? getAllDailySelectsForUser(user)
          : hydrationRange
            ? getDailySelectSeriesForUser(user, hydrationRange.start, hydrationRange.end)
            : [];
    const eventRows =
      summationSelections.length === 0
        ? []
        : allSummationData
          ? getAllSummationEventsForUser(user)
          : hydrationRange
            ? getSummationEventSeriesForUser(user, hydrationRange.start, hydrationRange.end)
            : [];
    return query.habits.map((selection): HydratedHabitData => {
      const range = ranges.get(selection.name)!;
      if (selection.type === 'single_select') {
        const values = selectValuesFromSeries(
          selectRows.filter(
            (row) =>
              row.habit === selection.name && (range === 'all' || dateIsInRange(row.date, range)),
          ),
        );
        const hydratedRange =
          range === 'all'
            ? rangeForDates(
                viewDate,
                values.map((row) => row.date),
              )
            : range;
        return {
          name: selection.name,
          type: 'single_select',
          dataStart: hydratedRange.start,
          dataEnd: hydratedRange.end,
          values,
        };
      }

      const events = eventsFromRows(
        eventRows.filter(
          (row) =>
            row.habit === selection.name && (range === 'all' || dateIsInRange(row.date, range)),
        ),
      );
      const hydratedRange =
        range === 'all'
          ? rangeForDates(
              viewDate,
              events.map((event) => event.date),
            )
          : range;
      return {
        name: selection.name,
        type: 'summation',
        dataStart: hydratedRange.start,
        dataEnd: hydratedRange.end,
        totals: totalsFromEvents(events),
        events,
      };
    });
  }
}
