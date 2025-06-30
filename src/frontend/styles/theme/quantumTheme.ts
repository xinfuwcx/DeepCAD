import { createTheme, ThemeOptions } from '@mui/material/styles';
import { PaletteOptions } from '@mui/material/styles/createPalette';
import { TypographyOptions } from '@mui/material/styles/createTypography';
import { quantumTokens } from '../tokens/quantumTokens';

/**
 * 量子主题 - 未来科技风UI主题
 * 基于Material-UI的主题系统，应用量子设计令牌
 */

// 调色板配置
const palette: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: quantumTokens.colors.quantumBrightStart,
    light: quantumTokens.colors.quantumBrightEnd,
    dark: quantumTokens.colors.quantumDeepStart,
    contrastText: '#ffffff',
  },
  secondary: {
    main: quantumTokens.colors.quantumEnergyStart,
    light: quantumTokens.colors.quantumEnergyEnd,
    dark: quantumTokens.colors.neonStress,
    contrastText: '#ffffff',
  },
  error: {
    main: quantumTokens.colors.neonStress,
    light: '#ff4d94',
    dark: '#c50062',
    contrastText: '#ffffff',
  },
  warning: {
    main: quantumTokens.colors.neonWarning,
    light: '#ff944d',
    dark: '#cc5200',
    contrastText: '#ffffff',
  },
  info: {
    main: quantumTokens.colors.neonDisplacement,
    light: '#66ffff',
    dark: '#00cccc',
    contrastText: '#000000',
  },
  success: {
    main: quantumTokens.colors.neonFlow,
    light: '#66ff4d',
    dark: '#2dcc10',
    contrastText: '#000000',
  },
  background: {
    default: quantumTokens.colors.quantumVoid,
    paper: 'rgba(26, 26, 46, 0.8)',
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    disabled: 'rgba(255, 255, 255, 0.5)',
  },
  divider: 'rgba(255, 255, 255, 0.12)',
  
  // 自定义颜色
  engineering: {
    soil: quantumTokens.colors.engineeringSoil,
    concrete: quantumTokens.colors.engineeringConcrete,
    steel: quantumTokens.colors.engineeringSteel,
    water: quantumTokens.colors.engineeringWater,
  } as any,
  glass: {
    surface: quantumTokens.colors.glassSurface,
    elevated: quantumTokens.colors.glassElevated,
    active: quantumTokens.colors.glassActive,
  } as any,
  quantum: {
    void: quantumTokens.colors.quantumVoid,
    deep: quantumTokens.colors.quantumDeep,
    bright: quantumTokens.colors.quantumBright,
    energy: quantumTokens.colors.quantumEnergy,
  } as any,
};

// 排版配置
const typography: TypographyOptions = {
  fontFamily: quantumTokens.typography.fontFamily.primary,
  fontSize: 14,
  fontWeightLight: quantumTokens.typography.fontWeight.light,
  fontWeightRegular: quantumTokens.typography.fontWeight.regular,
  fontWeightMedium: quantumTokens.typography.fontWeight.medium,
  fontWeightBold: quantumTokens.typography.fontWeight.bold,
  h1: {
    fontFamily: quantumTokens.typography.fontFamily.display,
    fontSize: quantumTokens.typography.fontSize['5xl'],
    fontWeight: quantumTokens.typography.fontWeight.bold,
    letterSpacing: '-0.01562em',
  },
  h2: {
    fontFamily: quantumTokens.typography.fontFamily.display,
    fontSize: quantumTokens.typography.fontSize['4xl'],
    fontWeight: quantumTokens.typography.fontWeight.semiBold,
    letterSpacing: '-0.00833em',
  },
  h3: {
    fontFamily: quantumTokens.typography.fontFamily.display,
    fontSize: quantumTokens.typography.fontSize['3xl'],
    fontWeight: quantumTokens.typography.fontWeight.semiBold,
    letterSpacing: '0em',
  },
  h4: {
    fontSize: quantumTokens.typography.fontSize['2xl'],
    fontWeight: quantumTokens.typography.fontWeight.semiBold,
    letterSpacing: '0.00735em',
  },
  h5: {
    fontSize: quantumTokens.typography.fontSize['xl'],
    fontWeight: quantumTokens.typography.fontWeight.semiBold,
    letterSpacing: '0em',
  },
  h6: {
    fontSize: quantumTokens.typography.fontSize.lg,
    fontWeight: quantumTokens.typography.fontWeight.semiBold,
    letterSpacing: '0.0075em',
  },
  subtitle1: {
    fontSize: quantumTokens.typography.fontSize.lg,
    fontWeight: quantumTokens.typography.fontWeight.medium,
    letterSpacing: '0.00938em',
  },
  subtitle2: {
    fontSize: quantumTokens.typography.fontSize.md,
    fontWeight: quantumTokens.typography.fontWeight.medium,
    letterSpacing: '0.00714em',
  },
  body1: {
    fontSize: quantumTokens.typography.fontSize.md,
    fontWeight: quantumTokens.typography.fontWeight.regular,
    letterSpacing: '0.00938em',
  },
  body2: {
    fontSize: quantumTokens.typography.fontSize.sm,
    fontWeight: quantumTokens.typography.fontWeight.regular,
    letterSpacing: '0.01071em',
  },
  button: {
    fontSize: quantumTokens.typography.fontSize.sm,
    fontWeight: quantumTokens.typography.fontWeight.medium,
    letterSpacing: '0.02857em',
    textTransform: 'none',
  },
  caption: {
    fontSize: quantumTokens.typography.fontSize.xs,
    fontWeight: quantumTokens.typography.fontWeight.regular,
    letterSpacing: '0.03333em',
  },
  overline: {
    fontFamily: quantumTokens.typography.fontFamily.display,
    fontSize: quantumTokens.typography.fontSize.xs,
    fontWeight: quantumTokens.typography.fontWeight.regular,
    letterSpacing: '0.08333em',
    textTransform: 'uppercase',
  },
};

