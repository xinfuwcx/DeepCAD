# 深基坑CAE系统 - 前端

这是深基坑CAE系统的前端代码仓库。本系统提供专业的深基坑模拟分析功能，包括建模、网格划分、计算、云图和物理AI等模块。

## 技术栈

- React 18
- TypeScript
- Material UI
- Three.js (3D渲染)
- Zustand (状态管理)

## 目录结构

```
frontend/
├── public/             # 静态资源目录
├── src/                # 源代码目录
│   ├── assets/         # 静态资源（图片、图标等）
│   ├── components/     # React组件
│   │   ├── layout/     # 布局相关组件
│   │   ├── modeling/   # 建模模块相关组件
│   │   ├── meshing/    # 网格模块相关组件
│   │   ├── computation/ # 计算模块相关组件
│   │   ├── visualization/ # 可视化模块相关组件
│   │   ├── ai/         # AI模块相关组件
│   │   └── viewer/     # 3D显示相关组件
│   ├── core/           # 核心逻辑
│   │   ├── modeling/   # 建模核心功能
│   │   ├── mesh/       # 网格划分相关功能
│   │   ├── solver/     # 求解器接口
│   │   └── visualization/ # 可视化核心功能
│   ├── models/         # 数据模型定义
│   ├── styles/         # 样式定义
│   ├── utils/          # 工具函数
│   ├── App.tsx         # 根组件
│   └── main.tsx        # 入口文件
├── index.html          # HTML模板
├── package.json        # 项目依赖
├── tsconfig.json       # TypeScript配置
└── vite.config.ts      # Vite配置
```

## 开发指南

### 环境要求

- Node.js 16+
- npm 8+ 或 yarn 1.22+

### 安装依赖

```bash
npm install
# 或
yarn
```

### 开发服务器

```bash
npm run dev
# 或
yarn dev
```

### 构建

```bash
npm run build
# 或
yarn build
```

## 主要特性

1. SolidWorks风格界面
2. 可拖拽的多面板布局
3. Three.js实现的3D渲染
4. 支持建模、网格划分、计算、云图和物理AI五大功能模块
5. 专业的数据可视化展示

## 代码规范

- 使用ESLint和Prettier进行代码风格检查
- 使用JSDoc/TSDoc进行注释规范
- 文件名使用PascalCase（组件）或camelCase（非组件）
- 组件使用函数式组件和React Hooks

## 后端API

后端API文档请参考`/docs/api.md`文件。 