# Terra - SuperMesh Studio

**Terra** 是基于 GMSH + Kratos 的现代化 CAE 平台，提供 Fusion 360 风格的用户界面。

## 🎯 项目目标

- **简化 GMSH 使用**: 将复杂的命令行工具转换为直观的图形界面
- **参数化建模**: 提供类似 Fusion 360 的参数驱动建模体验
- **智能网格生成**: 实时网格质量反馈和优化建议
- **无缝 Kratos 集成**: 一键从几何建模到仿真求解

## 🏗️ 技术架构

```
前端 (React + Three.js)
├── 🎨 UI: React + TypeScript + Tailwind CSS
├── 🎮 3D: Three.js 渲染引擎
└── 📊 状态: Zustand 状态管理

后端 (Python + FastAPI)  
├── 🔷 几何内核: GMSH 内置 OCC
├── 🕸️ 网格引擎: GMSH 原生
├── ⚡ 求解器: Kratos Multiphysics
└── 🚀 API: FastAPI 高性能后端
```

## 🚀 快速开始

```bash
# 启动后端
cd backend
python main.py

# 启动前端
cd frontend  
npm install
npm run dev
```

## 📁 项目结构

```
terra/
├── backend/           # Python FastAPI 后端
│   ├── api/          # API 路由
│   ├── core/         # 核心业务逻辑
│   ├── models/       # 数据模型
│   └── services/     # 服务层
├── frontend/         # React 前端
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── services/    # 前端服务
│   │   ├── stores/      # 状态管理
│   │   └── types/       # TypeScript 类型
│   └── public/
└── docs/             # 文档
```

## 🎨 核心功能

### 1. 参数化几何建模
- 智能约束系统
- 实时几何预览
- 参数表达式支持
- 建模历史树

### 2. 智能网格生成
- 一键网格生成
- 实时质量分析
- 自适应参数调整
- 质量可视化

### 3. Kratos 仿真集成
- 材料管理
- 边界条件设置
- 求解监控
- 结果后处理

### 4. 现代化界面
- Fusion 360 风格布局
- 上下文敏感工具栏
- 智能提示系统
- 响应式设计

## 📊 开发状态

- [x] 项目架构设计
- [ ] 后端 API 框架
- [ ] 前端界面框架
- [ ] 几何建模模块
- [ ] 网格生成模块
- [ ] Kratos 集成
- [ ] 结果可视化

## 🤝 贡献指南

欢迎贡献代码！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细信息。

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。