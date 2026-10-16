import { useEffect, useState } from 'react';
import { applyUiTheme, syncTheme, UI_THEME_STORAGE_KEY } from '@habsum/ui/theme';

export default function useTheme() {
  const [isDark, setIsDark] = useState(document.documentElement.dataset.theme === 'dark');

  useEffect(() => {
    const systemTheme = window.matchMedia('(prefers-color-scheme: light)');
    const update = () => {
      let preference: string | null = null;
      try {
        preference = localStorage.getItem(UI_THEME_STORAGE_KEY);
      } catch {
        // System preference still works when storage is unavailable.
      }
      applyUiTheme(preference);
      setIsDark(document.documentElement.dataset.theme === 'dark');
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === UI_THEME_STORAGE_KEY || event.key === null) update();
    };
    systemTheme.addEventListener('change', update);
    window.addEventListener('storage', onStorage);
    return () => {
      systemTheme.removeEventListener('change', update);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const toggleTheme = (dark: boolean) => {
    syncTheme(dark ? 'dark' : 'light');
    setIsDark(dark);
  };

  return { isDark, toggleTheme };
}
