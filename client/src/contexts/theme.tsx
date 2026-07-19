import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Taro from '@tarojs/taro';
import { getTheme, setTheme, toggleTheme, ThemeType } from '@/utils/theme';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(getTheme());

  useEffect(() => {
    applyTheme(theme);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const applyTheme = (newTheme: ThemeType) => {
    try {
      const isDark = newTheme === 'dark';
      const textColor = isDark ? '#ffffff' : '#000000';
      const navBarBgColor = isDark ? '#1e2128' : '#ffffff';
      const tabBarBgColor = isDark ? '#1a1d22' : '#ffffff';
      const tabBarColor = isDark ? '#7d8594' : '#999999';

      // 通过 CSS 自定义属性注入暗色主题（覆盖 page 上的默认亮色值）
      try {
        Taro.setPageStyle({
          style: isDark
            ? {
                '--color-default': '#dddddd',
                '--color-middle': '#9899ab',
                '--color-light': '#7d8594',
                '--color-background': '#1e2128',
                '--color-background-deep': '#1a1d22',
                '--color-border': '#2d3038',
                '--color-shadow': 'rgba(0,0,0,0.35)',
                '--color-skeleton-1': '#2a2d35',
                '--color-skeleton-2': '#23252c',
                '--color-skeleton-3': '#2d3038',
                '--color-tag-bg': '#2a2d35',
                '--color-modal-bg': '#25282f',
                '--color-modal-hover': '#2d3038',
                '--color-divider': '#3a3d45',
                '--color-input-bg': '#2a2d35',
              }
            : {
                '--color-default': '#33333d',
                '--color-middle': '#555555',
                '--color-light': '#999999',
                '--color-background': '#ffffff',
                '--color-background-deep': '#f5f7f9',
                '--color-border': '#ebedf0',
                '--color-shadow': 'rgba(0,0,0,0.15)',
                '--color-skeleton-1': '#f0f0f0',
                '--color-skeleton-2': '#e0e0e0',
                '--color-skeleton-3': '#f5f5f5',
                '--color-tag-bg': '#f5f5f5',
                '--color-modal-bg': '#ffffff',
                '--color-modal-hover': '#f5f5f5',
                '--color-divider': '#cccccc',
                '--color-input-bg': '#f5f5f5',
              },
        });
      } catch (e) {}

      try {
        Taro.setNavigationBarColor({
          frontColor: textColor,
          backgroundColor: navBarBgColor,
        });
      } catch (e) {}

      try {
        const pages = Taro.getCurrentPages();
        if (pages && pages.length > 0) {
          Taro.setTabBarStyle({
            color: tabBarColor,
            selectedColor: '#ff3b00',
            backgroundColor: tabBarBgColor,
          });
        }
      } catch (e) {}
    } catch (e) {
      console.warn('[Theme] 设置主题失败:', e);
    }
  };

  const handleSetTheme = (newTheme: ThemeType) => {
    setTheme(newTheme);
    setThemeState(newTheme);
  };

  const handleToggleTheme = () => {
    const newTheme = toggleTheme();
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, toggleTheme: handleToggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
