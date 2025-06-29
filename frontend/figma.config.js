/**
 * @file figma.config.js
 * @description Figma集成配置文件
 * @author Deep Excavation Team
 */

module.exports = {
  // Figma API配置
  figma: {
    // 从环境变量读取API Token
    accessToken: process.env.FIGMA_ACCESS_TOKEN,
    // 设计文件ID
    fileId: process.env.FIGMA_FILE_ID || 'YOUR_FIGMA_FILE_ID',
    // 团队ID
    teamId: process.env.FIGMA_TEAM_ID,
  },

  // 设计令牌配置
  tokens: {
    // 输出路径
    outputPath: './src/styles/tokens',
    // 支持的令牌类型
    types: [
      'colors',
      'typography',
      'spacing',
      'elevation',
      'borders',
      'animations'
    ],
    // 格式配置
    formats: [
      'css',
      'scss',
      'js',
      'ts',
      'json'
    ]
  },

  // 组件生成配置
  components: {
    // 输出路径
    outputPath: './src/components/figma-generated',
    // 组件映射规则
    mapping: {
      'Button': 'Button',
      'Input': 'TextField',
      'Card': 'Card',
      'Modal': 'Dialog',
      'Icon': 'Icon',
      'Navigation': 'Navigation',
      'Sidebar': 'Sidebar',
      'Header': 'AppBar',
      'Footer': 'Footer'
    },
    // 样式系统
    styleSystem: 'emotion', // 或 'styled-components'
    // 组件库
    uiLibrary: 'mui' // 或 'antd', 'chakra'
  },

  // 设计规范配置
  designSystem: {
    // 主题配置
    theme: {
      // 基础颜色
      colors: {
        primary: '#1976d2',
        secondary: '#dc004e',
        surface: '#ffffff',
        background: '#f5f5f5',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3',
        success: '#4caf50'
      },
      // 字体配置
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem'
        }
      },
      // 间距配置
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        base: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem'
      },
      // 断点配置
      breakpoints: {
        xs: '0px',
        sm: '600px',
        md: '960px',
        lg: '1280px',
        xl: '1920px'
      }
    }
  },

  // 自动化配置
  automation: {
    // 是否启用自动同步
    autoSync: false,
    // 同步间隔（分钟）
    syncInterval: 30,
    // 监听的页面/组件
    watchPages: [
      'Dashboard',
      'ExcavationAnalysis',
      'ProjectManagement',
      'ResultVisualization'
    ],
    // 构建时是否自动拉取最新设计
    buildTimeSync: true
  },

  // 版本控制配置
  versioning: {
    // 是否启用版本控制
    enabled: true,
    // 版本存储路径
    versionPath: './design-versions',
    // 保留的版本数量
    keepVersions: 10
  }
};
