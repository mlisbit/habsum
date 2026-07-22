// User habit config shapes shared by config parsing, services, repositories, and presentation.
import type { SummationOptions } from '@habsum/types/common/habit';

export type HabitType = 'summation' | 'single_select';
export type HabitInsight = 'average' | 'current_streak' | 'longest_streak';

export type HabitDef = {
  name: string;
  type: HabitType;
  goal: number | null;
  repeat: string[];
  options?: string[];
  theme?: string;
  /** Fixed +/− steps from YAML `summation_options` (array) or legacy `{ sub, add }`. */
  summationOptions?: SummationOptions;
  data_visualization?: {
    heatmap?: Record<string, never> | null;
    bargraph?: { period: string };
  };
  insights: HabitInsight[];
  /** Options shared by current- and longest-streak insights. */
  streak_options?: {
    /** Single-select values that count toward the streak. Summations use the goal. */
    options: string[];
    /** Target streak days per week, e.g. `3d`. */
    frequency: string;
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
  data_visualization?: unknown;
  insights?: unknown;
  streak_options?: unknown;
  /** Legacy schema, accepted as an alternate persisted representation. */
  history?: {
    period?: unknown;
    display?: unknown;
    displays?: unknown;
    show_average?: unknown;
  };
  /** Legacy schema, accepted as an alternate persisted representation. */
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
