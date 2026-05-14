export type StreakDatum = {
  /** Selected option for this calendar day, or `null` if nothing recorded. */
  value: string | null;
  /** `true` when `value` is in the habit’s configured `streak.options` (counts toward the streak). */
  include: boolean | null;
};

/** Daily streak window: `data` keys are `YYYY-MM-DD`, oldest → newest (see `MIN_STREAK_DAYS` on the server). */
export type StreakGraphData = {
  data: Record<string, StreakDatum>;
  /** Consecutive streak-eligible days ending on the API view date (`include`), may extend before `data`'s earliest day. */
  current: number;
};
