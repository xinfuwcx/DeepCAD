/**
 * DeepCAD 科技未来感主题系统
 * 1号架构师 - 统一视觉体验
 */

import { designTokens } from './tokens';

// ==================== 主题接口定义 ====================

export interface ThemeConfig {
  name: string;
  displayName: string;
  mode: 'dark' | 'light';
  
  // 品牌色彩
  brand: {
    primary: string;
    secondary: string;
    accent: string;
    logo: string;
  };

  // 功能色彩
  semantic: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };

  // CAE专业色彩
  cae: {
    geometry: string;
    mesh: string;
    material: string;
    boundary: string;
    computing: string;
    converged: string;
    diverged: string;
    iterating: string;
    displacement: string;
    stress: string;
    strain: string;
    safety: string;
  };

  // 背景色系
  background: {
    primary: string;      // 主背景
    secondary: string;    // 次要背景
    tertiary: string;     // 三级背景
    surface: string;      // 表面
    elevated: string;     // 悬浮层
    glass: string;        // 玻璃效果
    glow: string;         // 辉光效果
  };

  // 文本色系
  text: {
    primary: string;      // 主要文本
    secondary: string;    // 次要文本
    tertiary: string;     // 辅助文本
    inverse: string;      // 反色文本
    muted: string;        // 静音文本
    accent: string;       // 强调文本
  };

  // 边框色系
  border: {
    primary: string;      // 主要边框
    secondary: string;    // 次要边框
    focus: string;        // 聚焦边框
    error: string;        // 错误边框
    success: string;      // 成功边框
    glow: string;         // 辉光边框
  };

  // 阴影系统
  shadows: {
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    glow: string;
    colorGlow: {
      primary: string;
      secondary: string;
      accent: string;
      success: string;
      warning: string;
      error: string;
    };
  };

  // 动画配置
  animation: {
    enabled: boolean;
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    timing: {
      smooth: string;
      snappy: string;
      entrance: string;
      exit: string;
    };
  };

  // 组件特定样式
  components: {
    button: {
      primary: ComponentTheme;
      secondary: ComponentTheme;
      outline: ComponentTheme;
      ghost: ComponentTheme;
    };
    input: ComponentTheme;
    card: ComponentTheme;
    modal: ComponentTheme;
    tooltip: ComponentTheme;
  };
}

export interface ComponentTheme {
  background: string;
  color: string;
  border: string;
  shadow: string;
  hover: {
    background: string;
    color: string;
    border: string;
    shadow: string;
  };
  active: {
    background: string;
    color: string;
    border: string;
    shadow: string;
  };
  disabled: {
    background: string;
    color: string;
    border: string;
    opacity: number;
  };
}

// ==================== 主题实现 ====================

/**
 * 深空科技主题 (Dark Mode)
 */
