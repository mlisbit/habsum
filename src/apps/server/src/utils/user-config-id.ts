// Small validation helpers for user config identifiers used across services and routes.
export function isSafeConfigUserId(user: string): boolean {
  if (user.length === 0 || user.length > 200) return false;
  if (/[/\\]/.test(user)) return false;
  return true;
}
