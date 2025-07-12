# DeepCAD 前端界面开发文档

> 版本：0.1  
> 更新时间：{{DATE}}

---

## 目录

1. [目录与模块职责](#目录与模块职责)
2. [核心设计规范](#核心设计规范)
3. [文件模板示例](#文件模板示例)
4. [开发流程（Pull Request Checklist）](#开发流程pull-request-checklist)
5. [交互 & 视觉资源](#交互--视觉资源)
6. [常见问题与约定](#常见问题与约定)
7. [后续规划](#后续规划)

---

## 目录与模块职责

```
frontend/
│
├─ src/
│  ├─ api/                  # 与后端交互 axios 封装
│  ├─ assets/               # 静态素材：logo、icons、glb、着色器等
│  ├─ components/           # 复用组件 (UI + 业务)
│  │   ├─ layout/           # 布局壳：AppShell、Sidebar、Header、ThemeToggle
│  │   ├─ 3d/               # Three.js / vtk 可视化专用组件
│  │   ├─ forms/            # 表单 (react-hook-form + zod)
│  │   └─ shared/           # 纯展示小组件：Button、Card、Modal、Badge
│  ├─ hooks/                # 业务钩子：useSceneStore、useMultiSelect 等
│  ├─ stores/               # Zustand 全局状态
│  ├─ styles/               # themes.css、tailwind utilities、全局变量
│  ├─ views/                # 路由级页面：LandingView、AnalysisView、MaterialsView …
│  ├─ router.tsx            # React Router 定义（懒加载）
│  └─ main.tsx              # ReactDOM 渲染入口
│
└─ public/                  # index.html、favicon、OpenGraph 图
```

---

## 核心设计规范

### 1. 组件分层

| 层级 | 说明 |
|------|------|
| **Atom** | 最小交互/展示组件 |
| **Molecule** | 组合复用，无副作用 |
| **Organism** | 含业务逻辑、网络请求、全局状态 |
| **Page / View** | 路由级，聚合 Organism |

### 2. 状态管理

* **UI 局部状态**：`useState` / `useReducer`
* **跨组件共享**：Zustand store，使用 `useShallow` 减少重渲染
* **网络数据**：后续可接入 TanStack Query；当前可用 `useAsync` / 自研 Hook

### 3. 样式体系

* 双模式（Dark / Light）通过 `body` class 切换，核心 CSS 变量：`--bg-primary`、`--text-primary`…
* 高级特效（霓虹、玻璃拟态）：在 `themes.css` 增加 `--neon-*` 系列变量，结合 `backdrop-filter`、`text-shadow` 实现
* Tailwind utilities + `tailwind-merge` 处理动态类；或在组件内部使用 `clsx`

### 4. 可视化

* **3D 视口**：`Viewport3D.tsx` 基于 Three.js / R3F，全屏 `Canvas`，`pixelRatio` 自适应
* **vtk.js**：后处理管线封装在 `hooks/vtk/` 及 `components/3d/VTKViewport.tsx`

### 5. 表单与校验

* 使用 `react-hook-form` 管理表单状态
* `zod` Schema 负责同步/异步校验，`@hookform/resolvers/zod` 适配
* UI 组件来自 Ant Design / MUI，封装为 `FormInput`、`FormSelect` 统一样式

### 6. 路由与代码分割

* React Router v6 `lazy()` + `Suspense`
* 分包策略：视图级组件独立 chunk；Three.js / vtk.js 另外拆包；初屏体积 <150 kB gzip

---

## 文件模板示例

### 页面 View

```tsx
// src/views/MaterialsView.tsx
import { Suspense, lazy } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';

const MaterialList = lazy(() => import('@/components/MaterialList'));

export default function MaterialsView() {
  return (
    <PageWrapper title="材料库">
      <Suspense fallback={<span>加载中…</span>}>
        <MaterialList />
      </Suspense>
    </PageWrapper>
  );
}
```

### Zustand Store

```ts
// src/stores/useSceneStore.ts
import { create } from 'zustand';

type SceneState = {
  selectedComponentId: string | null;
  setSelectedComponentId: (id: string | null) => void;
};

export const useSceneStore = create<SceneState>(set => ({
  selectedComponentId: null,
  setSelectedComponentId: id => set({ selectedComponentId: id }),
}));
```

### 主题变量

```css
/* src/styles/themes.css */
:root {
  --bg-primary: #f4f6fa;
  --bg-secondary: #ffffff;
  --text-primary: #1a1a1a;
  --accent: #6675ff;
  /* Neon Palette */
  --neon-pink: #ff3cac;
  --neon-cyan: #46fcef;
  --neon-purple: #6d57ff;
}

body.dark {
  --bg-primary: #101014;
  --bg-secondary: #1c1f24;
  --text-primary: #f7f8fa;
}
```

---

## 开发流程（Pull Request Checklist）

1. 新建分支 `feature/<name>`
2. 保证 `npm run lint` 与 `npm run build` 无错误
3. PR 必须包含：
   * 变更目的 & 截图 / GIF
   * 关联 Issue / 任务
   * 评审要点（可视化场景、路由、新依赖）
4. 至少 **1** 名前端 + **1** 名算法/可视化同学 Review 通过
5. 合并后 CI 自动部署到内测环境

---

## 交互 & 视觉资源

* **Figma**：<https://figma.com/file/xxxxx/DeepCAD-UI>
* **Iconfont**：<https://www.iconfont.cn/collections/detail?cid=xxx>
* **3D 资源**：位于 `assets/`，命名使用 `kebab-case`
* **Lottie**：存放在 `assets/lottie/`，统一由 `LottiePlayer.tsx` 播放

---

## 常见问题与约定

| 问题 | 解法 |
|------|------|
| **如何接入新的 Three.js shader？** | 将着色器放入 `shaders/<name>.glsl`；在组件内 `import vertex from './foo.vert?raw'`；传给 `ShaderMaterial` |
| **滚动穿透 / 上下文菜单冲突** | 叠加层使用 `Portal` + `position: fixed`，避免依赖父级 |
| **对象选中后如何同步属性面板？** | 使用 `useSceneStore` 存储 `selectedComponentId`，`PropertyEditor` 监听并读取 |

---

## 后续规划

1. **LandingView**：粒子背景 + 霓虹 UI
2. **vtk 后处理管线**：支持多视口联动、等值面渲染
3. **Storybook**：组件文档与可视化回归
4. **E2E 测试**：Playwright 保障交互完整性

---

> 如需进一步示例（GLSL 粒子、Storybook 配置、复杂表单模式等），请在 Issue 中提出或 @团队。 