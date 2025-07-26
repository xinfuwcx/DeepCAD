# DeepCAD - 世界级深基坑CAE平台

## 1. 概述

DeepCAD是一个基于**WebGPU + Three.js**技术栈的下一代深基坑工程CAE平台，实现从地球到基坑的震撼可视化体验和世界领先的GPU加速计算能力。

### 🚀 核心技术创新
- **全球首个WebGPU深基坑CAE系统**：5-10x GPU计算加速
- **震撼大屏视觉体验**：从太空地球到基坑现场的电影级视觉切换
- **完整专业建模能力**：土体计算域 + 支护系统 + 土-结构耦合分析
- **统一Three.js生态**：单一渲染引擎，零冲突，性能最优

更多详细信息，请参考：
- **[完整任务分配方案](./DEEPCAD_TASK_ASSIGNMENT.md)**
- **[3号WebGPU计算优化模块完成报告](已完成世界级成果)**
- **[2号RBF地质建模和DXF导入系统](已完成专业建模)**

## 2. 核心技术架构

### 🌍 统一Three.js生态系统
- **地图渲染**: Three.js + three-globe + three-geo (开源MapLibre数据)
- **CAE计算**: 3号WebGPU多物理场求解器 (5-10x GPU加速)
- **数据管理**: 1号版本控制 + 内存管理 + 性能监控系统
- **UI界面**: React + TypeScript + 统一原子组件系统

### ⚡ 3号WebGPU计算引擎 (已完成)
- **GPU并行多物理场求解器**: 世界领先的5-10x计算加速
- **Biot渗流-应力耦合**: 35个专业物理参数的精确求解
- **百万级网格实时处理**: 大数据流式处理和空间索引
- **高级可视化系统**: 等值线、流线、剖切的GPU实时渲染

### 🏗️ 2号深基坑专业建模 (已完成)
- **RBF 3D地质重建系统**: 基于径向基函数的地质分层建模
- **DXF导入和布尔运算引擎**: 复杂基坑几何的精确处理
- **土体计算域自动生成**: 智能边界确定和网格优化
- **支护系统专业建模**: 围护墙、支撑、锚杆的完整建模

### 🎨 1号架构和视觉系统
- **震撼地球视觉**: 从太空地球到基坑现场的电影级飞行动画
- **数据版本控制**: Git-like的CAE数据管理和回滚机制
- **高级内存管理**: 大型工程数据的智能压缩和缓存
- **实时性能监控**: 全方位的系统健康和性能监控

## 4. 技术栈

| 分类             | 技术                                                         |
| ---------------- | ------------------------------------------------------------ |
| **前端**         | `React` `TypeScript` `Vite` `Three.js` `Material-UI` `Zustand` |
| **后端 (服务)**  | `Python` `FastAPI` `asyncio`                                 |
| **计算核心**     | `Kratos Multiphysics` `Gmsh` `OpenCASCADE` `VTK/PyVista`       |
| **微服务架构**   | `Docker` `Docker Compose` `Nginx` `Consul` (服务发现)        |
| **基础设施**     | `Prometheus` (监控) `Jaeger` (追踪)                          |
| **数据库**       | `PostgreSQL` `SQLAlchemy`                                    |

## 5. 如何运行

### 5.1 环境准备

1.  **安装 Docker 和 Docker Compose**: 这是运行朱雀架构所必需的。
2.  **安装 Kratos Multiphysics (可选)**: 如果需要在本地开发分析服务，则需要安装。在Docker环境中，Kratos已包含在镜像中。
3.  **克隆项目**:
    ```bash
    git clone [repository-url]
    cd DeepCAD
    ```

### 5.2 启动朱雀架构 (推荐)

我们提供了一个PowerShell脚本来一键启动整个微服务架构。

```powershell
# 确保Docker Desktop正在运行
cd deep_excavation
./start-zhuque-architecture.ps1
```

此脚本将使用 `docker-compose.yml` 文件自动构建和启动所有服务，包括：
- API网关 (Nginx)
- 服务发现 (Consul)
- 核心后端服务 (几何、网格、分析等)
- 前端开发服务器

### 5.3 访问应用

- **前端应用**: [http://localhost:5173](http://localhost:5173) (或根据`vite.config.js`中的配置)
- **Consul UI (服务发现)**: [http://localhost:8500](http://localhost:8500)

## 6. 开发指南

### 6.1 添加新服务

1. 在 `deep_excavation/services/` 目录下创建新服务目录。
2. 参照现有服务（如`geometry`或`mesh`）创建 `Dockerfile`, `main.py` 和 `requirements.txt`。
3. 在 `docker-compose.yml` 中添加新服务的配置。
4. 在 `nginx.conf` 中为新服务添加入口路由。
5. 重新运行 `./start-zhuque-architecture.ps1` 启动更新后的架构。

### 6.2 调试技巧

- **查看服务日志**: `docker-compose logs -f {service-name}` (例如 `docker-compose logs -f geometry-service`)
- **API自动文档**: 每个FastAPI服务都提供交互式API文档，访问 `http://localhost:{SERVICE_PORT}/docs` (端口号见`docker-compose.yml`)。
- **监控**: 访问Prometheus和Grafana仪表盘进行服务状态监控。
- **追踪**: 使用Jaeger UI追踪分布式请求。 