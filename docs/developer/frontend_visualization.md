---
title: 前端可视化与交互
---

# 前端可视化与交互

## PyVistaWebBridge

- 后端 `gateway/modules/visualization/pyvista_bridge.py` 提供 WebSocket 数据流。  
- 前端接收网格坐标和结果字段，构建 `BufferGeometry`。

## 组件

- `Viewport3D`: Three.js 上下文，负责初始化渲染循环和相机交互。  
- `ExcavationCanvas2D`: 2D DXF 渲染，展现地层剖面。  
- `TaskProgressIndicator`: 实时显示任务进度。

## 状态管理

- 使用 Zustand 存储任务状态与场景配置，组件通过 hook 订阅更新。 