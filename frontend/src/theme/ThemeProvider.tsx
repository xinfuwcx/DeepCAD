import React, { createContext, useContext, useState, useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import { useUIStore } from '../stores/useUIStore';

// 定义主题上下文
export const ThemeContext = createContext({
  isDarkMode: true,
  toggleTheme: () => {},
});

// 主题提供者组件
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme: appTheme, toggleTheme } = useUIStore();
  const isDarkMode = appTheme === 'dark';

  // 定义主题配置
  const themeConfig = {
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#1890ff',
      borderRadius: 8,
      colorBgBase: isDarkMode ? '#121212' : '#f0f2f5',
      colorTextBase: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
      colorBgContainer: isDarkMode ? '#1f1f1f' : '#ffffff',
      colorBgElevated: isDarkMode ? '#2c2c2c' : '#ffffff',
      colorBorder: isDarkMode ? '#424242' : '#d9d9d9',
    },
    components: {
      Card: {
        colorBgContainer: isDarkMode ? '#2c2c2c' : '#ffffff',
        colorBorderSecondary: isDarkMode ? '#424242' : '#f0f0f0',
      },
      Button: {
        colorPrimary: '#1890ff',
        colorPrimaryHover: '#40a9ff',
        colorPrimaryActive: '#096dd9',
      },
      Table: {
        colorBgContainer: isDarkMode ? '#2c2c2c' : '#ffffff',
        colorBorderSecondary: isDarkMode ? '#424242' : '#f0f0f0',
      },
      Menu: {
        colorItemBg: isDarkMode ? '#1f1f1f' : '#ffffff',
        colorItemText: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)',
        colorItemTextSelected: '#1890ff',
        colorItemBgSelected: isDarkMode ? 'rgba(24, 144, 255, 0.1)' : 'rgba(24, 144, 255, 0.1)',
        colorItemTextHover: '#1890ff',
      },
      Layout: {
        colorBgHeader: isDarkMode ? '#1f1f1f' : '#ffffff',
        colorBgBody: isDarkMode ? '#121212' : '#f0f2f5',
        colorBgSider: isDarkMode ? '#1f1f1f' : '#ffffff',
      },
      Tabs: {
        colorBorderSecondary: isDarkMode ? '#424242' : '#f0f0f0',
      },
    },
  };

  // 提供主题上下文值
  const contextValue = {
    isDarkMode,
    toggleTheme,
  };

  // 保存主题偏好到本地存储
  useEffect(() => {
    localStorage.setItem('theme', appTheme);
  }, [appTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <ConfigProvider theme={themeConfig}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

// 使用主题的钩子
export const useTheme = () => useContext(ThemeContext);

export default ThemeProvider; 