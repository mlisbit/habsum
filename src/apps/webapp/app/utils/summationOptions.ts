import type { SummationOptions } from '@habsum/types/common/habit';

export function hasSummationOptions(
  options: SummationOptions | undefined,
): options is SummationOptions {
  return options != null && options.manualInput && options.increments.length > 0;
}

export function formatIncrementLabel(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

/** First positive increment, used as the manual field placeholder. */
export function defaultManualIncrementPlaceholder(options: SummationOptions): string {
  const positive = options.increments.find((n) => n > 0);
  return positive != null ? String(positive) : '';
}
