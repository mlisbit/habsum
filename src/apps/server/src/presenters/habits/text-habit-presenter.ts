// Presents one hydrated text habit for a specific viewing date.
import type { Day } from '@habsum/types/common/day';
import type { HabitRowText } from '@habsum/types/common/habit';
import type { HydratedHabitData } from '../../types/habit.types.js';
import type { HabitDef } from '../../types/userConfig.js';
import {
  HabitPresenter,
  type HabitHistoryEvent,
  type HabitPresentationContext,
} from './habit-presenter.js';

type HydratedTextData = Extract<HydratedHabitData, { type: 'text' }>;

export class TextHabitPresenter extends HabitPresenter<
  HabitDef<'text'>,
  HydratedTextData,
  HabitRowText
> {
  constructor(
    definition: HabitDef<'text'>,
    habitData: HydratedTextData,
    context: HabitPresentationContext,
  ) {
    super(definition, habitData, context);
  }

  getHistoryEvents(startDay: Day, endDay: Day): HabitHistoryEvent[] {
    return this.habitData.texts
      .filter((row) => row.date >= startDay && row.date <= endDay)
      .map((row) => ({
        day: row.date,
        habit: this.getPresentedHabit(row.date),
      }));
  }

  present(): HabitRowText {
    return this.getPresentedHabit(this.context.viewingDate);
  }

  private getPresentedHabit(viewingDate: Day): HabitRowText {
    return {
      name: this.definition.name,
      type: 'text',
      details: {
        text: this.habitData.texts.find((row) => row.date === viewingDate)?.text ?? null,
      },
    };
  }
}