export const deepSpaceTechTheme: ThemeConfig = {
  name: 'deep-space-tech',
  displayName: '深空科技',
  mode: 'dark',

  brand: {
    primary: designTokens.colors.primary[500],
    secondary: designTokens.colors.secondary[500],
    accent: designTokens.colors.accent[500],
    logo: designTokens.colors.primary[400]
  },

  semantic: {
    success: designTokens.colors.semantic.success,
    warning: designTokens.colors.semantic.warning,
    error: designTokens.colors.semantic.error,
    info: designTokens.colors.semantic.info
  },

  cae: {
    geometry: designTokens.colors.semantic.geometry,
    mesh: designTokens.colors.semantic.mesh,
    material: designTokens.colors.semantic.material,
    boundary: designTokens.colors.semantic.boundary,
    computing: designTokens.colors.semantic.computing,
    converged: designTokens.colors.semantic.converged,
    diverged: designTokens.colors.semantic.diverged,
    iterating: designTokens.colors.semantic.iterating,
    displacement: designTokens.colors.semantic.displacement,
    stress: designTokens.colors.semantic.stress,
    strain: designTokens.colors.semantic.strain,
    safety: designTokens.colors.semantic.safety
  },

  background: {
    primary: designTokens.colors.background.primary,
    secondary: designTokens.colors.background.secondary,
    tertiary: designTokens.colors.background.tertiary,
    surface: designTokens.colors.background.surface,
    elevated: designTokens.colors.background.elevated,
    glass: designTokens.colors.background.glass,
    glow: designTokens.colors.background.glow
  },

  text: {
    primary: designTokens.colors.neutral[0],
    secondary: designTokens.colors.neutral[200],
    tertiary: designTokens.colors.neutral[400],
    inverse: designTokens.colors.neutral[900],
    muted: designTokens.colors.neutral[500],
    accent: designTokens.colors.primary[400]
  },

  border: {
    primary: designTokens.colors.neutral[700],
    secondary: designTokens.colors.neutral[800],
    focus: designTokens.colors.primary[500],
    error: designTokens.colors.semantic.error,
    success: designTokens.colors.semantic.success,
    glow: `0 0 0 1px ${designTokens.colors.primary[500]}40`
  },

  shadows: {
    sm: designTokens.shadows.sm,
    base: designTokens.shadows.base,
    md: designTokens.shadows.md,
    lg: designTokens.shadows.lg,
    xl: designTokens.shadows.xl,
    glow: designTokens.shadows.glow.base,
    colorGlow: {
      primary: designTokens.shadows.colorGlow.primary,
      secondary: designTokens.shadows.colorGlow.secondary,
      accent: designTokens.shadows.colorGlow.accent,
      success: designTokens.shadows.colorGlow.success,
      warning: designTokens.shadows.colorGlow.warning,
      error: designTokens.shadows.colorGlow.error
    }
  },

  animation: {
    enabled: true,
    duration: {
      fast: designTokens.animation.duration[150],
      normal: designTokens.animation.duration[300],
      slow: designTokens.animation.duration[500]
    },
    timing: {
      smooth: designTokens.animation.timing.smooth,
      snappy: designTokens.animation.timing.snappy,
      entrance: designTokens.animation.timing.entrance,
      exit: designTokens.animation.timing.exit
    }
  },

  components: {
    button: {
      primary: {
        background: designTokens.colors.primary[600],
        color: designTokens.colors.neutral[0],
        border: designTokens.colors.primary[600],
        shadow: designTokens.shadows.glow.sm,
        hover: {
          background: designTokens.colors.primary[500],
          color: designTokens.colors.neutral[0],
          border: designTokens.colors.primary[500],
          shadow: designTokens.shadows.glow.base
        },
        active: {
          background: designTokens.colors.primary[700],
          color: designTokens.colors.neutral[0],
          border: designTokens.colors.primary[700],
          shadow: designTokens.shadows.glow.sm
        },
        disabled: {
          background: designTokens.colors.neutral[800],
          color: designTokens.colors.neutral[500],
          border: designTokens.colors.neutral[800],
          opacity: 0.5
        }
      },
      secondary: {
        background: designTokens.colors.neutral[800],
        color: designTokens.colors.neutral[200],
        border: designTokens.colors.neutral[700],
        shadow: designTokens.shadows.sm,
        hover: {
          background: designTokens.colors.neutral[700],
          color: designTokens.colors.neutral[100],
          border: designTokens.colors.neutral[600],
          shadow: designTokens.shadows.base
        },
        active: {
          background: designTokens.colors.neutral[900],
          color: designTokens.colors.neutral[200],
          border: designTokens.colors.neutral[800],
          shadow: designTokens.shadows.sm
        },
        disabled: {
          background: designTokens.colors.neutral[900],
          color: designTokens.colors.neutral[600],
          border: designTokens.colors.neutral[800],
          opacity: 0.5
        }
      },
      outline: {
        background: 'transparent',
        color: designTokens.colors.primary[400],
        border: designTokens.colors.primary[600],
        shadow: 'none',
        hover: {
          background: `${designTokens.colors.primary[600]}10`,
          color: designTokens.colors.primary[300],
          border: designTokens.colors.primary[500],
          shadow: designTokens.shadows.glow.sm
        },
        active: {
          background: `${designTokens.colors.primary[600]}20`,
          color: designTokens.colors.primary[400],
          border: designTokens.colors.primary[600],
          shadow: 'none'
        },
        disabled: {
          background: 'transparent',
          color: designTokens.colors.neutral[600],
          border: designTokens.colors.neutral[800],
          opacity: 0.5
        }
      },
      ghost: {
        background: 'transparent',
        color: designTokens.colors.neutral[300],
        border: 'transparent',
        shadow: 'none',
        hover: {
          background: designTokens.colors.neutral[800],
          color: designTokens.colors.neutral[100],
          border: 'transparent',
          shadow: 'none'
        },
        active: {
          background: designTokens.colors.neutral[900],
          color: designTokens.colors.neutral[200],
          border: 'transparent',
          shadow: 'none'
        },
        disabled: {
          background: 'transparent',
          color: designTokens.colors.neutral[600],
          border: 'transparent',
          opacity: 0.5
        }
      }
    },

    input: {
      background: designTokens.colors.neutral[900],
      color: designTokens.colors.neutral[100],
      border: designTokens.colors.neutral[700],
      shadow: designTokens.shadows.inner,
      hover: {
        background: designTokens.colors.neutral[900],
        color: designTokens.colors.neutral[100],
        border: designTokens.colors.neutral[600],
        shadow: designTokens.shadows.inner
      },
      active: {
        background: designTokens.colors.neutral[900],
        color: designTokens.colors.neutral[50],
        border: designTokens.colors.primary[500],
        shadow: `${designTokens.shadows.inner}, ${designTokens.shadows.glow.sm}`
      },
      disabled: {
        background: designTokens.colors.neutral[950],
        color: designTokens.colors.neutral[600],
        border: designTokens.colors.neutral[800],
        opacity: 0.6
      }
    },

    card: {
      background: `linear-gradient(135deg, ${designTokens.colors.neutral[900]}80, ${designTokens.colors.neutral[800]}40)`,
      color: designTokens.colors.neutral[100],
      border: designTokens.colors.neutral[700],
      shadow: designTokens.shadows.lg,
      hover: {
        background: `linear-gradient(135deg, ${designTokens.colors.neutral[800]}80, ${designTokens.colors.neutral[700]}40)`,
        color: designTokens.colors.neutral[50],
        border: designTokens.colors.neutral[600],
        shadow: `${designTokens.shadows.xl}, ${designTokens.shadows.glow.sm}`
      },
      active: {
        background: `linear-gradient(135deg, ${designTokens.colors.neutral[900]}90, ${designTokens.colors.neutral[800]}50)`,
        color: designTokens.colors.neutral[100],
        border: designTokens.colors.primary[600],
        shadow: designTokens.shadows.lg
      },
      disabled: {
        background: designTokens.colors.neutral[950],
        color: designTokens.colors.neutral[600],
        border: designTokens.colors.neutral[800],
        opacity: 0.4
      }
    },

    modal: {
      background: `linear-gradient(135deg, ${designTokens.colors.neutral[900]}95, ${designTokens.colors.neutral[800]}90)`,
      color: designTokens.colors.neutral[100],
      border: designTokens.colors.neutral[600],
      shadow: `${designTokens.shadows['2xl']}, ${designTokens.shadows.glow.lg}`,
      hover: {
        background: `linear-gradient(135deg, ${designTokens.colors.neutral[900]}95, ${designTokens.colors.neutral[800]}90)`,
        color: designTokens.colors.neutral[100],
        border: designTokens.colors.neutral[600],
        shadow: `${designTokens.shadows['2xl']}, ${designTokens.shadows.glow.lg}`
      },
      active: {
        background: `linear-gradient(135deg, ${designTokens.colors.neutral[900]}95, ${designTokens.colors.neutral[800]}90)`,
        color: designTokens.colors.neutral[100],
        border: designTokens.colors.neutral[600],
        shadow: `${designTokens.shadows['2xl']}, ${designTokens.shadows.glow.lg}`
      },
      disabled: {
        background: designTokens.colors.neutral[950],
        color: designTokens.colors.neutral[600],
        border: designTokens.colors.neutral[800],
        opacity: 0.8
      }
    },

    tooltip: {
      background: designTokens.colors.neutral[800],
      color: designTokens.colors.neutral[100],
      border: designTokens.colors.neutral[700],
      shadow: `${designTokens.shadows.lg}, ${designTokens.shadows.glow.sm}`,
      hover: {
        background: designTokens.colors.neutral[800],
        color: designTokens.colors.neutral[100],
        border: designTokens.colors.neutral[700],
        shadow: `${designTokens.shadows.lg}, ${designTokens.shadows.glow.sm}`
      },
      active: {
        background: designTokens.colors.neutral[800],
        color: designTokens.colors.neutral[100],
        border: designTokens.colors.neutral[700],
        shadow: `${designTokens.shadows.lg}, ${designTokens.shadows.glow.sm}`
      },
      disabled: {
        background: designTokens.colors.neutral[900],
        color: designTokens.colors.neutral[600],
        border: designTokens.colors.neutral[800],
        opacity: 0.8
      }
    }
  }
};

