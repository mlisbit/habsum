import type { HabitType } from '@habsum/types/common/habit';

export interface HabitAction {
  name: 'HabitAction';
  body: {
    habitType: HabitType;
  };
}
