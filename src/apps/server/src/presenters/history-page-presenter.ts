// Presents hydrated habits as the history page API response.
import type { HistoryGetResponse } from '@habsum/types/api-responses/history-get';
import type { Day } from '@habsum/types/common/day';
import type { Habit } from '@habsum/types/common/habit';
import { dasherize } from '@habsum/utils/strings';
import type { HydratedHabitData } from '../types/habit.types.js';
import type { HabitDef, UserConfig } from '../types/userConfig.js';
import getMinDate from '../utils/get-min-date.js';
import isHabitRepeatedOnDate from '../utils/habits/is-habit-repeated-on-date.js';
import { HabitPresenter, type HabitPresentationContext } from './habits/habit-presenter.js';
import { SingleSelectHabitPresenter } from './habits/single-select-habit-presenter.js';
import { SummationHabitPresenter } from './habits/summation-habit-presenter.js';

export type HistoryPagePresenterInput = {
  user: string;
  userConfig: UserConfig;
  habitDefinitions: HabitDef[];
  hydratedHabits: HydratedHabitData[];
  viewingDate: Day;
  today: Day;
  requestedAt: Date;
};

export class HistoryPagePresenter {
  constructor(private readonly input: HistoryPagePresenterInput) {}

  present(): HistoryGetResponse {
    const { user, userConfig, hydratedHabits, habitDefinitions, viewingDate, requestedAt } =
      this.input;
    const historyStart = hydratedHabits.reduce(
      (start, hydratedHabit) => (hydratedHabit.dataStart < start ? hydratedHabit.dataStart : start),
      viewingDate,
    );
    const historyEnd = hydratedHabits.reduce(
      (end, hydratedHabit) => (hydratedHabit.dataEnd > end ? hydratedHabit.dataEnd : end),
      viewingDate,
    );
    const historyEvents = habitDefinitions.flatMap((definition) =>
      this.getHabitPresenter(definition, viewingDate).getHistoryEvents(historyStart, historyEnd),
    );
    const historyEventsByDay = new Map<Day, Map<string, Habit>>();
    for (const event of historyEvents) {
      const habitsByName = historyEventsByDay.get(event.day) ?? new Map<string, Habit>();
      habitsByName.set(event.habit.name, event.habit);
      historyEventsByDay.set(event.day, habitsByName);
    }
    const recordedDates = [...historyEventsByDay.keys()].sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );

    return {
      user,
      habits: Object.fromEntries(
        userConfig.habits.map((definition) => [dasherize(definition.name), definition.name]),
      ),
      firstDate: getMinDate(recordedDates),
      data: this.presentHabits(viewingDate),
      history: {
        user: recordedDates.map((day) => ({
          day,
          habits: this.presentHabits(day).map(
            (habit) => historyEventsByDay.get(day)?.get(habit.name) ?? habit,
          ),
        })),
      },
      serverTime: requestedAt.toISOString(),
    };
  }

  private presentHabits(viewingDate: Day): Habit[] {
    return this.input.habitDefinitions
      .filter((definition) => isHabitRepeatedOnDate(definition, viewingDate))
      .map((definition) => this.getHabitPresenter(definition, viewingDate).present());
  }

  private getHabitPresenter(definition: HabitDef, viewingDate: Day): HabitPresenter {
    const habitData = this.getHabitData(definition);
    const context: HabitPresentationContext = {
      viewingDate,
      today: this.input.today,
      includeEvents: true,
    };

    if (definition.type === 'single_select' && habitData.type === 'single_select') {
      return new SingleSelectHabitPresenter(definition, habitData, context);
    }
    if (definition.type === 'summation' && habitData.type === 'summation') {
      return new SummationHabitPresenter(definition, habitData, context);
    }
    throw new Error(`hydrated habit type mismatch for "${definition.name}"`);
  }

  private getHabitData(definition: HabitDef): HydratedHabitData {
    const habitData = this.input.hydratedHabits.find(
      (candidate) => candidate.name === definition.name,
    );
    if (!habitData) {
      throw new Error(`missing hydrated data for configured habit "${definition.name}"`);
    }
    return habitData;
  }
}
