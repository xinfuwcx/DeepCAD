/**
 * @file figma-sync.js
 * @description Figma完整同步脚本
 * @author Deep Excavation Team
 */

const TokenSync = require('./figma-tokens');
const ComponentGenerator = require('./figma-components');
const config = require('../figma.config');
const fs = require('fs').promises;
const path = require('path');

class FigmaSync {
  constructor() {
    this.tokenSync = new TokenSync();
    this.componentGenerator = new ComponentGenerator();
  }

  /**
   * 完整同步流程
   */
  async fullSync() {
    console.log('🚀 开始Figma完整同步...');
    
    try {
      // 检查配置
      await this.validateConfig();
      
      // 创建备份
      await this.createBackup();
      
      // 同步设计令牌
      console.log('\n📊 同步设计令牌...');
      await this.tokenSync.syncTokens();
      
      // 生成组件
      console.log('\n🔧 生成React组件...');
      await this.componentGenerator.generateComponents();
      
      // 更新文档
      await this.updateDocumentation();
      
      // 生成同步报告
      await this.generateSyncReport();
      
      console.log('\n✅ Figma同步完成！');
      console.log('📋 查看同步报告: ./figma-sync-report.md');
      
    } catch (error) {
      console.error('\n❌ 同步失败:', error.message);
      
      // 恢复备份
      await this.restoreBackup();
      
      process.exit(1);
    }
  }

  /**
   * 验证配置
   */
  async validateConfig() {
    console.log('🔍 验证配置...');
    
    // 检查必需的环境变量
    if (!config.figma.accessToken) {
      throw new Error('请设置 FIGMA_ACCESS_TOKEN 环境变量');
    }
    
    if (!config.figma.fileId) {
      throw new Error('请设置 FIGMA_FILE_ID 环境变量');
    }
    
    // 检查输出目录
    await fs.mkdir(config.tokens.outputPath, { recursive: true });
    await fs.mkdir(config.components.outputPath, { recursive: true });
    
    console.log('✅ 配置验证通过');
  }

