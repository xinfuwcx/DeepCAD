/**
 * @file FigmaThemeProvider.tsx
 * @description Figma集成主题提供者
 * @author Deep Excavation Team
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider, createTheme, Theme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// 尝试导入生成的令牌和主题（如果存在）
let generatedTokens: any = {};
let generatedTheme: Theme | null = null;

try {
  generatedTokens = require('../styles/tokens/tokens').tokens || {};
} catch {
  console.log('⚠️ 未找到生成的设计令牌，使用默认配置');
}

try {
  generatedTheme = require('../styles/theme-generated').generatedTheme;
} catch {
  console.log('⚠️ 未找到生成的主题，使用默认配置');
}

interface FigmaThemeContextType {
  tokens: any;
  refreshTheme: () => Promise<void>;
  isLoading: boolean;
  lastSync: Date | null;
}

const FigmaThemeContext = createContext<FigmaThemeContextType>({
  tokens: {},
  refreshTheme: async () => {},
  isLoading: false,
  lastSync: null,
});

export const useFigmaTheme = () => useContext(FigmaThemeContext);

interface FigmaThemeProviderProps {
  children: React.ReactNode;
  fallbackTheme?: Theme;
  autoRefresh?: boolean;
  refreshInterval?: number; // 分钟
}

export const FigmaThemeProvider: React.FC<FigmaThemeProviderProps> = ({
  children,
  fallbackTheme,
  autoRefresh = false,
  refreshInterval = 30,
}) => {
  const [tokens, setTokens] = useState(generatedTokens);
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(generatedTheme);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // 创建默认主题
  const createDefaultTheme = (): Theme => {
    const baseTheme = createTheme({
      palette: {
        primary: {
          main: tokens.colors?.primary || '#1976d2',
          light: tokens.colors?.['primary-light'] || '#42a5f5',
          dark: tokens.colors?.['primary-dark'] || '#1565c0',
        },
        secondary: {
          main: tokens.colors?.secondary || '#dc004e',
          light: tokens.colors?.['secondary-light'] || '#e91e63',
          dark: tokens.colors?.['secondary-dark'] || '#c51162',
        },
        error: {
          main: tokens.colors?.error || '#f44336',
        },
        warning: {
          main: tokens.colors?.warning || '#ff9800',
        },
        info: {
          main: tokens.colors?.info || '#2196f3',
        },
        success: {
          main: tokens.colors?.success || '#4caf50',
        },
        background: {
          default: tokens.colors?.background || '#ffffff',
          paper: tokens.colors?.surface || '#f5f5f5',
        },
        text: {
          primary: tokens.colors?.['text-primary'] || '#212121',
          secondary: tokens.colors?.['text-secondary'] || '#757575',
          disabled: tokens.colors?.['text-disabled'] || '#bdbdbd',
        },
      },
      typography: {
        fontFamily: tokens.typography?.body?.fontFamily || '"Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
          fontSize: tokens.typography?.h1?.fontSize || '2.125rem',
          fontWeight: tokens.typography?.h1?.fontWeight || 300,
          lineHeight: tokens.typography?.h1?.lineHeight || 1.167,
        },
        h2: {
          fontSize: tokens.typography?.h2?.fontSize || '1.5rem',
          fontWeight: tokens.typography?.h2?.fontWeight || 400,
          lineHeight: tokens.typography?.h2?.lineHeight || 1.2,
        },
        body1: {
          fontSize: tokens.typography?.body?.fontSize || '1rem',
          fontWeight: tokens.typography?.body?.fontWeight || 400,
          lineHeight: tokens.typography?.body?.lineHeight || 1.5,
        },
        button: {
          fontSize: tokens.typography?.button?.fontSize || '0.875rem',
          fontWeight: tokens.typography?.button?.fontWeight || 500,
          textTransform: 'none' as const,
        },
      },
      spacing: (factor: number) => {
        const base = parseFloat(tokens.spacing?.base || '8px');
        return `${base * factor}px`;
      },
      shape: {
        borderRadius: parseFloat(tokens.borders?.radius || '8'),
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: tokens.borders?.radius || 8,
              padding: `${tokens.spacing?.sm || '8px'} ${tokens.spacing?.base || '16px'}`,
              boxShadow: tokens.effects?.shadow || 'none',
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: tokens.borders?.radius || 8,
              boxShadow: tokens.effects?.['card-shadow'] || '0 2px 4px rgba(0,0,0,0.1)',
              border: `1px solid ${tokens.colors?.border || '#e0e0e0'}`,
            },
          },
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                borderRadius: tokens.borders?.radius || 8,
                backgroundColor: tokens.colors?.['input-background'] || 'transparent',
              },
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundColor: tokens.colors?.['navbar-background'] || tokens.colors?.primary,
              boxShadow: tokens.effects?.['navbar-shadow'] || '0 2px 4px rgba(0,0,0,0.1)',
            },
          },
        },
      },
    });

    return baseTheme;
  };

  // 刷新主题
  const refreshTheme = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // 在生产环境中，这里会调用 Figma API
      // 开发环境中，尝试重新加载生成的文件
      if (process.env.NODE_ENV === 'development') {
        // 动态重新导入令牌
        delete require.cache[require.resolve('../styles/tokens/tokens')];
        const newTokens = require('../styles/tokens/tokens').tokens || {};
        setTokens(newTokens);
        
        // 重新创建主题
        const newTheme = createDefaultTheme();
        setCurrentTheme(newTheme);
        
        setLastSync(new Date());
        console.log('🎨 主题已刷新');
      }
    } catch (error) {
      console.warn('⚠️ 主题刷新失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshTheme();
    }, refreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // 初始化主题
  useEffect(() => {
    if (!currentTheme) {
      setCurrentTheme(fallbackTheme || createDefaultTheme());
    }
  }, [tokens, fallbackTheme]);

  const contextValue: FigmaThemeContextType = {
    tokens,
    refreshTheme,
    isLoading,
    lastSync,
  };

  return (
    <FigmaThemeContext.Provider value={contextValue}>
      <ThemeProvider theme={currentTheme || createDefaultTheme()}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </FigmaThemeContext.Provider>
  );
};

export default FigmaThemeProvider;
