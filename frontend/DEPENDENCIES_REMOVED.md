# 前端依赖清理记录

## 移除的依赖及原因

### 3D渲染库合并
- **移除**: `@kitware/vtk.js` - 科学可视化库
- **移除**: `@react-three/drei` - Three.js 工具库  
- **移除**: `@react-three/fiber` - React Three.js 集成
- **保留**: `three` - 核心3D渲染引擎
- **原因**: 统一使用Three.js作为唯一3D渲染方案，后端PyVista输出glTF给Three.js加载

### UI框架合并  
- **移除**: `@emotion/react` - CSS-in-JS 样式库
- **移除**: `@emotion/styled` - Emotion styled组件
- **移除**: `@mui/material` - Material-UI组件库
- **移除**: `@headlessui/react` - Headless UI组件
- **移除**: `@heroicons/react` - Heroicons图标库
- **移除**: `daisyui` - DaisyUI组件库
- **移除**: `tailwind-merge` - Tailwind类名合并工具
- **移除**: `tailwindcss` - Tailwind CSS框架
- **移除**: `autoprefixer` - CSS前缀自动添加
- **移除**: `postcss` - CSS后处理器
- **保留**: `antd` + `@ant-design/icons` - Ant Design组件库
- **原因**: 统一使用Ant Design作为唯一UI框架，避免样式冲突和包大小膨胀

### 辅助工具精简
- **移除**: `@hookform/resolvers` - React Hook Form 验证器
- **移除**: `react-timeago` - 时间显示组件
- **移除**: `react-icons` - 通用图标库
- **原因**: 使用Ant Design内置的表单验证、时间组件和图标库

## 保留的核心依赖

### React 生态核心
- `react` + `react-dom` - React框架
- `react-router-dom` - 路由管理
- `react-hook-form` - 表单状态管理
- `react-error-boundary` - 错误边界

### 状态管理与工具
- `zustand` - 轻量状态管理
- `ahooks` - React Hooks工具库
- `axios` - HTTP客户端
- `clsx` - 条件类名工具

### 3D与动画
- `three` - 3D渲染引擎
- `framer-motion` - 动画库

### 工具库
- `uuid` - UUID生成
- `zod` - 类型验证

## 影响评估

### 包大小减少
- 估计减少约 **60-70%** 的依赖包大小
- 主要来自移除Three.js生态、多套UI框架、Tailwind等

### 技术栈简化
- **3D渲染**: 后端PyVista → glTF → 前端Three.js
- **UI框架**: 统一Ant Design
- **样式方案**: Ant Design内置样式系统

### 迁移工作量
- 需要将现有组件从Material-UI/Tailwind迁移到Ant Design
- 需要将VTK.js 3D组件迁移到Three.js + glTF加载器
- 需要更新所有相关的TypeScript类型定义