import type { Habit } from '@habsum/types/common/habit';
import type HabitRenderingInterface from './HabitRenderingInterface';
import SingleSelectHabitRenderer from './SingleSelectHabitRenderer';
import SummationHabitRenderer from './SummationHabitRenderer';
import TextHabitRenderer from './TextHabitRenderer';

export default function getHabitRendering(habit: Habit): HabitRenderingInterface {
  switch (habit.type) {
    case 'single_select':
      return new SingleSelectHabitRenderer(habit);
    case 'summation':
      return new SummationHabitRenderer(habit);
    case 'text':
      return new TextHabitRenderer(habit);
  }
}
