/**
 * @file quantumTheme.ts
 * @description 量子科技风主题配置 - 未来感UI系统
 * @author GitHub Copilot - 量子设计师
 * @inspiration 银翼杀手2049 + 苹果Vision Pro + 星际穿越
 */

import { createTheme, Theme, ThemeOptions } from '@mui/material/styles';
import { defaultTokens } from '../tokens/defaultTokens';

// 🌌 量子主题接口定义
declare module '@mui/material/styles' {
  interface Palette {
    quantum: {
      primary: string;
      secondary: string;
      accent: string;
      tertiary: string;
    };
    neon: {
      blue: string;
      pink: string;
      green: string;
      orange: string;
      purple: string;
      yellow: string;
    };
    glass: {
      surface: string;
      surfaceHover: string;
      card: string;
      modal: string;
      border: string;
    };
    engineering: {
      excavation: { main: string; accent: string; gradient: string };
      concrete: { main: string; accent: string; gradient: string };
      steel: { main: string; accent: string; gradient: string };
      water: { main: string; accent: string; gradient: string };
      stress: { main: string; accent: string; gradient: string };
      displacement: { main: string; accent: string; gradient: string };
    };
  }

  interface PaletteOptions {
    quantum?: {
      primary?: string;
      secondary?: string;
      accent?: string;
      tertiary?: string;
    };
    neon?: {
      blue?: string;
      pink?: string;
      green?: string;
      orange?: string;
      purple?: string;
      yellow?: string;
    };
    glass?: {
      surface?: string;
      surfaceHover?: string;
      card?: string;
      modal?: string;
      border?: string;
    };
    engineering?: {
      excavation?: { main: string; accent: string; gradient: string };
      concrete?: { main: string; accent: string; gradient: string };
      steel?: { main: string; accent: string; gradient: string };
      water?: { main: string; accent: string; gradient: string };
      stress?: { main: string; accent: string; gradient: string };
      displacement?: { main: string; accent: string; gradient: string };
    };
  }

  interface Theme {
    shadows: string[];
    quantum: {
      shadows: {
        neon: {
          blue: string;
          pink: string;
          green: string;
          purple: string;
        };
        glass: {
          light: string;
          medium: string;
          heavy: string;
          glow: string;
        };
        quantum: {
          levitate: string;
          float: string;
          hover: string;
          active: string;
        };
      };
      transitions: {
        preset: {
          quantumScale: string;
          quantumFade: string;
          quantumSlide: string;
          fluidMorph: string;
          magneticAttract: string;
          organicGrow: string;
        };
      };
      filters: {
        backdrop: {
          sm: string;
          md: string;
          lg: string;
          xl: string;
        };
        glow: {
          primary: string;
          secondary: string;
          accent: string;
        };
      };
    };
  }

  interface ThemeOptions {
    quantum?: {
      shadows?: {
        neon?: {
          blue?: string;
          pink?: string;
          green?: string;
          purple?: string;
        };
        glass?: {
          light?: string;
          medium?: string;
          heavy?: string;
          glow?: string;
        };
        quantum?: {
          levitate?: string;
          float?: string;
          hover?: string;
          active?: string;
        };
      };
      transitions?: {
        preset?: {
          quantumScale?: string;
          quantumFade?: string;
          quantumSlide?: string;
          fluidMorph?: string;
          magneticAttract?: string;
          organicGrow?: string;
        };
      };
      filters?: {
        backdrop?: {
          sm?: string;
          md?: string;
          lg?: string;
          xl?: string;
        };
        glow?: {
          primary?: string;
          secondary?: string;
          accent?: string;
        };
      };
    };
  }
}

