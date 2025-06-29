# 🏗️ 深基坑CAE系统

基于等几何分析(IGA)的深基坑工程分析系统，提供高精度的几何表达和力学分析，集成现代化的设计系统和自动化工作流。

## ✨ 系统特点

### 🔬 核心分析技术
- **等几何分析(IGA)技术**：直接使用NURBS几何模型进行分析，无需传统网格划分
- **几何精确表达**：保持CAD几何的精确性，避免网格近似误差
- **高阶连续性**：支持高阶连续基函数，提供更高的计算精度

### 🎨 设计系统集成 (NEW!)
- **Figma自动化设计系统**：实现设计师与开发者无缝协作
- **设计令牌系统**：12个颜色、5个字体、6个间距的完整设计规范
- **多格式支持**：JSON、TypeScript、CSS三种格式的设计令牌
- **实时同步**：支持与Figma设计的实时同步更新
- **类型安全**：完整的TypeScript类型定义和Material-UI主题集成

## 🚀 快速开始

### 环境要求
- Python 3.9+
- Node.js 18+
- npm 或 yarn

### 安装步骤
1. **安装Python依赖**: `pip install -r requirements.minimal.txt`
2. **安装前端依赖**: `cd frontend && npm install && cd ..`
3. **启动系统**: `scripts\start_system.bat` (Windows) 或 `bash scripts/start_system.sh` (Linux)

### 🎨 Figma设计系统快速配置
```bash
# 进入前端目录
cd frontend

# 运行Figma集成测试
node scripts/test-figma.js

# 或运行完整测试
final-figma-test.bat
```

### 使用设计令牌
```tsx
// 在React组件中使用
import { tokens } from './styles/tokens';

// 使用CSS变量
color: var(--color-primary);
padding: var(--spacing-base);
```

## 📚 文档

### 核心文档
- [📖 安装指南](docs/INSTALLATION.md)
- [🏗️ 系统架构](docs/ARCHITECTURE.md)
- [🔄 IGA迁移计划](docs/IGA_MIGRATION_PLAN.md)
- [📋 技术报告](docs/TECHNICAL_REPORT.md)

### 设计系统文档
- [🎨 Figma集成指南](frontend/FIGMA_SETUP.md)
- [✅ 集成完成报告](frontend/FIGMA_INTEGRATION_COMPLETE.md)
- [📊 最终状态报告](frontend/FIGMA_FINAL_STATUS.md)
- [⚡ 快速参考](frontend/FIGMA_QUICK_REFERENCE.js)

### API文档
- [🔌 API文档](docs/API_DOCUMENTATION.md)
- [🔧 UI设计文档](docs/UI_DESIGN_DOCUMENT.md)

## 🛠️ 项目状态

### ✅ 已完成功能
- 🎨 **Figma自动化设计系统**: 完全集成，可立即使用
- 📐 **设计令牌系统**: 12个颜色、5个字体、6个间距
- ⚛️ **React组件库**: 主题提供者、同步组件、示例组件
- 🤖 **自动化脚本**: 配置、测试、同步脚本完整
- 📝 **完整文档**: 安装、使用、参考文档齐全

### 🔄 进行中
- 🏗️ **Kratos编译**: 正在积极编译核心计算引擎 (最新更新: 2025-06-29 11:51)
  - ✅ 核心模块已编译: KratosCore.dll, Kratos.cp311-win_amd64.pyd
  - 🔄 专业模块编译中: 地质力学、高级分析模块
  - 📊 编译进度: 基础功能已可用，扩展功能编译中
- 📊 **IGA模块**: 等几何分析模块开发中

### 📋 计划中
- 🌐 **Web界面**: 基于设计系统的现代化界面
- 🔗 **API集成**: 前后端完整对接
- 📱 **响应式设计**: 移动端适配

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 联系我们

- 项目负责人: your-email@example.com
- 官方网站: https://www.example.com
- 技术支持: support@example.com