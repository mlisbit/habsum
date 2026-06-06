export type ClassMap = Record<string, boolean | undefined | null | ''>;

/**
 * Builds a space-separated class string from optional base classes and a map
 * of full class names to booleans.
 */
export function classBuilder(classes: ClassMap, base?: string | false | null | undefined): string {
  const parts = typeof base === 'string' ? base.split(/\s+/).filter(Boolean) : [];
  for (const [name, active] of Object.entries(classes)) {
    if (active) parts.push(name);
  }
  return parts.join(' ');
}
