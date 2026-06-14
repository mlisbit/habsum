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

export type HabitWidgetBase = {
  title: string;
  titleValue: string;
  body: HabitWidgetBody[];
};

export type HabitWidgetPill = {
  /** HTML-safe display text rendered by the client. */
  label: string;
  /** Optional HTML-safe hover text rendered by the client. */
  hover?: string;
};

export type HabitWidgetPillsBody = {
  kind: 'pills';
  pills: HabitWidgetPill[];
};

export type HabitWidgetProgressBody = {
  kind: 'progress';
  value: number | null;
  max: number;
};

export type HabitWidgetBarGraphLine = {
  value: number;
  label: string;
};

export type HabitWidgetBarGraphBody = {
  kind: 'barGraph';
  data: BarGraphData;
  lines?: HabitWidgetBarGraphLine[];
};

export type HabitWidgetStreakGraphBody = {
  kind: 'streakGraph';
  graph: StreakGraphData;
};

export type HabitWidgetBody =
  | HabitWidgetPillsBody
  | HabitWidgetProgressBody
  | HabitWidgetBarGraphBody
  | HabitWidgetStreakGraphBody;

export type HabitWidget = HabitWidgetBase;

export type HabitRenderModelFields = {
  widgets?: HabitWidget[];
};

/** A single-select row from `GET /users/:user/habits` */
export type HabitRowSingleSelect = HabitRenderModelFields & {
  name: string;
  type: 'single_select';
  goal: number | null;
  options: string[];
  theme?: string;
  value: string | null;
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
export type HabitRowSummation = HabitRenderModelFields & {
  name: string;
  type: 'summation';
  goal: number | null;
  /** Logged total for the requested day; `null` means no row stored (distinct from explicit `0`). */
  total: number | null;
  /** Individual events for detail views. Omitted from list views. */
  events?: SummationEvent[];
  /** Manual amount entry plus quick-add increments from config (`summation_options`). */
  summationOptions?: SummationOptions;
};

/**
 * A habit as returned from `GET /users/:user/habits` and normalized from
 * `PATCH` on the client.
 */
export type Habit = HabitRowSingleSelect | HabitRowSummation;
