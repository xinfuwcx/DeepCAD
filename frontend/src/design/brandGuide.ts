/**
 * DeepCAD 品牌设计指南
 * 1号架构师 - 完整的品牌视觉标准化系统
 */

import { designTokens } from './tokens';

// ==================== 品牌核心理念 ====================

export const brandCore = {
  mission: {
    zh: '为深基坑工程提供世界级GPU加速CAE分析平台',
    en: 'World-class GPU-accelerated CAE platform for deep excavation engineering'
  },
  
  vision: {
    zh: '震撼视觉体验 × 专业工程能力 × 前沿技术创新',
    en: 'Stunning Visual Experience × Professional Engineering × Cutting-edge Innovation'
  },
  
  values: [
    { key: 'precision', zh: '精准', en: 'Precision', description: '工程级精度和可靠性' },
    { key: 'innovation', zh: '创新', en: 'Innovation', description: 'WebGPU前沿技术应用' },
    { key: 'experience', zh: '体验', en: 'Experience', description: '从地球到基坑的震撼视觉' },
    { key: 'professional', zh: '专业', en: 'Professional', description: '深基坑工程专业建模' }
  ]
} as const;

// ==================== 品牌色彩系统 ====================

export const brandColors = {
  // 主品牌色：科技蓝紫
  primary: {
    name: '量子蓝',
    hex: designTokens.colors.primary[500],
    rgb: 'rgb(99, 102, 241)',
    hsl: 'hsl(237, 84%, 67%)',
    usage: ['主要按钮', 'Logo主色调', '重要信息标识', '链接文字'],
    psychology: '科技感、专业性、信任感',
    accessibility: 'WCAG AA级别对比度',
    variations: {
      light: designTokens.colors.primary[400],
      dark: designTokens.colors.primary[600],
      subtle: designTokens.colors.primary[100]
    }
  },

  // 次要品牌色：量子青
  secondary: {
    name: '深海青',
    hex: designTokens.colors.secondary[500],
    rgb: 'rgb(6, 182, 212)',
    hsl: 'hsl(187, 95%, 43%)',
    usage: ['辅助按钮', '图表数据', '进度指示器', '装饰元素'],
    psychology: '清新、流动、数据可视化',
    accessibility: 'WCAG AA级别对比度',
    variations: {
      light: designTokens.colors.secondary[400],
      dark: designTokens.colors.secondary[600],
      subtle: designTokens.colors.secondary[100]
    }
  },

  // 强调色：能量紫
  accent: {
    name: '能量紫',
    hex: designTokens.colors.accent[500],
    rgb: 'rgb(168, 85, 247)',
    hsl: 'hsl(271, 91%, 65%)',
    usage: ['关键操作', '高亮显示', '特殊状态', '动画效果'],
    psychology: '创新、魔幻、高端、未来感',
    accessibility: 'WCAG AA级别对比度',
    variations: {
      light: designTokens.colors.accent[400],
      dark: designTokens.colors.accent[600],
      subtle: designTokens.colors.accent[100]
    }
  },

  // 语义色彩系统
  semantic: {
    success: {
      name: '成功绿',
      hex: designTokens.colors.semantic.success,
      usage: ['成功状态', '完成指示', '正向反馈'],
      emotions: '成功、安全、稳定'
    },
    warning: {
      name: '警告橙',
      hex: designTokens.colors.semantic.warning,
      usage: ['警告信息', '注意事项', '中等优先级'],
      emotions: '注意、谨慎、活力'
    },
    error: {
      name: '错误红',
      hex: designTokens.colors.semantic.error,
      usage: ['错误状态', '删除操作', '危险警告'],
      emotions: '紧急、警告、停止'
    },
    info: {
      name: '信息蓝',
      hex: designTokens.colors.semantic.info,
      usage: ['信息提示', '帮助文档', '中性反馈'],
      emotions: '信息、帮助、引导'
    }
  }
} as const;

// ==================== 品牌字体系统 ====================

