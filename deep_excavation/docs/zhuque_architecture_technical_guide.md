# 朱雀架构技术指南

## 1. 架构概述

朱雀架构是DeepCAD项目的微服务化重构方案，旨在提高系统的可扩展性、可维护性和性能。本文档详细说明朱雀架构的技术路线、关键组件和实现细节。

![朱雀架构图](../assets/zhuque_architecture_diagram.png)

### 1.1 架构设计原则

- **服务拆分**：按照业务领域和技术边界进行合理拆分
- **高内聚低耦合**：服务内部高内聚，服务间低耦合
- **独立部署**：每个服务可以独立开发、测试和部署
- **技术异构**：允许不同服务使用最适合其需求的技术栈
- **弹性设计**：系统能够应对部分服务故障，保持整体可用性

### 1.2 架构层次

朱雀架构分为以下几个层次：

1. **前端层**：用户界面，使用React、TypeScript和Three.js
2. **API网关层**：统一入口，请求路由和负载均衡，使用Nginx
3. **服务层**：核心服务和支撑服务，使用Python和FastAPI
4. **基础设施层**：服务注册与发现、监控、日志、追踪等

## 2. 技术栈选择

### 2.1 前端技术栈

- **框架**：React 18
- **语言**：TypeScript 4.9+
- **状态管理**：Zustand
- **3D渲染**：Three.js
- **UI组件**：Material-UI
- **构建工具**：Vite

### 2.2 后端技术栈

- **语言**：Python 3.9+
- **Web框架**：FastAPI
- **异步处理**：asyncio
- **数据库**：PostgreSQL 14
- **ORM**：SQLAlchemy 2.0
- **API文档**：OpenAPI/Swagger

### 2.3 微服务基础设施

- **容器化**：Docker
- **编排**：Docker Compose (开发环境)，Kubernetes (生产环境)
- **服务注册与发现**：Consul
- **API网关**：Nginx
- **监控**：Prometheus + Grafana
- **日志**：ELK Stack/Loki
- **分布式追踪**：Jaeger/OpenTelemetry

### 2.4 计算组件

- **几何处理**：OpenCASCADE (通过Gmsh集成)
- **网格生成**：Gmsh
- **数值计算**：Kratos Multiphysics
- **可视化**：VTK/PyVista

## 3. 服务详解

### 3.1 几何服务 (Geometry Service)

#### 3.1.1 功能职责

- 几何模型的创建、读取、更新和删除
- DXF文件的导入和处理
- 几何操作（布尔运算、偏移、倒角等）
- 几何验证和修复

#### 3.1.2 技术实现

- **OpenCASCADE集成**：通过Gmsh的OCC接口使用OpenCASCADE几何内核
- **API接口**：RESTful API，使用FastAPI实现
- **数据格式**：JSON格式的几何数据交换

#### 3.1.3 关键代码结构

```
services/geometry/
├── Dockerfile           # 容器化配置
├── requirements.txt     # Python依赖
├── main.py              # 服务入口
├── infrastructure/      # 基础设施组件
│   ├── consul_client.py # 服务注册与发现
│   ├── metrics.py       # 指标收集
│   └── tracing.py       # 分布式追踪
└── core/                # 核心业务逻辑
    ├── geometry_engine.py    # 几何引擎
    └── geometry_operations.py # 几何操作
```

### 3.2 网格服务 (Mesh Service)

#### 3.2.1 功能职责

- 基于几何模型生成网格
- 网格质量评估和优化
- 网格格式转换
- 边界条件设置

#### 3.2.2 技术实现

- **网格生成引擎**：Gmsh
- **网格处理库**：meshio
- **API接口**：RESTful API，使用FastAPI实现
- **数据格式**：各种网格格式（msh, vtk, mdpa等）

#### 3.2.3 关键代码结构

