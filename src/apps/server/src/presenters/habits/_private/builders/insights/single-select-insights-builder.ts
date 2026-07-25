import type { Day } from '@habsum/types/common/day';
import type { HydratedHabitData } from '../../../../../types/habit.types.js';
import type { HabitDef } from '../../../../../types/userConfig.js';
import { InsightsBuilder } from './insights-builder.js';

type HydratedSingleSelectData = Extract<HydratedHabitData, { type: 'single_select' }>;

export class SingleSelectInsightsBuilder extends InsightsBuilder<
  HabitDef<'single_select'>,
  HydratedSingleSelectData,
  string
> {
  protected getHabitValue(date: Day): string | null {
    return this.hydratedHabit.values.find((row) => row.date === date)?.value ?? null;
  }

  protected getRecordedDates(): Day[] {
    return this.hydratedHabit.values.map((row) => row.date);
  }

  protected doesValueCountTowardStreak(value: string, eligible: ReadonlySet<string>): boolean {
    return eligible.has(value);
  }
}
