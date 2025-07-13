# 技术文档：设计规格与当前实现对比

## 1. 概述

本文件整合了此前的设计文档（UI 开发规范、界面美化总结、前端技术设计、傻瓜式用户体验）与当前代码实现情况，便于评估差距、制定优化计划。

## 2. 设计文档汇总

### 2.1 前端界面开发文档（UI Development Guide）
- **目录与模块职责**：`api/`、`assets/`、`components/{layout,3d,forms,shared}`、`hooks/`、`stores/`、`styles/`、`views/`、`router.tsx`、`main.tsx`
- **核心设计规范**：
  - 组件分层 Atom / Molecule / Organism / Page
  - 状态管理：`useState` / `useReducer` + Zustand（`useShallow`），预留 TanStack Query
  - 样式体系：CSS 变量 + 暗/亮模式 + Tailwind / Styled Components
  - 可视化：Three.js(R3F) + vtk.js
  - 表单与校验：React-Hook-Form + Zod + AntD/MUI 封装
  - 路由：React Router v6 `lazy` + Chunk 分割

### 2.2 界面美化总结（UI Enhancement Summary）
- **美化目标**：3D 视口填充、玻璃态设计、渐变背景、微交互、性能无损
- **实现要点**：
  - 主容器布局：渐变背景 + 内阴影 + 100% 视口
  - CSS Token：`--primary-gradient`、`--glass-bg`、`--shadow-*` 等
  - 组件定制：Card、Button、Input、List 等玻璃态 + 悬停/焦点动画
  - 性能：GPU 加速的 transform/opacity 动画，60fps

### 2.3 前端技术设计（Frontend Technical Design）
- **3D Viewport**：glTF (Draco) + R3F/`useGLTF` + LOD + GPU Instancing
- **通信**：Axios HTTP + WebSocket 实时推送
- **表单**：AntD + React-Hook-Form + Zod Schema
- **网格 & 动网格**：Gmsh API + PyVista Bridge + WebSocket

### 2.4 傻瓜式用户体验设计（Step3 User Experience）
- **对话式交互**：ChatInterface + TypingIndicator + VoiceInput + Progress
- **智能引导**：VisualGuidanceAgent 高亮、动画、Tooltip
- **语音支持**：SpeechRecognition + SpeechSynthesis + NLP

## 3. 当前实现概览

### 3.1 前端
- **技术栈**：React+TS, Ant Design, Zustand(`useShallow`), 自研 Hooks
- **表单管理**：AntD `<Form>` + `useState`，无 React-Hook-Form / Zod
- **样式**：大量内联样式 + 默认主题，无全局 CSS 变量、无暗/亮切换
- **3D 可视化**：自定义 SVG + R3F（部分），视口未完全填充
- **路由**：部分懒加载，需补全所有视图
- **测试 & 文档**：缺少 Storybook、E2E 测试、组件文档

### 3.2 后端 & 核心计算
- **Web 框架**：FastAPI + Pydantic + Celery + WebSocket
- **RBF 插值**：`scipy.interpolate.Rbf` + 趋势面 + cKDTree 距离加权 → PyVista 导出 glTF
- **DXF 导入 & 差集**：`ezdxf` 解析 LWPOLYLINE → PyVista `.extrude()` + `.boolean_difference()` (VTK CSG)
- **Gmsh 网格生成**：原生 API (`addBox`→`synchronize`→`mesh.generate`) + 导出 VTK/.msh，无 PhysicalGroup 定义
- **Terra 求解器**：Kratos Multiphysics 调用 + PyVista 后处理，`mesh_file` 参数预留但未消费

## 4. 差距分析与优化建议

1. **全局样式 & 主题体系**：引入 CSS 变量、玻璃态组件、暗/亮切换；替换内联样式
2. **表单 Schema 驱动**：推行 React-Hook-Form + Zod，统一封装输入组件、动态 FieldArray
3. **布局 & 3D 视口**：统一主容器尺寸；R3F 视口 100% 填充 + Draco/LOD 支持
4. **智能助理 & 语音交互**：补齐 AI 助手进度指示、对话动画、高亮引导、语音识别/合成
5. **Gmsh 物理组 & mesh_file 支持**：`addPhysicalGroup` → 导出 .msh 带物理标签；Terra 消费用户网格
6. **DXF 导入健壮性**：Shapely 预处理自交、支持洞孔、进度回馈
7. **CI/CD & 文档测试**：Storybook 自动部署、Playwright E2E 报告、OpenAPI 文档同步 TS 类型

## 5. 后续计划与优先级

- **第一阶段 (P0)**：全局样式体系 + 表单 Schema 驱动 + 主容器布局 & 视口填充
- **第二阶段 (P1)**：Gmsh 物理组管理 + Terra `mesh_file` 支持 + 智能助理增强
- **第三阶段 (P2)**：DXF 导入健壮性 + CI/CD 测试完善 + 可访问性 & 国际化

---

*此文档由系统自动生成，供开发与产品团队参考和评审。* 