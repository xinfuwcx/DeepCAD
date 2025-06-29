/**
 * @file figma-tokens.js
 * @description 设计令牌同步脚本
 * @author Deep Excavation Team
 */

const FigmaAPI = require('./figma-api');
const config = require('../figma.config');
const fs = require('fs').promises;
const path = require('path');

class TokenSync {
  constructor() {
    this.figmaApi = new FigmaAPI();
  }

  /**
   * 同步设计令牌
   */
  async syncTokens() {
    try {
      console.log('🎨 开始同步设计令牌...');
      
      // 获取设计令牌
      const tokens = await this.figmaApi.getDesignTokens();
      
      // 扩展令牌（添加计算值和变体）
      const enhancedTokens = await this.enhanceTokens(tokens);
      
      // 保存到多种格式
      for (const format of config.tokens.formats) {
        await this.figmaApi.saveTokens(enhancedTokens, format);
      }
      
      // 生成TypeScript类型定义
      await this.generateTypeDefinitions(enhancedTokens);
      
      // 更新主题配置
      await this.updateThemeConfig(enhancedTokens);
      
      console.log('✅ 设计令牌同步完成!');
      
    } catch (error) {
      console.error('❌ 设计令牌同步失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 增强设计令牌
   * @param {Object} tokens - 原始令牌
   * @returns {Object} 增强后的令牌
   */
  async enhanceTokens(tokens) {
    const enhanced = { ...tokens };
    
    // 生成颜色变体
    enhanced.colors = await this.generateColorVariants(tokens.colors);
    
    // 生成响应式间距
    enhanced.spacing = await this.generateResponsiveSpacing(tokens.spacing);
    
    // 生成字体变体
    enhanced.typography = await this.generateTypographyVariants(tokens.typography);
    
    // 添加语义化令牌
    enhanced.semantic = await this.generateSemanticTokens(enhanced);
    
    return enhanced;
  }

  /**
   * 生成颜色变体
   * @param {Object} colors - 基础颜色
   * @returns {Object} 颜色变体
   */
  async generateColorVariants(colors) {
    const variants = { ...colors };
    const chroma = require('chroma-js');
    
    Object.entries(colors).forEach(([name, color]) => {
      try {
        const chromaColor = chroma(color);
        
        // 生成明暗变体
        variants[`${name}-light`] = chromaColor.brighten(1).hex();
        variants[`${name}-lighter`] = chromaColor.brighten(2).hex();
        variants[`${name}-dark`] = chromaColor.darken(1).hex();
        variants[`${name}-darker`] = chromaColor.darken(2).hex();
        
        // 生成透明度变体
        variants[`${name}-10`] = chromaColor.alpha(0.1).css();
        variants[`${name}-20`] = chromaColor.alpha(0.2).css();
        variants[`${name}-50`] = chromaColor.alpha(0.5).css();
        variants[`${name}-80`] = chromaColor.alpha(0.8).css();
        
      } catch (error) {
        console.warn(`无法处理颜色 ${name}: ${color}`);
      }
    });
    
    return variants;
  }

  /**
   * 生成响应式间距
   * @param {Object} spacing - 基础间距
   * @returns {Object} 响应式间距
   */
  async generateResponsiveSpacing(spacing) {
    const responsive = { ...spacing };
    
    // 为每个间距生成响应式变体
    Object.entries(spacing).forEach(([name, value]) => {
      const baseValue = parseFloat(value);
      if (!isNaN(baseValue)) {
        responsive[`${name}-mobile`] = `${baseValue * 0.75}rem`;
        responsive[`${name}-tablet`] = `${baseValue * 0.875}rem`;
        responsive[`${name}-desktop`] = value;
        responsive[`${name}-wide`] = `${baseValue * 1.25}rem`;
      }
    });
    
    return responsive;
  }

  /**
   * 生成字体变体
   * @param {Object} typography - 基础字体
   * @returns {Object} 字体变体
   */
  async generateTypographyVariants(typography) {
    const variants = { ...typography };
    
    // 生成移动端字体变体
    Object.entries(typography).forEach(([name, style]) => {
      const fontSize = parseFloat(style.fontSize);
      if (!isNaN(fontSize)) {
        variants[`${name}-mobile`] = {
          ...style,
          fontSize: `${fontSize * 0.875}px`,
          lineHeight: parseFloat(style.lineHeight) * 1.1
        };
      }
    });
    
    return variants;
  }

  /**
   * 生成语义化令牌
   * @param {Object} tokens - 基础令牌
   * @returns {Object} 语义化令牌
   */
  async generateSemanticTokens(tokens) {
    return {
      colors: {
        // 状态颜色
        success: tokens.colors['success'] || '#4caf50',
        warning: tokens.colors['warning'] || '#ff9800',
        error: tokens.colors['error'] || '#f44336',
        info: tokens.colors['info'] || '#2196f3',
        
        // 界面颜色
        background: tokens.colors['background'] || '#ffffff',
        surface: tokens.colors['surface'] || '#f5f5f5',
        border: tokens.colors['border'] || '#e0e0e0',
        divider: tokens.colors['divider'] || '#eeeeee',
        
        // 文本颜色
        'text-primary': tokens.colors['text-primary'] || '#212121',
        'text-secondary': tokens.colors['text-secondary'] || '#757575',
        'text-disabled': tokens.colors['text-disabled'] || '#bdbdbd'
      },
      
      spacing: {
        // 组件间距
        'component-padding': tokens.spacing['base'] || '1rem',
        'component-margin': tokens.spacing['lg'] || '1.5rem',
        'section-padding': tokens.spacing['2xl'] || '3rem',
        
        // 网格间距
        'grid-gap': tokens.spacing['base'] || '1rem',
        'grid-gutter': tokens.spacing['lg'] || '1.5rem'
      },
      
      typography: {
        // 功能性字体
        heading: tokens.typography['heading'] || tokens.typography['h1'],
        body: tokens.typography['body'] || tokens.typography['body1'],
        caption: tokens.typography['caption'] || tokens.typography['caption1']
      }
    };
  }

  /**
   * 生成TypeScript类型定义
   * @param {Object} tokens - 设计令牌
   */
  async generateTypeDefinitions(tokens) {
    const outputPath = path.join(config.tokens.outputPath, 'types.ts');
    
    let types = `// Auto-generated design tokens types
// DO NOT EDIT MANUALLY

export interface DesignTokens {
  colors: {
`;

    // 生成颜色类型
    Object.keys(tokens.colors || {}).forEach(key => {
      types += `    '${key}': string;\n`;
    });

    types += `  };
  typography: {
`;

    // 生成字体类型
    Object.keys(tokens.typography || {}).forEach(key => {
      types += `    '${key}': TypographyStyle;\n`;
    });

    types += `  };
  spacing: {
`;

    // 生成间距类型
    Object.keys(tokens.spacing || {}).forEach(key => {
      types += `    '${key}': string;\n`;
    });

    types += `  };
  semantic: {
    colors: { [key: string]: string };
    spacing: { [key: string]: string };
    typography: { [key: string]: TypographyStyle };
  };
}

export interface TypographyStyle {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: string;
}

export type ColorToken = keyof DesignTokens['colors'];
export type TypographyToken = keyof DesignTokens['typography'];
export type SpacingToken = keyof DesignTokens['spacing'];
`;

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, types, 'utf8');
    console.log(`TypeScript类型定义已生成: ${outputPath}`);
  }

  /**
   * 更新主题配置
   * @param {Object} tokens - 设计令牌
   */
  async updateThemeConfig(tokens) {
    const themePath = path.join(config.tokens.outputPath, '..', 'theme-generated.ts');
    
    const themeConfig = `// Auto-generated theme configuration
// DO NOT EDIT MANUALLY

import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens/tokens';

export const generatedTheme = createTheme({
  palette: {
    primary: {
      main: tokens.colors.primary || '${config.designSystem.theme.colors.primary}',
      light: tokens.colors['primary-light'] || '${config.designSystem.theme.colors.primary}',
      dark: tokens.colors['primary-dark'] || '${config.designSystem.theme.colors.primary}',
    },
    secondary: {
      main: tokens.colors.secondary || '${config.designSystem.theme.colors.secondary}',
      light: tokens.colors['secondary-light'] || '${config.designSystem.theme.colors.secondary}',
      dark: tokens.colors['secondary-dark'] || '${config.designSystem.theme.colors.secondary}',
    },
    error: {
      main: tokens.colors.error || '${config.designSystem.theme.colors.error}',
    },
    warning: {
      main: tokens.colors.warning || '${config.designSystem.theme.colors.warning}',
    },
    info: {
      main: tokens.colors.info || '${config.designSystem.theme.colors.info}',
    },
    success: {
      main: tokens.colors.success || '${config.designSystem.theme.colors.success}',
    },
    background: {
      default: tokens.colors.background || '${config.designSystem.theme.colors.background}',
      paper: tokens.colors.surface || '${config.designSystem.theme.colors.surface}',
    },
  },
  typography: {${this.generateTypographyTheme(tokens.typography)}
  },
  spacing: (factor: number) => \`\${factor * 8}px\`,
  breakpoints: {
    values: ${JSON.stringify(config.designSystem.theme.breakpoints, null, 6)}
  }
});
`;

    await fs.writeFile(themePath, themeConfig, 'utf8');
    console.log(`主题配置已更新: ${themePath}`);
  }

  /**
   * 生成字体主题配置
   * @param {Object} typography - 字体令牌
   * @returns {string} 字体配置
   */
  generateTypographyTheme(typography) {
    let config = '\n';
    
    Object.entries(typography || {}).forEach(([name, style], index) => {
      if (index < 10) { // 限制数量以避免过长
        config += `    ${name}: {
      fontFamily: '${style.fontFamily}',
      fontSize: '${style.fontSize}',
      fontWeight: ${style.fontWeight},
      lineHeight: ${style.lineHeight},
    },\n`;
      }
    });
    
    return config;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const tokenSync = new TokenSync();
  tokenSync.syncTokens();
}

module.exports = TokenSync;
