import type { BarGraphData } from './bar-chart.js';

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
};

/** Parsed from YAML `summation_options` for summation habits. */
export type SummationOptions = {
  add: number;
  sub: number;
  /** True when config is `[sub, input, add]` — − uses `sub`, middle field sets + amount (defaults to `add`). */
  inputBetween?: boolean;
};

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
  /** Fixed +/− amounts from config (`summation_options`); omit for free-form count control. */
  summationOptions?: SummationOptions;
  history?: HabitHistory;
};

/**
 * A habit as returned from `GET /users/:user/habits` and normalized from
 * `PATCH` on the client.
 */
export type Habit = HabitRowSingleSelect | HabitRowSummation;
