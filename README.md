# DeepCAD - 朱雀架构

## 1. 概述

DeepCAD是一个专为岩土工程、特别是深基坑项目打造的下一代智能CAD/CAE集成平台。项目采用先进的**朱雀架构 (Zhuque Architecture)**，一个基于微服务的设计，旨在实现极致的可扩展性、灵活性和高性能。

通过将复杂的岩土工程分析流程分解为独立的、可独立部署的服务，朱雀架构使我们能够为每个功能模块（如几何建模、网格剖分、数值分析）选择最适合的技术栈，并实现独立开发、测试和优化。

更多详细信息，请参考：
- **[朱雀架构技术指南](./deep_excavation/docs/zhuque_architecture_technical_guide.md)**
- **[OpenCASCADE与Gmsh集成技术指南](./deep_excavation/docs/occ_gmsh_integration_guide.md)**

## 2. 朱雀架构设计理念

- **服务拆分**: 按照业务领域和技术边界进行合理拆分，将系统分解为几何、网格、分析、结果、项目等核心服务。
- **高内聚低耦合**: 服务内部功能高度集中，服务之间通过定义良好的API进行通信。
- **独立部署与扩展**: 每个微服务都可以独立开发、测试、部署和扩展，便于快速迭代和应对高并发场景。
- **技术异构**: 允许不同服务使用最适合其需求的技术栈，例如使用Python进行计算密集型任务，使用Node.js处理高并发I/O。
- **弹性与容错**: 系统能够优雅地处理部分服务故障，通过服务发现和熔断机制保证整体可用性。

## 3. 微服务模块

朱雀架构主要包含以下微服务：

- **几何服务 (Geometry Service)**: 负责所有几何对象的创建、操作和持久化。通过Gmsh内置的OpenCASCADE (OCC) 内核处理复杂的CAD操作。
- **网格服务 (Mesh Service)**: 调用Gmsh引擎，基于几何模型生成高质量的有限元网格。
- **分析服务 (Analysis Service)**: 与Kratos Multiphysics求解器集成，执行结构分析、渗流分析和多物理场耦合分析。
- **结果服务 (Result Service)**: 管理和处理分析结果，提供数据查询、可视化和导出功能。
- **项目服务 (Project Service)**: 负责项目、用户和权限管理。
- **文件服务 (File Service)**: 提供统一的文件上传、下载和存储管理。
- **通知服务 (Notification Service)**: 通过WebSocket实现任务状态更新和实时消息推送。

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