export const brandTypography = {
  // 主字体：Inter - 现代科技感
  primary: {
    name: 'Inter',
    fallback: ['system-ui', 'sans-serif'],
    characteristics: '现代、清晰、科技感',
    usage: ['界面文字', '按钮标签', '表单输入', '数据展示'],
    weights: [300, 400, 500, 600, 700],
    features: ['数字等宽', '高可读性', '多语言支持']
  },

  // 等宽字体：JetBrains Mono - 代码和数据
  monospace: {
    name: 'JetBrains Mono',
    fallback: ['Fira Code', 'Consolas', 'monospace'],
    characteristics: '等宽、清晰、专业',
    usage: ['代码显示', '数据表格', '参数输入', '日志信息'],
    weights: [400, 500, 600, 700],
    features: ['字符区分度高', '编程友好', '数学符号支持']
  },

  // 展示字体：Cal Sans - 标题和Logo
  display: {
    name: 'Cal Sans',
    fallback: ['Inter', 'sans-serif'],
    characteristics: '现代、几何、品牌感',
    usage: ['Logo文字', '大标题', '品牌标语', '特殊标识'],
    weights: [400, 600],
    features: ['品牌识别性', '现代几何感', '高端专业']
  },

  // 中文字体：优雅支持
  chinese: {
    name: 'PingFang SC',
    fallback: ['Microsoft YaHei', 'SimHei', 'sans-serif'],
    characteristics: '清晰、现代、易读',
    usage: ['中文界面', '技术文档', '帮助信息'],
    weights: [400, 500, 600],
    features: ['中文优化', '字重丰富', '屏幕优化']
  }
} as const;

// ==================== 视觉层次系统 ====================

export const visualHierarchy = {
  // 标题层次
  headings: {
    h1: {
      size: designTokens.typography.fontSize['4xl'],
      weight: designTokens.typography.fontWeight.bold,
      lineHeight: designTokens.typography.lineHeight.tight,
      usage: '页面主标题',
      color: designTokens.colors.neutral[100]
    },
    h2: {
      size: designTokens.typography.fontSize['3xl'],
      weight: designTokens.typography.fontWeight.semibold,
      lineHeight: designTokens.typography.lineHeight.tight,
      usage: '章节标题',
      color: designTokens.colors.neutral[200]
    },
    h3: {
      size: designTokens.typography.fontSize['2xl'],
      weight: designTokens.typography.fontWeight.semibold,
      lineHeight: designTokens.typography.lineHeight.normal,
      usage: '子章节标题',
      color: designTokens.colors.neutral[200]
    },
    h4: {
      size: designTokens.typography.fontSize.xl,
      weight: designTokens.typography.fontWeight.medium,
      lineHeight: designTokens.typography.lineHeight.normal,
      usage: '小标题',
      color: designTokens.colors.neutral[300]
    }
  },

  // 正文层次
  body: {
    large: {
      size: designTokens.typography.fontSize.lg,
      weight: designTokens.typography.fontWeight.normal,
      lineHeight: designTokens.typography.lineHeight.relaxed,
      usage: '重要正文',
      color: designTokens.colors.neutral[300]
    },
    medium: {
      size: designTokens.typography.fontSize.base,
      weight: designTokens.typography.fontWeight.normal,
      lineHeight: designTokens.typography.lineHeight.normal,
      usage: '标准正文',
      color: designTokens.colors.neutral[400]
    },
    small: {
      size: designTokens.typography.fontSize.sm,
      weight: designTokens.typography.fontWeight.normal,
      lineHeight: designTokens.typography.lineHeight.normal,
      usage: '辅助文字',
      color: designTokens.colors.neutral[500]
    },
    caption: {
      size: designTokens.typography.fontSize.xs,
      weight: designTokens.typography.fontWeight.normal,
      lineHeight: designTokens.typography.lineHeight.normal,
      usage: '说明文字',
      color: designTokens.colors.neutral[600]
    }
  }
} as const;

// ==================== 动画设计原则 ====================

