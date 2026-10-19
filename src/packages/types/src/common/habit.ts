import type { BarGraphData } from './bar-chart.js';
import type { StreakGraphData } from './streak.js';
import type { SummationOptionInput, SummationOptions } from './summation-options.js';

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
  titleValue?: string;
  titleValueHoverText?: string;
  body: HabitWidgetBody[];
};

export type HabitWidgetInsight = {
  /** HTML-safe leading text rendered by the client. */
  header: string;
  /** HTML-safe supporting text rendered after the header. */
  description: string;
  /** Optional HTML-safe hover text rendered by the client. */
  hover?: string;
};

export type HabitWidgetInsightsBody = {
  kind: 'insights';
  insights: HabitWidgetInsight[];
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
  | HabitWidgetInsightsBody
  | HabitWidgetProgressBody
  | HabitWidgetBarGraphBody
  | HabitWidgetStreakGraphBody;

export type HabitWidget = HabitWidgetBase;

export type HabitRenderModelFields = {
  /** Title navigation destination. Omit to render the title without a link. */
  ctaUrl?: string;
  widgets?: HabitWidget[];
};

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

export type HabitType = 'summation' | 'single_select' | 'text';

export const HabitTheme = {
  CHECKBOX: 'checkbox',
} as const;

export type HabitTheme = (typeof HabitTheme)[keyof typeof HabitTheme];

export function isHabitTheme(value: unknown): value is HabitTheme {
  return value === HabitTheme.CHECKBOX;
}

type CompleteHabitTypeMap<T extends Record<HabitType, object>> = T;

export type HabitDetailsByType = CompleteHabitTypeMap<{
  single_select: {
    options: string[];
    theme?: HabitTheme;
    value: string | null;
  };
  summation: {
    goal: number | null;
    /** Logged total for the requested day; `null` means no row stored (distinct from explicit `0`). */
    total: number | null;
    /** Individual events for detail views. Omitted from list views. */
    events?: SummationEvent[];
    /** Manual amount entry plus quick-add increments from config (`summation_options`). */
    summationOptions?: SummationOptions;
  };
  text: {
    /** Plain text logged for the requested day; `null` means no row is stored. */
    text: string | null;
  };
}>;

/**
 * A habit API view model. Shared presentation fields stay at the root while
 * everything specific to a habit type is grouped under `details`.
 */
export type HabitRow<T extends HabitType = HabitType> = {
  [K in T]: HabitRenderModelFields & {
    name: string;
    type: K;
    details: HabitDetailsByType[K];
  };
}[T];

export type HabitRowSingleSelect = HabitRow<'single_select'>;
export type HabitRowSummation = HabitRow<'summation'>;
export type HabitRowText = HabitRow<'text'>;
export type Habit = HabitRow;