// 量子主题选项
const quantumThemeOptions: ThemeOptions = {
  palette,
  typography,
  shape: {
    borderRadius: parseInt(quantumTokens.borderRadius.md),
  },
  shadows: [
    'none',
    quantumTokens.shadows.glass.sm,
    quantumTokens.shadows.glass.sm,
    quantumTokens.shadows.glass.sm,
    quantumTokens.shadows.glass.md,
    quantumTokens.shadows.glass.md,
    quantumTokens.shadows.glass.md,
    quantumTokens.shadows.glass.md,
    quantumTokens.shadows.glass.md,
    quantumTokens.shadows.glass.lg,
    quantumTokens.shadows.glass.lg,
    quantumTokens.shadows.glass.lg,
    quantumTokens.shadows.glass.lg,
    quantumTokens.shadows.glass.lg,
    quantumTokens.shadows.glass.lg,
    quantumTokens.shadows.glass.lg,
    quantumTokens.shadows.glass.lg,
    quantumTokens.shadows.glass.lg,
    quantumTokens.shadows.glass.lg,
    quantumTokens.shadows.glass.lg,
    quantumTokens.shadows.glass.lg,
    quantumTokens.shadows.glass.lg,
    quantumTokens.shadows.glass.lg,
    quantumTokens.shadows.glass.lg,
    quantumTokens.shadows.glass.lg,
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: quantumTokens.colors.backgroundDark,
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
          minHeight: '100vh',
          scrollBehavior: 'smooth',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(0, 0, 0, 0.1)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.3)',
            },
          },
        },
        '@font-face': [
          {
            fontFamily: 'Exo 2',
            fontStyle: 'normal',
            fontDisplay: 'swap',
            fontWeight: 400,
            src: `
              url(https://fonts.gstatic.com/s/exo2/v10/7cH1v4okm5zmbvwkAx_sfcEuiD8jvvKsOdC_.woff2) format('woff2')
            `,
          },
          {
            fontFamily: 'Orbitron',
            fontStyle: 'normal',
            fontDisplay: 'swap',
            fontWeight: 400,
            src: `
              url(https://fonts.gstatic.com/s/orbitron/v19/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1nyGy6xpmIyXw.woff2) format('woff2')
            `,
          },
          {
            fontFamily: 'JetBrains Mono',
            fontStyle: 'normal',
            fontDisplay: 'swap',
            fontWeight: 400,
            src: `
              url(https://fonts.gstatic.com/s/jetbrainsmono/v6/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxTOlOV.woff2) format('woff2')
            `,
          },
        ],
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(10, 14, 39, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: quantumTokens.borderRadius.md,
          padding: `${quantumTokens.spacing.sm} ${quantumTokens.spacing.lg}`,
          transition: quantumTokens.animation.transitions.normal,
        },
        contained: {
          backgroundImage: ({ ownerState }) => {
            if (ownerState.color === 'primary') return quantumTokens.colors.quantumBright;
            if (ownerState.color === 'secondary') return quantumTokens.colors.quantumEnergy;
            return 'none';
          },
          '&:hover': {
            boxShadow: ({ ownerState }) => {
              if (ownerState.color === 'primary')
                return quantumTokens.shadows.glow.subtle(quantumTokens.colors.quantumBrightEnd);
              if (ownerState.color === 'secondary')
                return quantumTokens.shadows.glow.subtle(quantumTokens.colors.quantumEnergyEnd);
              return 'none';
            },
          },
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.23)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: quantumTokens.components.glassCard.background,
          backdropFilter: quantumTokens.components.glassCard.backdropFilter,
          borderRadius: quantumTokens.borderRadius.lg,
          border: quantumTokens.components.glassCard.border,
          boxShadow: quantumTokens.components.glassCard.boxShadow,
          overflow: 'hidden',
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(26, 26, 46, 0.8)',
          backgroundImage: 'none',
          boxShadow: 'none',
          borderRadius: quantumTokens.borderRadius.md,
        },
        elevation1: {
          boxShadow: quantumTokens.shadows.glass.sm,
        },
        elevation2: {
          boxShadow: quantumTokens.shadows.glass.md,
        },
        elevation3: {
          boxShadow: quantumTokens.shadows.glass.lg,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: quantumTokens.borderRadius.md,
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.23)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: quantumTokens.colors.quantumBrightEnd,
              boxShadow: quantumTokens.shadows.glow.subtle(quantumTokens.colors.quantumBrightEnd),
            },
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 42,
          height: 26,
          padding: 0,
          '& .MuiSwitch-switchBase': {
            padding: 0,
            margin: 2,
            transitionDuration: '300ms',
            '&.Mui-checked': {
              transform: 'translateX(16px)',
              color: '#fff',
              '& + .MuiSwitch-track': {
                backgroundColor: quantumTokens.colors.quantumBrightStart,
                opacity: 1,
                border: 0,
              },
              '&.Mui-disabled + .MuiSwitch-track': {
                opacity: 0.5,
              },
            },
          },
          '& .MuiSwitch-thumb': {
            boxSizing: 'border-box',
            width: 22,
            height: 22,
          },
          '& .MuiSwitch-track': {
            borderRadius: 26 / 2,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            opacity: 1,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: quantumTokens.borderRadius.full,
        },
        filled: {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          },
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.23)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(10, 14, 39, 0.9)',
          backdropFilter: 'blur(4px)',
          boxShadow: quantumTokens.shadows.glass.sm,
          borderRadius: quantumTokens.borderRadius.sm,
          padding: `${quantumTokens.spacing.xs} ${quantumTokens.spacing.sm}`,
          fontSize: quantumTokens.typography.fontSize.xs,
        },
        arrow: {
          color: 'rgba(10, 14, 39, 0.9)',
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          padding: quantumTokens.spacing.xs,
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: quantumTokens.borderRadius.sm,
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
            },
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          '& .MuiTabs-indicator': {
            backgroundColor: quantumTokens.colors.quantumBrightEnd,
            height: 3,
            borderRadius: quantumTokens.borderRadius.full,
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: quantumTokens.typography.fontWeight.medium,
          '&.Mui-selected': {
            color: quantumTokens.colors.quantumBrightEnd,
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255, 255, 255, 0.12)',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          '& .MuiSlider-thumb': {
            '&:hover, &.Mui-active': {
              boxShadow: `0 0 0 8px ${quantumTokens.colors.glassSurface}`,
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(26, 26, 46, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: quantumTokens.borderRadius.lg,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: quantumTokens.shadows.glass.lg,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: quantumTokens.borderRadius.md,
        },
        standardSuccess: {
          backgroundColor: 'rgba(57, 255, 20, 0.15)',
          color: quantumTokens.colors.neonFlow,
        },
        standardInfo: {
          backgroundColor: 'rgba(0, 255, 255, 0.15)',
          color: quantumTokens.colors.neonDisplacement,
        },
        standardWarning: {
          backgroundColor: 'rgba(255, 102, 0, 0.15)',
          color: quantumTokens.colors.neonWarning,
        },
        standardError: {
          backgroundColor: 'rgba(255, 0, 128, 0.15)',
          color: quantumTokens.colors.neonStress,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(26, 26, 46, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: quantumTokens.borderRadius.md,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: quantumTokens.shadows.glass.md,
        },
      },
    },
  },
};

// 创建量子主题
export const quantumTheme = createTheme(quantumThemeOptions);

export default quantumTheme; 