/**
 * 量子设计系统 - 设计令牌
 * 基于未来科技风UI设计规范实现
 */

export const quantumTokens = {
  // 量子梯度色
  colors: {
    // 基础量子色
    quantumVoid: '#0A0E27',
    quantumDeepStart: '#667eea',
    quantumDeepEnd: '#764ba2',
    quantumBrightStart: '#4facfe',
    quantumBrightEnd: '#00f2fe',
    quantumEnergyStart: '#f093fb',
    quantumEnergyEnd: '#f5576c',
    
    // 霓虹强调色
    neonStress: '#ff0080',       // 应力可视化
    neonDisplacement: '#00ffff', // 位移可视化
    neonFlow: '#39ff14',         // 渗流可视化
    neonWarning: '#ff6600',      // 风险警告
    neonSuccess: '#00ff9d',      // 成功状态
    
    // 玻璃拟态表面
    glassSurface: 'rgba(255, 255, 255, 0.05)',
    glassElevated: 'rgba(255, 255, 255, 0.08)',
    glassActive: 'rgba(255, 255, 255, 0.12)',
    
    // 工程专业色彩
    engineeringSoil: '#8B5A3C',    // 土体
    engineeringConcrete: '#9CA3AF', // 混凝土
    engineeringSteel: '#6B7280',    // 钢材
    engineeringWater: '#06B6D4',    // 地下水
    
    // 背景梯度
    backgroundDark: 'linear-gradient(135deg, #0A0E27 0%, #1a1a2e 50%, #16213e 100%)',
    
    // 量子梯度
    quantumDeep: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    quantumBright: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    quantumEnergy: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  
  // 字体定义
  typography: {
    fontFamily: {
      primary: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif',
      code: '"JetBrains Mono", monospace',
      display: '"Orbitron", sans-serif',
    },
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      semiBold: 600,
      bold: 700,
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
    },
  },
  
  // 空间尺寸与间距
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '2.5rem',
    '3xl': '3rem',
  },
  
  // 圆角半径
  borderRadius: {
    none: '0',
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
  
  // 阴影定义
  shadows: {
    glow: {
      neon: (color: string) => `0 0 5px ${color}, 0 0 10px ${color}, 0 0 20px ${color}`,
      subtle: (color: string) => `0 0 5px ${color}`,
      intense: (color: string) => `0 0 10px ${color}, 0 0 20px ${color}, 0 0 40px ${color}`,
    },
    glass: {
      sm: '0 2px 10px rgba(0, 0, 0, 0.2)',
      md: '0 4px 20px rgba(0, 0, 0, 0.25)',
      lg: '0 8px 30px rgba(0, 0, 0, 0.3)',
    },
    inner: 'inset 0 2px 10px rgba(0, 0, 0, 0.15)',
  },
  
  // 动画与过渡
  animation: {
    transitions: {
      fast: '0.15s ease',
      normal: '0.25s ease',
      slow: '0.5s ease',
      bounce: '0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
      spring: '0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    },
    keyframes: {
      pulse: {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.5 },
      },
      float: {
        '0%, 100%': { transform: 'translateY(0)' },
        '50%': { transform: 'translateY(-10px)' },
      },
      glow: {
        '0%, 100%': { filter: 'brightness(1)' },
        '50%': { filter: 'brightness(1.3)' },
      },
    },
  },
  
  // 滤镜效果
  filters: {
    blur: {
      sm: 'blur(4px)',
      md: 'blur(8px)',
      lg: 'blur(16px)',
    },
    saturate: {
      intense: 'saturate(1.5)',
      normal: 'saturate(1)',
      muted: 'saturate(0.8)',
    },
  },
  
  // 网格与布局
  grid: {
    gutter: {
      sm: '0.5rem',
      md: '1rem',
      lg: '2rem',
    },
    container: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
  },
  
  // 响应式断点
  breakpoints: {
    xs: '0px',
    sm: '600px',
    md: '900px',
    lg: '1200px',
    xl: '1536px',
  },
  
  // Z轴层级
  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modal: 1300,
    popover: 1400,
    tooltip: 1500,
    command: 1600,
  },
  
  // 组件特定定义
  components: {
    // 数据球组件
    holographicSphere: {
      base: {
        size: {
          sm: '250px',
          md: '350px',
          lg: '500px',
        },
        rotation: {
          idle: '0.5deg/s',
          interactive: '1deg/s',
        },
      },
      layers: {
        opacity: {
          active: 0.9,
          inactive: 0.3,
        },
      },
    },
    
    // 玻璃卡片
    glassCard: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
      backdropFilter: 'blur(8px)',
    },
    
    // 智能命令面板
    commandPalette: {
      width: {
        default: '600px',
        expanded: '800px',
      },
      height: {
        collapsed: '60px',
        expanded: '400px',
      },
      background: 'rgba(10, 14, 39, 0.85)',
      backdropFilter: 'blur(12px)',
    },
    
    // 预测式工具栏
    predictiveToolbar: {
      height: '60px',
      itemSpacing: '12px',
      background: 'rgba(10, 14, 39, 0.8)',
      activeItem: {
        background: 'rgba(255, 255, 255, 0.12)',
        glow: '0 0 10px rgba(0, 242, 254, 0.5)',
      },
    },
  },
};

export default quantumTokens; 