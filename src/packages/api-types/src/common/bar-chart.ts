/** One column in a bar chart keyed by bucket id (e.g. localized hour label). */
export type BarGraphDatum = {
  /** `null` when nothing was recorded for this bucket (e.g. no logging that day in history). */
  value: number | null;
  /** Scale maximum; bar height is `value / top` (null values render as no fill). */
  top: number;
  /** Shown in the hover panel (e.g. localized time range for this bucket). */
  hoverLabel: string;
  /** When set, the track uses a negative/deficit style (e.g. no donor column to absorb into). */
  trackModifier?: 'negative';
};

/** Bar graph payload: keys are bucket ids (display order follows object insertion when rendered). */
export type BarGraphData = Record<string, BarGraphDatum>;