export const animationPrinciples = {
  // 动画时长标准
  durations: {
    instant: { value: '75ms', usage: '即时反馈：按钮按下' },
    fast: { value: '150ms', usage: '快速交互：悬停效果' },
    normal: { value: '300ms', usage: '标准动画：模态框显示' },
    slow: { value: '500ms', usage: '复杂动画：页面切换' },
    epic: { value: '1000ms+', usage: '史诗动画：Logo加载' }
  },

  // 缓动函数
  easings: {
    smooth: {
      value: designTokens.animation.timing.smooth,
      usage: '流畅过渡：滚动、拖拽',
      personality: '自然、舒适'
    },
    snappy: {
      value: designTokens.animation.timing.snappy,
      usage: '敏捷响应：按钮、开关',
      personality: '响应快、有力'
    },
    entrance: {
      value: designTokens.animation.timing.entrance,
      usage: '入场动画：弹窗、提示',
      personality: '优雅、专业'
    },
    bounce: {
      value: designTokens.animation.timing.bounce,
      usage: '强调动画：成功反馈',
      personality: '活跃、友好'
    }
  },

  // 动画类型
  types: {
    micro: {
      description: '微交互动画',
      examples: ['按钮悬停', 'Icon状态变化', '输入框聚焦'],
      principles: ['快速响应', '细节精致', '功能明确']
    },
    transition: {
      description: '转场动画',
      examples: ['页面切换', '模态框', '抽屉导航'],
      principles: ['方向明确', '层次清晰', '连贯性']
    },
    loading: {
      description: '加载动画',
      examples: ['数据加载', '系统初始化', '计算进度'],
      principles: ['状态明确', '时间感知', '减轻焦虑']
    },
    celebration: {
      description: '庆祝动画',
      examples: ['任务完成', '成功提交', '解锁成就'],
      principles: ['情感共鸣', '正向反馈', '记忆深刻']
    }
  }
} as const;

// ==================== 组件设计规范 ====================

export const componentSpecs = {
  // 按钮规范
  buttons: {
    primary: {
      background: designTokens.colors.primary[500],
      color: designTokens.colors.neutral[100],
      borderRadius: designTokens.borderRadius.md,
      padding: `${designTokens.spacing[3]} ${designTokens.spacing[6]}`,
      fontSize: designTokens.typography.fontSize.base,
      fontWeight: designTokens.typography.fontWeight.medium,
      transition: 'all 150ms ease',
      hover: {
        background: designTokens.colors.primary[400],
        transform: 'translateY(-1px)',
        boxShadow: designTokens.shadows.glow.base
      },
      active: {
        transform: 'translateY(0px)'
      },
      disabled: {
        background: designTokens.colors.neutral[700],
        color: designTokens.colors.neutral[500],
        cursor: 'not-allowed'
      }
    },
    secondary: {
      background: 'transparent',
      color: designTokens.colors.primary[400],
      border: `1px solid ${designTokens.colors.primary[500]}`,
      borderRadius: designTokens.borderRadius.md,
      padding: `${designTokens.spacing[3]} ${designTokens.spacing[6]}`,
      fontSize: designTokens.typography.fontSize.base,
      fontWeight: designTokens.typography.fontWeight.medium,
      transition: 'all 150ms ease',
      hover: {
        background: designTokens.colors.primary[500],
        color: designTokens.colors.neutral[100],
        borderColor: designTokens.colors.primary[400]
      }
    }
  },

  // 卡片规范
  cards: {
    default: {
      background: designTokens.colors.background.glass,
      border: `1px solid ${designTokens.colors.neutral[800]}`,
      borderRadius: designTokens.borderRadius.lg,
      padding: designTokens.spacing[6],
      backdropFilter: 'blur(12px)',
      boxShadow: designTokens.shadows.md,
      transition: 'all 200ms ease',
      hover: {
        borderColor: designTokens.colors.primary[600],
        boxShadow: designTokens.shadows.lg,
        transform: 'translateY(-2px)'
      }
    },
    interactive: {
      cursor: 'pointer',
      hover: {
        borderColor: designTokens.colors.primary[500],
        boxShadow: designTokens.shadows.colorGlow.primary,
        transform: 'translateY(-4px)'
      }
    }
  },

  // 输入框规范
  inputs: {
    default: {
      background: designTokens.colors.background.tertiary,
      border: `1px solid ${designTokens.colors.neutral[700]}`,
      borderRadius: designTokens.borderRadius.md,
      padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
      fontSize: designTokens.typography.fontSize.base,
      color: designTokens.colors.neutral[200],
      transition: 'all 150ms ease',
      focus: {
        borderColor: designTokens.colors.primary[500],
        boxShadow: `0 0 0 3px ${designTokens.colors.primary[500]}20`,
        outline: 'none'
      },
      error: {
        borderColor: designTokens.colors.semantic.error,
        boxShadow: `0 0 0 3px ${designTokens.colors.semantic.error}20`
      }
    }
  }
} as const;

