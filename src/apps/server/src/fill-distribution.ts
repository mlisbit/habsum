import type { StreakFill } from '@habsum/types/common/streak';

/**
 * Converts raw heatmap history values into the signed fill-token range used by the API.
 * Positive and negative values are scaled independently to preserve their direction, while a
 * missing history value stays undefined so consumers can distinguish it from a real zero.
 */
export function fillDistribution(
  values: ReadonlyArray<number | undefined>,
): Array<StreakFill | undefined> {
  const definedValues = values.filter((value): value is number => value !== undefined);
  const maxPositive = Math.max(0, ...definedValues.filter((value) => value > 0));
  const maxNegativeMagnitude = Math.max(
    0,
    ...definedValues.filter((value) => value < 0).map((value) => Math.abs(value)),
  );

  return values.map((value) => {
    if (value == null) return undefined;
    if (value === 0) return 0;
    if (value > 0) {
      return Math.max(1, Math.round((value / maxPositive) * 5)) as StreakFill;
    }
    return -Math.max(1, Math.round((Math.abs(value) / maxNegativeMagnitude) * 5)) as StreakFill;
  });
}
