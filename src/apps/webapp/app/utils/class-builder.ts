export type ClassMap = Record<string, boolean | undefined | null | ''>;

/**
 * Builds a space-separated class string from optional base classes and a map
 * of full class names to booleans.
 *
 * @example
 * classBuilder({ 'full-class-name--blah': isActive }, 'base-class-name')
 * classBuilder({ 'text-error': isError }, 'settings__link text-b-l')
 */
export function classBuilder(classes: ClassMap, base?: string | false | null | undefined): string {
  const parts = typeof base === 'string' ? base.split(/\s+/).filter(Boolean) : [];
  for (const [name, active] of Object.entries(classes)) {
    if (active) parts.push(name);
  }
  return parts.join(' ');
}
