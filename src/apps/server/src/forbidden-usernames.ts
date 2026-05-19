/**
 * Login / YAML user ids that cannot be created or chosen via rename (case-insensitive, trimmed).
 * Extend this list as needed for reserved routes, branding, or confusable names.
 */
const FORBIDDEN_USERNAME_LOWER = new Set<string>([
  'admin',
  'administrator',
  'api',
  'ftp',
  'help',
  'localhost',
  'mail',
  'null',
  'root',
  'support',
  'system',
  'test',
  'undefined',
  'webmaster',
  'www',
  'habsum',
  'fuck',
]);

export function isForbiddenUsername(name: string): boolean {
  const k = name.trim().toLowerCase();
  return k.length > 0 && FORBIDDEN_USERNAME_LOWER.has(k);
}
