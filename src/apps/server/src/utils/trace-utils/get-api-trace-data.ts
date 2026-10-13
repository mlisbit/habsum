import { REDACTED_PLACEHOLDER } from './constants.js';

/** Copy JSON data for logging without exposing password fields or mutating the payload. */
export default function getApiTraceData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(getApiTraceData);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        /password/i.test(key) && typeof entry !== 'boolean'
          ? REDACTED_PLACEHOLDER
          : getApiTraceData(entry),
      ]),
    );
  }
  return value;
}
