export type ClassMap = Record<string, boolean | undefined | null | ''>;

/**
 * Builds a space-separated class string from optional base classes and a map
 * of full class names to booleans.
 *
 * @example
 * classBuilder({ 'full-class-name--blah': isActive }, 'base-class-name')
 */
export function classBuilder(
  classes: ClassMap,
  ...bases: Array<string | false | null | undefined>
): string {
  const parts = bases.filter(Boolean) as string[];
  for (const [name, active] of Object.entries(classes)) {
    if (active) parts.push(name);
  }
  return parts.join(' ');
}
