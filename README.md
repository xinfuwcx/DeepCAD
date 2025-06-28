# 深基坑CAE系统

## 项目简介

深基坑CAE系统是一个专业的深基坑工程建模、计算和分析软件，集成了几何建模、等几何分析和结果可视化等功能。系统采用现代化的技术栈，专注于等几何分析(IGA)技术，提供精确的几何表达和高效的分析能力。

## 系统架构

### 整体架构

系统采用前后端分离的架构：

- **前端**: React + Material-UI + Three.js
- **后端**: FastAPI + SQLAlchemy
- **计算引擎**: Kratos Multiphysics (IGA应用)
- **可视化**: Trame/VTK

### 核心模块

1. **几何建模模块**: 封装OpenCascade几何建模功能，支持NURBS曲面定义
2. **计算分析模块**: 基于Kratos的等几何分析(IGA)求解器
3. **可视化模块**: 基于Trame的可视化服务器，支持三维模型和计算结果可视化

## 系统特点

- **等几何分析(IGA)**: 直接从CAD几何到分析，无需网格生成
- **高精度计算**: 使用NURBS基函数，提供更高精度的分析结果
- **简化流程**: 省略传统有限元分析中的网格生成步骤
- **前后端分离**: 灵活的部署方式，良好的用户体验

## 安装指南

### 环境要求

- **Python**: 3.9+
- **Node.js**: v18+
- **操作系统**: Windows 10/11, Linux, macOS

### 基础安装

1. 克隆代码库：
   ```
   git clone https://github.com/yourusername/deep-excavation.git
   cd deep-excavation
   ```

2. 安装后端依赖：
   ```
   pip install -r requirements.minimal.txt
   ```

3. 安装前端依赖：
   ```
   cd frontend
   npm install
   cd ..
   ```

### 启动系统

#### Windows

使用提供的批处理脚本：

1. 启动后端：
   ```
   scripts\start_backend_dev.bat
   ```

2. 启动前端：
   ```
   scripts\start_frontend_dev.bat
   ```

#### Linux/macOS

1. 启动后端：
   ```
   python -m src.server.app
   ```

2. 启动前端：
   ```
   cd frontend
   npm run dev
   ```

## 使用指南

1. 打开浏览器访问前端: http://localhost:1000
2. API文档访问: http://localhost:6000/docs

## 技术路线

系统专注于IGA（等几何分析）技术，不采用传统有限元方法：

- **直接NURBS分析**: 几何模型直接用于分析，无需网格生成
- **高精度**: 采用高阶NURBS基函数，获得更高计算精度
- **简化工作流**: 省略网格生成步骤，简化设计到分析的流程

详细路线图请参考 [ROADMAP.md](docs/ROADMAP.md)

## 开发指南

详细的开发指南请参考 [CONTRIBUTING.md](CONTRIBUTING.md)

## 许可证

本项目采用 MIT 许可证 - 详情请参见 [LICENSE](LICENSE) 文件

## 联系我们

- 项目负责人: your-email@example.com
- 官方网站: https://www.example.com
- 技术支持: support@example.com