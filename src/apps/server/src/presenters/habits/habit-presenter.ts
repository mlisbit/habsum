// Shared presentation behavior for hydrated, viewing-date-bound habit presenters.
import type { Day } from '@habsum/types/common/day';
import type { Habit } from '@habsum/types/common/habit';
import type { HydratedHabitData } from '../../types/habit.types.js';
import type { HabitDef } from '../../types/userConfig.js';
import type { HabitViewOptions } from './_private/utils.js';

export type HabitPresentationContext = HabitViewOptions & {
  includeWidgets?: boolean;
  includeEvents?: boolean;
  includeAbsentDaysInAverage?: boolean;
};

export type HabitHistoryEvent = {
  day: Day;
  habit: Habit;
};

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

  /** Returns the habit data displayed in the calendar view of the history route. */
  abstract getHistoryEvents(startDay: Day, endDay: Day): HabitHistoryEvent[];

  abstract present(): THabit;
}
