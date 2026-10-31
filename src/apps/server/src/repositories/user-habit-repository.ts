// Repository that owns one user's habit config, DB access, and hydrated habit construction.
import { dayFromString, type Day } from '@habsum/types/common/day';
import type { ConfigService } from '../services/config-service.js';
import type { UserConfig } from '../types/userConfig.js';
import ServiceError from '../utils/classes/service-error.js';
import getHabitInsightDataRange from '../utils/habits/get-habit-insight-data-range.js';
import {
  addToTotal,
  deleteDailySelect,
  deleteDailySelectValue,
  deleteHabitText,
  deleteSummationEvent,
  deleteSummationEventsForDay,
  getAllDailySelectsForUser,
  getAllHabitTextsForUser,
  getAllSummationEventsForUser,
  getDailySelectSeriesForUser,
  getHabitHydrationMetadata,
  getHabitTextSeriesForUser,
  getSummationEventSeriesForUser,
  renameDailySelectValue,
  renameHabitData,
  setHabitText,
  setSelect,
  setTotal,
} from './_private/db.js';
import type {
  HabitDataMetadata,
  HabitDataQuery,
  HabitDataRange,
  HabitDataRangeRequest,
  HabitDataSelection,
  HabitListViewContext,
  HydratedHabitData,
} from '../types/habit.types.js';

type LoadHydratedHabitsOptions = {
  firstRecordedDate?: Day | null;
};

export type HabitMutation =
  | { kind: 'set_select'; habit: string; date: Day; value: string }
  | { kind: 'clear_select'; habit: string; date: Day }
  | { kind: 'set_text'; habit: string; date: Day; text: string }
  | { kind: 'clear_text'; habit: string; date: Day }
  | {
      kind: 'add_total' | 'set_total';
      habit: string;
      date: Day;
      total: number;
      createdAt: string;
    }
  | { kind: 'clear_total'; habit: string; date: Day }
  | { kind: 'delete_event'; habit: string; date: Day; eventId: number };

export type HabitConfigMutation =
  | { kind: 'delete_select_value'; habit: string; value: string }
  | { kind: 'rename_select_value'; habit: string; from: string; to: string }
  | { kind: 'rename_habit'; from: string; to: string };

function selectValuesFromSeries(rows: Array<{ date: string; value: string }>) {
  return rows.map((row) => ({
    date: dayFromString(row.date),
    value: row.value,
  }));
}

