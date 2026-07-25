import type { Day } from '@habsum/types/common/day';
import type { HydratedHabitData } from '../../../../../types/habit.types.js';
import type { HabitDef } from '../../../../../types/userConfig.js';
import { InsightsBuilder } from './insights-builder.js';

type HydratedSummationData = Extract<HydratedHabitData, { type: 'summation' }>;

export class SummationInsightsBuilder extends InsightsBuilder<
  HabitDef<'summation'>,
  HydratedSummationData,
  number
> {
  protected getHabitValue(date: Day): number | null {
    return this.hydratedHabit.totals.find((row) => row.date === date)?.total ?? null;
  }

  protected getRecordedDates(): Day[] {
    return this.hydratedHabit.totals.map((row) => row.date);
  }

  protected doesValueCountTowardStreak(value: number, eligible: ReadonlySet<string>): boolean {
    for (const option of eligible) {
      const goal = Number(option);
      if (Number.isFinite(goal) && value >= goal) return true;
    }
    return false;
  }
}
