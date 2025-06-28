# 深基坑CAE系统

一个用于深基坑工程建模、网格划分、计算、云图可视化和物理AI的专业CAE系统。集成Kratos多物理场仿真平台，支持IGA（等几何分析）、优化模块、地质力学等高级功能。

## 🎯 核心特性

- **高精度几何建模** - 基于OpenCascade的NURBS几何内核
- **Three.js 3D交互** - 强大的Web端3D可视化与交互
- **Kratos-IGA分析** - 等几何分析提供高精度数值模拟
- **多物理场仿真** - 土-水-结构相互作用分析
- **物理AI系统** - 基于PDE约束的反演分析与PyTorch深度学习
- **IoT数据集成** - 现场监测数据处理与融合
- **Trame高级可视化** - 专业后处理与结果展示

## 技术栈

### 几何与前端
- **OpenCascade Core** - 几何建模内核
- **PyOCCT/PythonOCC** - Python OpenCascade绑定
- **Three.js** - WebGL 3D渲染库
- **React 18** - 前端框架
- **TypeScript** - 类型安全的JavaScript超集
- **Material UI** - React组件库

### 计算引擎
- **Kratos Multiphysics** - 多物理场仿真平台
- **IgaApplication** - 等几何分析模块
- **GeomechanicsApplication** - 地质力学模块  
- **OptimizationApplication** - 结构优化模块
- **MPI并行计算** - 大规模并行求解

### 物理AI
- **PyTorch** - 深度学习框架
- **Physics-Informed Neural Networks** - 物理信息神经网络
- **伴随优化器** - 基于伴随法的参数反演
- **IoT数据处理** - 传感器数据分析与预处理

### 后端与可视化
- **FastAPI** - 高性能Python Web框架
- **Trame** - 基于VTK的Web可视化框架
- **VTK/PyVista** - 科学可视化工具库
- **SQLAlchemy** - ORM数据库接口

## 项目结构

```
Deep Excavation/
├── docs/                  # 文档
│   ├── ARCHITECTURE.md    # 架构文档
│   ├── ROADMAP.md         # 技术路线图
│   └── KRATOS_BUILD_GUIDE.md # Kratos编译指南
├── frontend/              # 前端代码
│   ├── src/
│   │   ├── components/    # React组件
│   │   │   ├── modeling/  # 几何建模组件
│   │   │   ├── simulation/# 计算设置组件
│   │   │   ├── results/   # 结果查看组件
│   │   │   └── ai/        # 物理AI组件
│   │   ├── pages/         # 页面组件
│   │   └── services/      # API服务
│   └── ...
├── src/                   # 后端代码
│   ├── ai/                # 物理AI模块
│   │   ├── physics_ai_system.py     # 物理AI系统
│   │   ├── inverse_analyzer.py      # 反演分析器
│   │   ├── iot_data_manager.py      # IoT数据管理
│   │   ├── ml_predictor.py          # 机器学习预测器
│   │   └── physics_ai_integration.py # 物理AI集成
│   ├── api/               # API接口
│   │   └── routes/        # 路由定义
│   ├── core/              # 核心功能
│   │   ├── modeling/      # 建模模块
│   │   │   ├── occ_wrapper.py       # OCC封装
│   │   │   ├── nurbs_builder.py     # NURBS建模
│   │   │   └── physical_groups.py   # 物理组管理
│   │   ├── simulation/    # 计算模块
│   │   │   ├── nurbs_to_iga_converter.py # NURBS到IGA转换
│   │   │   ├── iga_solver_config.py # IGA求解器配置
│   │   │   └── terra_wrapper.py     # Terra引擎包装
│   │   └── visualization/ # 可视化模块
│   │       └── trame_visualization.py # Trame可视化
│   ├── database/          # 数据库模块
│   └── server/            # 服务器配置
├── data/                  # 数据文件夹
│   ├── mesh/              # 网格文件
│   ├── models/            # 模型文件
│   │   └── pinn/          # PINN模型
│   ├── results/           # 计算结果
│   └── visualization/     # 可视化数据
├── scripts/               # 脚本文件
└── tools/                 # 工具脚本
    └── setup/             # 安装配置工具

## 系统架构

系统采用模块化架构设计，主要由以下几个核心层组成：

### 1. 几何建模层 (OCC-Three)
OpenCascade几何内核负责精确NURBS建模，Three.js负责Web端交互式显示。

### 2. 分析求解层 (Kratos-IGA)
Kratos多物理场框架集成IGA等几何分析，提供高精度计算。

### 3. 可视化层 (Trame)
基于VTK的Trame框架提供专业后处理可视化功能。

### 4. 物理AI层 (PyTorch)
集成PDE约束反演和神经网络，实现参数辨识与预测。

详细架构信息请参见[架构文档](docs/ARCHITECTURE.md)。

## 🚀 快速开始

### 环境要求

#### 基础环境
- Python 3.9+ 
- Node.js 18+
- Git

#### 编译环境 (Kratos)
**Windows:**
- Visual Studio 2019/2022 (含C++开发工具)
- CMake 3.16+

**Linux:**
- GCC 9+ 或 Clang 10+
- CMake 3.16+

### 安装与配置

请参照[详细安装指南](docs/INSTALLATION.md)进行环境配置。

### 开发路线图

请查看[技术路线图](docs/ROADMAP.md)了解项目发展计划和里程碑。