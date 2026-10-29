import type { Day } from '@habsum/types/common/day';
import type { HydratedHabitData } from '../../../../../types/habit.types.js';
import type { HabitDef } from '../../../../../types/userConfig.js';
import { HeatmapBuilder } from './heatmap-builder.js';

type HydratedSingleSelectData = Extract<HydratedHabitData, { type: 'single_select' }>;

export class SingleSelectHeatmapBuilder extends HeatmapBuilder<
  HabitDef<'single_select'>,
  HydratedSingleSelectData,
  string
> {
  protected getHabitValue(date: Day): string | null {
    return this.hydratedHabit.values.find((row) => row.date === date)?.value ?? null;
  }

  protected doesValueCountTowardStreak(value: string, eligible: ReadonlySet<string>): boolean {
    return eligible.has(value);
  }

  protected getFillValue(value: string, eligible: ReadonlySet<string>): number {
    const position =
      this.userRowConfig.settings.options.findIndex((option) => option.label === value) + 1;
    if (!eligible.has(value)) return position > 0 ? -position : -1;

    const eligiblePosition = [...eligible].indexOf(value);
    return eligiblePosition < 0 ? 1 : eligible.size - eligiblePosition;
  }
}
