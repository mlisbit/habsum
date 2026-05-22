import type { BarGraphData } from './bar-chart.js';
import type { StreakGraphData } from './streak.js';

export type HabitHistory = {
  data: {
    user: {
      /** Daily buckets for `history.period` (e.g. 7 days for `1w`), keyed by `YYYY-MM-DD`. */
      graphData: BarGraphData;
    };
  };
};

/** A single-select row from `GET /users/:user/habits` */
export type HabitRowSingleSelect = {
  name: string;
  type: 'single_select';
  goal: number | null;
  options: string[];
  value: string | null;
  /** Present when YAML defines `streak.options`; `data` spans 14 periods ending on the API `date`, plus `streakText`. */
  streak?: StreakGraphData;
};

import type { SummationOptionInput, SummationOptions } from './summation-options.js';

export type { SummationOptionInput, SummationOptions };
export {
  SUMMATION_OPTION_INPUT,
  parseSummationOptionsFromRaw,
  yamlSummationEntriesToIncrements,
} from './summation-options.js';

/** Parsed from DB `created_at`: calendar day (`YYYY-MM-DD`) and time portion (e.g. `HH:MM:SS`). */
export type SummationEventCreatedAt = {
  day: string;
  time: string;
};

export type SummationEvent = {
  id: number;
  amount: number;
  createdAt: SummationEventCreatedAt;
};

/** A summation row from `GET /users/:user/habits` */
export type HabitRowSummation = {
  name: string;
  type: 'summation';
  goal: number | null;
  /** Logged total for the requested day; `null` means no row stored (distinct from explicit `0`). */
  total: number | null;
  /** Individual events for detail views. Omitted from list views. */
  events?: SummationEvent[];
  /** Manual amount entry plus quick-add increments from config (`summation_options`). */
  summationOptions?: SummationOptions;
  history?: HabitHistory;
};

/**
 * A habit as returned from `GET /users/:user/habits` and normalized from
 * `PATCH` on the client.
 */
export type Habit = HabitRowSingleSelect | HabitRowSummation;
