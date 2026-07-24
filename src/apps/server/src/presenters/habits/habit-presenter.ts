// Shared presentation behavior for hydrated, viewing-date-bound habit presenters.
import { dayFromString, type Day } from '@habsum/types/common/day';
import type {
  Habit,
  HabitHistory,
  HabitRowSingleSelect,
  HabitRowSummation,
  HabitWidget,
  HabitWidgetInsight,
} from '@habsum/types/common/habit';
import {
  isDailyStreakFrequency,
  parseStreakFrequencyDays,
  type LongestStreak,
  type StreakDatum,
  type StreakFill,
  type StreakGraphData,
} from '@habsum/types/common/streak';
import { fromDateKey, toDateKey } from '@habsum/utils/date';
import type { HydratedHabitData } from '../../types/habit.types.js';
import type { HabitDef } from '../../types/userConfig.js';

export type HabitPresentationContext = {
  viewingDate: Day;
  today: Day;
  includeWidgets?: boolean;
  includeEvents?: boolean;
  includeAbsentDaysInAverage?: boolean;
};

export type StreakGraphWithText = StreakGraphData & {
  currentText: string;
};

export type HabitHistoryEvent =
  | {
      day: Day;
      habit: HabitRowSingleSelect;
    }
  | {
      day: Day;
      habit: HabitRowSummation;
    };

type StreakGraphOptions = {
  eligibleOptions: readonly string[];
  frequency?: string;
  includeLongest?: boolean;
  selectableValues?: readonly string[];
};

type StreakCalculationOptions = {
  date: Day;
  eligible: ReadonlySet<string>;
  daysPerWeek: number;
  omitEmptyViewPeriod: boolean;
};

type StreakWindowOptions = StreakCalculationOptions & {
  selectableValueMap: ReadonlyMap<string, number>;
};

type StreakRangeOptions = {
  start: Day;
  end: Day;
  eligible: ReadonlySet<string>;
};

type StreakRun = {
  length: number;
  start: Day;
  end: Day;
};

type HistoryWidgetOptions = {
  history?: HabitHistory | null;
  goal?: number | null;
  heatmap?: StreakGraphWithText | null;
  streak?: StreakGraphWithText | null;
  includeCurrentStreak?: boolean;
  includeBarGraph?: boolean;
};

const WEEKDAY_ROW_COUNT = 7;
const DAILY_STREAK_WINDOW_DAYS = 53 * 7;
const WEEKLY_STREAK_WINDOW_WEEKS = 126;
const MAX_STREAK_BACKTRACK_DAYS = 10 * 366;

export abstract class HabitPresenter<
  TDefinition extends HabitDef = HabitDef,
  THabitData extends HydratedHabitData = HydratedHabitData,
  THabit extends Habit = Habit,
