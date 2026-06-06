export const UI_THEME_STORAGE_KEY = 'habsum.uiThemePreference';

export const UI_THEME_FIXED_OPTIONS = ['dark', 'light'] as const;

export type UiThemeFixedOption = (typeof UI_THEME_FIXED_OPTIONS)[number];

/** `null` = follow OS color scheme (`prefers-color-scheme`). */
export type UiThemePreference = UiThemeFixedOption | null;

export const UI_THEME_SELECT_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
  preference: UiThemePreference;
}> = [
  { value: 'system', label: 'Use system default', preference: null },
  { value: 'dark', label: 'Dark', preference: 'dark' },
  { value: 'light', label: 'Light', preference: 'light' },
];

export function preferenceToSelectValue(theme: UiThemePreference): string {
  return theme === 'light' || theme === 'dark' ? theme : 'system';
}

export function selectValueToPreference(value: string): UiThemePreference {
  if (value === 'light' || value === 'dark') return value;
  return null;
}

/** PATCH body value for "use OS color scheme" (stored as SQL `NULL`). */
export const THEME_API_SYSTEM = 'system' as const;

export type ThemeApiValue = UiThemeFixedOption | typeof THEME_API_SYSTEM;

/** Value for `PATCH /users/:user` (use {@link THEME_API_SYSTEM}, not JSON `null`). */
export function themePreferenceToApi(theme: UiThemePreference): ThemeApiValue {
  return theme === 'light' || theme === 'dark' ? theme : THEME_API_SYSTEM;
}

function resolveUiTheme(theme: string | null | undefined): UiThemeFixedOption {
  if (theme === 'light' || theme === 'dark') return theme;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

/** Applies `data-theme` on `<html>`; `null`/unknown uses the system color scheme. */
export function applyUiTheme(theme: string | null | undefined): void {
  document.documentElement.dataset.theme = resolveUiTheme(theme);
}

/** Applies the theme preference and stores it for the next first paint. */
export function syncTheme(theme: string | null | undefined): void {
  applyUiTheme(theme);
  try {
    window.localStorage.setItem(
      UI_THEME_STORAGE_KEY,
      theme === 'light' || theme === 'dark' ? theme : 'system',
    );
  } catch {
    // Ignore storage failures; the active document theme has already been applied.
  }
}
