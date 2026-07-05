import { setStorageSync, getStorageSync } from '@/utils/storage';

export type ThemeType = 'light' | 'dark';

export const THEME_KEY = 'theme';

export const getTheme = (): ThemeType => {
  const stored = getStorageSync(THEME_KEY);
  if (stored === 'dark') return 'dark';
  return 'light';
};

export const setTheme = (theme: ThemeType): void => {
  setStorageSync(THEME_KEY, theme);
};

export const toggleTheme = (): ThemeType => {
  const current = getTheme();
  const next = current === 'light' ? 'dark' : 'light';
  setTheme(next);
  return next;
};