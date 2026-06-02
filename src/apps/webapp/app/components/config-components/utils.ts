import { dayFromString, type Day } from '@habsum/types/common/day';
import type { HabitRowSingleSelect, HabitRowSummation } from '@habsum/types/common/habit';
import type { StreakGraphData } from '@habsum/types/common/streak';

export const PREVIEW_USER = '_preview';

export const PREVIEW_VIEW_DATE = dayFromString('2025-05-21');

export const PREVIEW_SINGLE_SELECT_STREAK: StreakGraphData = {
  streakText: '3 days',
  data: {},
};

export const PREVIEW_SUMMATION_HABIT: HabitRowSummation = {
  name: 'Water intake',
  type: 'summation',
  goal: 25,
  total: 6,
};

export const PREVIEW_SINGLE_SELECT_HABIT: HabitRowSingleSelect = {
  name: 'Mood',
  type: 'single_select',
  goal: null,
  options: ['Good', 'Okay', 'Bad'],
  value: null,
  streak: PREVIEW_SINGLE_SELECT_STREAK,
};

export const PREVIEW_CHECKBOX_HABIT: HabitRowSingleSelect = {
  name: 'Brush teeth',
  type: 'single_select',
  goal: null,
  options: ['yes', 'no'],
  theme: 'checkbox',
  value: null,
};

export async function previewNoop(): Promise<void> {}
