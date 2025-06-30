/**
 * @file createEnhancedTheme.ts
 * @description 创建增强的Material-UI主题
 * @author GitHub Copilot
 */

import { createTheme, Theme, ThemeOptions } from '@mui/material/styles';
import { defaultTokens, DesignTokens } from './defaultTokens';

export const createEnhancedTheme = (tokens: DesignTokens = defaultTokens): Theme => {
  const themeOptions: ThemeOptions = {
    palette: {
      mode: 'light',
      primary: {
        main: tokens.colors.primary,
        light: tokens.colors.primaryLight,
        dark: tokens.colors.primaryDark,
        contrastText: '#ffffff',
      },
      secondary: {
        main: tokens.colors.secondary,
        light: tokens.colors.secondaryLight,
        dark: tokens.colors.secondaryDark,
        contrastText: '#ffffff',
      },
      error: {
        main: tokens.colors.error,
      },
      warning: {
        main: tokens.colors.warning,
      },
      info: {
        main: tokens.colors.info,
      },
      success: {
        main: tokens.colors.success,
      },
      background: {
        default: tokens.colors.background,
        paper: tokens.colors.surface,
      },
      text: {
        primary: tokens.colors.textPrimary,
        secondary: tokens.colors.textSecondary,
        disabled: tokens.colors.textDisabled,
      },
      divider: tokens.colors.border,
    },
    
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", "Microsoft YaHei", sans-serif',
      h1: {
        fontSize: tokens.typography.h1.size,
        fontWeight: tokens.typography.h1.weight,
        lineHeight: tokens.typography.h1.lineHeight,
      },
      h2: {
        fontSize: tokens.typography.h2.size,
        fontWeight: tokens.typography.h2.weight,
        lineHeight: tokens.typography.h2.lineHeight,
      },
      h3: {
        fontSize: tokens.typography.h3.size,
        fontWeight: tokens.typography.h3.weight,
        lineHeight: tokens.typography.h3.lineHeight,
      },
      h4: {
        fontSize: tokens.typography.h4.size,
        fontWeight: tokens.typography.h4.weight,
        lineHeight: tokens.typography.h4.lineHeight,
      },
      h5: {
        fontSize: tokens.typography.h5.size,
        fontWeight: tokens.typography.h5.weight,
        lineHeight: tokens.typography.h5.lineHeight,
      },
      h6: {
        fontSize: tokens.typography.h6.size,
        fontWeight: tokens.typography.h6.weight,
        lineHeight: tokens.typography.h6.lineHeight,
      },
      subtitle1: {
        fontSize: tokens.typography.subtitle1.size,
        fontWeight: tokens.typography.subtitle1.weight,
        lineHeight: tokens.typography.subtitle1.lineHeight,
      },
      subtitle2: {
        fontSize: tokens.typography.subtitle2.size,
        fontWeight: tokens.typography.subtitle2.weight,
        lineHeight: tokens.typography.subtitle2.lineHeight,
      },
      body1: {
        fontSize: tokens.typography.body1.size,
        fontWeight: tokens.typography.body1.weight,
        lineHeight: tokens.typography.body1.lineHeight,
      },
      body2: {
        fontSize: tokens.typography.body2.size,
        fontWeight: tokens.typography.body2.weight,
        lineHeight: tokens.typography.body2.lineHeight,
      },
      button: {
        fontSize: tokens.typography.button.size,
        fontWeight: tokens.typography.button.weight,
        lineHeight: tokens.typography.button.lineHeight,
        textTransform: 'none' as const,
      },
      caption: {
        fontSize: tokens.typography.caption.size,
        fontWeight: tokens.typography.caption.weight,
        lineHeight: tokens.typography.caption.lineHeight,
      },
      overline: {
        fontSize: tokens.typography.overline.size,
        fontWeight: tokens.typography.overline.weight,
        lineHeight: tokens.typography.overline.lineHeight,
      },
    },
    
    spacing: 8, // 基础间距单位
    
    shape: {
      borderRadius: parseInt(tokens.borderRadius.medium),
    },
    
    shadows: [
      'none',
      tokens.shadows.elevation1,
      tokens.shadows.elevation2,
      tokens.shadows.elevation3,
      tokens.shadows.elevation4,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
      tokens.shadows.elevation5,
    ],
    
    transitions: {
      duration: {
        shortest: parseInt(tokens.transitions.duration.shortest),
        shorter: parseInt(tokens.transitions.duration.shorter),
        short: parseInt(tokens.transitions.duration.short),
        standard: parseInt(tokens.transitions.duration.standard),
        complex: parseInt(tokens.transitions.duration.complex),
        enteringScreen: parseInt(tokens.transitions.duration.enteringScreen),
        leavingScreen: parseInt(tokens.transitions.duration.leavingScreen),
      },
      easing: {
        easeInOut: tokens.transitions.easing.easeInOut,
        easeOut: tokens.transitions.easing.easeOut,
        easeIn: tokens.transitions.easing.easeIn,
        sharp: tokens.transitions.easing.sharp,
      },
    },
    
    zIndex: {
      mobileStepper: tokens.zIndex.mobileStepper,
      speedDial: tokens.zIndex.speedDial,
      appBar: tokens.zIndex.appBar,
      drawer: tokens.zIndex.drawer,
      modal: tokens.zIndex.modal,
      snackbar: tokens.zIndex.snackbar,
      tooltip: tokens.zIndex.tooltip,
    },
    
    components: {
      // 自定义组件样式
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: tokens.shadows.elevation2,
            borderBottom: `1px solid ${tokens.colors.border}`,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: tokens.shadows.elevation1,
            borderRadius: tokens.borderRadius.medium,
            border: `1px solid ${tokens.colors.borderLight}`,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.borderRadius.medium,
            textTransform: 'none',
            fontWeight: 500,
          },
          containedPrimary: {
            boxShadow: tokens.shadows.elevation1,
            '&:hover': {
              boxShadow: tokens.shadows.elevation2,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: tokens.borderRadius.medium,
          },
          elevation1: {
            boxShadow: tokens.shadows.elevation1,
          },
          elevation2: {
            boxShadow: tokens.shadows.elevation2,
          },
          elevation3: {
            boxShadow: tokens.shadows.elevation3,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${tokens.colors.border}`,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: tokens.typography.button.size,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: tokens.borderRadius.medium,
            },
          },
        },
      },
    },
  };
  
  return createTheme(themeOptions);
};