// 🎨 量子主题配置 - 深色模式
const quantumDarkTheme: ThemeOptions = {
  palette: {
    mode: 'dark',
    
    // 主色调配置
    primary: {
      main: '#667eea',
      light: '#9ca5f0',
      dark: '#4a5fd1',
      contrastText: '#ffffff',
    },
    
    secondary: {
      main: '#f093fb',
      light: '#f5b7fc',
      dark: '#e56ff8',
      contrastText: '#ffffff',
    },
    
    // 背景配置
    background: {
      default: '#0a0a0a',
      paper: 'rgba(255, 255, 255, 0.05)',
    },
    
    // 分隔线配置
    divider: 'rgba(255, 255, 255, 0.12)',
    
    // 状态颜色
    success: {
      main: '#00d4aa',
      light: '#33ddb8',
      dark: '#00a085',
    },
    
    warning: {
      main: '#ffb800',
      light: '#ffc733',
      dark: '#cc9200',
    },
    
    error: {
      main: '#ff3366',
      light: '#ff5c85',
      dark: '#cc2952',
    },
    
    info: {
      main: '#00aaff',
      light: '#33bbff',
      dark: '#0088cc',
    },
    
    // 🌌 量子色彩扩展
    quantum: {
      primary: defaultTokens.colors.quantum.primary,
      secondary: defaultTokens.colors.quantum.secondary,
      accent: defaultTokens.colors.quantum.accent,
      tertiary: defaultTokens.colors.quantum.tertiary,
    },
    
    // ⚡ 霓虹色彩
    neon: {
      blue: defaultTokens.colors.neon.blue,
      pink: defaultTokens.colors.neon.pink,
      green: defaultTokens.colors.neon.green,
      orange: defaultTokens.colors.neon.orange,
      purple: defaultTokens.colors.neon.purple,
      yellow: defaultTokens.colors.neon.yellow,
    },
    
    // 💎 玻璃表面
    glass: {
      surface: defaultTokens.colors.glass.surface,
      surfaceHover: defaultTokens.colors.glass.surfaceHover,
      card: defaultTokens.colors.glass.card,
      modal: defaultTokens.colors.glass.modal,
      border: defaultTokens.colors.glass.border,
    },
    
    // 🏗️ 工程色彩
    engineering: defaultTokens.colors.engineering,
  },
  
  // 🎨 字体配置
  typography: {
    fontFamily: defaultTokens.typography.fontFamily.primary,
    
    // 标题字体
    h1: {
      ...defaultTokens.typography.preset.heroTitle,
      '@media (max-width:600px)': {
        fontSize: defaultTokens.typography.fontSize['4xl'],
      },
    },
    
    h2: {
      fontSize: defaultTokens.typography.fontSize['3xl'],
      fontWeight: defaultTokens.typography.fontWeight.semiBold,
      lineHeight: defaultTokens.typography.lineHeight.tight,
      letterSpacing: defaultTokens.typography.letterSpacing.tight,
      fontFamily: defaultTokens.typography.fontFamily.display,
    },
    
    h3: {
      fontSize: defaultTokens.typography.fontSize['2xl'],
      fontWeight: defaultTokens.typography.fontWeight.semiBold,
      lineHeight: defaultTokens.typography.lineHeight.snug,
      letterSpacing: defaultTokens.typography.letterSpacing.tight,
    },
    
    h4: {
      fontSize: defaultTokens.typography.fontSize.xl,
      fontWeight: defaultTokens.typography.fontWeight.medium,
      lineHeight: defaultTokens.typography.lineHeight.snug,
    },
    
    h5: {
      fontSize: defaultTokens.typography.fontSize.lg,
      fontWeight: defaultTokens.typography.fontWeight.medium,
      lineHeight: defaultTokens.typography.lineHeight.normal,
    },
    
    h6: {
      fontSize: defaultTokens.typography.fontSize.base,
      fontWeight: defaultTokens.typography.fontWeight.semiBold,
      lineHeight: defaultTokens.typography.lineHeight.normal,
    },
    
    // 正文字体
    body1: defaultTokens.typography.preset.bodyBase,
    body2: defaultTokens.typography.preset.bodySmall,
    
    // 按钮字体
    button: {
      ...defaultTokens.typography.preset.button,
      textTransform: 'none',
    },
    
    // 标题字体
    caption: {
      fontSize: defaultTokens.typography.fontSize.xs,
      fontWeight: defaultTokens.typography.fontWeight.medium,
      lineHeight: defaultTokens.typography.lineHeight.snug,
      letterSpacing: defaultTokens.typography.letterSpacing.wide,
      textTransform: 'uppercase' as const,
    },
    
    // 代码字体
    subtitle1: {
      fontSize: defaultTokens.typography.fontSize.lg,
      fontWeight: defaultTokens.typography.fontWeight.medium,
      lineHeight: defaultTokens.typography.lineHeight.normal,
    },
    
    subtitle2: {
      fontSize: defaultTokens.typography.fontSize.sm,
      fontWeight: defaultTokens.typography.fontWeight.medium,
      lineHeight: defaultTokens.typography.lineHeight.snug,
    },
  },
  
  // 🎭 形状配置
  shape: {
    borderRadius: parseInt(defaultTokens.borderRadius.medium.replace('rem', '')) * 16, // 转换为px
  },
  
  // 🌫️ 阴影配置
  shadows: [
    'none',
    defaultTokens.shadows.xs,
    defaultTokens.shadows.sm,
    defaultTokens.shadows.md,
    defaultTokens.shadows.lg,
    defaultTokens.shadows.xl,
    defaultTokens.shadows['2xl'],
    defaultTokens.shadows.quantum.float,
    defaultTokens.shadows.quantum.hover,
    defaultTokens.shadows.quantum.levitate,
    defaultTokens.shadows.glass.light,
    defaultTokens.shadows.glass.medium,
    defaultTokens.shadows.glass.heavy,
    defaultTokens.shadows.neon.blue,
    defaultTokens.shadows.neon.pink,
    defaultTokens.shadows.neon.green,
    defaultTokens.shadows.neon.purple,
    defaultTokens.shadows.card,
    defaultTokens.shadows.cardHover,
    defaultTokens.shadows.modal,
    defaultTokens.shadows.dropdown,
    defaultTokens.shadows.button,
    defaultTokens.shadows.buttonHover,
    defaultTokens.shadows.inner.light,
    defaultTokens.shadows.inner.medium,
  ],
  
  // 🚀 量子扩展配置
  quantum: {
    // 特殊阴影
    shadows: {
      neon: defaultTokens.shadows.neon,
      glass: defaultTokens.shadows.glass,
      quantum: defaultTokens.shadows.quantum,
    },
    
    // 动效预设
    transitions: {
      preset: defaultTokens.transitions.preset,
    },
    
    // 滤镜效果
    filters: {
      backdrop: defaultTokens.filters.backdrop,
      glow: {
        primary: `drop-shadow(0 0 20px ${defaultTokens.colors.quantum.primary})`,
        secondary: `drop-shadow(0 0 20px ${defaultTokens.colors.quantum.secondary})`,
        accent: `drop-shadow(0 0 20px ${defaultTokens.colors.quantum.accent})`,
      },
    },
  },
  
  // 🎨 组件配置
  components: {
    // 按钮组件
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: defaultTokens.borderRadius.medium,
          fontWeight: defaultTokens.typography.fontWeight.medium,
          transition: defaultTokens.transitions.preset.buttonHover,
          
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: defaultTokens.shadows.buttonHover,
          },
        },
        
        containedPrimary: {
          background: defaultTokens.colors.quantum.primary,
          boxShadow: defaultTokens.shadows.button,
          
          '&:hover': {
            background: defaultTokens.colors.quantum.primary,
            filter: 'brightness(1.1)',
            boxShadow: defaultTokens.shadows.quantum.hover,
          },
        },
        
        containedSecondary: {
          background: defaultTokens.colors.quantum.secondary,
          boxShadow: defaultTokens.shadows.button,
          
          '&:hover': {
            background: defaultTokens.colors.quantum.secondary,
            filter: 'brightness(1.1)',
            boxShadow: defaultTokens.shadows.quantum.hover,
          },
        },
      },
    },
    
    // 卡片组件
    MuiCard: {
      styleOverrides: {
        root: {
          background: defaultTokens.colors.glass.card,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${defaultTokens.colors.glass.border}`,
          borderRadius: defaultTokens.borderRadius.card,
          boxShadow: defaultTokens.shadows.card,
          transition: defaultTokens.transitions.preset.cardHover,
          
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: defaultTokens.shadows.cardHover,
            borderColor: defaultTokens.colors.glass.borderGlow,
          },
        },
      },
    },
    
    // 纸张组件
    MuiPaper: {
      styleOverrides: {
        root: {
          background: defaultTokens.colors.glass.surface,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${defaultTokens.colors.glass.border}`,
        },
      },
    },
    
    // 输入框组件
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: defaultTokens.colors.glass.surface,
            backdropFilter: 'blur(8px)',
            borderRadius: defaultTokens.borderRadius.input,
            transition: defaultTokens.transitions.preset.quantumFade,
            
            '&:hover': {
              background: defaultTokens.colors.glass.surfaceHover,
            },
            
            '&.Mui-focused': {
              background: defaultTokens.colors.glass.surfaceActive,
              boxShadow: defaultTokens.shadows.quantum.float,
            },
            
            '& fieldset': {
              borderColor: defaultTokens.colors.glass.border,
            },
            
            '&:hover fieldset': {
              borderColor: defaultTokens.colors.glass.borderGlow,
            },
            
            '&.Mui-focused fieldset': {
              borderColor: defaultTokens.colors.glass.borderFocus,
              boxShadow: defaultTokens.shadows.neon.blue,
            },
          },
        },
      },
    },
    
    // 应用栏组件
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: defaultTokens.colors.glass.surface,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${defaultTokens.colors.glass.border}`,
          boxShadow: defaultTokens.shadows.glass.light,
        },
      },
    },
    
    // 抽屉组件
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: defaultTokens.colors.glass.surface,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: `1px solid ${defaultTokens.colors.glass.border}`,
        },
      },
    },
    
    // 对话框组件
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: defaultTokens.colors.glass.modal,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${defaultTokens.colors.glass.border}`,
          borderRadius: defaultTokens.borderRadius.modal,
          boxShadow: defaultTokens.shadows.modal,
        },
      },
    },
    
    // 工具提示组件
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: defaultTokens.colors.glass.card,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${defaultTokens.colors.glass.border}`,
          borderRadius: defaultTokens.borderRadius.tooltip,
          boxShadow: defaultTokens.shadows.dropdown,
        },
      },
    },
  },
};

// 🌅 量子主题配置 - 浅色模式
const quantumLightTheme: ThemeOptions = {
  ...quantumDarkTheme,
  palette: {
    ...quantumDarkTheme.palette,
    mode: 'light',
    
    background: {
      default: '#ffffff',
      paper: 'rgba(255, 255, 255, 0.8)',
    },
    
    text: {
      primary: '#0f172a',
      secondary: 'rgba(15, 23, 42, 0.7)',
      disabled: 'rgba(15, 23, 42, 0.4)',
    },
    
    divider: 'rgba(15, 23, 42, 0.12)',
  },
};

// 🚀 创建主题实例
export const createQuantumTheme = (mode: 'light' | 'dark' = 'dark'): Theme => {
  const themeOptions = mode === 'light' ? quantumLightTheme : quantumDarkTheme;
  return createTheme(themeOptions);
};

// 🌌 默认导出深色量子主题
export const quantumTheme = createQuantumTheme('dark');
export const quantumLightThemeInstance = createQuantumTheme('light');

export default quantumTheme;