  /**
   * 创建备份
   */
  async createBackup() {
    console.log('💾 创建备份...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join('./', 'figma-backups', timestamp);
    
    try {
      await fs.mkdir(backupDir, { recursive: true });
      
      // 备份现有的设计令牌
      const tokensPath = config.tokens.outputPath;
      if (await this.pathExists(tokensPath)) {
        await this.copyDirectory(tokensPath, path.join(backupDir, 'tokens'));
      }
      
      // 备份现有的组件
      const componentsPath = config.components.outputPath;
      if (await this.pathExists(componentsPath)) {
        await this.copyDirectory(componentsPath, path.join(backupDir, 'components'));
      }
      
      this.backupPath = backupDir;
      console.log(`✅ 备份已创建: ${backupDir}`);
      
    } catch (error) {
      console.warn('⚠️ 备份创建失败:', error.message);
    }
  }

  /**
   * 恢复备份
   */
  async restoreBackup() {
    if (!this.backupPath) return;
    
    console.log('🔄 恢复备份...');
    
    try {
      // 恢复设计令牌
      const tokensBackup = path.join(this.backupPath, 'tokens');
      if (await this.pathExists(tokensBackup)) {
        await this.copyDirectory(tokensBackup, config.tokens.outputPath);
      }
      
      // 恢复组件
      const componentsBackup = path.join(this.backupPath, 'components');
      if (await this.pathExists(componentsBackup)) {
        await this.copyDirectory(componentsBackup, config.components.outputPath);
      }
      
      console.log('✅ 备份已恢复');
      
    } catch (error) {
      console.error('❌ 备份恢复失败:', error.message);
    }
  }

  /**
   * 更新文档
   */
  async updateDocumentation() {
    console.log('📚 更新文档...');
    
    const docsPath = path.join('./', 'docs', 'figma-integration.md');
    await fs.mkdir(path.dirname(docsPath), { recursive: true });
    
    const documentation = this.generateDocumentation();
    await fs.writeFile(docsPath, documentation, 'utf8');
    
    console.log('✅ 文档已更新');
  }

  /**
   * 生成文档内容
   */
  generateDocumentation() {
    return `# Figma 集成文档

## 概述

本项目集成了 Figma 设计系统，可以自动同步设计令牌和生成 React 组件。

## 功能特性

- 🎨 **设计令牌同步**: 自动从 Figma 提取颜色、字体、间距等设计令牌
- 🔧 **组件自动生成**: 基于 Figma 组件生成 React 组件代码
- 📱 **响应式支持**: 自动生成响应式变体
- 🎭 **Storybook 集成**: 自动生成组件故事
- 📋 **TypeScript 支持**: 完整的类型定义

## 使用方法

### 1. 配置环境变量

创建 \`.env\` 文件：

\`\`\`bash
FIGMA_ACCESS_TOKEN=your_figma_access_token
FIGMA_FILE_ID=your_figma_file_id
FIGMA_TEAM_ID=your_figma_team_id
\`\`\`

### 2. 运行同步命令

\`\`\`bash
# 完整同步
npm run figma:sync

# 仅同步设计令牌
npm run figma:tokens

# 仅生成组件
npm run figma:components
\`\`\`

### 3. 使用生成的资源

\`\`\`tsx
// 使用设计令牌
import { tokens } from './styles/tokens/tokens';

// 使用生成的组件
import { Button, Card } from './components/figma-generated';
\`\`\`

## 配置说明

配置文件位于 \`figma.config.js\`，包含以下主要配置：

- **figma**: Figma API 配置
- **tokens**: 设计令牌配置
- **components**: 组件生成配置
- **automation**: 自动化配置

## 获取 Figma Access Token

1. 访问 [Figma Account Settings](https://www.figma.com/developers/api#access-tokens)
2. 点击 "Create a new personal access token"
3. 输入 token 名称，如 "Deep Excavation CAE"
4. 复制生成的 token

## 获取 Figma File ID

从 Figma 文件 URL 中提取：
\`https://www.figma.com/file/FILE_ID/file-name\`

## 目录结构

\`\`\`
src/
├── styles/
│   ├── tokens/          # 生成的设计令牌
│   │   ├── tokens.json
│   │   ├── tokens.js
│   │   ├── tokens.css
│   │   └── types.ts
│   └── theme-generated.ts
├── components/
│   └── figma-generated/ # 生成的组件
└── stories/             # Storybook 故事
\`\`\`

## 注意事项

- 生成的文件包含 \`@generated\` 注释，请勿手动编辑
- 建议定期运行同步以保持设计一致性
- 生成前会自动创建备份
- 支持增量更新，不会覆盖自定义修改

## 故障排除

### Token 无效
检查 FIGMA_ACCESS_TOKEN 是否正确设置

### 文件访问权限
确保 token 有权限访问指定的 Figma 文件

### 生成失败
查看控制台错误信息，通常是网络问题或配置错误
`;
  }

  /**
   * 生成同步报告
   */
  async generateSyncReport() {
    const reportPath = './figma-sync-report.md';
    const timestamp = new Date().toISOString();
    
    // 统计生成的文件
    const tokenFiles = await this.countFiles(config.tokens.outputPath);
    const componentFiles = await this.countFiles(config.components.outputPath);
    
    const report = `# Figma 同步报告

## 同步信息

- **时间**: ${timestamp}
- **状态**: ✅ 成功
- **配置文件**: figma.config.js

## 生成统计

### 设计令牌
- **生成文件**: ${tokenFiles} 个
- **输出路径**: ${config.tokens.outputPath}
- **支持格式**: ${config.tokens.formats.join(', ')}

### React 组件
- **生成组件**: ${componentFiles} 个
- **输出路径**: ${config.components.outputPath}
- **UI 库**: ${config.components.uiLibrary}

## 文件列表

### 设计令牌文件
${await this.listFiles(config.tokens.outputPath)}

### 组件文件
${await this.listFiles(config.components.outputPath)}

## 下次同步

建议在设计更新后重新运行同步：

\`\`\`bash
npm run figma:sync
\`\`\`

---
*报告生成时间: ${new Date().toLocaleString()}*
`;

    await fs.writeFile(reportPath, report, 'utf8');
  }

  /**
   * 工具方法
   */
  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const files = await fs.readdir(src, { withFileTypes: true });
    
    for (const file of files) {
      const srcPath = path.join(src, file.name);
      const destPath = path.join(dest, file.name);
      
      if (file.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async countFiles(dir) {
    try {
      const files = await fs.readdir(dir);
      return files.length;
    } catch {
      return 0;
    }
  }

  async listFiles(dir) {
    try {
      const files = await fs.readdir(dir);
      return files.map(file => `- ${file}`).join('\n');
    } catch {
      return '- (无文件)';
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const figmaSync = new FigmaSync();
  figmaSync.fullSync();
}

module.exports = FigmaSync;
