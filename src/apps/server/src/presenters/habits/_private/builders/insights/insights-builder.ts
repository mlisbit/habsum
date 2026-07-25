import type { Day } from '@habsum/types/common/day';
import { isDailyStreakFrequency, parseStreakFrequencyDays } from '@habsum/types/common/streak';
import type { HydratedHabitData } from '../../../../../types/habit.types.js';
import type { HabitDef } from '../../../../../types/userConfig.js';
import { getDayAfter, type HabitViewOptions } from '../../utils.js';
import { getMondayWeekStart } from '../utils.js';
import { getFirstRecordedDate } from './utils.js';

export type InsightsBuildResult = {
  currentStreak: number;
  longestStreak: {
    start: Day;
    end: Day;
    values: string[];
  } | null;
};

export type InsightsBuildOptions = {
  eligibleOptions: readonly string[];
  frequency?: string;
};

type StreakCalculationOptions = {
  date: Day;
  eligible: ReadonlySet<string>;
  daysPerWeek: number;
  omitEmptyViewPeriod: boolean;
};

type StreakRun = {
  length: number;
  start: Day;
  end: Day;
};

const MAX_STREAK_BACKTRACK_DAYS = 10 * 366;

export abstract class InsightsBuilder<
  TDefinition extends HabitDef,
  THydratedHabit extends HydratedHabitData,
  TValue extends string | number,
> {
  constructor(
    protected readonly hydratedHabit: THydratedHabit,
    protected readonly userRowConfig: TDefinition,
    protected readonly viewOptions: HabitViewOptions,
  ) {}

  build({ eligibleOptions, frequency }: InsightsBuildOptions): InsightsBuildResult {
    const calculationOptions: StreakCalculationOptions = {
      date: this.viewOptions.viewingDate,
      eligible: new Set(eligibleOptions),
      daysPerWeek: parseStreakFrequencyDays(frequency),
      omitEmptyViewPeriod: this.viewOptions.viewingDate === this.viewOptions.today,
    };
    const current = this.getCurrentStreakRun(calculationOptions);
    const longest = this.getLongestStreakRun(calculationOptions);

    return {
      currentStreak: current?.length ?? 0,
      longestStreak: longest
        ? {
            start: longest.start,
            end: longest.end,
            values: [...calculationOptions.eligible],
          }
        : null,
    };
  }

  protected abstract getHabitValue(date: Day): TValue | null;

  protected abstract getRecordedDates(): Day[];

  protected abstract doesValueCountTowardStreak(
    value: TValue,
    eligible: ReadonlySet<string>,
  ): boolean;

  private doesDayCountTowardStreak(date: Day, eligible: ReadonlySet<string>): boolean {
    const value = this.getHabitValue(date);
    return value == null ? false : this.doesValueCountTowardStreak(value, eligible);
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
    let eligibleDays = 0;
    const weekEnd = getDayAfter(weekStart, 6);
    for (let date = weekStart; date <= weekEnd; date = getDayAfter(date, 1)) {
      if (this.doesDayCountTowardStreak(date, eligible)) eligibleDays++;
    }
    return eligibleDays >= daysPerWeek;
  }

  private getCurrentStreakRun({
    date,
    eligible,
    daysPerWeek,
    omitEmptyViewPeriod,
  }: StreakCalculationOptions): StreakRun | null {
    const weekly = !isDailyStreakFrequency(daysPerWeek);
    const step = weekly ? 7 : 1;
    let periodStart = weekly ? getMondayWeekStart(date) : date;
    const periodQualifies = (start: Day) =>
      weekly
        ? this.doesWeekCountTowardStreak({ weekStart: start, daysPerWeek, eligible })
        : this.doesDayCountTowardStreak(start, eligible);

    const viewPeriodIsEmpty = weekly
      ? !periodQualifies(periodStart)
      : this.getHabitValue(periodStart) == null;
    if (omitEmptyViewPeriod && viewPeriodIsEmpty) {
      periodStart = getDayAfter(periodStart, -step);
    }

    const end = weekly ? getDayAfter(periodStart, 6) : periodStart;
    let length = 0;
    for (
      let steps = 0;
      steps < MAX_STREAK_BACKTRACK_DAYS / step;
      steps++, periodStart = getDayAfter(periodStart, -step)
    ) {
      if (!periodQualifies(periodStart)) break;
      length++;
    }
    if (length === 0) return null;

    return {
      length,
      start: getDayAfter(weekly ? getDayAfter(end, -6) : end, -(length - 1) * step),
      end,
    };
  }

  private getLongestStreakRun({
    date,
    eligible,
    daysPerWeek,
  }: StreakCalculationOptions): StreakRun | null {
    const firstDate = getFirstRecordedDate(this.getRecordedDates());
    if (firstDate == null || firstDate > date) return null;

    const weekly = !isDailyStreakFrequency(daysPerWeek);
    const step = weekly ? 7 : 1;
    const scanStart = weekly ? getMondayWeekStart(firstDate) : firstDate;
    const scanEnd = weekly ? getMondayWeekStart(date) : date;
    const periodQualifies = (start: Day) =>
      weekly
        ? this.doesWeekCountTowardStreak({ weekStart: start, daysPerWeek, eligible })
        : this.doesDayCountTowardStreak(start, eligible);

    let longest: StreakRun | null = null;
    let current: StreakRun | null = null;
    for (
      let periodStart = scanStart;
      periodStart <= scanEnd;
      periodStart = getDayAfter(periodStart, step)
    ) {
      if (!periodQualifies(periodStart)) {
        if (current && (!longest || current.length > longest.length)) longest = current;
        current = null;
        continue;
      }

      const periodEnd = weekly ? getDayAfter(periodStart, 6) : periodStart;
      current = this.getExtendedStreakRun(current, periodStart, periodEnd);
    }
    if (current && (!longest || current.length > longest.length)) longest = current;
    return longest;
  }

  private getExtendedStreakRun(run: StreakRun | null, start: Day, end: Day): StreakRun {
    return run ? { ...run, length: run.length + 1, end } : { length: 1, start, end };
  }
}