> {
  constructor(
    protected readonly definition: TDefinition,
    protected readonly habitData: THabitData,
    protected readonly context: HabitPresentationContext,
  ) {
    if (definition.name !== habitData.name || definition.type !== habitData.type) {
      throw new Error(`hydrated habit type mismatch for "${definition.name}"`);
    }
  }

  abstract getRecordedDates(): Day[];

  /** Returns the habit data displayed in the calendar view of the history route. */
  abstract getHistoryEvents(startDay: Day, endDay: Day): HabitHistoryEvent[];

  abstract present(): THabit;

  protected getHistoryWidget({
    history = null,
    goal = null,
    heatmap = null,
    streak = null,
    includeCurrentStreak = true,
    includeBarGraph = true,
  }: HistoryWidgetOptions): HabitWidget {
    const body: HabitWidget['body'] = [];
    const insights = this.getAvailableInsights([
      includeCurrentStreak ? this.getCurrentStreakInsight(streak) : null,
      this.getLongestStreakInsight(streak),
      this.getWeeklyAverageInsight(history),
    ]);

    if (history && includeBarGraph) {
      body.push({
        kind: 'barGraph',
        data: history.data.user.graphData,
        ...(goal != null && goal > 0
          ? { lines: [{ value: goal, label: `Daily goal: ${goal}` }] }
          : {}),
      });
    }
    if (heatmap) body.push({ kind: 'streakGraph', graph: this.getPublicStreakGraph(heatmap) });
    if (insights.length > 0) body.push({ kind: 'insights', insights });
    return { title: 'History', body };
  }

  protected getStreakGraph({
    eligibleOptions,
    frequency,
    includeLongest = false,
    selectableValues = eligibleOptions,
  }: StreakGraphOptions): StreakGraphWithText {
    const date = this.context.viewingDate;
    const eligible = new Set(eligibleOptions);
    const daysPerWeek = parseStreakFrequencyDays(frequency);
    const omitEmptyViewPeriod = date === this.context.today;
    const calculationOptions: StreakCalculationOptions = {
      date,
      eligible,
      daysPerWeek,
      omitEmptyViewPeriod,
    };
    const graph = this.getStreakGraphWindow({
      ...calculationOptions,
      selectableValueMap:
        this.habitData.type === 'single_select'
          ? this.getSelectableValueMap(selectableValues, eligibleOptions)
          : new Map(),
    });

    if (!includeLongest) return graph;
    return this.getStreakGraphWithLongest(graph, calculationOptions);
  }

  private getHabitValue(date: Day): string | number | null {
    if (this.habitData.type === 'single_select') {
      return this.habitData.values.find((row) => row.date === date)?.value ?? null;
    }
    return this.habitData.totals.find((row) => row.date === date)?.total ?? null;
  }

  private doesDayCountTowardStreak(date: Day, eligible: ReadonlySet<string>): boolean {
    const value = this.getHabitValue(date);
    if (value == null) return false;
    if (this.habitData.type === 'single_select') return eligible.has(value as string);

    for (const option of eligible) {
      const goal = Number(option);
      if (Number.isFinite(goal) && (value as number) >= goal) return true;
    }
    return false;
  }

  private getDailyFillValue(
    date: Day,
    {
      eligible,
      selectableValueMap,
    }: {
      eligible: ReadonlySet<string>;
      selectableValueMap: ReadonlyMap<string, number>;
    },
  ): number | undefined {
    const value = this.getHabitValue(date);
    if (value == null) return undefined;
    if (this.habitData.type === 'summation') return value as number;

    const selected = value as string;
    return selectableValueMap.get(selected) ?? (eligible.has(selected) ? 1 : -1);
  }

  private getStreakRangeCounts({ start, end, eligible }: StreakRangeOptions): {
    eligibleDays: number;
    loggedDays: number;
  } {
    let eligibleDays = 0;
    let loggedDays = 0;
    for (let date = start; date <= end; date = this.addDays(date, 1)) {
      if (this.getHabitValue(date) != null) loggedDays++;
      if (this.doesDayCountTowardStreak(date, eligible)) eligibleDays++;
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
      end: this.addDays(weekStart, 6),
      eligible,
    });
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
    let periodStart = weekly ? this.getMondayWeekStart(date) : date;
    const periodQualifies = (start: Day) =>
      weekly
        ? this.doesWeekCountTowardStreak({ weekStart: start, daysPerWeek, eligible })
        : this.doesDayCountTowardStreak(start, eligible);

    const viewPeriodIsEmpty = weekly
      ? !periodQualifies(periodStart)
      : this.getHabitValue(periodStart) == null;
    if (omitEmptyViewPeriod && viewPeriodIsEmpty) {
      periodStart = this.addDays(periodStart, -step);
    }

    const end = weekly ? this.addDays(periodStart, 6) : periodStart;
    let length = 0;
    for (
      let steps = 0;
      steps < MAX_STREAK_BACKTRACK_DAYS / step;
      steps++, periodStart = this.addDays(periodStart, -step)
    ) {
      if (!periodQualifies(periodStart)) break;
      length++;
    }
    if (length === 0) return null;

    return {
      length,
      start: this.addDays(weekly ? this.addDays(end, -6) : end, -(length - 1) * step),
      end,
    };
  }

  private getLongestStreakRun({
    date,
    eligible,
    daysPerWeek,
  }: StreakCalculationOptions): StreakRun | null {
    const firstDate = this.getFirstRecordedDate();
    if (firstDate == null || firstDate > date) return null;

    const weekly = !isDailyStreakFrequency(daysPerWeek);
    const step = weekly ? 7 : 1;
    const scanStart = weekly ? this.getMondayWeekStart(firstDate) : firstDate;
    const scanEnd = weekly ? this.getMondayWeekStart(date) : date;
    const periodQualifies = (start: Day) =>
      weekly
        ? this.doesWeekCountTowardStreak({ weekStart: start, daysPerWeek, eligible })
        : this.doesDayCountTowardStreak(start, eligible);

    let longest: StreakRun | null = null;
    let current: StreakRun | null = null;
    for (
      let periodStart = scanStart;
      periodStart <= scanEnd;
      periodStart = this.addDays(periodStart, step)
    ) {
      if (!periodQualifies(periodStart)) {
        if (current && (!longest || current.length > longest.length)) longest = current;
        current = null;
        continue;
      }

      const periodEnd = weekly ? this.addDays(periodStart, 6) : periodStart;
      current = this.getExtendedStreakRun(current, periodStart, periodEnd);
    }
    if (current && (!longest || current.length > longest.length)) longest = current;
    return longest;
  }

  private getFirstRecordedDate(): Day | null {
    return this.getRecordedDates().reduce<Day | null>(
      (earliest, date) => (earliest == null || date < earliest ? date : earliest),
      null,
    );
  }

  private getStreakGraphWindow({
    date,
    eligible,
    daysPerWeek,
    omitEmptyViewPeriod,
    selectableValueMap,
  }: StreakWindowOptions): StreakGraphWithText {
    const weekly = !isDailyStreakFrequency(daysPerWeek);
    const outlineViewDate = date !== this.context.today;
    const rightPaddingDays = this.getGraphRightPaddingDays(date);
    const data: StreakDatum[][] = [];
    const rawFillValues: Array<number | undefined> = [];

    if (weekly) {
      const viewWeekStart = this.getMondayWeekStart(date);
      const endWeekStart = this.getMondayWeekStart(this.addDays(date, rightPaddingDays));
      for (let index = WEEKLY_STREAK_WINDOW_WEEKS - 1; index >= 0; index--) {
        const weekStart = this.addDays(endWeekStart, -index * 7);
        const weekEnd = this.addDays(weekStart, 6);
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
            label: this.getDayRangeLabel(weekStart, weekEnd),
            ...(outlineViewDate && weekStart === viewWeekStart ? { outline: true } : {}),
            ...(outlineViewDate && weekStart > viewWeekStart ? { dimmed: true } : {}),
          },
          true,
        );
      }
    } else {
      const end = this.addDays(date, rightPaddingDays);
      const start = this.addDays(
        this.getSundayWeekStart(end),
        -(DAILY_STREAK_WINDOW_DAYS - WEEKDAY_ROW_COUNT),
      );
      for (let index = 0; index < DAILY_STREAK_WINDOW_DAYS; index++) {
        const graphDate = this.addDays(start, index);
        if (graphDate > end) continue;
        rawFillValues.push(this.getDailyFillValue(graphDate, { eligible, selectableValueMap }));
        const value = this.getHabitValue(graphDate);
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

    this.setStreakFillDistribution(data, rawFillValues);
    const current = this.getCurrentStreakRun({
      date,
      eligible,
      daysPerWeek,
      omitEmptyViewPeriod,
    });
    return {
      data,
      currentText: this.getStreakText(current?.length ?? 0, weekly),
    };
  }

  private getStreakGraphWithLongest(
    graph: StreakGraphWithText,
    options: StreakCalculationOptions,
  ): StreakGraphWithText {
    const run = this.getLongestStreakRun(options);
    if (!run) return graph;

    const current = this.getCurrentStreakRun(options);
    const weekly = !isDailyStreakFrequency(options.daysPerWeek);
    const eligibleOptions = [...options.eligible].join(', ');
    const qualifier = eligibleOptions
      ? weekly
        ? `${options.daysPerWeek}+ per week: ${eligibleOptions}`
        : eligibleOptions
      : '';
    const text = this.getStreakText(run.length, weekly);
    const isCurrent =
      current != null &&
      current.length === run.length &&
      current.start === run.start &&
      current.end === run.end;
    const longestStreak: LongestStreak = {
      label: 'Longest streak',
      text: isCurrent ? `${text} (current)` : text,
      range: this.getDayRangeLabel(run.start, run.end),
      ...(qualifier ? { qualifier } : {}),
    };
    return { ...graph, longestStreak };
  }

  private getSelectableValueMap(
    values: readonly string[],
    eligibleValues: readonly string[],
  ): ReadonlyMap<string, number> {
    const eligible = eligibleValues.length > 0 ? new Set(eligibleValues) : null;
    const positiveValueByOption = new Map(
      eligibleValues.map((value, index) => [value, eligibleValues.length - index]),
    );
    return new Map(
      values.map((value, index) => {
        const position = index + 1;
        if (eligible == null) return [value, position];
        return [value, eligible.has(value) ? (positiveValueByOption.get(value) ?? 1) : -position];
      }),
    );
  }

  private setStreakFillDistribution(
    columns: StreakDatum[][],
    values: ReadonlyArray<number | undefined>,
  ): void {
    const defined = values.filter((value): value is number => value !== undefined);
    const maxPositive = Math.max(0, ...defined.filter((value) => value > 0));
    const maxNegativeMagnitude = Math.max(
      0,
      ...defined.filter((value) => value < 0).map((value) => Math.abs(value)),
    );
    columns.flat().forEach((datum, index) => {
      const value = values[index];
      if (value == null) return;
      if (value === 0) datum.fill = 0;
      else if (value > 0) {
        datum.fill = Math.max(1, Math.round((value / maxPositive) * 5)) as StreakFill;
      } else {
        datum.fill = -Math.max(
          1,
          Math.round((Math.abs(value) / maxNegativeMagnitude) * 5),
        ) as StreakFill;
      }
    });
  }

  private appendStreakDatum(columns: StreakDatum[][], datum: StreakDatum, weekly: boolean): void {
    if (weekly) {
      columns.push([datum]);
      return;
    }

    const currentColumn = columns.at(-1);
    const currentWeekStart = currentColumn?.[0]
      ? this.getSundayWeekStart(currentColumn[0].date)
      : null;
    const datumWeekStart = this.getSundayWeekStart(datum.date);
    if (!currentColumn || currentWeekStart !== datumWeekStart) {
      columns.push([datum]);
      return;
    }
    currentColumn.push(datum);
  }

  private getExtendedStreakRun(run: StreakRun | null, start: Day, end: Day): StreakRun {
    return run ? { ...run, length: run.length + 1, end } : { length: 1, start, end };
  }

  private getCurrentStreakInsight(streak: StreakGraphWithText | null): HabitWidgetInsight | null {
    if (!streak) return null;
    return { header: 'Current streak', description: streak.currentText };
  }

  private getLongestStreakInsight(streak: StreakGraphWithText | null): HabitWidgetInsight | null {
    if (!streak?.longestStreak) return null;
    return {
      header: streak.longestStreak.label,
      description: streak.longestStreak.text,
      hover: [
        streak.longestStreak.range,
        streak.longestStreak.qualifier ? `Includes ${streak.longestStreak.qualifier}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  private getWeeklyAverageInsight(history: HabitHistory | null): HabitWidgetInsight | null {
    if (!history) return null;
    const graphData = history.data.user.graphData;
    const allValues = Object.values(graphData).map((datum) => datum.value);
    const values = this.context.includeAbsentDaysInAverage
      ? allValues
      : allValues.filter((value): value is number => value != null);
    const average =
      values.length === 0
        ? null
        : Math.round(values.reduce<number>((sum, value) => sum + (value ?? 0), 0) / values.length);
    const entries = Object.entries(graphData);
    const first = entries.at(0)?.[0];
    const outlined = entries.find(([, datum]) => datum.outline === true)?.[0];
    const end = outlined == null ? 'today' : this.getShortDate(dayFromString(outlined));
    return {
      header: 'Average/day',
      description: average == null ? '—' : String(average),
      hover: first == null ? 'today' : `${this.getShortDate(dayFromString(first))} to ${end}`,
    };
  }

  private getAvailableInsights(insights: Array<HabitWidgetInsight | null>): HabitWidgetInsight[] {
    return insights.filter((insight): insight is HabitWidgetInsight => insight != null);
  }

  private getPublicStreakGraph(streak: StreakGraphWithText): StreakGraphData {
    const { currentText: _omit, ...graph } = streak;
    return graph;
  }

  private getGraphRightPaddingDays(date: Day): number {
    if (date >= this.context.today) return 0;
    const difference = Math.round(
      (fromDateKey(this.context.today, 0).getTime() - fromDateKey(date, 0).getTime()) / 86_400_000,
    );
    return Number.isFinite(difference) && difference > 0 ? Math.min(3, difference) : 0;
  }

  private addDays(date: Day, delta: number): Day {
    const next = new Date(fromDateKey(date, 0).getTime() + delta * 86_400_000);
    return toDateKey(next, 0);
  }

  private getSundayWeekStart(date: Day): Day {
    return this.addDays(date, -fromDateKey(date, 0).getUTCDay());
  }

  private getMondayWeekStart(date: Day): Day {
    const weekday = fromDateKey(date, 0).getUTCDay();
    return this.addDays(date, -((weekday + 6) % 7));
  }

  private getDayRangeLabel(start: Day, end: Day): string {
    return `${this.getHistoryDayLabel(start)} – ${this.getHistoryDayLabel(end)}`;
  }

  private getHistoryDayLabel(date: Day): string {
    const [yearText, monthText, dayText] = date.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return date;
    const parsed = new Date(year, month - 1, day);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  private getShortDate(date: Day): string {
    const [yearText, monthText, dayText] = date.split('-');
    const parsed = new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  private getStreakText(current: number, weekly: boolean): string {
    if (weekly) return current === 1 ? '1 week' : `${current} weeks`;
    return current === 1 ? '1 day' : `${current} days`;
  }
}
