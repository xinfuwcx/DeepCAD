/**
 * DeepCAD 科技未来感设计令牌系统
 * 1号架构师 - 构建视觉基础设施
 */

// ==================== 颜色系统 ====================

export const colors = {
  // 主色调 - 科技蓝紫渐变
  primary: {
    50: '#f0f4ff',
    100: '#e0e7ff', 
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',  // 主色调
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
    deep: '#312e81'   // 深色版本
  },

  // 次要色调 - 量子青色
  secondary: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',  // 次要色
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63'
  },

  // 强调色 - 能量紫色
  accent: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',  // 强调色
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6b21a8',
    900: '#581c87',
    // CAE专业强调色扩展
    quantum: '#6366f1',      // 量子蓝
    glow: '#8b5cf6',         // 辉光紫
    engineering: '#06b6d4',  // 工程青
    visualization: '#10b981', // 可视化绿
    ai: '#f59e0b',           // AI橙
    computation: '#ef4444',  // 计算红 - 3号专家主色
    deep: '#312e81'          // 深色
  },

  // CAE专业语义色
  semantic: {
    // 几何相关
    geometry: '#06b6d4',    // 青色 - 清晰、精确
    mesh: '#8b5cf6',        // 紫色 - 结构、网络
    material: '#10b981',    // 绿色 - 材料、属性
    boundary: '#f59e0b',    // 橙色 - 边界、约束
    
    // 计算相关
    computing: '#3b82f6',   // 蓝色 - 计算、处理
    converged: '#10b981',   // 绿色 - 收敛、成功
    diverged: '#ef4444',    // 红色 - 发散、错误
    iterating: '#f59e0b',   // 橙色 - 迭代、进行中
    
    // 结果相关
    displacement: '#06b6d4', // 青色 - 位移
    stress: '#ef4444',      // 红色 - 应力
    strain: '#f59e0b',      // 橙色 - 应变
    safety: '#10b981',      // 绿色 - 安全系数
    
    // 系统状态
    success: '#10b981',
    warning: '#f59e0b', 
    error: '#ef4444',
    info: '#06b6d4'
  },

  // 中性色 - 科技灰度
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a'
  },

  // 背景色系统
  background: {
    primary: '#0a0a0a',     // 深空黑
    secondary: '#171717',   // 碳纤维黑
    tertiary: '#262626',    // 面板灰
    surface: '#404040',     // 表面灰
    elevated: '#525252',    // 悬浮层
    glass: 'rgba(255, 255, 255, 0.05)', // 玻璃效果
    glow: 'rgba(99, 102, 241, 0.1)'     // 辉光效果
  },

  // 深色主题
  dark: {
    deepSpace: '#0a0a0a',   // 深空黑
    quantum: '#171717',     // 量子黑
    surface: '#262626',     // 表面灰
    card: '#404040',        // 卡片灰
    border: '#525252'       // 边框灰
  },

  // 浅色主题
  light: {
    primary: '#ffffff',     // 主要白色
    secondary: '#f5f5f5',   // 次要灰色
    tertiary: '#e5e5e5'     // 第三灰色
  }
} as const;

// ==================== 字体系统 ====================

export const typography = {
  // 字体族
  fontFamily: {
    primary: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
    display: ['Cal Sans', 'Inter', 'sans-serif'],
    chinese: ['PingFang SC', 'Microsoft YaHei', 'SimHei', 'sans-serif']
  },

  // 字体大小 (基于1.25倍比例)
  fontSize: {
    xs: '0.75rem',      // 12px - 辅助信息
    sm: '0.875rem',     // 14px - 正文小
    base: '1rem',       // 16px - 基础正文
    lg: '1.125rem',     // 18px - 大正文
    xl: '1.25rem',      // 20px - 小标题
    '2xl': '1.5rem',    // 24px - 标题
    '3xl': '1.875rem',  // 30px - 大标题
    '4xl': '2.25rem',   // 36px - 特大标题
    '5xl': '3rem',      // 48px - 展示标题
  },

  // 字重
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900
  },

  // 行高
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2
  },

  // 字间距
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em', 
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em'
  }
} as const;

// ==================== 间距系统 ====================

export const spacing = {
  // 基础间距 (基于4px网格)
  0: '0',
  px: '1px',
  0.5: '0.125rem',    // 2px
  1: '0.25rem',       // 4px
  1.5: '0.375rem',    // 6px
  2: '0.5rem',        // 8px
  2.5: '0.625rem',    // 10px
  3: '0.75rem',       // 12px
  3.5: '0.875rem',    // 14px
  4: '1rem',          // 16px
  5: '1.25rem',       // 20px
  6: '1.5rem',        // 24px
  7: '1.75rem',       // 28px
  8: '2rem',          // 32px
  9: '2.25rem',       // 36px
  10: '2.5rem',       // 40px
  11: '2.75rem',      // 44px
  12: '3rem',         // 48px
  14: '3.5rem',       // 56px
  16: '4rem',         // 64px
  20: '5rem',         // 80px
  24: '6rem',         // 96px
  28: '7rem',         // 112px
  32: '8rem',         // 128px
  36: '9rem',         // 144px
  40: '10rem',        // 160px
  44: '11rem',        // 176px
  48: '12rem',        // 192px
  52: '13rem',        // 208px
  56: '14rem',        // 224px
  60: '15rem',        // 240px
  64: '16rem',        // 256px
  72: '18rem',        // 288px
  80: '20rem',        // 320px
  96: '24rem'         // 384px
} as const;

