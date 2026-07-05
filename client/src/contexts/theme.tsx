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
      const textColor = newTheme === 'dark' ? '#ffffff' : '#000000';
      const navBarBgColor = newTheme === 'dark' ? '#1e2128' : '#ffffff';
      const tabBarBgColor = newTheme === 'dark' ? '#1a1d22' : '#ffffff';
      const tabBarColor = newTheme === 'dark' ? '#7d8594' : '#999999';

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