// ==================== 布局网格系统 ====================

export const layoutGrid = {
  // 断点系统
  breakpoints: designTokens.breakpoints,
  
  // 容器最大宽度
  containers: {
    sm: '640px',
    md: '768px', 
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    '3xl': '1920px'
  },

  // 网格系统
  grid: {
    columns: 12,
    gap: designTokens.spacing[6],
    margin: designTokens.spacing[6]
  },

  // 垂直节奏
  verticalRhythm: {
    baseLineHeight: 24, // 24px基础行高
    scale: 1.5, // 1.5倍垂直节奏
    sections: {
      small: designTokens.spacing[8],
      medium: designTokens.spacing[12],
      large: designTokens.spacing[16],
      xlarge: designTokens.spacing[24]
    }
  }
} as const;

// ==================== 可访问性标准 ====================

export const accessibilityStandards = {
  // 颜色对比度
  colorContrast: {
    aa: { normal: 4.5, large: 3.0 },
    aaa: { normal: 7.0, large: 4.5 }
  },

  // 字体大小最小值
  minFontSizes: {
    body: '14px',
    ui: '12px',
    icon: '16px'
  },

  // 触摸目标最小尺寸
  touchTargets: {
    minimum: '44px',
    recommended: '48px'
  },

  // 焦点指示器
  focusIndicator: {
    outline: `2px solid ${designTokens.colors.primary[500]}`,
    outlineOffset: '2px',
    borderRadius: designTokens.borderRadius.md
  },

  // 动画偏好
  reducedMotion: {
    duration: '0ms',
    transform: 'none',
    transition: 'none'
  }
} as const;

// ==================== 品牌应用指南 ====================

export const brandApplications = {
  // Logo使用规范
  logo: {
    clearSpace: '等于Logo高度的1/2',
    minSize: { web: '24px', print: '12mm' },
    variations: ['full', 'icon', 'text'],
    backgrounds: {
      preferred: ['深色背景', '纯黑背景'],
      acceptable: ['深灰背景'],
      avoid: ['浅色背景', '复杂图案背景']
    },
    donts: [
      '不要改变Logo颜色比例',
      '不要拉伸或压缩Logo',
      '不要在Logo上添加效果',
      '不要将Logo放在低对比度背景上'
    ]
  },

  // 色彩应用
  colorUsage: {
    primary: {
      do: ['主要操作按钮', 'Logo主色', '重要信息强调'],
      dont: ['大面积背景色', '错误状态', '警告信息']
    },
    backgrounds: {
      recommended: [
        designTokens.colors.background.primary,
        designTokens.colors.background.secondary
      ],
      accent: [
        designTokens.colors.background.glass,
        designTokens.colors.background.glow
      ]
    }
  },

  // 图标使用
  iconography: {
    style: '线性图标为主，填充图标为辅',
    strokeWidth: '1.5px',
    cornerRadius: '2px',
    sizes: ['16px', '20px', '24px', '32px', '48px'],
    colors: [
      designTokens.colors.primary[500],
      designTokens.colors.neutral[400],
      designTokens.colors.semantic.success
    ]
  }
} as const;

// ==================== 导出品牌指南 ====================

export const brandGuide = {
  core: brandCore,
  colors: brandColors,
  typography: brandTypography,
  hierarchy: visualHierarchy,
  animations: animationPrinciples,
  components: componentSpecs,
  layout: layoutGrid,
  accessibility: accessibilityStandards,
  applications: brandApplications
} as const;

export default brandGuide;