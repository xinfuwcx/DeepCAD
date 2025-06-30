/**
 * @file modernTheme.ts
 * @description 现代化MUI主题配置
 * @author GitHub Copilot - 设计大咖
 */

import { createTheme, ThemeOptions } from '@mui/material/styles';
import { defaultTokens } from '../tokens/defaultTokens';

// 创建现代化主题
export const createModernTheme = (mode: 'light' | 'dark' = 'light') => {
  const colors = mode === 'light' ? defaultTokens.colors.light : defaultTokens.colors.dark;
  
  const themeOptions: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: defaultTokens.colors.primary,
        light: defaultTokens.colors.primaryLight,
        dark: defaultTokens.colors.primaryDark,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: defaultTokens.colors.secondary,
        light: defaultTokens.colors.secondaryLight,
        dark: defaultTokens.colors.secondaryDark,
        contrastText: '#FFFFFF',
      },
      success: {
        main: defaultTokens.colors.success,
        light: '#6EE7B7',
        dark: '#065F46',
      },
      warning: {
        main: defaultTokens.colors.warning,
        light: '#FDE68A',
        dark: '#92400E',
      },
      error: {
        main: defaultTokens.colors.error,
        light: '#FCA5A5',
        dark: '#991B1B',
      },
      info: {
        main: defaultTokens.colors.info,
        light: '#93C5FD',
        dark: '#1E40AF',
      },
      background: {
        default: colors.background,
        paper: colors.surface,
      },
      text: {
        primary: colors.textPrimary,
        secondary: colors.textSecondary,
        disabled: mode === 'light' ? defaultTokens.colors.light.textDisabled : colors.textSecondary,
      },
      divider: colors.border,
    },
    
    typography: {
      fontFamily: defaultTokens.typography.fontFamily.primary,
      h1: {
        ...defaultTokens.typography.heading.h1,
        fontFamily: defaultTokens.typography.fontFamily.display,
        background: defaultTokens.colors.gradient.primary,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      },
      h2: {
        ...defaultTokens.typography.heading.h2,
        fontFamily: defaultTokens.typography.fontFamily.display,
      },
      h3: defaultTokens.typography.heading.h3,
      h4: defaultTokens.typography.heading.h4,
      h5: defaultTokens.typography.heading.h5,
      h6: defaultTokens.typography.heading.h6,
      body1: defaultTokens.typography.body.base,
      body2: defaultTokens.typography.body.small,
      button: {
        ...defaultTokens.typography.button,
        fontWeight: 500,
        textTransform: 'none',
      },
      caption: defaultTokens.typography.caption,
      overline: {
        ...defaultTokens.typography.overline,
        textTransform: 'uppercase' as const,
      },
    },
    
    shape: {
      borderRadius: parseInt(defaultTokens.borderRadius.lg),
    },
    
    spacing: 8, // 基础间距单位
    
    shadows: [
      'none',
      defaultTokens.shadows.xs,
      defaultTokens.shadows.sm,
      defaultTokens.shadows.md,
      defaultTokens.shadows.lg,
      defaultTokens.shadows.xl,
      defaultTokens.shadows['2xl'],
      defaultTokens.shadows.card,
      defaultTokens.shadows.cardHover,
      defaultTokens.shadows.button,
      defaultTokens.shadows.buttonHover,
      defaultTokens.shadows.modal,
      defaultTokens.shadows.dropdown,
      defaultTokens.shadows.glow,
      defaultTokens.shadows.glowSecondary,
      defaultTokens.shadows.inner,
      defaultTokens.shadows['2xl'],
      defaultTokens.shadows['2xl'],
      defaultTokens.shadows['2xl'],
      defaultTokens.shadows['2xl'],
      defaultTokens.shadows['2xl'],
      defaultTokens.shadows['2xl'],
      defaultTokens.shadows['2xl'],
      defaultTokens.shadows['2xl'],
      defaultTokens.shadows['2xl'],
    ],
    
    transitions: {
      duration: {
        shortest: parseInt(defaultTokens.transitions.duration.fast),
        shorter: parseInt(defaultTokens.transitions.duration.normal),
        short: parseInt(defaultTokens.transitions.duration.normal),
        standard: parseInt(defaultTokens.transitions.duration.slow),
        complex: parseInt(defaultTokens.transitions.duration.slower),
        enteringScreen: parseInt(defaultTokens.transitions.duration.normal),
        leavingScreen: parseInt(defaultTokens.transitions.duration.fast),
      },
      easing: {
        easeInOut: defaultTokens.transitions.easing.easeInOut,
        easeOut: defaultTokens.transitions.easing.easeOut,
        easeIn: defaultTokens.transitions.easing.easeIn,
        sharp: defaultTokens.transitions.easing.sharp,
      },
    },
    
    zIndex: {
      mobileStepper: defaultTokens.zIndex.sticky,
      speedDial: defaultTokens.zIndex.dropdown,
      appBar: defaultTokens.zIndex.banner,
      drawer: defaultTokens.zIndex.overlay,
      modal: defaultTokens.zIndex.modal,
      snackbar: defaultTokens.zIndex.toast,
      tooltip: defaultTokens.zIndex.tooltip,
    },
    
    components: {
      // 全局样式重置
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily: defaultTokens.typography.fontFamily.primary,
            background: mode === 'light' 
              ? `linear-gradient(135deg, ${colors.background} 0%, ${defaultTokens.colors.light.backgroundSecondary} 100%)`
              : defaultTokens.colors.gradient.dark,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: colors.surfaceVariant,
            },
            '&::-webkit-scrollbar-thumb': {
              background: colors.border,
              borderRadius: '4px',
              '&:hover': {
                background: colors.textSecondary,
              },
            },
          },
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: `${colors.border} ${colors.surfaceVariant}`,
          },
        },
      },
      
      // 按钮组件
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: defaultTokens.borderRadius.button,
            transition: defaultTokens.transitions.smooth,
            boxShadow: defaultTokens.shadows.button,
            '&:hover': {
              boxShadow: defaultTokens.shadows.buttonHover,
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          },
          contained: {
            background: defaultTokens.colors.gradient.primary,
            '&:hover': {
              background: defaultTokens.colors.gradient.primary,
              opacity: 0.9,
            },
          },
          outlined: {
            borderWidth: '2px',
            '&:hover': {
              borderWidth: '2px',
              background: defaultTokens.colors.primaryAlpha,
            },
          },
        },
      },
      
      // 卡片组件
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: defaultTokens.borderRadius.card,
            boxShadow: defaultTokens.shadows.card,
            border: `1px solid ${colors.border}`,
            transition: defaultTokens.transitions.smooth,
            overflow: 'hidden',
            background: mode === 'light' 
              ? defaultTokens.colors.gradient.surface
              : colors.surface,
            '&:hover': {
              boxShadow: defaultTokens.shadows.cardHover,
              transform: 'translateY(-2px)',
            },
          },
        },
      },
      
      // 纸张组件
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: defaultTokens.borderRadius.lg,
            border: `1px solid ${colors.border}`,
          },
        },
      },
      
      // 输入框组件
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: defaultTokens.borderRadius.input,
              transition: defaultTokens.transitions.smooth,
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: defaultTokens.colors.primary,
                borderWidth: '2px',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: defaultTokens.colors.primary,
                borderWidth: '2px',
                boxShadow: `0 0 0 3px ${defaultTokens.colors.primaryAlpha}`,
              },
            },
          },
        },
      },
      
      // 应用栏
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: mode === 'light' 
              ? `${colors.surface}CC` // 80% 透明度
              : `${colors.surface}CC`,
            backdropFilter: `blur(${defaultTokens.blur.backdrop})`,
            borderBottom: `1px solid ${colors.border}`,
            boxShadow: defaultTokens.shadows.sm,
          },
        },
      },
      
      // 抽屉
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: mode === 'light' 
              ? `${colors.surface}F5` // 96% 透明度
              : `${colors.surface}F5`,
            backdropFilter: `blur(${defaultTokens.blur.backdrop})`,
            borderRight: `1px solid ${colors.border}`,
          },
        },
      },
      
      // 对话框
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: defaultTokens.borderRadius.modal,
            boxShadow: defaultTokens.shadows.modal,
          },
        },
      },
      
      // 菜单
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: defaultTokens.borderRadius.lg,
            boxShadow: defaultTokens.shadows.dropdown,
            border: `1px solid ${colors.border}`,
          },
        },
      },
      
      // 标签页
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            minHeight: '48px',
            '&.Mui-selected': {
              background: defaultTokens.colors.primaryAlpha,
            },
          },
        },
      },
      
      // 芯片组件
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: defaultTokens.borderRadius.lg,
            fontWeight: 500,
          },
        },
      },
    },
  };
  
  return createTheme(themeOptions);
};

// 导出默认主题
export const lightTheme = createModernTheme('light');
export const darkTheme = createModernTheme('dark');