// ==================== 圆角系统 ====================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',     // 2px
  base: '0.25rem',    // 4px
  md: '0.375rem',     // 6px
  lg: '0.5rem',       // 8px
  xl: '0.75rem',      // 12px
  '2xl': '1rem',      // 16px
  '3xl': '1.5rem',    // 24px
  full: '9999px'
} as const;

// ==================== 阴影系统 ====================

export const shadows = {
  // 基础阴影
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  
  // 科技感辉光阴影
  glow: {
    sm: '0 0 4px rgba(99, 102, 241, 0.3)',
    base: '0 0 8px rgba(99, 102, 241, 0.4)',
    md: '0 0 16px rgba(99, 102, 241, 0.4)',
    lg: '0 0 24px rgba(99, 102, 241, 0.5)',
    xl: '0 0 32px rgba(99, 102, 241, 0.6)'
  },

  // 彩色辉光
  colorGlow: {
    primary: '0 0 16px rgba(99, 102, 241, 0.4)',
    secondary: '0 0 16px rgba(6, 182, 212, 0.4)',
    accent: '0 0 16px rgba(168, 85, 247, 0.4)',
    success: '0 0 16px rgba(16, 185, 129, 0.4)',
    warning: '0 0 16px rgba(245, 158, 11, 0.4)',
    error: '0 0 16px rgba(239, 68, 68, 0.4)'
  },

  // 内阴影
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  innerLg: 'inset 0 4px 8px 0 rgba(0, 0, 0, 0.1)'
} as const;

// ==================== 动画系统 ====================

export const animation = {
  // 持续时间
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms'
  },

  // 缓动函数
  timing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    // 自定义科技感缓动
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',      // 流畅
    snappy: 'cubic-bezier(0.4, 0, 1, 1)',        // 敏捷
    entrance: 'cubic-bezier(0, 0, 0.2, 1)',      // 入场
    exit: 'cubic-bezier(0.4, 0, 1, 1)',          // 退场
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' // 弹跳
  },

  // 预设动画
  keyframes: {
    // 脉冲发光
    pulse: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.5 }
    },
    
    // 量子闪烁
    quantum: {
      '0%, 100%': { 
        opacity: 0.8,
        transform: 'scale(1)',
        filter: 'hue-rotate(0deg)'
      },
      '33%': { 
        opacity: 1,
        transform: 'scale(1.02)',
        filter: 'hue-rotate(120deg)'
      },
      '66%': { 
        opacity: 0.9,
        transform: 'scale(0.98)',
        filter: 'hue-rotate(240deg)'
      }
    },

    // 数据流动
    dataFlow: {
      '0%': { 
        transform: 'translateX(-100%)',
        opacity: 0
      },
      '50%': { 
        opacity: 1
      },
      '100%': { 
        transform: 'translateX(100%)',
        opacity: 0
      }
    },

    // 能量波动
    energyWave: {
      '0%': { 
        transform: 'scale(1)',
        opacity: 0.7
      },
      '50%': { 
        transform: 'scale(1.1)',
        opacity: 1
      },
      '100%': { 
        transform: 'scale(1.2)',
        opacity: 0
      }
    },

    // 旋转加载
    spin: {
      '0%': { transform: 'rotate(0deg)' },
      '100%': { transform: 'rotate(360deg)' }
    },

    // 浮动效果
    float: {
      '0%, 100%': { transform: 'translateY(0px)' },
      '50%': { transform: 'translateY(-6px)' }
    }
  }
} as const;

// ==================== 断点系统 ====================

export const breakpoints = {
  sm: '640px',      // 手机横屏
  md: '768px',      // 平板竖屏
  lg: '1024px',     // 平板横屏/小笔记本
  xl: '1280px',     // 桌面显示器
  '2xl': '1536px',  // 大屏显示器
  '3xl': '1920px',  // 全高清
  '4xl': '2560px'   // 2K/4K显示器
} as const;

// ==================== Z-Index层级 ====================

export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
  loading: 1900,
  max: 2147483647
} as const;

// ==================== 模糊效果 ====================

export const blur = {
  none: '0',
  sm: '4px',
  base: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '40px',
  '3xl': '64px'
} as const;

// ==================== 导出类型 ====================

export type ColorKey = keyof typeof colors;
export type TypographyKey = keyof typeof typography;
export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;
export type ShadowKey = keyof typeof shadows;
export type AnimationKey = keyof typeof animation;
export type BreakpointKey = keyof typeof breakpoints;
export type ZIndexKey = keyof typeof zIndex;
export type BlurKey = keyof typeof blur;

// ==================== 设计令牌集合 ====================

export const designTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  breakpoints,
  zIndex,
  blur
} as const;

export default designTokens;