/**
 * @file figma-components.js
 * @description Figma组件自动生成脚本
 * @author Deep Excavation Team
 */

const FigmaAPI = require('./figma-api');
const config = require('../figma.config');
const fs = require('fs').promises;
const path = require('path');

class ComponentGenerator {
  constructor() {
    this.figmaApi = new FigmaAPI();
  }

  /**
   * 生成React组件
   */
  async generateComponents() {
    try {
      console.log('🔧 开始生成React组件...');
      
      // 获取Figma组件
      const components = await this.figmaApi.getComponents();
      
      // 生成组件代码
      for (const [componentId, component] of Object.entries(components.meta?.components || {})) {
        await this.generateSingleComponent(componentId, component);
      }
      
      // 生成组件索引文件
      await this.generateComponentIndex();
      
      // 生成Storybook故事
      await this.generateStorybookStories();
      
      console.log('✅ React组件生成完成!');
      
    } catch (error) {
      console.error('❌ 组件生成失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 生成单个组件
   * @param {string} componentId - 组件ID
   * @param {Object} component - 组件数据
   */
  async generateSingleComponent(componentId, component) {
    const componentName = this.formatComponentName(component.name);
    const mappedName = config.components.mapping[componentName] || componentName;
    
    // 获取组件样式
    const styles = await this.extractComponentStyles(component);
    
    // 生成组件代码
    const componentCode = this.generateComponentCode(mappedName, styles, component);
    
    // 保存组件文件
    const outputPath = path.join(config.components.outputPath, `${mappedName}.tsx`);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, componentCode, 'utf8');
    
    console.log(`组件已生成: ${mappedName}`);
  }

  /**
   * 格式化组件名称
   * @param {string} name - 原始名称
   * @returns {string} 格式化后的名称
   */
  formatComponentName(name) {
    return name
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^./, str => str.toUpperCase());
  }

  /**
   * 提取组件样式
   * @param {Object} component - 组件数据
   * @returns {Object} 样式对象
   */
  async extractComponentStyles(component) {
    // 这里简化处理，实际需要解析Figma的样式数据
    return {
      width: component.absoluteBoundingBox?.width || 'auto',
      height: component.absoluteBoundingBox?.height || 'auto',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      padding: '16px',
      margin: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };
  }

  /**
   * 生成组件代码
   * @param {string} componentName - 组件名称
   * @param {Object} styles - 样式
   * @param {Object} component - 组件数据
   * @returns {string} 组件代码
   */
  generateComponentCode(componentName, styles, component) {
    const propsInterface = this.generatePropsInterface(componentName, component);
    const styledComponent = this.generateStyledComponent(componentName, styles);
    
    return `/**
 * @file ${componentName}.tsx
 * @description Auto-generated component from Figma
 * @generated DO NOT EDIT MANUALLY
 */

import React from 'react';
import { styled } from '@mui/material/styles';
import { Box, BoxProps } from '@mui/material';

${propsInterface}

const Styled${componentName} = styled(Box)<${componentName}Props>(({ theme }) => ({
${this.formatStyles(styles)}
}));

export const ${componentName}: React.FC<${componentName}Props> = ({
  children,
  variant = 'default',
  size = 'medium',
  ...props
}) => {
  return (
    <Styled${componentName} 
      variant={variant}
      size={size}
      {...props}
    >
      {children}
    </Styled${componentName}>
  );
};

${componentName}.displayName = '${componentName}';

export default ${componentName};
`;
  }

  /**
   * 生成Props接口
   * @param {string} componentName - 组件名称
   * @param {Object} component - 组件数据
   * @returns {string} Props接口代码
   */
  generatePropsInterface(componentName, component) {
    return `export interface ${componentName}Props extends BoxProps {
  /** Component variant */
  variant?: 'default' | 'outlined' | 'filled';
  /** Component size */
  size?: 'small' | 'medium' | 'large';
  /** Child elements */
  children?: React.ReactNode;
}`;
  }

  /**
   * 生成样式组件
   * @param {string} componentName - 组件名称
   * @param {Object} styles - 样式
   * @returns {string} 样式组件代码
   */
  generateStyledComponent(componentName, styles) {
    return `const Styled${componentName} = styled(Box)`;
  }

  /**
   * 格式化样式对象
   * @param {Object} styles - 样式对象
   * @returns {string} 格式化的样式
   */
  formatStyles(styles) {
    return Object.entries(styles)
      .map(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `  ${cssKey}: '${value}',`;
      })
      .join('\n');
  }

  /**
   * 生成组件索引文件
   */
  async generateComponentIndex() {
    const outputPath = path.join(config.components.outputPath, 'index.ts');
    
    // 读取所有生成的组件文件
    const componentFiles = await fs.readdir(config.components.outputPath);
    const componentExports = componentFiles
      .filter(file => file.endsWith('.tsx') && file !== 'index.ts')
      .map(file => {
        const componentName = file.replace('.tsx', '');
        return `export { default as ${componentName}, ${componentName} } from './${componentName}';`;
      })
      .join('\n');

    const indexContent = `/**
 * @file index.ts
 * @description Auto-generated component exports
 * @generated DO NOT EDIT MANUALLY
 */

${componentExports}

// Re-export all component types
export type * from './types';
`;

    await fs.writeFile(outputPath, indexContent, 'utf8');
    console.log('组件索引文件已生成');
  }

  /**
   * 生成Storybook故事
   */
  async generateStorybookStories() {
    const storiesPath = path.join(config.components.outputPath, '..', 'stories');
    await fs.mkdir(storiesPath, { recursive: true });
    
    // 读取所有组件文件
    const componentFiles = await fs.readdir(config.components.outputPath);
    
    for (const file of componentFiles) {
      if (file.endsWith('.tsx') && file !== 'index.ts') {
        const componentName = file.replace('.tsx', '');
        await this.generateSingleStory(componentName, storiesPath);
      }
    }
  }

  /**
   * 生成单个组件的故事
   * @param {string} componentName - 组件名称
   * @param {string} storiesPath - 故事文件路径
   */
  async generateSingleStory(componentName, storiesPath) {
    const storyContent = `/**
 * @file ${componentName}.stories.tsx
 * @description Auto-generated Storybook stories
 * @generated DO NOT EDIT MANUALLY
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ${componentName} } from '../figma-generated/${componentName}';

const meta: Meta<typeof ${componentName}> = {
  title: 'Figma Generated/${componentName}',
  component: ${componentName},
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Auto-generated component from Figma design system.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'outlined', 'filled'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: '${componentName} Component',
  },
};

export const Outlined: Story = {
  args: {
    children: '${componentName} Component',
    variant: 'outlined',
  },
};

export const Filled: Story = {
  args: {
    children: '${componentName} Component',
    variant: 'filled',
  },
};

export const Small: Story = {
  args: {
    children: '${componentName} Component',
    size: 'small',
  },
};

export const Large: Story = {
  args: {
    children: '${componentName} Component',
    size: 'large',
  },
};
`;

    const storyPath = path.join(storiesPath, `${componentName}.stories.tsx`);
    await fs.writeFile(storyPath, storyContent, 'utf8');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const generator = new ComponentGenerator();
  generator.generateComponents();
}

module.exports = ComponentGenerator;
