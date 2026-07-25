import type { Day } from '@habsum/types/common/day';
import type { HydratedHabitData } from '../../../../../types/habit.types.js';
import type { HabitDef } from '../../../../../types/userConfig.js';
import { GraphBuilder } from './graph-builder.js';

type HydratedSummationData = Extract<HydratedHabitData, { type: 'summation' }>;

export class SummationGraphBuilder extends GraphBuilder<
  HabitDef<'summation'>,
  HydratedSummationData
> {
  protected getGoal(): number | null {
    return this.userRowConfig.settings.goal;
  }

  protected getValuesByDate(start: Day, end: Day): ReadonlyMap<Day, number> {
    return new Map(
      this.hydratedHabit.totals
        .filter((row) => row.date >= start && row.date <= end)
        .map((row) => [row.date, row.total]),
    );
  }
}
