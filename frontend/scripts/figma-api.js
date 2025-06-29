/**
 * @file figma-api.js
 * @description Figma API集成工具
 * @author Deep Excavation Team
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const config = require('../figma.config');

class FigmaAPI {
  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.figma.com/v1',
      headers: {
        'X-Figma-Token': config.figma.accessToken,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 获取文件信息
   * @param {string} fileId - 文件ID
   * @returns {Promise<Object>} 文件信息
   */
  async getFile(fileId = config.figma.fileId) {
    try {
      const response = await this.client.get(`/files/${fileId}`);
      return response.data;
    } catch (error) {
      console.error('获取Figma文件失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取文件的设计令牌
   * @param {string} fileId - 文件ID
   * @returns {Promise<Object>} 设计令牌
   */
  async getDesignTokens(fileId = config.figma.fileId) {
    try {
      const file = await this.getFile(fileId);
      const tokens = this.extractTokensFromFile(file);
      return tokens;
    } catch (error) {
      console.error('提取设计令牌失败:', error.message);
      throw error;
    }
  }

  /**
   * 从文件中提取设计令牌
   * @param {Object} file - Figma文件数据
   * @returns {Object} 设计令牌
   */
  extractTokensFromFile(file) {
    const tokens = {
      colors: {},
      typography: {},
      spacing: {},
      effects: {},
      grids: {}
    };

    // 提取颜色令牌
    this.extractColors(file, tokens.colors);
    
    // 提取文字样式令牌
    this.extractTextStyles(file, tokens.typography);
    
    // 提取效果令牌
    this.extractEffects(file, tokens.effects);

    return tokens;
  }

  /**
   * 提取颜色令牌
   * @param {Object} file - Figma文件
   * @param {Object} colors - 颜色对象
   */
  extractColors(file, colors) {
    if (file.styles) {
      Object.values(file.styles).forEach(style => {
        if (style.styleType === 'FILL') {
          const name = this.formatTokenName(style.name);
          colors[name] = this.extractColorValue(style);
        }
      });
    }
  }

  /**
   * 提取文字样式令牌
   * @param {Object} file - Figma文件
   * @param {Object} typography - 文字样式对象
   */
  extractTextStyles(file, typography) {
    if (file.styles) {
      Object.values(file.styles).forEach(style => {
        if (style.styleType === 'TEXT') {
          const name = this.formatTokenName(style.name);
          typography[name] = this.extractTextStyle(style);
        }
      });
    }
  }

  /**
   * 提取效果令牌
   * @param {Object} file - Figma文件
   * @param {Object} effects - 效果对象
   */
  extractEffects(file, effects) {
    if (file.styles) {
      Object.values(file.styles).forEach(style => {
        if (style.styleType === 'EFFECT') {
          const name = this.formatTokenName(style.name);
          effects[name] = this.extractEffectValue(style);
        }
      });
    }
  }

  /**
   * 格式化令牌名称
   * @param {string} name - 原始名称
   * @returns {string} 格式化后的名称
   */
  formatTokenName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * 提取颜色值
   * @param {Object} style - 样式对象
   * @returns {string} 颜色值
   */
  extractColorValue(style) {
    // 这里简化处理，实际应根据Figma API返回的数据结构处理
    if (style.paints && style.paints[0]) {
      const paint = style.paints[0];
      if (paint.type === 'SOLID') {
        const { r, g, b, a = 1 } = paint.color;
        return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
      }
    }
    return '#000000';
  }

  /**
   * 提取文字样式
   * @param {Object} style - 样式对象
   * @returns {Object} 文字样式
   */
  extractTextStyle(style) {
    // 简化处理，实际应根据Figma API返回的数据结构处理
    return {
      fontFamily: style.fontFamily || 'Roboto',
      fontSize: `${style.fontSize || 16}px`,
      fontWeight: style.fontWeight || 400,
      lineHeight: style.lineHeight || 1.5,
      letterSpacing: `${style.letterSpacing || 0}px`
    };
  }

  /**
   * 提取效果值
   * @param {Object} style - 样式对象
   * @returns {string} 效果值
   */
  extractEffectValue(style) {
    // 简化处理，实际应根据Figma API返回的数据结构处理
    if (style.effects && style.effects[0]) {
      const effect = style.effects[0];
      if (effect.type === 'DROP_SHADOW') {
        const { offset, radius, color } = effect;
        return `${offset.x}px ${offset.y}px ${radius}px rgba(0,0,0,0.1)`;
      }
    }
    return 'none';
  }

  /**
   * 获取组件信息
   * @param {string} fileId - 文件ID
   * @returns {Promise<Object>} 组件信息
   */
  async getComponents(fileId = config.figma.fileId) {
    try {
      const response = await this.client.get(`/files/${fileId}/components`);
      return response.data;
    } catch (error) {
      console.error('获取组件失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取组件图片
   * @param {string} fileId - 文件ID
   * @param {Array} componentIds - 组件ID列表
   * @returns {Promise<Object>} 组件图片URL
   */
  async getComponentImages(fileId = config.figma.fileId, componentIds) {
    try {
      const response = await this.client.get(`/images/${fileId}`, {
        params: {
          ids: componentIds.join(','),
          format: 'svg'
        }
      });
      return response.data;
    } catch (error) {
      console.error('获取组件图片失败:', error.message);
      throw error;
    }
  }

  /**
   * 保存设计令牌到文件
   * @param {Object} tokens - 设计令牌
   * @param {string} format - 输出格式
   */
  async saveTokens(tokens, format = 'json') {
    const outputPath = path.join(config.tokens.outputPath, `tokens.${format}`);
    
    // 确保目录存在
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    let content;
    switch (format) {
      case 'json':
        content = JSON.stringify(tokens, null, 2);
        break;
      case 'js':
        content = `export const tokens = ${JSON.stringify(tokens, null, 2)};`;
        break;
      case 'ts':
        content = `export const tokens: DesignTokens = ${JSON.stringify(tokens, null, 2)};`;
        break;
      case 'css':
        content = this.generateCSSTokens(tokens);
        break;
      case 'scss':
        content = this.generateSCSSTokens(tokens);
        break;
      default:
        throw new Error(`不支持的格式: ${format}`);
    }

    await fs.writeFile(outputPath, content, 'utf8');
    console.log(`设计令牌已保存到: ${outputPath}`);
  }

  /**
   * 生成CSS变量
   * @param {Object} tokens - 设计令牌
   * @returns {string} CSS内容
   */
  generateCSSTokens(tokens) {
    let css = ':root {\n';
    
    Object.entries(tokens.colors || {}).forEach(([name, value]) => {
      css += `  --color-${name}: ${value};\n`;
    });

    Object.entries(tokens.typography || {}).forEach(([name, style]) => {
      css += `  --font-${name}-family: ${style.fontFamily};\n`;
      css += `  --font-${name}-size: ${style.fontSize};\n`;
      css += `  --font-${name}-weight: ${style.fontWeight};\n`;
    });

    Object.entries(tokens.spacing || {}).forEach(([name, value]) => {
      css += `  --spacing-${name}: ${value};\n`;
    });

    css += '}';
    return css;
  }

  /**
   * 生成SCSS变量
   * @param {Object} tokens - 设计令牌
   * @returns {string} SCSS内容
   */
  generateSCSSTokens(tokens) {
    let scss = '';
    
    Object.entries(tokens.colors || {}).forEach(([name, value]) => {
      scss += `$color-${name}: ${value};\n`;
    });

    Object.entries(tokens.typography || {}).forEach(([name, style]) => {
      scss += `$font-${name}-family: ${style.fontFamily};\n`;
      scss += `$font-${name}-size: ${style.fontSize};\n`;
      scss += `$font-${name}-weight: ${style.fontWeight};\n`;
    });

    Object.entries(tokens.spacing || {}).forEach(([name, value]) => {
      scss += `$spacing-${name}: ${value};\n`;
    });

    return scss;
  }
}

module.exports = FigmaAPI;
