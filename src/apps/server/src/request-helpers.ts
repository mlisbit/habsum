export function isSafeConfigUserId(user: string): boolean {
  if (user.length === 0 || user.length > 200) return false;
  if (/[/\\]/.test(user)) return false;
  return true;
}

/** Login route param: YAML username or email address (no path segments). */
export function isSafeLoginId(loginId: string): boolean {
  return isSafeConfigUserId(loginId);
}

export function parsePin(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const pin = value.trim();
  return pin.length > 0 ? pin : null;
}

/** Stored as plain strings; extend as new themes ship. */
export const ALLOWED_UI_THEMES = ['light', 'dark'] as const;

export function isAllowedUiTheme(value: string): boolean {
  return (ALLOWED_UI_THEMES as readonly string[]).includes(value);
}

/** PATCH body `theme`: `null` / empty / `system` → DB null (OS default); otherwise `light` or `dark`. */
export function parseThemePatchInput(value: unknown): string | null | 'invalid' {
  if (value == null) return null;
  if (typeof value !== 'string') return 'invalid';
  const t = value.trim();
  if (t === '' || t.toLowerCase() === 'system') return null;
  if (isAllowedUiTheme(t)) return t;
  return 'invalid';
}

/** Basic sanity check for stored contact email (not full RFC 5322). */
export function isPlausibleEmail(value: string): boolean {
  const t = value.trim().toLowerCase();
  if (t === '') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}
