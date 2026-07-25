import type { BarGraphData } from '@habsum/types/common/bar-chart';
import type { Day } from '@habsum/types/common/day';
import type { HydratedHabitData } from '../../../../../types/habit.types.js';
import type { HabitDef } from '../../../../../types/userConfig.js';
import { getDayAfter, getGraphRightPaddingDays, type HabitViewOptions } from '../../utils.js';
import { getBarGraphDayLabel, getPeriodDays } from './utils.js';

export abstract class GraphBuilder<
  TDefinition extends HabitDef,
  THydratedHabit extends HydratedHabitData,
> {
  constructor(
    protected readonly hydratedHabit: THydratedHabit,
    protected readonly userRowConfig: TDefinition,
    protected readonly viewOptions: HabitViewOptions,
  ) {}

  build(): BarGraphData {
    const period = this.userRowConfig.data_visualization?.bargraph?.period;
    if (!period) {
      throw new Error(`bar graph configuration missing for "${this.userRowConfig.name}"`);
    }

    const days = getPeriodDays(period) ?? 7;
    const { viewingDate, today } = this.viewOptions;
    const end = getDayAfter(viewingDate, getGraphRightPaddingDays(viewingDate, today));
    const start = getDayAfter(end, -(days - 1));
    const outlineViewDate = viewingDate !== today;
    const valuesByDate = this.getValuesByDate(start, end);
    const values = Array.from({ length: days }, (_, index) => {
      const date = getDayAfter(start, index);
      return valuesByDate.get(date) ?? null;
    });
    const goal = this.getGoal();
    const top = Math.max(
      1,
      ...values.filter((value): value is number => value != null),
      goal != null && goal > 0 ? goal : 0,
    );
    const graphData: BarGraphData = {};

    for (let index = 0; index < days; index++) {
      const date = getDayAfter(start, index);
      graphData[date] = {
        value: values[index]!,
        top,
        hoverLabel: getBarGraphDayLabel(date),
        ...(outlineViewDate && date === viewingDate ? { outline: true } : {}),
        ...(outlineViewDate && date > viewingDate ? { dimmed: true } : {}),
      };
    }
    return graphData;
  }

  protected abstract getGoal(): number | null;

  protected abstract getValuesByDate(start: Day, end: Day): ReadonlyMap<Day, number>;
}