/**
 * 量子实验室主题 (Bright Dark)
 */
export const quantumLabTheme: ThemeConfig = {
  ...deepSpaceTechTheme,
  name: 'quantum-lab',
  displayName: '量子实验室',
  
  brand: {
    primary: designTokens.colors.accent[500],
    secondary: designTokens.colors.secondary[400],
    accent: designTokens.colors.primary[500],
    logo: designTokens.colors.accent[400]
  },

  background: {
    ...deepSpaceTechTheme.background,
    primary: '#0f0f0f',
    secondary: '#1a1a1a',
    tertiary: '#2a2a2a',
    glow: 'rgba(168, 85, 247, 0.1)'
  }
};

// ==================== 主题工具函数 ====================

/**
 * 获取CSS变量
 */
export const getCSSVariables = (theme: ThemeConfig): Record<string, string> => {
  return {
    // 品牌色
    '--color-primary': theme.brand.primary,
    '--color-secondary': theme.brand.secondary,
    '--color-accent': theme.brand.accent,
    '--color-logo': theme.brand.logo,

    // 语义色
    '--color-success': theme.semantic.success,
    '--color-warning': theme.semantic.warning,
    '--color-error': theme.semantic.error,
    '--color-info': theme.semantic.info,

    // CAE色彩
    '--color-geometry': theme.cae.geometry,
    '--color-mesh': theme.cae.mesh,
    '--color-material': theme.cae.material,
    '--color-boundary': theme.cae.boundary,
    '--color-computing': theme.cae.computing,
    '--color-converged': theme.cae.converged,
    '--color-diverged': theme.cae.diverged,
    '--color-iterating': theme.cae.iterating,
    '--color-displacement': theme.cae.displacement,
    '--color-stress': theme.cae.stress,
    '--color-strain': theme.cae.strain,
    '--color-safety': theme.cae.safety,

    // 背景色
    '--bg-primary': theme.background.primary,
    '--bg-secondary': theme.background.secondary,
    '--bg-tertiary': theme.background.tertiary,
    '--bg-surface': theme.background.surface,
    '--bg-elevated': theme.background.elevated,
    '--bg-glass': theme.background.glass,
    '--bg-glow': theme.background.glow,

    // 文本色
    '--text-primary': theme.text.primary,
    '--text-secondary': theme.text.secondary,
    '--text-tertiary': theme.text.tertiary,
    '--text-inverse': theme.text.inverse,
    '--text-muted': theme.text.muted,
    '--text-accent': theme.text.accent,

    // 边框色
    '--border-primary': theme.border.primary,
    '--border-secondary': theme.border.secondary,
    '--border-focus': theme.border.focus,
    '--border-error': theme.border.error,
    '--border-success': theme.border.success,
    '--border-glow': theme.border.glow,

    // 阴影
    '--shadow-sm': theme.shadows.sm,
    '--shadow-base': theme.shadows.base,
    '--shadow-md': theme.shadows.md,
    '--shadow-lg': theme.shadows.lg,
    '--shadow-xl': theme.shadows.xl,
    '--shadow-glow': theme.shadows.glow,

    // 动画
    '--duration-fast': theme.animation.duration.fast,
    '--duration-normal': theme.animation.duration.normal,
    '--duration-slow': theme.animation.duration.slow,
    '--timing-smooth': theme.animation.timing.smooth,
    '--timing-snappy': theme.animation.timing.snappy,
    '--timing-entrance': theme.animation.timing.entrance,
    '--timing-exit': theme.animation.timing.exit,

    // 字体
    '--font-primary': designTokens.typography.fontFamily.primary.join(', '),
    '--font-mono': designTokens.typography.fontFamily.mono.join(', '),
    '--font-display': designTokens.typography.fontFamily.display.join(', '),

    // 间距
    '--spacing-xs': designTokens.spacing[1],
    '--spacing-sm': designTokens.spacing[2],
    '--spacing-md': designTokens.spacing[4],
    '--spacing-lg': designTokens.spacing[6],
    '--spacing-xl': designTokens.spacing[8],

    // 圆角
    '--radius-sm': designTokens.borderRadius.sm,
    '--radius-base': designTokens.borderRadius.base,
    '--radius-md': designTokens.borderRadius.md,
    '--radius-lg': designTokens.borderRadius.lg,
    '--radius-xl': designTokens.borderRadius.xl,
    '--radius-2xl': designTokens.borderRadius['2xl'],
    '--radius-full': designTokens.borderRadius.full
  };
};

/**
 * 应用主题到DOM
 */
export const applyTheme = (theme: ThemeConfig): void => {
  const root = document.documentElement;
  const cssVariables = getCSSVariables(theme);
  
  Object.entries(cssVariables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  
  // 设置主题属性
  root.setAttribute('data-theme', theme.name);
  root.setAttribute('data-theme-mode', theme.mode);
};

/**
 * 预设主题
 */
export const presetThemes = {
  deepSpaceTech: deepSpaceTechTheme,
  quantumLab: quantumLabTheme
} as const;

export type PresetThemeName = keyof typeof presetThemes;

// ==================== 导出 ====================

export {
  deepSpaceTechTheme as defaultTheme
};

export default {
  presetThemes,
  getCSSVariables,
  applyTheme,
  defaultTheme: deepSpaceTechTheme
};