```
services/mesh/
├── Dockerfile           # 容器化配置
├── requirements.txt     # Python依赖
├── main.py              # 服务入口
├── infrastructure/      # 基础设施组件
│   ├── consul_client.py # 服务注册与发现
│   ├── metrics.py       # 指标收集
│   └── tracing.py       # 分布式追踪
└── core/                # 核心业务逻辑
    ├── mesh_generator.py     # 网格生成器
    └── mesh_quality.py       # 网格质量评估
```

### 3.3 分析服务 (Analysis Service)

#### 3.3.1 功能职责

- 结构分析
- 渗流分析
- 耦合分析
- 参数化分析

#### 3.3.2 技术实现

- **计算引擎**：Kratos Multiphysics
- **API接口**：RESTful API，使用FastAPI实现
- **数据格式**：JSON配置，VTK结果文件

#### 3.3.3 关键代码结构

```
services/analysis/
├── Dockerfile           # 容器化配置
├── requirements.txt     # Python依赖
├── main.py              # 服务入口
├── infrastructure/      # 基础设施组件
│   ├── consul_client.py # 服务注册与发现
│   ├── metrics.py       # 指标收集
│   └── tracing.py       # 分布式追踪
└── core/                # 核心业务逻辑
    ├── kratos_solver.py      # Kratos求解器接口
    └── analysis_runner.py    # 分析任务运行器
```

### 3.4 结果服务 (Result Service)

#### 3.4.1 功能职责

- 结果数据管理
- 结果可视化
- 结果导出
- 结果对比

#### 3.4.2 技术实现

- **可视化库**：VTK/PyVista
- **API接口**：RESTful API，使用FastAPI实现
- **数据格式**：VTK、JSON、CSV等

#### 3.4.3 关键代码结构

```
services/result/
├── Dockerfile           # 容器化配置
├── requirements.txt     # Python依赖
├── main.py              # 服务入口
├── infrastructure/      # 基础设施组件
│   ├── consul_client.py # 服务注册与发现
│   ├── metrics.py       # 指标收集
│   └── tracing.py       # 分布式追踪
└── core/                # 核心业务逻辑
    ├── result_processor.py   # 结果处理器
    └── visualization.py      # 可视化工具
```

### 3.5 项目服务 (Project Service)

#### 3.5.1 功能职责

- 项目管理
- 用户管理
- 权限控制
- 版本控制

#### 3.5.2 技术实现

- **数据库**：PostgreSQL
- **ORM**：SQLAlchemy
- **API接口**：RESTful API，使用FastAPI实现
- **认证**：JWT

#### 3.5.3 关键代码结构

```
services/project/
├── Dockerfile           # 容器化配置
├── requirements.txt     # Python依赖
├── main.py              # 服务入口
├── infrastructure/      # 基础设施组件
│   ├── consul_client.py # 服务注册与发现
│   ├── metrics.py       # 指标收集
│   └── tracing.py       # 分布式追踪
├── models/              # 数据模型
│   ├── project.py       # 项目模型
│   └── user.py          # 用户模型
└── core/                # 核心业务逻辑
    ├── project_manager.py    # 项目管理
    └── user_manager.py       # 用户管理
```

### 3.6 文件服务 (File Service)

#### 3.6.1 功能职责

- 文件上传下载
- 文件存储
- 文件格式转换
- 文件元数据管理

#### 3.6.2 技术实现

- **存储**：本地文件系统/对象存储
- **API接口**：RESTful API，使用FastAPI实现
- **文件处理**：Python标准库、专用格式库

#### 3.6.3 关键代码结构

```
services/file/
├── Dockerfile           # 容器化配置
├── requirements.txt     # Python依赖
├── main.py              # 服务入口
├── infrastructure/      # 基础设施组件
│   ├── consul_client.py # 服务注册与发现
│   ├── metrics.py       # 指标收集
│   └── tracing.py       # 分布式追踪
└── core/                # 核心业务逻辑
    ├── file_manager.py       # 文件管理
    └── format_converter.py   # 格式转换
```

### 3.7 通知服务 (Notification Service)

#### 3.7.1 功能职责

- 实时通知
- 事件广播
- 任务状态更新
- 系统通知

