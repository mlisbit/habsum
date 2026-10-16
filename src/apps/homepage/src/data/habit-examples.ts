import type { Habit } from '@habsum/types/common/habit';

export const habitExamples = {
  summation: {
    name: 'Push ups',
    type: 'summation',
    details: {
      goal: 100,
      total: 25,
      summationOptions: { manualInput: true, increments: [5, 10] },
    },
  },
  singleSelect: {
    name: 'Reading',
    type: 'single_select',
    details: { options: ['None', 'A bit', 'A lot'], value: null },
  },
  checkbox: {
    name: 'Take Multivitamin',
    type: 'single_select',
    details: { options: ['yes', 'no'], theme: 'checkbox', value: null },
  },
  note: {
    name: 'Journal',
    type: 'text',
    details: { text: null },
  },
} satisfies Record<string, Habit>;
