import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme, darkTheme } from '../../styles/theme';
import { THEME_CONFIG } from '../../config/appConfig';
import { settingsStorage } from '../../utils/storage';

// 主题上下文类型
interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

// 创建主题上下文
const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
  isDarkMode: false,
  toggleTheme: () => {},
});

// 主题提供者组件Props
interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * 主题提供者组件
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // 获取存储的主题或使用默认主题
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    const savedTheme = settingsStorage.getTheme();
    return (savedTheme as 'light' | 'dark' | 'system') || 'light';
  });

  // 检测系统主题
  const prefersDarkMode = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }, []);

  // 根据主题设置和系统主题确定是否使用暗色模式
  const isDarkMode = useMemo(() => {
    if (theme === 'system') {
      return prefersDarkMode;
    }
    return theme === 'dark';
  }, [theme, prefersDarkMode]);

  // 根据是否使用暗色模式选择主题
  const currentTheme = useMemo(() => {
    return isDarkMode ? darkTheme : lightTheme;
  }, [isDarkMode]);

  // 设置主题并保存到本地存储
  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    settingsStorage.saveTheme(newTheme);
  };

  // 切换主题
  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setTheme(newTheme);
  };

  // 监听系统主题变化
  useEffect(() => {
    if (typeof window !== 'undefined' && theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = () => {
        // 强制重新渲染
        setThemeState('system');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [theme]);

  // 主题上下文值
  const themeContextValue = useMemo(
    () => ({
      theme,
      setTheme,
      isDarkMode,
      toggleTheme,
    }),
    [theme, isDarkMode]
  );

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <MuiThemeProvider theme={currentTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

/**
 * 使用主题钩子
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

export default ThemeProvider; 