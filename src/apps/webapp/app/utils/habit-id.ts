import { dasherize } from "@habsum/utils";

/**
 * Lowercase, dasherize, and safe-guard a habit name for a URL path segment
 * (e.g. `My Habit` → `my-habit`).
 */
export function habitIdPathSegment(name: string): string {
  return dasherize(name);
}