function textsFromSeries(rows: Array<{ date: string; text: string }>) {
  return rows.map((row) => ({
    date: dayFromString(row.date),
    text: row.text,
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

export class UserHabitRepository {
  readonly userConfig: UserConfig;

  constructor(
    private readonly userId: string,
    userConfigService: Pick<ConfigService, 'loadUserConfig'>,
  ) {
    const userConfig = userConfigService.loadUserConfig(userId);
    if (!userConfig) throw new ServiceError('not_found', 'user not found');
    this.userConfig = userConfig;
  }

  getHabitListDataQuery({
    viewDate,
    today,
  }: Pick<HabitListViewContext, 'viewDate' | 'today'>): HabitDataQuery {
    return {
      viewDate,
      habits: this.userConfig.habits.map((habit) => ({
        name: habit.name,
        type: habit.type,
        range: getHabitInsightDataRange(habit, viewDate, today),
      })),
    };
  }

  getHabitHistoryDataQuery({
    habitNames,
    viewDate,
  }: {
    habitNames: string[];
    viewDate: Day;
  }): HabitDataQuery {
    return {
      viewDate,
      habits: habitNames.map((name) => {
        const habit = this.userConfig.habits.find((habit) => habit.name === name);
        if (!habit) throw new ServiceError('not_found', `habit not configured: ${name}`);
        return { name: habit.name, type: habit.type, range: 'all' };
      }),
    };
  }

  applyConfigMutation(mutation: HabitConfigMutation): void {
    switch (mutation.kind) {
      case 'delete_select_value':
        deleteDailySelectValue(this.userId, mutation.habit, mutation.value);
        return;
      case 'rename_select_value':
        renameDailySelectValue(this.userId, mutation.habit, mutation.from, mutation.to);
        return;
      case 'rename_habit':
        renameHabitData(this.userId, mutation.from, mutation.to);
    }
  }

  applyHabitMutation(mutation: HabitMutation): boolean {
    const { habit, date } = mutation;
    switch (mutation.kind) {
      case 'set_select':
        setSelect(this.userId, habit, date, mutation.value);
        return true;
      case 'clear_select':
        deleteDailySelect(this.userId, habit, date);
        return true;
      case 'set_text':
        setHabitText(this.userId, habit, date, mutation.text);
        return true;
      case 'clear_text':
        deleteHabitText(this.userId, habit, date);
        return true;
      case 'add_total':
        addToTotal(this.userId, habit, date, mutation.total, mutation.createdAt);
        return true;
      case 'set_total':
        setTotal(this.userId, habit, date, mutation.total, mutation.createdAt);
        return true;
      case 'clear_total':
        deleteSummationEventsForDay(this.userId, habit, date);
        return true;
      case 'delete_event':
        return deleteSummationEvent(this.userId, habit, date, mutation.eventId);
    }
  }

  getDataExport() {
    return {
      dailySelects: getAllDailySelectsForUser(this.userId),
      summationEvents: getAllSummationEventsForUser(this.userId),
      texts: getAllHabitTextsForUser(this.userId),
    };
  }

  getDataMetadata(): HabitDataMetadata {
    const { firstDate, displayName: rawDisplayName } = getHabitHydrationMetadata(this.userId);
    const displayName = rawDisplayName?.trim();
    return {
      familiarName: displayName?.split(/\s+/)[0] || this.userId,
      firstRecordedDate: firstDate == null ? null : dayFromString(firstDate),
    };
  }

  // Returns one data object per requested habit, scoped to this user and the requested date range.
  // Each includes name/type, data bounds, and select values, texts, or summation events with daily totals.
  loadHydratedHabits(
    query: HabitDataQuery,
    { firstRecordedDate = null }: LoadHydratedHabitsOptions = {},
  ): HydratedHabitData[] {
    const { viewDate } = query;
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
    const textSelections = query.habits.filter((habit) => habit.type === 'text');
    const allSelectData = selectSelections.some((habit) => habit.range === 'all');
    const allSummationData = summationSelections.some((habit) => habit.range === 'all');
    const allTextData = textSelections.some((habit) => habit.range === 'all');
    const selectRows =
      selectSelections.length === 0
        ? []
        : allSelectData
          ? getAllDailySelectsForUser(this.userId)
          : hydrationRange
            ? getDailySelectSeriesForUser(this.userId, hydrationRange.start, hydrationRange.end)
            : [];
    const eventRows =
      summationSelections.length === 0
        ? []
        : allSummationData
          ? getAllSummationEventsForUser(this.userId)
          : hydrationRange
            ? getSummationEventSeriesForUser(this.userId, hydrationRange.start, hydrationRange.end)
            : [];
    const textRows =
      textSelections.length === 0
        ? []
        : allTextData
          ? getAllHabitTextsForUser(this.userId)
          : hydrationRange
            ? getHabitTextSeriesForUser(this.userId, hydrationRange.start, hydrationRange.end)
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

      if (selection.type === 'summation') {
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
      }

      const texts = textsFromSeries(
        textRows.filter(
          (row) =>
            row.habit === selection.name && (range === 'all' || dateIsInRange(row.date, range)),
        ),
      );
      const hydratedRange =
        range === 'all'
          ? rangeForDates(
              viewDate,
              texts.map((row) => row.date),
            )
          : range;
      return {
        name: selection.name,
        type: 'text',
        dataStart: hydratedRange.start,
        dataEnd: hydratedRange.end,
        texts,
      };
    });
  }
}
