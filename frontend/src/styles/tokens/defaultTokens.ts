/**
 * @file defaultTokens.ts  
 * @description 未来科技风设计令牌 - 量子蓝紫主题
 * @author GitHub Copilot - 未来UI设计师
 * @inspiration 银翼杀手2049 + 苹果Vision Pro + 赛博朋克2077
 */

export const defaultTokens = {
  colors: {
    // 🌌 量子主色调 - 深空蓝紫渐变
    quantum: {
      primary: '#667eea',
      secondary: '#764ba2',
      accent: '#4facfe',
      tertiary: '#43e97b',
      glow: '#00f2fe',
    },
    
    // ⚡ 霓虹色彩 - 赛博朋克风格
    neon: {
      blue: '#00ffff',         // 电蓝
      pink: '#ff0080',         // 霓虹粉
      green: '#39ff14',        // 毒绿
      orange: '#ff6600',       // 火橙
      purple: '#bf00ff',       // 深紫
      yellow: '#ffff00',       // 激光黄
      
      // 霓虹发光效果
      glowBlue: '0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 80px #00ffff',
      glowPink: '0 0 20px #ff0080, 0 0 40px #ff0080, 0 0 80px #ff0080',
      glowGreen: '0 0 20px #39ff14, 0 0 40px #39ff14, 0 0 80px #39ff14',
    },
    
    // 🌃 深空背景系统
    space: {
      void: '#0a0a0a',         // 深空虚无
      dark: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)',
      nebula: 'radial-gradient(circle at 50% 50%, rgba(102, 126, 234, 0.1) 0%, rgba(0,0,0,0) 70%)',
      stars: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0) 50%)',
    },
    
    // 💎 玻璃拟态表面
    glass: {
      surface: 'rgba(255, 255, 255, 0.05)',
      surfaceHover: 'rgba(255, 255, 255, 0.08)',
      surfaceActive: 'rgba(255, 255, 255, 0.12)',
      card: 'rgba(255, 255, 255, 0.08)',
      cardHover: 'rgba(255, 255, 255, 0.15)',
      modal: 'rgba(0, 0, 0, 0.8)',
      
      // 边框发光
      border: 'rgba(255, 255, 255, 0.2)',
      borderGlow: 'rgba(102, 126, 234, 0.4)',
      borderFocus: 'rgba(79, 172, 254, 0.6)',
    },
    
    // 🎯 状态色彩 - 未来感增强
    status: {
      success: {
        main: '#00d4aa',
        glow: '0 0 15px rgba(0, 212, 170, 0.5)',
        gradient: 'linear-gradient(135deg, #00d4aa 0%, #39ff14 100%)',
      },
      warning: {
        main: '#ffb800',
        glow: '0 0 15px rgba(255, 184, 0, 0.5)',
        gradient: 'linear-gradient(135deg, #ffb800 0%, #ff6600 100%)',
      },
      error: {
        main: '#ff3366',
        glow: '0 0 15px rgba(255, 51, 102, 0.5)',
        gradient: 'linear-gradient(135deg, #ff3366 0%, #ff0080 100%)',
      },
      info: {
        main: '#00aaff',
        glow: '0 0 15px rgba(0, 170, 255, 0.5)',
        gradient: 'linear-gradient(135deg, #00aaff 0%, #0080ff 100%)',
      },
    },
    
    // 🏗️ 工程专业色彩 - 科技感升级
    engineering: {
      excavation: {
        main: '#8B4513',
        accent: '#D2691E',
        glow: '0 0 10px rgba(210, 105, 30, 0.3)',
        gradient: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
      },
      concrete: {
        main: '#708090',
        accent: '#B0C4DE',
        glow: '0 0 10px rgba(176, 196, 222, 0.3)',
        gradient: 'linear-gradient(135deg, #708090 0%, #B0C4DE 100%)',
      },
      steel: {
        main: '#4682B4',
        accent: '#87CEEB',
        glow: '0 0 10px rgba(135, 206, 235, 0.3)',
        gradient: 'linear-gradient(135deg, #4682B4 0%, #87CEEB 100%)',
      },
      water: {
        main: '#00CED1',
        accent: '#40E0D0',
        glow: '0 0 15px rgba(64, 224, 208, 0.4)',
        gradient: 'linear-gradient(135deg, #00CED1 0%, #40E0D0 100%)',
      },
      stress: {
        main: '#DC143C',
        accent: '#FF6347',
        glow: '0 0 15px rgba(255, 99, 71, 0.5)',
        gradient: 'linear-gradient(135deg, #DC143C 0%, #FF6347 100%)',
      },
      displacement: {
        main: '#9370DB',
        accent: '#DDA0DD',
        glow: '0 0 15px rgba(221, 160, 221, 0.4)',
        gradient: 'linear-gradient(135deg, #9370DB 0%, #DDA0DD 100%)',
      },
    },
    
    // 🎨 数据可视化 - 全息色板
    holographic: {
      primary: [
        'rgba(102, 126, 234, 0.9)',
        'rgba(118, 75, 162, 0.8)', 
        'rgba(79, 172, 254, 0.7)',
        'rgba(0, 242, 254, 0.6)'
      ],
      stress: [
        'rgba(220, 20, 60, 0.9)',
        'rgba(255, 99, 71, 0.8)',
        'rgba(255, 140, 0, 0.7)',
        'rgba(255, 215, 0, 0.6)'
      ],
      displacement: [
        'rgba(147, 112, 219, 0.9)',
        'rgba(221, 160, 221, 0.8)',
        'rgba(186, 85, 211, 0.7)',
        'rgba(138, 43, 226, 0.6)'
      ],
      flow: [
        'rgba(0, 206, 209, 0.9)',
        'rgba(64, 224, 208, 0.8)',
        'rgba(72, 209, 204, 0.7)',
        'rgba(175, 238, 238, 0.6)'
      ],
    },
  },
  
  typography: {
    // 🚀 未来字体系统 - 几何现代感
    fontFamily: {
      primary: '"Inter Variable", "SF Pro Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      display: '"Space Grotesk", "Inter Display", "SF Pro Display", system-ui, sans-serif',
      mono: '"JetBrains Mono Variable", "SF Mono", "Fira Code", "Cascadia Code", Consolas, monospace',
      quantum: '"Orbitron", "Space Grotesk", system-ui, sans-serif', // 量子风格字体
    },
    
    // 📏 模块化字体尺度 - 黄金比例 1.618
    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px  
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem',      // 48px
      '6xl': '3.75rem',   // 60px
      '7xl': '4.5rem',    // 72px
      '8xl': '6rem',      // 96px
      '9xl': '8rem',      // 128px
    },
    
    // ⚖️ 字重系统 - 精细控制
    fontWeight: {
      thin: 100,
      extraLight: 200,
      light: 300,
      normal: 400,
      medium: 500,
      semiBold: 600,
      bold: 700,
      extraBold: 800,
      black: 900,
      variable: 'normal', // 可变字重
    },
    
    // 📐 行高系统 - 垂直节律
    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
      quantum: 1.618, // 黄金比例行高
    },
    
    // 🎯 字间距 - 精准控制
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
      quantum: '0.05em', // 量子间距
    },
    
    // 🎨 预设字体样式 - 语义化设计
    preset: {
      // 标题系列
      heroTitle: {
        fontSize: '6rem',
        fontWeight: 700,
        lineHeight: 1.1,
        letterSpacing: '-0.025em',
        fontFamily: 'display',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      },
      
      sectionTitle: {
        fontSize: '3rem',
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
        fontFamily: 'display',
      },
      
      cardTitle: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
      },
      
      // 正文系列
      bodyLarge: {
        fontSize: '1.125rem',
        fontWeight: 400,
        lineHeight: 1.6,
        letterSpacing: '0',
      },
      
      bodyBase: {
        fontSize: '1rem',
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: '0',
      },
      
      bodySmall: {
        fontSize: '0.875rem',
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: '0',
      },
      
      // 特殊用途
      caption: {
        fontSize: '0.75rem',
        fontWeight: 500,
        lineHeight: 1.33,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      },
      
      button: {
        fontSize: '0.875rem',
        fontWeight: 500,
        lineHeight: 1.5,
        letterSpacing: '0.025em',
        textTransform: 'none',
      },
      
      code: {
        fontSize: '0.875rem',
        fontWeight: 400,
        lineHeight: 1.4,
        fontFamily: 'mono',
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '0.125rem 0.25rem',
        borderRadius: '0.25rem',
      },
      
      // 量子风格文字
      quantum: {
        fontSize: '1rem',
        fontWeight: 500,
        lineHeight: 1.618,
        letterSpacing: '0.05em',
        fontFamily: 'quantum',
        textShadow: '0 0 10px rgba(102, 126, 234, 0.5)',
      },
    },
  },
  
  spacing: {
    // 🌌 量子间距系统 - 基于黄金比例的8px网格
    0: '0',
    1: '0.25rem',    // 4px
    2: '0.5rem',     // 8px
    3: '0.75rem',    // 12px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    8: '2rem',       // 32px
    10: '2.5rem',    // 40px
    12: '3rem',      // 48px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
    24: '6rem',      // 96px
    32: '8rem',      // 128px
    40: '10rem',     // 160px
    48: '12rem',     // 192px
    64: '16rem',     // 256px
    
    // 🎯 语义化间距
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
    
    // ⚡ 量子比例间距 (黄金比例)
    quantum: {
      micro: '0.31rem',    // φ^-2 * 16px ≈ 5px
      mini: '0.5rem',      // φ^-1 * 16px ≈ 8px  
      small: '0.81rem',    // φ^0 * 16px ≈ 13px
      medium: '1.31rem',   // φ^1 * 16px ≈ 21px
      large: '2.12rem',    // φ^2 * 16px ≈ 34px
      huge: '3.43rem',     // φ^3 * 16px ≈ 55px
      epic: '5.55rem',     // φ^4 * 16px ≈ 89px
    },
    
    // 🏗️ 组件专用间距
    component: {
      cardPadding: '1.5rem',
      cardMargin: '1rem',
      buttonPadding: '0.75rem 1.5rem',
      inputPadding: '0.875rem 1rem',
      sectionSpacing: '3rem',
      containerPadding: '1rem',
      headerHeight: '4rem',
      sidebarWidth: '16rem',
      sidebarCollapsed: '4rem',
    },
  },
  
  borderRadius: {
    // 🔮 未来圆角系统 - 从锐利到柔和
    none: '0',
    micro: '0.125rem',   // 2px
    mini: '0.25rem',     // 4px
    small: '0.375rem',   // 6px
    medium: '0.5rem',    // 8px
    large: '0.75rem',    // 12px
    xl: '1rem',          // 16px
    '2xl': '1.5rem',     // 24px
    '3xl': '2rem',       // 32px
    '4xl': '3rem',       // 48px
    full: '9999px',
    
    // 🎨 组件圆角
    button: '0.5rem',
    card: '1rem',
    input: '0.5rem',
    modal: '1.5rem',
    tooltip: '0.375rem',
    avatar: '50%',
    badge: '9999px',
    
    // ⚡ 量子圆角 - 创造流动感
    quantum: {
      soft: '0.618rem',     // 黄金比例圆角
      flow: '1.618rem',     // 黄金比例大圆角
      organic: '2.618rem',  // 有机圆角
    },
  },
  
  shadows: {
    // 🌌 深空阴影系统 - 多层次立体感
    none: 'none',
    
    // 基础阴影
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    
    // 🌟 霓虹发光阴影
    neon: {
      blue: '0 0 20px rgba(0, 255, 255, 0.5), 0 0 40px rgba(0, 255, 255, 0.3), 0 0 80px rgba(0, 255, 255, 0.1)',
      pink: '0 0 20px rgba(255, 0, 128, 0.5), 0 0 40px rgba(255, 0, 128, 0.3), 0 0 80px rgba(255, 0, 128, 0.1)',
      green: '0 0 20px rgba(57, 255, 20, 0.5), 0 0 40px rgba(57, 255, 20, 0.3), 0 0 80px rgba(57, 255, 20, 0.1)',
      purple: '0 0 20px rgba(191, 0, 255, 0.5), 0 0 40px rgba(191, 0, 255, 0.3), 0 0 80px rgba(191, 0, 255, 0.1)',
    },
    
    // 💎 玻璃拟态阴影
    glass: {
      light: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      medium: '0 8px 32px 0 rgba(31, 38, 135, 0.5)',
      heavy: '0 8px 32px 0 rgba(31, 38, 135, 0.7)',
      glow: '0 0 40px rgba(102, 126, 234, 0.2)',
    },
    
    // 🔮 量子阴影 - 多维空间感
    quantum: {
      levitate: '0 20px 40px -10px rgba(102, 126, 234, 0.3), 0 0 20px rgba(102, 126, 234, 0.2)',
      float: '0 10px 30px -5px rgba(102, 126, 234, 0.2), 0 0 15px rgba(102, 126, 234, 0.1)',
      hover: '0 15px 35px -5px rgba(102, 126, 234, 0.4), 0 5px 20px rgba(102, 126, 234, 0.3)',
      active: '0 5px 15px -3px rgba(102, 126, 234, 0.3), 0 2px 10px rgba(102, 126, 234, 0.2)',
    },
    
    // 🏗️ 组件阴影
    card: '0 4px 20px -2px rgba(0, 0, 0, 0.1), 0 2px 8px -2px rgba(0, 0, 0, 0.06)',
    cardHover: '0 10px 40px -4px rgba(0, 0, 0, 0.15), 0 4px 16px -4px rgba(0, 0, 0, 0.1)',
    button: '0 2px 8px -1px rgba(0, 0, 0, 0.1), 0 1px 4px -1px rgba(0, 0, 0, 0.06)',
    buttonHover: '0 4px 16px -2px rgba(0, 0, 0, 0.15), 0 2px 8px -2px rgba(0, 0, 0, 0.1)',
    modal: '0 25px 100px -12px rgba(0, 0, 0, 0.4)',
    dropdown: '0 10px 40px -4px rgba(0, 0, 0, 0.15), 0 4px 16px -4px rgba(0, 0, 0, 0.1)',
    
    // 🎭 内阴影
    inner: {
      light: 'inset 0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      medium: 'inset 0 2px 6px 0 rgba(0, 0, 0, 0.15)',
      heavy: 'inset 0 4px 12px 0 rgba(0, 0, 0, 0.2)',
    },
  },
  
  transitions: {
    // ⚡ 量子动效系统 - 物理感知动画
    duration: {
      instant: '50ms',      // 瞬间响应
      micro: '100ms',       // 微交互
      fast: '150ms',        // 快速反馈
      quick: '200ms',       // 快速动画
      normal: '300ms',      // 标准动画
      smooth: '400ms',      // 平滑动画
      slow: '500ms',        // 慢动画
      slower: '750ms',      // 更慢动画
      epic: '1000ms',       // 史诗动画
      cinematic: '1500ms',  // 电影级动画
    },
    
    // 🌊 缓动函数 - 自然物理曲线
    easing: {
      // 基础缓动
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      
      // 高级缓动
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      
      // 量子缓动 - 物理真实感
      quantum: 'cubic-bezier(0.23, 1, 0.32, 1)',
      fluid: 'cubic-bezier(0.4, 0, 0.2, 1)',
      organic: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      magnetic: 'cubic-bezier(0.5, -0.5, 0.5, 1.5)',
      
      // 专业动效
      anticipate: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
      overshoot: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
      backIn: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
      backOut: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      
      // 苹果风格
      apple: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      appleSpring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
    
    // 🎭 预设动画组合
    preset: {
      // 基础交互
      buttonHover: '150ms cubic-bezier(0, 0, 0.2, 1)',
      cardHover: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
      modalEnter: '300ms cubic-bezier(0.23, 1, 0.32, 1)',
      modalExit: '200ms cubic-bezier(0.4, 0, 1, 1)',
      
      // 量子动效
      quantumScale: '400ms cubic-bezier(0.23, 1, 0.32, 1)',
      quantumFade: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
      quantumSlide: '350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      
      // 流体动效
      fluidMorph: '500ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      fluidWave: '750ms cubic-bezier(0.4, 0, 0.2, 1)',
      fluidRipple: '600ms cubic-bezier(0.23, 1, 0.32, 1)',
      
      // 磁力动效
      magneticAttract: '300ms cubic-bezier(0.5, -0.5, 0.5, 1.5)',
      magneticRepel: '200ms cubic-bezier(0.68, -0.6, 0.32, 1.6)',
      
      // 有机动效
      organicGrow: '400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      organicShrink: '300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      organicFloat: '1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    },
    
    // 🎪 动画属性
    properties: {
      all: 'all',
      transform: 'transform',
      opacity: 'opacity',
      background: 'background-color',
      border: 'border-color',
      shadow: 'box-shadow',
      filter: 'filter',
      
      // 组合属性
      interactive: 'transform, opacity, box-shadow',
      colorful: 'background-color, border-color, color',
      spatial: 'transform, opacity',
      visual: 'opacity, filter, backdrop-filter',
    },
  },
  
  zIndex: {
    // 🚀 分层系统 - 清晰的空间层次
    hide: -1,
    auto: 'auto',
    base: 0,
    
    // 内容层
    content: 1,
    elevated: 10,
    floating: 100,
    
    // 交互层
    dropdown: 1000,
    sticky: 1100,
    overlay: 1200,
    
    // 系统层
    modal: 1300,
    popover: 1400,
    toast: 1500,
    tooltip: 1600,
    
    // 最高层
    skipLink: 9997,
    dev: 9998,
    max: 9999,
    
    // 量子层次 (特殊效果)
    quantum: {
      background: 0,
      surface: 1,
      floating: 10,
      interactive: 100,
      overlay: 1000,
      portal: 9000,
    },
  },
  
  // 📱 响应式断点系统
  breakpoints: {
    // 标准断点
    xs: '0px',
    sm: '640px',      // 手机横屏
    md: '768px',      // 平板
    lg: '1024px',     // 笔记本
    xl: '1280px',     // 桌面
    '2xl': '1536px',  // 大屏幕
    '3xl': '1920px',  // 超宽屏
    '4xl': '2560px',  // 4K显示器
    
    // 设备特定
    mobile: '480px',
    tablet: '768px',
    laptop: '1024px',
    desktop: '1280px',
    wide: '1920px',
    ultrawide: '2560px',
    
    // 内容导向
    prose: '65ch',    // 最佳阅读宽度
    content: '768px', // 内容最大宽度
    container: '1200px', // 容器最大宽度
  },
  
  // 📏 组件尺寸系统
  sizes: {
    // 按钮尺寸
    button: {
      xs: { height: '1.75rem', padding: '0 0.5rem', fontSize: '0.75rem' },
      sm: { height: '2rem', padding: '0 0.75rem', fontSize: '0.875rem' },
      md: { height: '2.5rem', padding: '0 1rem', fontSize: '1rem' },
      lg: { height: '3rem', padding: '0 1.5rem', fontSize: '1.125rem' },
      xl: { height: '3.5rem', padding: '0 2rem', fontSize: '1.25rem' },
    },
    
    // 输入框尺寸
    input: {
      xs: { height: '1.75rem', padding: '0 0.5rem', fontSize: '0.75rem' },
      sm: { height: '2rem', padding: '0 0.75rem', fontSize: '0.875rem' },
      md: { height: '2.5rem', padding: '0 1rem', fontSize: '1rem' },
      lg: { height: '3rem', padding: '0 1rem', fontSize: '1.125rem' },
      xl: { height: '3.5rem', padding: '0 1.25rem', fontSize: '1.25rem' },
    },
    
    // 图标尺寸
    icon: {
      xs: '0.75rem',    // 12px
      sm: '1rem',       // 16px
      md: '1.25rem',    // 20px
      lg: '1.5rem',     // 24px
      xl: '2rem',       // 32px
      '2xl': '2.5rem',  // 40px
      '3xl': '3rem',    // 48px
      '4xl': '4rem',    // 64px
    },
    
    // 头像尺寸
    avatar: {
      xs: '1.5rem',     // 24px
      sm: '2rem',       // 32px
      md: '2.5rem',     // 40px
      lg: '3rem',       // 48px
      xl: '4rem',       // 64px
      '2xl': '5rem',    // 80px
      '3xl': '6rem',    // 96px
    },
    
    // 容器尺寸
    container: {
      xs: '20rem',      // 320px
      sm: '24rem',      // 384px
      md: '28rem',      // 448px
      lg: '32rem',      // 512px
      xl: '36rem',      // 576px
      '2xl': '42rem',   // 672px
      '3xl': '48rem',   // 768px
      '4xl': '56rem',   // 896px
      '5xl': '64rem',   // 1024px
      '6xl': '72rem',   // 1152px
      '7xl': '80rem',   // 1280px
      full: '100%',
      screen: '100vw',
    },
  },
  
  // 🌫️ 滤镜效果系统
  filters: {
    // 模糊效果
    blur: {
      none: 'blur(0)',
      sm: 'blur(4px)',
      md: 'blur(8px)',
      lg: 'blur(16px)',
      xl: 'blur(24px)',
      '2xl': 'blur(40px)',
      '3xl': 'blur(64px)',
    },
    
    // 背景模糊
    backdrop: {
      none: 'backdrop-filter: blur(0)',
      sm: 'backdrop-filter: blur(4px)',
      md: 'backdrop-filter: blur(8px)',
      lg: 'backdrop-filter: blur(16px)',
      xl: 'backdrop-filter: blur(24px)',
    },
    
    // 亮度调节
    brightness: {
      dim: 'brightness(0.8)',
      normal: 'brightness(1)',
      bright: 'brightness(1.2)',
      super: 'brightness(1.5)',
    },
    
    // 对比度
    contrast: {
      low: 'contrast(0.8)',
      normal: 'contrast(1)',
      high: 'contrast(1.2)',
      super: 'contrast(1.5)',
    },
    
    // 饱和度
    saturate: {
      grayscale: 'saturate(0)',
      low: 'saturate(0.5)',
      normal: 'saturate(1)',
      high: 'saturate(1.5)',
      vivid: 'saturate(2)',
    },
    
    // 色相旋转
    hue: {
      none: 'hue-rotate(0deg)',
      quarter: 'hue-rotate(90deg)',
      half: 'hue-rotate(180deg)',
      three: 'hue-rotate(270deg)',
    },
  },
  
  // 🎨 透明度系统
  opacity: {
    0: '0',
    5: '0.05',
    10: '0.1',
    20: '0.2',
    25: '0.25',
    30: '0.3',
    40: '0.4',
    50: '0.5',
    60: '0.6',
    70: '0.7',
    75: '0.75',
    80: '0.8',
    90: '0.9',
    95: '0.95',
    100: '1',
    
    // 语义化透明度
    disabled: '0.4',
    secondary: '0.6',
    muted: '0.7',
    hover: '0.8',
    active: '0.9',
    overlay: '0.5',
    backdrop: '0.8',
    
    // 玻璃效果透明度
    glass: {
      light: '0.05',
      medium: '0.08',
      heavy: '0.12',
      intense: '0.2',
    },
  },
};

// 🎯 主题模式定义
export const themeMode = {
  light: 'light',
  dark: 'dark',
  auto: 'auto',
} as const;

export type ThemeMode = typeof themeMode[keyof typeof themeMode];

// 🚀 设计令牌类型定义
export type DesignTokens = typeof defaultTokens;

// 🌈 颜色类型提取
export type ColorTokens = typeof defaultTokens.colors;
export type QuantumColors = typeof defaultTokens.colors.quantum;
export type NeonColors = typeof defaultTokens.colors.neon;
export type GlassColors = typeof defaultTokens.colors.glass;
export type EngineeringColors = typeof defaultTokens.colors.engineering;

// 📝 字体类型提取
export type TypographyTokens = typeof defaultTokens.typography;
export type FontFamilies = typeof defaultTokens.typography.fontFamily;
export type FontSizes = typeof defaultTokens.typography.fontSize;

// 🎭 动效类型提取
export type TransitionTokens = typeof defaultTokens.transitions;
export type EasingFunctions = typeof defaultTokens.transitions.easing;
export type AnimationDurations = typeof defaultTokens.transitions.duration;

// 📏 尺寸类型提取
export type SizeTokens = typeof defaultTokens.sizes;
export type SpacingTokens = typeof defaultTokens.spacing;

// 🌫️ 视觉效果类型提取
export type ShadowTokens = typeof defaultTokens.shadows;
export type FilterTokens = typeof defaultTokens.filters;
export type OpacityTokens = typeof defaultTokens.opacity;

// 🎨 工具函数 - 设计令牌辅助
export const tokenHelpers = {
  // 获取颜色值
  getColor: (path: string) => {
    const keys = path.split('.');
    let value: any = defaultTokens.colors;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  },
  
  // 获取间距值
  getSpacing: (key: keyof typeof defaultTokens.spacing) => {
    return defaultTokens.spacing[key];
  },
  
  // 获取阴影值
  getShadow: (key: keyof typeof defaultTokens.shadows) => {
    return defaultTokens.shadows[key];
  },
  
  // 获取动效配置
  getTransition: (properties: string, duration?: keyof typeof defaultTokens.transitions.duration, easing?: keyof typeof defaultTokens.transitions.easing) => {
    const dur = duration ? defaultTokens.transitions.duration[duration] : defaultTokens.transitions.duration.normal;
    const ease = easing ? defaultTokens.transitions.easing[easing] : defaultTokens.transitions.easing.easeInOut;
    return `${properties} ${dur} ${ease}`;
  },
  
  // 响应式断点检查
  isBreakpoint: (width: number, breakpoint: keyof typeof defaultTokens.breakpoints) => {
    const bpValue = parseInt(defaultTokens.breakpoints[breakpoint]);
    return width >= bpValue;
  },
  
  // 生成渐变字符串
  createGradient: (direction: string, ...colors: string[]) => {
    return `linear-gradient(${direction}, ${colors.join(', ')})`;
  },
  
  // 生成霓虹发光效果
  createNeonGlow: (color: string, intensity: number = 1) => {
    return `0 0 ${20 * intensity}px ${color}, 0 0 ${40 * intensity}px ${color}, 0 0 ${80 * intensity}px ${color}`;
  },
  
  // 生成玻璃拟态样式
  createGlassmorphism: (opacity: number = 0.08, blur: number = 16) => {
    return {
      background: `rgba(255, 255, 255, ${opacity})`,
      backdropFilter: `blur(${blur}px)`,
      WebkitBackdropFilter: `blur(${blur}px)`,
      border: '1px solid rgba(255, 255, 255, 0.2)',
    };
  },
  
  // 计算对比色
  getContrastColor: (bgColor: string) => {
    // 简化版本，实际项目中可以使用更复杂的对比度计算
    return bgColor.includes('#') ? '#ffffff' : '#0f172a';
  },
};

// 🚀 默认导出
export default defaultTokens;
