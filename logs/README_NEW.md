# Deep Excavation Engineering Analysis Platform

🏗️ **深基坑工程分析平台** - 基于Kratos Multiphysics的综合性岩土工程仿真系统

[![Python](https://img.shields.io/badge/Python-3.7+-blue.svg)](https://www.python.org/)
[![Kratos](https://img.shields.io/badge/Kratos-Multiphysics-green.svg)](https://github.com/KratosMultiphysics/Kratos)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎯 项目概述

本项目是一个专门用于深基坑工程分析的综合性仿真平台，集成了多种先进的数值计算方法和工程分析工具。系统基于Kratos Multiphysics构建，支持复杂的多物理场耦合分析，为深基坑工程设计和施工提供科学依据。

## ✨ 核心特性

### 🔬 多物理场分析
- **结构力学分析** - 支撑结构应力应变分析
- **流体动力学** - 地下水渗流分析
- **地质力学** - 土体本构模型与稳定性分析
- **流固耦合** - 渗流-变形耦合分析

### 🎨 几何与优化
- **IGA (等几何分析)** - 高精度几何建模
- **形状优化** - 支撑结构优化设计
- **拓扑优化** - 最优支撑布局设计

### 🤖 AI增强功能
- **物理信息神经网络 (PINN)** - 数据驱动建模
- **IoT数据集成** - 实时监测数据处理
- **智能预测** - 基坑变形预测

### 🖥️ 可视化界面
- **Web前端** - 现代化用户界面
- **3D可视化** - Three.js交互式场景
- **实时图表** - 动态数据展示

## 📁 项目结构

```
Deep Excavation/
├── 📁 src/                    # 核心源码
│   ├── 🤖 ai/                # AI模块 (PINN, IoT)
│   ├── 🔧 core/              # 核心仿真引擎
│   ├── 📊 database/          # 数据库模型
│   └── 🖥️ server/           # 后端服务
├── 📁 frontend/              # Web前端
│   ├── 📱 src/              # React/TypeScript源码
│   ├── 🎨 css/              # 样式文件
│   └── 📄 public/           # 静态资源
├── 📁 examples/              # 示例案例
│   ├── 🏗️ excavation_case.py # 标准深基坑案例
│   └── 📈 visualize_results.py # 结果可视化
├── 📁 tools/                 # 开发工具
│   └── ⚙️ setup/            # 编译安装脚本
├── 📁 data/                  # 数据文件
│   ├── 🕸️ mesh/             # 网格文件
│   └── 📋 models/           # 模型文件
├── 📁 docs/                  # 文档
├── 📁 scripts/               # 运行脚本
└── 📁 logs/                  # 日志文件
```

## 🚀 快速开始

### 1. 环境要求

- **Python**: 3.7+
- **CMake**: 3.16+
- **Visual Studio**: 2019+ (Windows) / GCC 7+ (Linux)
- **Git**: 最新版本
- **Node.js**: 14+ (前端开发)

### 2. 安装步骤

#### 克隆项目
```bash
git clone https://github.com/yourusername/deep-excavation.git
cd deep-excavation
```

#### 创建Python环境
```bash
python -m venv env
# Windows
.\env\Scripts\activate
# Linux/Mac
source env/bin/activate
```

#### 安装依赖
```bash
pip install -r requirements.txt
```

#### 编译Kratos (自动化)
```bash
# Windows
scripts\build_kratos_one_click.bat

# 或手动编译
python tools\setup\build_kratos.py
```

### 3. 运行示例

```bash
# 基础深基坑分析
python examples\excavation_case.py

# 启动Web界面
python src\server\app.py

# 可视化结果
python examples\visualize_results.py
```

## 🔧 核心模块

### Kratos应用模块
- ✅ **StructuralMechanicsApplication** - 结构力学
- ✅ **FluidDynamicsApplication** - 流体力学  
- ✅ **GeomechanicsApplication** - 地质力学
- ✅ **IgaApplication** - 等几何分析
- ✅ **OptimizationApplication** - 结构优化
- ✅ **FSIApplication** - 流固耦合

### AI模块
- 🧠 **PINN集成** - 物理信息神经网络
- 📡 **IoT数据处理** - 实时监测数据
- 📈 **预测分析** - 变形预测算法

## 💻 开发指南

### 添加新的分析模块
```python
# src/analysis/custom_analysis.py
from src.core.kratos_engine import KratosEngine

class CustomAnalysis(KratosEngine):
    def __init__(self, model_params):
        super().__init__(model_params)
    
    def run_analysis(self):
        # 实现自定义分析逻辑
        pass
```

### 扩展AI功能
```python
# src/ai/custom_ai_model.py
from src.ai.physics_ai import PhysicsAI

class CustomAIModel(PhysicsAI):
    def train_model(self, data):
        # 实现自定义AI模型
        pass
```

## 📊 案例展示

### 1. 标准深基坑案例
- 🏗️ **工程背景**: 15m深基坑支护设计
- 📐 **几何模型**: 复杂地层条件
- 🔍 **分析内容**: 变形、应力、稳定性
- 📈 **结果**: 优化支撑方案

### 2. 流固耦合分析
- 💧 **渗流分析**: 地下水影响评估
- 🌊 **耦合效应**: 孔压-变形相互作用
- ⚖️ **稳定性**: 抗浮稳定性评估

## 🛠️ 技术栈

### 后端
- **Kratos Multiphysics** - 多物理场仿真核心
- **Python** - 主要开发语言
- **FastAPI** - Web API框架
- **SQLAlchemy** - 数据库ORM
- **PyTorch** - AI/ML框架

### 前端
- **React** - 用户界面框架
- **TypeScript** - 类型安全开发
- **Three.js** - 3D可视化
- **Vite** - 构建工具

### 工具链
- **CMake** - 构建系统
- **Git** - 版本控制
- **Docker** - 容器化部署
- **GitHub Actions** - CI/CD

## 📝 文档

- 📖 [详细文档](docs/README.md)
- 🎯 [快速入门指南](docs/quick-start.md)
- 🔧 [API参考](docs/api-reference.md)
- 💡 [开发指南](docs/development.md)

## 🤝 贡献指南

我们欢迎任何形式的贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细信息。

### 贡献方式
1. 🍴 Fork 项目
2. 🌱 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 💾 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 📤 推送到分支 (`git push origin feature/AmazingFeature`)
5. 🔃 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👥 团队

- **项目负责人** - [@yourusername](https://github.com/yourusername)
- **核心开发者** - 深基坑工程分析团队

## 🙏 致谢

- [Kratos Multiphysics](https://github.com/KratosMultiphysics/Kratos) - 核心仿真引擎
- [Three.js](https://threejs.org/) - 3D可视化支持
- [React](https://reactjs.org/) - 前端框架

## 📞 联系我们

- 📧 邮箱: [your.email@domain.com](mailto:your.email@domain.com)
- 🐛 问题反馈: [GitHub Issues](https://github.com/yourusername/deep-excavation/issues)
- 💬 讨论: [GitHub Discussions](https://github.com/yourusername/deep-excavation/discussions)

---

⭐ 如果这个项目对您有帮助，请给我们一个Star！
