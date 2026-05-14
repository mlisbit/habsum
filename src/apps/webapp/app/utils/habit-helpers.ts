import type { Habit, HabitRowSummation } from '@habsum/types/common/habit';

/** Habits that have numeric goals weigh this much vs “other” habits in the aggregate bar fraction. */
const GOAL_WEIGHT = 4;

/** Habits without (or with neutral) goals weigh one unit when averaging completion for the bar. */
const OTHER_WEIGHT = 1;

/** Denominator for `.total`; `done / PROGRESS_TOTAL_SCALE` equals weighted-average completion [0–1]. */
export const PROGRESS_TOTAL_SCALE = 10_000;

export type DayProgressSlice = {
  /** Progress toward completing this slice (numerator-like). */
  done: number;
  /** Capacity for this slice (denominator-like). */
  total: number;
};

export type DayProgressBreakdown = {
  /** Summation habits with a positive goal: progress is min(total, goal) vs goal per habit. */
  goals: DayProgressSlice;
  /** Habits without a goal: binary completion counts for captions (“N other habits”). */
  other: DayProgressSlice;
  /**
   * Bar fill: numerator ÷ denominator = weighted-average completion (**weight 4** with numeric goals,
   * **weight 1** for habits without usable goals). **`done`** is the numerator, **`total`** the scale.
   */
  total: DayProgressSlice;
};

/**
 * True when the habit has no logged data for the day: single-select has no choice,
 * summation has no row (`total` is `null`; explicit `0` counts as data).
 */
export function isEmpty(habit: Habit): boolean {
  if (habit.type === 'single_select') {
    return habit.value == null || habit.value === '';
  }
  return habit.total == null;
}

function isSummation(h: Habit): h is HabitRowSummation {
  return h.type === 'summation';
}

function hasPositiveGoal(h: Habit): h is HabitRowSummation & { goal: number } {
  return isSummation(h) && h.goal != null && h.goal > 0;
}

function otherHabitCompleted(h: Habit): boolean {
  if (h.type === 'single_select') return h.value != null;
  if (h.goal != null && h.goal > 0) return false;
  return (h.total ?? 0) > 0;
}

/** 0 = none, 1 = fully done for today (toward goal or binary “has data”). */
function habitCompletionFraction(h: Habit): number {
  if (hasPositiveGoal(h)) {
    const t = h.total ?? 0;
    return Math.min(Math.max(t / h.goal, 0), 1);
  }
  return otherHabitCompleted(h) ? 1 : 0;
}

/**
 * Aggregates logged progress for copy and the top bar.
 *
 * The bar‑level fraction is **Σ (weightᵢ × completionᵢ) ÷ Σ weightᵢ**, with higher weight on habits that
 * have goals so completing only lighter “other” habits moves the needle less than the simple mean.
 */
export function getProgress(habits: readonly Habit[]): DayProgressBreakdown {
  const n = habits.length;
  if (n === 0) {
    return {
      goals: { done: 0, total: 0 },
      other: { done: 0, total: 0 },
      total: { done: 0, total: 0 },
    };
  }

  let goalsCurrent = 0;
  let goalsTotal = 0;
  let otherCurrent = 0;
  let otherTotal = 0;

  let weightedSum = 0;
  let weightTotal = 0;

  for (const h of habits) {
    const w = hasPositiveGoal(h) ? GOAL_WEIGHT : OTHER_WEIGHT;
    weightedSum += w * habitCompletionFraction(h);
    weightTotal += w;

    if (hasPositiveGoal(h)) {
      goalsTotal += h.goal;
      goalsCurrent += Math.min(h.total ?? 0, h.goal);
    } else {
      otherTotal += 1;
      if (otherHabitCompleted(h)) otherCurrent += 1;
    }
  }

  const weightedCompletion = weightTotal > 0 ? weightedSum / weightTotal : 0;
  const totalCurrent = Math.round(PROGRESS_TOTAL_SCALE * weightedCompletion);

  return {
    goals: { done: goalsCurrent, total: goalsTotal },
    other: { done: otherCurrent, total: otherTotal },
    total: { done: totalCurrent, total: PROGRESS_TOTAL_SCALE },
  };
}
