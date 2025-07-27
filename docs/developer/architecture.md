---
title: 架构与模块说明
---

# 架构与模块说明

DeepCAD 系统主要由四个核心模块组成：

1. **后端服务 (FastAPI + Celery + Kratos)**  
   - `gateway`: 接收前端请求，调度计算任务，提供 REST 和 WebSocket 接口。  
   - `core`: 核心计算库，封装 Kratos Multiphysics 集成、网格移动、求解器流程。  
   - `modules`: 细分为 geomechanics、excavation、visualization、ai_assistant 等子模块。

2. **前端应用 (React + Vite)**  
   - `components`: UI 组件库，包括 2D/3D 画布、表单、进度指示器等。  
   - `stores`: 使用 Zustand 管理应用状态，如任务进度、图层设置。  
   - `views`: 页面级视图，组织不同的操作流程。  
   - `api`: TypeScript 客户端代理自动生成的 REST & WebSocket API。

3. **AI 加速**  
   - `physics_ai_optimizer`: 基于 SciPy、scikit-learn 的优化模型，用于参数寻优。  
   - `agent`: ChatGPT 驱动的智能助手，可通过自然语言辅助操作。

4. **可视化引擎**  
   - `PyVistaWebBridge`: 后端推送网格/场景数据，前端利用 Three.js/BufferGeometry 实时渲染。  
   - `Viewport3D`: 包装 Three.js 渲染上下文并集成 React 生命周期。 