export function commaList(values: string[]): string {
  if (values.length <= 2) return values.join(' and ');
  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
}
