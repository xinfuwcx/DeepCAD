// 设计令牌系统
// 这个文件定义了应用中使用的所有设计变量

// 颜色系统
export const colors = {
  // 主题色
  primary: {
    main: '#00b96b',
    light: '#33c987',
    dark: '#009e5a',
    contrastText: '#ffffff',
  },
  
  // 辅助色
  secondary: {
    main: '#1890ff',
    light: '#40a9ff',
    dark: '#096dd9',
    contrastText: '#ffffff',
  },
  
  // 成功状态
  success: {
    main: '#52c41a',
    light: '#73d13d',
    dark: '#389e0d',
    contrastText: '#ffffff',
  },
  
  // 警告状态
  warning: {
    main: '#faad14',
    light: '#ffc53d',
    dark: '#d48806',
    contrastText: '#000000',
  },
  
  // 错误状态
  error: {
    main: '#f5222d',
    light: '#ff4d4f',
    dark: '#cf1322',
    contrastText: '#ffffff',
  },
  
  // 信息状态
  info: {
    main: '#1890ff',
    light: '#40a9ff',
    dark: '#096dd9',
    contrastText: '#ffffff',
  },
  
  // 中性色
  grey: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  
  // 背景色
  background: {
    default: {
      light: '#ffffff',
      dark: '#121212',
    },
    paper: {
      light: '#ffffff',
      dark: '#1e1e1e',
    },
    card: {
      light: '#ffffff',
      dark: '#2c2c2c',
    },
  },
  
  // 文本色
  text: {
    primary: {
      light: 'rgba(0, 0, 0, 0.87)',
      dark: 'rgba(255, 255, 255, 0.87)',
    },
    secondary: {
      light: 'rgba(0, 0, 0, 0.6)',
      dark: 'rgba(255, 255, 255, 0.6)',
    },
    disabled: {
      light: 'rgba(0, 0, 0, 0.38)',
      dark: 'rgba(255, 255, 255, 0.38)',
    },
  },
  
  // 边框色
  border: {
    light: '#f0f0f0',
    dark: '#303030',
  },
  
  // 分割线
  divider: {
    light: 'rgba(0, 0, 0, 0.12)',
    dark: 'rgba(255, 255, 255, 0.12)',
  },
  
  // 渐变
  gradients: {
    primary: 'linear-gradient(135deg, #00b96b 0%, #33c987 100%)',
    blue: 'linear-gradient(135deg, #1565C0 0%, #1E88E5 100%)',
    background: 'linear-gradient(135deg, #121212 0%, #1e1e1e 100%)',
  },
};

// 间距系统
export const spacing = {
  unit: 8, // 基础单位，单位为像素
  
  // 辅助函数，返回指定倍数的间距
  get: (multiplier: number = 1) => `${spacing.unit * multiplier}px`,
  
  // 常用间距
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

// 字体系统
export const typography = {
  fontFamily: {
    primary: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
    code: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  },
  
  // 字体大小
  fontSize: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    xxl: '24px',
    xxxl: '30px',
  },
  
  // 字重
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    bold: 700,
  },
  
  // 行高
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// 阴影系统
export const shadows = {
  sm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  md: '0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)',
  lg: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
  xl: '0 15px 25px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.05)',
  
  // 内部阴影
  inset: 'inset 0 2px 4px rgba(0,0,0,0.1)',
};

// 圆角系统
export const borderRadius = {
  none: '0',
  sm: '2px',
  md: '4px',
  lg: '8px',
  xl: '12px',
  xxl: '16px',
  round: '50%',
};

// 过渡系统
export const transitions = {
  duration: {
    short: '150ms',
    medium: '300ms',
    long: '500ms',
  },
  
  timing: {
    ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    easeIn: 'cubic-bezier(0.42, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.58, 1)',
    easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
  },
};

// z-index系统
export const zIndex = {
  appBar: 1100,
  drawer: 1200,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500,
};

// 导出所有设计令牌
const designTokens = {
  colors,
  spacing,
  typography,
  shadows,
  borderRadius,
  transitions,
  zIndex,
};

export default designTokens; 