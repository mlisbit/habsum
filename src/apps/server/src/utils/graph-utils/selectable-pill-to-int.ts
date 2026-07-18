// Maps selectable habit values to stable graph intensity numbers.
/**
 * Assigns selectable-pill values one-based numeric positions for heatmap fill distribution.
 * When streak values are configured, they are positive and ranked best-to-worst from left to
 * right, while every other option uses the negative form of its position. Without streak values,
 * every option remains positive.
 */
export function selectablePillToInt(
  selectableValues: readonly string[],
  streakValues?: readonly string[],
): Map<string, number> {
  const streakValueSet = streakValues?.length ? new Set(streakValues) : null;
  const positiveValueByOption = new Map(
    streakValues?.map((value, index, values) => [value, values.length - index]) ?? [],
  );

  return new Map(
    selectableValues.map((value, index) => {
      const position = index + 1;
      if (streakValueSet == null) return [value, position];
      return [
        value,
        streakValueSet.has(value) ? (positiveValueByOption.get(value) ?? 1) : -position,
      ];
    }),
  );
}