#### 3.7.2 技术实现

- **WebSocket**：Starlette/FastAPI
- **消息队列**：RabbitMQ (可选)
- **API接口**：RESTful API，使用FastAPI实现

#### 3.7.3 关键代码结构

```
services/notification/
├── Dockerfile           # 容器化配置
├── requirements.txt     # Python依赖
├── main.py              # 服务入口
├── infrastructure/      # 基础设施组件
│   ├── consul_client.py # 服务注册与发现
│   ├── metrics.py       # 指标收集
│   └── tracing.py       # 分布式追踪
└── core/                # 核心业务逻辑
    ├── notification_manager.py  # 通知管理
    └── websocket_handler.py     # WebSocket处理
```

## 4. 前端集成

### 4.1 前端架构

- **组件化设计**：使用React组件
- **状态管理**：使用Zustand
- **API客户端**：使用Axios
- **3D渲染**：使用Three.js

### 4.2 与微服务的通信

- **HTTP API**：通过Axios与后端API通信
- **WebSocket**：与通知服务建立WebSocket连接
- **文件上传下载**：通过文件服务API

### 4.3 前端服务

前端定义了一系列服务类，用于与后端微服务通信：

```typescript
// 几何服务
class GeometryService {
  async importDxf(file: File): Promise<GeometryModel>;
  async performOperation(operation: string, params: any): Promise<GeometryModel>;
  // ...
}

// 网格服务
class MeshService {
  async generateMesh(geometryData: any, settings: MeshSettings): Promise<MeshResult>;
  async assessMeshQuality(meshFile: string): Promise<QualityMetrics>;
  // ...
}

// 分析服务
class AnalysisService {
  async runStructuralAnalysis(request: StructuralAnalysisRequest): Promise<AnalysisResult>;
  async runSeepageAnalysis(request: SeepageAnalysisRequest): Promise<AnalysisResult>;
  async runCoupledAnalysis(request: CoupledAnalysisRequest): Promise<AnalysisResult>;
  // ...
}

// 其他服务...
```

## 5. 关键技术点详解

### 5.1 OpenCASCADE与Gmsh集成

在朱雀架构中，我们使用的是Gmsh自带的OpenCASCADE几何内核，而非独立安装的OCC依赖。这种方式有以下优势：

1. **简化依赖管理**：不需要单独安装和配置OpenCASCADE
2. **一致性保证**：Gmsh与其内置的OCC版本兼容性已经过验证
3. **API一致性**：通过Gmsh的Python API统一访问OCC功能

关键代码示例：

```python
import gmsh

# 初始化Gmsh
gmsh.initialize()
gmsh.model.add("example")

# 使用OpenCASCADE几何内核
box = gmsh.model.occ.addBox(0, 0, 0, 1, 1, 1)
cylinder = gmsh.model.occ.addCylinder(0.5, 0.5, 0, 0, 0, 1, 0.3)

# 执行布尔运算
cut = gmsh.model.occ.cut([(3, box)], [(3, cylinder)])

# 同步几何
gmsh.model.occ.synchronize()

# 生成网格
gmsh.model.mesh.generate(3)
```

### 5.2 DXF文件处理流程

虽然后端使用OCC处理几何，但前端仍需ezdxf来解析DXF文件并提取初始几何信息。完整的DXF处理流程如下：

1. **前端解析**：使用ezdxf在浏览器中解析DXF文件，提取基本几何元素
2. **数据转换**：将解析结果转换为标准几何数据格式
3. **数据传输**：将几何数据通过API发送到几何服务
4. **后端处理**：几何服务使用OCC进行进一步处理
5. **模型构建**：基于处理后的几何数据构建计算模型

这种前后端协作的方式可以减轻服务器负担，同时保持良好的用户体验。

### 5.3 服务间通信

朱雀架构中的服务间通信主要通过以下方式实现：

1. **同步通信**：RESTful API
2. **服务发现**：Consul
3. **负载均衡**：Nginx
4. **异步通信**：消息队列（可选）

