// User habit config shapes shared by config parsing, services, repositories, and presentation.
import type { SummationOptions } from '@habsum/types/common/habit';

export type HabitType = 'summation' | 'single_select';

export type HabitDef = {
  name: string;
  type: HabitType;
  goal: number | null;
  repeat: string[];
  options?: string[];
  theme?: string;
  /** Fixed +/− steps from YAML `summation_options` (array) or legacy `{ sub, add }`. */
  summationOptions?: SummationOptions;
  history?: {
    period: string;
    displays: Array<'heatmap' | 'weekly_history'>;
    show_average?: boolean;
  };
  /** Subset of selectable values or summation totals that count toward the streak. */
  streak?: {
    options: string[];
    /** Target streak days per week, e.g. `3d/1w`. Omitted when daily (`7d/1w`). */
    frequency?: string;
    /** False when only the longest-streak insight should be returned. */
    show_current?: boolean;
    /** When true, API includes `longestStreak` on streak responses. */
    show_longest?: boolean;
  };
};

export type UserConfig = {
  user: string;
  includeAbsentDaysInAverage: boolean;
  habits: HabitDef[];
};

export type RawHabitConfig = {
  type?: HabitType;
  goal?: number;
  options?: string[];
  theme?: unknown;
  repeat?: unknown;
  /** `[subtract, add]` or `{ sub, add }` / `{ add, sub }` */
  summation_options?: unknown;
  summationOptions?: unknown;
  history?: {
    period?: unknown;
    display?: unknown;
    displays?: unknown;
    show_average?: unknown;
  };
  streak?: unknown;
};

export type RawUserConfig = {
  include_absent_days_in_average?: unknown;
  habits?: Record<string, RawHabitConfig>;
};

export const HABIT_REPEAT_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
