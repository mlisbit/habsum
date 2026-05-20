/** Legacy `input` marker in YAML `summation_options` (ignored by the API). */
export const SUMMATION_OPTION_INPUT = 'input' as const;

export type SummationOptionInput = typeof SUMMATION_OPTION_INPUT;

/** API / habit row: manual amount entry plus configured quick-add deltas. */
export type SummationOptions = {
  manualInput: true;
  increments: number[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function isSummationInputMarker(entry: unknown): boolean {
  return typeof entry === 'string' && entry.trim().toLowerCase() === SUMMATION_OPTION_INPUT;
}

function parseIncrementNumber(entry: unknown): number | null {
  if (isSummationInputMarker(entry)) return null;
  const n = Math.trunc(Number(entry));
  if (!Number.isFinite(n)) return null;
  return n;
}

/** Drops legacy `input` entries; keeps numeric values unchanged. */
export function yamlSummationEntriesToIncrements(raw: unknown[]): number[] {
  return raw
    .map((entry) => parseIncrementNumber(entry))
    .filter((entry): entry is number => entry != null);
}

function parseIncrementsArray(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const increments = yamlSummationEntriesToIncrements(raw);
  return increments.length > 0 ? increments : undefined;
}

/**
 * Normalizes YAML `summation_options`, legacy `{ sub, add }`, or API object into `SummationOptions`.
 */
export function parseSummationOptionsFromRaw(raw: unknown): SummationOptions | undefined {
  if (raw == null) return undefined;

  if (Array.isArray(raw)) {
    const increments = yamlSummationEntriesToIncrements(raw);
    if (increments.length < 2) return undefined;
    return { manualInput: true, increments };
  }

  if (!isRecord(raw)) return undefined;

  const incrementsFromField = parseIncrementsArray(raw.increments);
  if (incrementsFromField != null && incrementsFromField.length >= 2) {
    return { manualInput: true, increments: incrementsFromField };
  }

  const sub = Math.trunc(Number(raw.sub));
  const add = Math.trunc(Number(raw.add));
  if (!Number.isFinite(sub) || !Number.isFinite(add)) return undefined;

  return { manualInput: true, increments: [sub, add] };
}
