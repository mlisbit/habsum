import type { Day } from '@habsum/types/common/day';
import {
  isDailyStreakFrequency,
  parseStreakFrequencyDays,
  type StreakDatum,
  type StreakGraphData,
} from '@habsum/types/common/streak';
import type { HydratedHabitData } from '../../../../../types/habit.types.js';
import type { HabitDef } from '../../../../../types/userConfig.js';
import {
  getDayAfter,
  getDayRangeLabel,
  getGraphRightPaddingDays,
  type HabitViewOptions,
} from '../../utils.js';
import { getMondayWeekStart } from '../utils.js';
import { getStreakFills, getSundayWeekStart } from './utils.js';

export type HeatmapBuildOptions = {
  eligibleOptions: readonly string[];
  frequency?: string;
};

type StreakCalculationOptions = {
  date: Day;
  eligible: ReadonlySet<string>;
  daysPerWeek: number;
};

type StreakRangeOptions = {
  start: Day;
  end: Day;
  eligible: ReadonlySet<string>;
};

const WEEKDAY_ROW_COUNT = 7;
const DAILY_STREAK_WINDOW_DAYS = 53 * 7;
const WEEKLY_STREAK_WINDOW_WEEKS = 126;

export abstract class HeatmapBuilder<
  TDefinition extends HabitDef,
  THydratedHabit extends HydratedHabitData,
  TValue extends string | number,
> {
  constructor(
    protected readonly hydratedHabit: THydratedHabit,
    protected readonly userRowConfig: TDefinition,
    protected readonly viewOptions: HabitViewOptions,
  ) {}

  build({ eligibleOptions, frequency }: HeatmapBuildOptions): StreakGraphData {
    return this.getStreakGraphWindow({
      date: this.viewOptions.viewingDate,
      eligible: new Set(eligibleOptions),
      daysPerWeek: parseStreakFrequencyDays(frequency),
    });
  }

  protected abstract getHabitValue(date: Day): TValue | null;

  protected abstract doesValueCountTowardStreak(
    value: TValue,
    eligible: ReadonlySet<string>,
  ): boolean;

  protected abstract getFillValue(value: TValue, eligible: ReadonlySet<string>): number;

  private getStreakRangeCounts({ start, end, eligible }: StreakRangeOptions): {
    eligibleDays: number;
    loggedDays: number;
  } {
    let eligibleDays = 0;
    let loggedDays = 0;
    for (let date = start; date <= end; date = getDayAfter(date, 1)) {
      const value = this.getHabitValue(date);
      if (value == null) continue;
      loggedDays++;
      if (this.doesValueCountTowardStreak(value, eligible)) eligibleDays++;
    }
    return { eligibleDays, loggedDays };
  }

  private doesWeekCountTowardStreak({
    weekStart,
    daysPerWeek,
    eligible,
  }: {
    weekStart: Day;
    daysPerWeek: number;
    eligible: ReadonlySet<string>;
  }): boolean {
    const { eligibleDays } = this.getStreakRangeCounts({
      start: weekStart,
      end: getDayAfter(weekStart, 6),
      eligible,
    });
    return eligibleDays >= daysPerWeek;
  }

  private getStreakGraphWindow({
    date,
    eligible,
    daysPerWeek,
  }: StreakCalculationOptions): StreakGraphData {
    const weekly = !isDailyStreakFrequency(daysPerWeek);
    const outlineViewDate = date !== this.viewOptions.today;
    const rightPaddingDays = getGraphRightPaddingDays(date, this.viewOptions.today);
    const data: StreakDatum[][] = [];
    const rawFillValues: Array<number | undefined> = [];

    if (weekly) {
      const viewWeekStart = getMondayWeekStart(date);
      const endWeekStart = getMondayWeekStart(getDayAfter(date, rightPaddingDays));
      for (let index = WEEKLY_STREAK_WINDOW_WEEKS - 1; index >= 0; index--) {
        const weekStart = getDayAfter(endWeekStart, -index * 7);
        const weekEnd = getDayAfter(weekStart, 6);
        const { eligibleDays, loggedDays } = this.getStreakRangeCounts({
          start: weekStart,
          end: weekEnd,
          eligible,
        });
        rawFillValues.push(loggedDays === 0 ? undefined : eligibleDays === 0 ? -1 : eligibleDays);
        this.appendStreakDatum(
          data,
          {
            date: weekStart,
            value: eligibleDays > 0 ? `${eligibleDays}/${daysPerWeek}` : null,
            label: getDayRangeLabel(weekStart, weekEnd),
            ...(outlineViewDate && weekStart === viewWeekStart ? { outline: true } : {}),
            ...(outlineViewDate && weekStart > viewWeekStart ? { dimmed: true } : {}),
          },
          true,
        );
      }
    } else {
      const end = getDayAfter(date, rightPaddingDays);
      const start = getDayAfter(
        getSundayWeekStart(end),
        -(DAILY_STREAK_WINDOW_DAYS - WEEKDAY_ROW_COUNT),
      );
      for (let index = 0; index < DAILY_STREAK_WINDOW_DAYS; index++) {
        const graphDate = getDayAfter(start, index);
        if (graphDate > end) continue;
        const value = this.getHabitValue(graphDate);
        rawFillValues.push(value == null ? undefined : this.getFillValue(value, eligible));
        this.appendStreakDatum(
          data,
          {
            date: graphDate,
            value: value == null ? null : String(value),
            ...(outlineViewDate && graphDate === date ? { outline: true } : {}),
            ...(graphDate > date ? { dimmed: true } : {}),
          },
          false,
        );
      }
    }

    const fills = getStreakFills(rawFillValues);
    data.flat().forEach((datum, index) => {
      const fill = fills[index];
      if (fill !== undefined) datum.fill = fill;
    });
    return { data };
  }

  private appendStreakDatum(columns: StreakDatum[][], datum: StreakDatum, weekly: boolean): void {
    if (weekly) {
      columns.push([datum]);
      return;
    }

    const currentColumn = columns.at(-1);
    const currentWeekStart = currentColumn?.[0] ? getSundayWeekStart(currentColumn[0].date) : null;
    const datumWeekStart = getSundayWeekStart(datum.date);
    if (!currentColumn || currentWeekStart !== datumWeekStart) {
      columns.push([datum]);
      return;
    }
    currentColumn.push(datum);
  }
}
