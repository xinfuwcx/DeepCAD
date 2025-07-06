# 凤凰架构 - DeepCAD v3.2

## 简介

本项目是 DeepCAD 的 v3.2 版本，代号"凤凰架构"，旨在构建一个现代化的、可扩展的Web原生CAE平台。

## 项目结构

- `frontend/` - 前端React应用
  - `components/` - 可复用的React组件
    - `creators/` - 用于创建BIM元素的组件
    - `layout/` - 布局相关的组件
    - `modals/` - 模态框组件
  - `core/` - 核心逻辑，包括状态管理(Zustand)、渲染器等
  - `services/` - 与后端API交互的服务
- `backend/` - 后端Python API
  - `api/` - API路由定义
  - `core/` - 核心计算逻辑
  - `models/` - 数据模型

## 技术栈

- **前端**: React, TypeScript, Vite, Three.js, Zustand
- **后端**: Python, FastAPI, Gmsh, OpenCASCADE
- **数据库**: MongoDB (计划中)
- **DevOps**: Docker

## 启动项目

请参考根目录下的 `run-all-dev.ps1` 或 `start_dev.bat` 脚本。 