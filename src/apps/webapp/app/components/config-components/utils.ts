import { dayFromString, type Day } from '@habsum/types/common/day';
import type { HabitRowSingleSelect, HabitRowSummation } from '@habsum/types/common/habit';
import type { StreakGraphData } from '@habsum/types/common/streak';

export const PREVIEW_USER = '_preview';

export const PREVIEW_VIEW_DATE = dayFromString('2025-05-21');

export const PREVIEW_SINGLE_SELECT_STREAK: StreakGraphData = {
  streakText: '3 days',
  data: {
    [dayFromString('2025-05-15')]: { value: '1', include: false },
    [dayFromString('2025-05-16')]: { value: '2', include: true },
    [dayFromString('2025-05-17')]: { value: '2', include: true },
    [dayFromString('2025-05-18')]: { value: null, include: null },
    [dayFromString('2025-05-19')]: { value: '3', include: true },
    [dayFromString('2025-05-20')]: { value: '2', include: true },
    [dayFromString('2025-05-21')]: { value: '2', include: true },
  },
};

export const PREVIEW_SUMMATION_HABIT: HabitRowSummation = {
  name: 'Summable habit',
  type: 'summation',
  goal: 25,
  total: 6,
};

export const PREVIEW_SINGLE_SELECT_HABIT: HabitRowSingleSelect = {
  name: 'Example habit',
  type: 'single_select',
  goal: null,
  options: ['1', '2', '3'],
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
