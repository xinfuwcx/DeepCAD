/**
 * DeepCAD专业UI主题系统
 * 1号架构师 - 炫酷科技感Fusion风格主题
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';

// 主题类型定义
export type DeepCADTheme = 'deep-space' | 'quantum-lab' | 'energy-matrix' | 'high-contrast';

// 主题配置接口
interface ThemeConfig {
  name: string;
  displayName: string;
  // Add compatibility properties
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
    };
    border: {
      primary: string;
      secondary: string;
      glow: string;
    };
  };
  effects: {
    glassOpacity: number;
    borderRadius: number;
    shadowIntensity: number;
    glowIntensity: number;
  };
  animations: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      standard: string;
      emphasized: string;
      decelerated: string;
    };
  };
}

// 预设主题配置
const THEME_CONFIGS: Record<DeepCADTheme, ThemeConfig> = {
  'deep-space': {
    name: 'deep-space',
    displayName: '深空探索',
    primaryColor: '#00d9ff',
    secondaryColor: '#16213e',
    accentColor: '#a855f7',
    colors: {
      primary: '#00d9ff',
      secondary: '#16213e',
      accent: '#a855f7',
      success: '#00ff88',
      warning: '#ff6600',
      error: '#ff4444',
      info: '#64ffda',
      background: {
        primary: '#0a0a0a',
        secondary: '#16213e',
        tertiary: '#1a1a2e',
      },
      text: {
        primary: '#ffffff',
        secondary: '#e2e8f0',
        tertiary: '#94a3b8',
        inverse: '#0a0a0a',
      },
      border: {
        primary: 'rgba(0, 217, 255, 0.3)',
        secondary: 'rgba(255, 255, 255, 0.1)',
        glow: 'rgba(0, 217, 255, 0.6)',
      },
    },
    effects: {
      glassOpacity: 0.3,
      borderRadius: 8,
      shadowIntensity: 0.2,
      glowIntensity: 0.4,
    },
    animations: {
      duration: {
        fast: '0.15s',
        normal: '0.3s',
        slow: '0.6s',
      },
      easing: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
        decelerated: 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },
  'quantum-lab': {
    name: 'quantum-lab',
    displayName: '量子实验室',
    primaryColor: '#a855f7',
    secondaryColor: '#21262d',
    accentColor: '#00d9ff',
    colors: {
      primary: '#a855f7',
      secondary: '#21262d',
      accent: '#00d9ff',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#8b5cf6',
      background: {
        primary: '#0d1117',
        secondary: '#21262d',
        tertiary: '#30363d',
      },
      text: {
        primary: '#f0f6fc',
        secondary: '#c9d1d9',
        tertiary: '#8b949e',
        inverse: '#0d1117',
      },
      border: {
        primary: 'rgba(168, 85, 247, 0.3)',
        secondary: 'rgba(240, 246, 252, 0.1)',
        glow: 'rgba(168, 85, 247, 0.6)',
      },
    },
    effects: {
      glassOpacity: 0.4,
      borderRadius: 8,
      shadowIntensity: 0.25,
      glowIntensity: 0.5,
    },
    animations: {
      duration: {
        fast: '0.12s',
        normal: '0.25s',
        slow: '0.5s',
      },
      easing: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
        decelerated: 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },
  'energy-matrix': {
    name: 'energy-matrix',
    displayName: '能源矩阵',
    primaryColor: '#00ff88',
    secondaryColor: '#1e293b',
    accentColor: '#ff6600',
    colors: {
      primary: '#00ff88',
      secondary: '#1e293b',
      accent: '#ff6600',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#06b6d4',
      background: {
        primary: '#0f172a',
        secondary: '#1e293b',
        tertiary: '#334155',
      },
      text: {
        primary: '#e2e8f0',
        secondary: '#cbd5e1',
        tertiary: '#94a3b8',
        inverse: '#0f172a',
      },
      border: {
        primary: 'rgba(0, 255, 136, 0.3)',
        secondary: 'rgba(226, 232, 240, 0.1)',
        glow: 'rgba(0, 255, 136, 0.6)',
      },
    },
    effects: {
      glassOpacity: 0.35,
      borderRadius: 6,
      shadowIntensity: 0.3,
      glowIntensity: 0.45,
    },
    animations: {
      duration: {
        fast: '0.18s',
        normal: '0.35s',
        slow: '0.7s',
      },
      easing: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
        decelerated: 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },
  'high-contrast': {
    name: 'high-contrast',
    displayName: '高对比度',
    primaryColor: '#ffffff',
    secondaryColor: '#000000',
    accentColor: '#ff0000',
    colors: {
      primary: '#ffffff',
      secondary: '#1a1a1a',
      accent: '#ffff00',
      success: '#00ff00',
      warning: '#ffaa00',
      error: '#ff0000',
      info: '#00ffff',
      background: {
        primary: '#000000',
        secondary: '#1a1a1a',
        tertiary: '#333333',
      },
      text: {
        primary: '#ffffff',
        secondary: '#ffffff',
        tertiary: '#cccccc',
        inverse: '#000000',
      },
      border: {
        primary: 'rgba(255, 255, 255, 0.8)',
        secondary: 'rgba(255, 255, 255, 0.4)',
        glow: 'rgba(255, 255, 255, 1)',
      },
    },
    effects: {
      glassOpacity: 0.8,
      borderRadius: 4,
      shadowIntensity: 0.8,
      glowIntensity: 1,
    },
    animations: {
      duration: {
        fast: '0.1s',
        normal: '0.2s',
        slow: '0.4s',
      },
      easing: {
        standard: 'ease',
        emphasized: 'ease-out',
        decelerated: 'ease-in',
      },
    },
  },
};

// 主题上下文
interface ThemeContextType {
  currentTheme: DeepCADTheme;
  themeConfig: ThemeConfig;
  setTheme: (theme: DeepCADTheme) => void;
  availableThemes: { key: DeepCADTheme; name: string }[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 主题提供者组件
interface DeepCADThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: DeepCADTheme;
}

export const DeepCADThemeProvider: React.FC<DeepCADThemeProviderProps> = ({
  children,
  defaultTheme = 'deep-space'
}) => {
  const [currentTheme, setCurrentTheme] = useState<DeepCADTheme>(defaultTheme);

  // 从localStorage加载主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('deepcad-theme') as DeepCADTheme;
    if (savedTheme && THEME_CONFIGS[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  // 设置主题并保存到localStorage
  const setTheme = (theme: DeepCADTheme) => {
    setCurrentTheme(theme);
    localStorage.setItem('deepcad-theme', theme);
    
    // 应用CSS变量到根元素
    applyThemeCSS(THEME_CONFIGS[theme]);
  };

  // 应用主题CSS变量
  const applyThemeCSS = (config: ThemeConfig) => {
    const root = document.documentElement;
    
    // 颜色变量
    root.style.setProperty('--deepcad-primary', config.colors.primary);
    root.style.setProperty('--deepcad-secondary', config.colors.secondary);
    root.style.setProperty('--deepcad-accent', config.colors.accent);
    root.style.setProperty('--deepcad-success', config.colors.success);
    root.style.setProperty('--deepcad-warning', config.colors.warning);
    root.style.setProperty('--deepcad-error', config.colors.error);
    root.style.setProperty('--deepcad-info', config.colors.info);
    
    // 背景颜色
    root.style.setProperty('--deepcad-bg-primary', config.colors.background.primary);
    root.style.setProperty('--deepcad-bg-secondary', config.colors.background.secondary);
    root.style.setProperty('--deepcad-bg-tertiary', config.colors.background.tertiary);
    
    // 文字颜色
    root.style.setProperty('--deepcad-text-primary', config.colors.text.primary);
    root.style.setProperty('--deepcad-text-secondary', config.colors.text.secondary);
    root.style.setProperty('--deepcad-text-tertiary', config.colors.text.tertiary);
    root.style.setProperty('--deepcad-text-inverse', config.colors.text.inverse);
    
    // 边框颜色
    root.style.setProperty('--deepcad-border-primary', config.colors.border.primary);
    root.style.setProperty('--deepcad-border-secondary', config.colors.border.secondary);
    root.style.setProperty('--deepcad-border-glow', config.colors.border.glow);
    
    // 效果变量
    root.style.setProperty('--deepcad-glass-opacity', config.effects.glassOpacity.toString());
    root.style.setProperty('--deepcad-border-radius', `${config.effects.borderRadius}px`);
    root.style.setProperty('--deepcad-shadow-intensity', config.effects.shadowIntensity.toString());
    root.style.setProperty('--deepcad-glow-intensity', config.effects.glowIntensity.toString());
    
    // 动画变量
    root.style.setProperty('--deepcad-duration-fast', config.animations.duration.fast);
    root.style.setProperty('--deepcad-duration-normal', config.animations.duration.normal);
    root.style.setProperty('--deepcad-duration-slow', config.animations.duration.slow);
    root.style.setProperty('--deepcad-easing-standard', config.animations.easing.standard);
    root.style.setProperty('--deepcad-easing-emphasized', config.animations.easing.emphasized);
    root.style.setProperty('--deepcad-easing-decelerated', config.animations.easing.decelerated);
    
    // 更新body背景
    document.body.style.background = config.colors.background.primary;
    document.body.className = `theme-${config.name}`;
  };

  // 初始化主题CSS
  useEffect(() => {
    applyThemeCSS(THEME_CONFIGS[currentTheme]);
  }, [currentTheme]);

  const themeConfig = THEME_CONFIGS[currentTheme];
  const availableThemes = Object.entries(THEME_CONFIGS).map(([key, config]) => ({
    key: key as DeepCADTheme,
    name: config.displayName
  }));

  // Ant Design主题配置
  const antdTheme = {
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: themeConfig.colors.primary,
      colorSuccess: themeConfig.colors.success,
      colorWarning: themeConfig.colors.warning,
      colorError: themeConfig.colors.error,
      colorInfo: themeConfig.colors.info,
      colorBgBase: themeConfig.colors.background.primary,
      colorBgContainer: themeConfig.colors.background.secondary,
      colorBgElevated: themeConfig.colors.background.tertiary,
      colorText: themeConfig.colors.text.primary,
      colorTextSecondary: themeConfig.colors.text.secondary,
      colorTextTertiary: themeConfig.colors.text.tertiary,
      colorBorder: themeConfig.colors.border.primary,
      borderRadius: themeConfig.effects.borderRadius,
      fontFamily: '"Orbitron", "Microsoft YaHei", sans-serif',
    },
    components: {
      Card: {
        colorBgContainer: `rgba(${parseInt(themeConfig.colors.background.secondary.slice(1, 3), 16)}, ${parseInt(themeConfig.colors.background.secondary.slice(3, 5), 16)}, ${parseInt(themeConfig.colors.background.secondary.slice(5, 7), 16)}, ${themeConfig.effects.glassOpacity})`,
        colorBorderSecondary: themeConfig.colors.border.primary,
      },
      Button: {
        colorPrimaryBg: themeConfig.colors.primary,
        colorPrimaryBgHover: themeConfig.colors.accent,
        borderRadius: themeConfig.effects.borderRadius,
      },
      Input: {
        colorBgContainer: `rgba(${parseInt(themeConfig.colors.background.tertiary.slice(1, 3), 16)}, ${parseInt(themeConfig.colors.background.tertiary.slice(3, 5), 16)}, ${parseInt(themeConfig.colors.background.tertiary.slice(5, 7), 16)}, 0.6)`,
        borderRadius: themeConfig.effects.borderRadius,
      },
      Table: {
        colorBgContainer: `rgba(${parseInt(themeConfig.colors.background.secondary.slice(1, 3), 16)}, ${parseInt(themeConfig.colors.background.secondary.slice(3, 5), 16)}, ${parseInt(themeConfig.colors.background.secondary.slice(5, 7), 16)}, 0.8)`,
        colorBorderSecondary: themeConfig.colors.border.secondary,
      },
      Tabs: {
        colorBgContainer: 'transparent',
        colorBorderSecondary: themeConfig.colors.border.primary,
      },
      Progress: {
        colorSuccess: themeConfig.colors.success,
        colorInfo: themeConfig.colors.primary,
      },
    },
  };

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      themeConfig,
      setTheme,
      availableThemes
    }}>
      <ConfigProvider theme={antdTheme}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

// 主题Hook
export const useDeepCADTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useDeepCADTheme must be used within DeepCADThemeProvider');
  }
  return context;
};

// 主题切换器组件
interface ThemeSwitcherProps {
  className?: string;
  size?: 'small' | 'middle' | 'large';
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ 
  className,
  size = 'middle' 
}) => {
  const { currentTheme, setTheme, availableThemes } = useDeepCADTheme();

  return (
    <select
      className={`deepcad-theme-switcher ${className || ''}`}
      value={currentTheme}
      onChange={(e) => setTheme(e.target.value as DeepCADTheme)}
      style={{
        background: 'var(--deepcad-bg-secondary)',
        border: '1px solid var(--deepcad-border-primary)',
        borderRadius: 'var(--deepcad-border-radius)',
        color: 'var(--deepcad-text-primary)',
        padding: size === 'small' ? '4px 8px' : size === 'large' ? '12px 16px' : '8px 12px',
        fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
        fontFamily: '"Orbitron", "Microsoft YaHei", sans-serif',
        cursor: 'pointer',
        transition: 'all var(--deepcad-duration-normal) var(--deepcad-easing-standard)',
      }}
    >
      {availableThemes.map(theme => (
        <option key={theme.key} value={theme.key}>
          {theme.name}
        </option>
      ))}
    </select>
  );
};

export default DeepCADThemeProvider;