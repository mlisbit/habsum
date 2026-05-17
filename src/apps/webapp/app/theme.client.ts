export const UI_THEME_OPTIONS = ['dark', 'light'] as const;

export type UiThemeOption = (typeof UI_THEME_OPTIONS)[number];

/** Applies `data-theme` on `<html>`; unknown values fall back to `dark`. */
export function applyUiTheme(theme: string | null | undefined): void {
  const t = theme === 'light' || theme === 'dark' ? theme : 'dark';
  document.documentElement.dataset.theme = t;
}
