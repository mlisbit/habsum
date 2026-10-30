// User habit config shapes shared by config parsing, services, repositories, and presentation.
import type {
  HabitTheme,
  HabitType,
  SingleSelectOption,
  SummationOptions,
} from '@habsum/types/common/habit';

export type { HabitType };

export type HabitInsight = 'average' | 'current_streak' | 'longest_streak';

export type SummationHabitSettings = {
  goal: number | null;
  /** Fixed +/− steps from YAML `summation_options` (array) or legacy `{ sub, add }`. */
  summationOptions?: SummationOptions;
};

export type SingleSelectHabitSettings = {
  options: SingleSelectOption[];
  theme?: HabitTheme;
};

export type TextHabitSettings = {
  /** Weekdays that start a fresh note window. All seven preserves daily behavior. */
  reset: string[];
};

type CompleteHabitTypeMap<T extends Record<HabitType, object>> = T;

export type HabitSettingsByType = CompleteHabitTypeMap<{
  summation: SummationHabitSettings;
  single_select: SingleSelectHabitSettings;
  text: TextHabitSettings;
}>;

type SharedHabitDef = {
  name: string;
  repeat: string[];
  data_visualization?: {
    heatmap?: Record<string, never> | null;
    bargraph?: { period: string };
  };
  insights: HabitInsight[];
  /** Options shared by current- and longest-streak insights. */
  streak_options?: {
    /** Target streak days per week, e.g. `3d`. */
    frequency: string;
  };
};

/**
 * Internal configured-habit model. Shared behavior stays at the root while
 * `type` and `settings` remain correlated for every supported habit type.
 */
export type HabitDef<T extends HabitType = HabitType> = {
  [K in T]: SharedHabitDef & {
    type: K;
    settings: HabitSettingsByType[K];
  };
}[T];

export type ConfigData = {
  includeAbsentDaysInAverage: boolean;
  habits: HabitDef[];
};

export type UserConfig = ConfigData & {
  user: string;
};

export type RawHabitConfig = {
  type?: HabitType;
  goal?: number;
  options?: unknown;
  theme?: unknown;
  repeat?: unknown;
  reset?: unknown;
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
