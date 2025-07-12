# DeepCAD - 朱雀深基坑CAE分析平台

## 🎯 项目概述

**DeepCAD** 是一个专业的深基坑工程CAE分析平台，采用朱雀微服务架构，集成Kratos Multiphysics求解器和Terra专业地质力学引擎，为深基坑工程提供全流程数字化解决方案。

## ⭐ 核心特性

### 🏗️ 专业CAE能力
- **几何建模**: DXF导入、参数化建模、3D可视化
- **网格生成**: Gmsh集成、自适应网格、质量控制
- **多物理场**: 结构-渗流-应力耦合分析
- **材料库**: 专业岩土参数库、本构模型支持
- **求解器**: Kratos + Terra双引擎架构

### 🧠 智能化设计
- **AI助手**: 参数推荐、设计优化、风险预警
- **数据驱动**: 基于历史案例的智能决策
- **实时反馈**: WebSocket进度推送、动态可视化

### 📊 专业可视化
- **3D渲染**: Three.js + PyVista高质量渲染
- **结果后处理**: 云图、切片、动画导出
- **报告生成**: 自动化工程报告、图表生成

## 🛠️ 技术架构

### 朱雀微服务架构
```
DeepCAD Platform
├── 前端层 (React + Three.js)
├── API网关 (FastAPI)
├── 核心服务
│   ├── 几何服务 (Gmsh/OCC)
│   ├── 网格服务 (Gmsh)
│   ├── 求解服务 (Kratos/Terra)
│   └── 可视化服务 (PyVista)
├── 数据层 (SQLite/PostgreSQL)
└── AI层 (预留)
```

### 技术栈
- **前端**: React 18, Three.js, TypeScript, Vite, Ant Design
- **后端**: Python 3.10+, FastAPI, SQLAlchemy, Pydantic
- **求解器**: Kratos Multiphysics, Terra地质力学引擎
- **可视化**: PyVista, Three.js, VTK
- **几何**: Gmsh, OCC (OpenCASCADE)
- **数据库**: SQLite (开发), PostgreSQL (生产)

## 🚀 快速启动

### 1. 环境要求
```bash
Python 3.10+
Node.js 18+
```

### 2. 安装依赖
```bash
# 后端依赖
pip install fastapi uvicorn sqlalchemy pydantic

# 完整依赖 (可选)
pip install -r requirements.txt

# 前端依赖
cd frontend && npm install
```

### 3. 启动后端
```bash
# 使用启动脚本 (推荐)
python start_backend.py

# 或直接启动
cd gateway && python main.py
```

### 4. 启动前端
```bash
cd frontend && npm run dev
```

### 5. 访问应用
- 🌐 **前端**: http://localhost:3000
- 📡 **后端API**: http://localhost:8080
- 📚 **API文档**: http://localhost:8080/docs
- 🏥 **健康检查**: http://localhost:8080/api/health

## 📁 项目结构

```
DeepCAD/
├── frontend/                 # React前端
│   ├── src/
│   │   ├── components/      # 通用组件
│   │   ├── views/           # 页面视图
│   │   ├── stores/          # 状态管理
│   │   └── api/             # API客户端
│   └── package.json
├── gateway/                  # FastAPI后端
│   ├── main.py              # 应用入口
│   ├── database.py          # 数据库配置
│   ├── models/              # ORM模型
│   └── modules/             # 业务模块
│       ├── components/      # 构件管理
│       ├── computation/     # 计算分析
│       ├── materials/       # 材料库
│       └── scene/           # 场景管理
├── core/                    # Kratos集成
├── data/                    # 测试数据
├── docs/                    # 技术文档
├── requirements.txt         # Python依赖
└── start_backend.py         # 启动脚本
```

## 🔧 开发指南

### API使用示例
```python
import requests

# 创建构件
component_data = {
    "type": "diaphragm_wall",
    "name": "地下连续墙",
    "path": [[0, 0], [10, 0], [10, 10]],
    "thickness": 0.8,
    "depth": 20.0
}

response = requests.post(
    "http://localhost:8080/api/components/", 
    json=component_data
)
```

### Terra求解器使用
```python
# 启动深基坑分析
analysis_data = {
    "project_name": "测试基坑",
    "excavation_depth": 15.0,
    "soil_layers": [...],
    "support_system": {...}
}

response = requests.post(
    "http://localhost:8080/api/computation/terra/analysis/start",
    json=analysis_data
)
```

## 📊 功能模块

| 模块 | 功能 | 状态 |
|------|------|------|
| 🏗️ 几何建模 | DXF导入、参数化建模 | ✅ 完成 |
| 🕸️ 网格生成 | Gmsh集成、网格质量控制 | ✅ 完成 |
| 🧮 求解分析 | Kratos+Terra双引擎 | ✅ 完成 |
| 📊 后处理 | PyVista可视化、结果导出 | ✅ 完成 |
| 🏛️ 材料库 | 岩土参数、本构模型 | ✅ 完成 |
| 🧠 AI助手 | 智能设计、参数推荐 | 🚧 规划中 |
| 📈 监控 | 性能监控、日志分析 | 🚧 规划中 |

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 技术支持

- 📧 邮箱: support@deepcad.com
- 📚 文档: [docs/](docs/)
- 🐛 问题: [GitHub Issues](https://github.com/deepcad/issues)

---

**DeepCAD - 让深基坑工程分析更智能、更专业、更高效**