服务注册与发现示例代码：

```python
class ConsulClient:
    def __init__(self, consul_host="consul", consul_port=8500):
        self.consul = consul.Consul(host=consul_host, port=consul_port)
        self.service_id = f"{SERVICE_NAME}-{socket.gethostname()}"
        
    def register_service(self):
        self.consul.agent.service.register(
            name=SERVICE_NAME,
            service_id=self.service_id,
            address=socket.gethostname(),
            port=SERVICE_PORT,
            check={"http": f"http://{socket.gethostname()}:{SERVICE_PORT}/health", "interval": "10s"}
        )
        
    def discover_service(self, service_name):
        _, services = self.consul.health.service(service_name, passing=True)
        if services:
            service = services[0]["Service"]
            return {"address": service["Address"], "port": service["Port"]}
        return None
```

### 5.4 监控与可观测性

朱雀架构实现了完整的可观测性解决方案：

1. **指标收集**：使用Prometheus客户端库收集服务指标
2. **分布式追踪**：使用OpenTelemetry和Jaeger实现分布式追踪
3. **日志聚合**：集中式日志收集和分析
4. **告警**：基于Prometheus的告警规则和Alertmanager

指标收集示例代码：

```python
# 定义指标
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP Requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP Request Duration', ['method', 'endpoint'])

# FastAPI中间件
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    REQUEST_COUNT.labels(method=request.method, endpoint=request.url.path, status=response.status_code).inc()
    REQUEST_DURATION.labels(method=request.method, endpoint=request.url.path).observe(duration)
    
    return response
```

## 6. 部署与运维

### 6.1 容器化

所有服务都使用Docker容器化，Dockerfile示例：

```dockerfile
FROM python:3.9-slim

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libglu1-mesa-dev \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制依赖文件并安装
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制服务代码
COPY . .

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV SERVICE_NAME=geometry_service
ENV SERVICE_PORT=8001

# 暴露端口
EXPOSE 8001

# 启动服务
CMD ["python", "main.py"]
```

### 6.2 开发环境部署

使用Docker Compose进行开发环境部署：

```yaml
version: '3.8'

services:
  consul:
    image: consul:1.14
    ports:
      - "8500:8500"
    command: "agent -server -bootstrap-expect=1 -ui -client=0.0.0.0"
    
  geometry-service:
    build:
      context: ./services/geometry
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    environment:
      - CONSUL_HOST=consul
    depends_on:
      - consul
      
  # 其他服务...
```

### 6.3 生产环境部署

生产环境推荐使用Kubernetes进行部署，关键组件包括：

- **容器编排**：Kubernetes
- **服务网格**：Istio (可选)
- **持久化存储**：PersistentVolume
- **配置管理**：ConfigMap和Secret
- **自动扩缩容**：HorizontalPodAutoscaler

## 7. 开发指南

### 7.1 开发环境设置

1. 安装Docker和Docker Compose
2. 克隆代码库
3. 运行启动脚本：`./start-zhuque-architecture.ps1`

### 7.2 添加新服务

1. 在`services/`目录下创建新服务目录
2. 创建基础文件：Dockerfile、requirements.txt、main.py等
3. 实现服务基础设施组件：consul_client.py、metrics.py、tracing.py
4. 实现核心业务逻辑
5. 添加到docker-compose.yml
6. 在Nginx配置中添加路由

### 7.3 调试技巧

1. 使用FastAPI的自动文档：访问`http://localhost:{PORT}/docs`
2. 查看服务日志：`docker-compose logs -f {service-name}`
3. 监控服务指标：访问Prometheus和Grafana
4. 追踪请求：使用Jaeger UI

## 8. 总结

朱雀架构是一个基于微服务的现代化架构，通过合理的服务拆分和先进的技术栈选择，为DeepCAD项目提供了高可扩展性、高可维护性和高性能的解决方案。本文档详细介绍了朱雀架构的技术路线、关键组件和实现细节，为开发团队提供了全面的技术指南。 