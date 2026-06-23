import { dayFromString, type Day } from '@habsum/types/common/day';
import type {
  HabitRowSingleSelect,
  HabitRowSummation,
  HabitWidget,
} from '@habsum/types/common/habit';

export const PREVIEW_USER = '_preview';

export const PREVIEW_VIEW_DATE = dayFromString('2025-05-21');

export const PREVIEW_SINGLE_SELECT_STREAK: HabitWidget = {
  title: 'Streak',
  body: [{ kind: 'streakGraph', graph: { data: {} } }],
};

export const PREVIEW_SUMMATION_HABIT: HabitRowSummation = {
  name: 'Pages read',
  type: 'summation',
  summationOptions: {
    manualInput: true,
    increments: [25, 50],
  },
  goal: 25,
  total: 6,
};

export const PREVIEW_SINGLE_SELECT_HABIT: HabitRowSingleSelect = {
  name: 'Reading',
  type: 'single_select',
  goal: null,
  options: ['None', 'not much', 'a lot'],
  value: null,
};

export const PREVIEW_CHECKBOX_HABIT: HabitRowSingleSelect = {
  name: 'Reading',
  type: 'single_select',
  goal: null,
  options: ['yes', 'no'],
  theme: 'checkbox',
  value: null,
};

export async function previewNoop(): Promise<void> {}
