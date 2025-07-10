# 本地优先开发方案 (Local-First Development Plan) V2

## 1. 核心理念

**彻底移除 Docker 依赖，实现真正的本地优先开发。**

此方案旨在创建一个不依赖任何容器化技术的纯本地开发环境。所有服务和依赖项都直接在开发者的机器上运行，以获得最快的启动速度、最方便的调试体验和最少的环境抽象。

## 2. 环境搭建

### 2.1. 核心依赖安装

开发者需要在本地环境中手动安装和管理以下核心依赖：

1.  **PostgreSQL (>=14)**: 用于数据存储。
    *   **Windows**: 使用官方安装包或通过包管理器 (如 `winget`, `scoop`) 安装。
    *   **macOS**: 使用 `Homebrew` (`brew install postgresql`)。
    *   **Linux (WSL)**: 使用 `apt` 或其他发行版的包管理器。
2.  **MinIO**: 用于对象存储。
    *   直接下载二进制文件运行，或者使用包管理器安装。
3.  **Redis**: 用于缓存和消息队列。
    *   同样，可以通过官方渠道或包管理器安装。

**优势**:
*   **性能最大化**: 服务直接在裸机上运行，没有虚拟化或容器化开销。
*   **完全控制**: 开发者对本地服务有完全的控制权，方便进行数据迁移、备份和调试。

### 2.2. Python 环境

使用 `venv` 或 `conda` 创建独立的 Python 环境，并通过 `pip` 安装 `requirements.txt` 中列出的所有依赖。

```bash
# 创建虚拟环境
python -m venv .venv

# 激活环境
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

## 3. 开发工作流

### 3.1. 启动服务

1.  **启动核心依赖**: 确保本地的 PostgreSQL, MinIO, Redis 服务已经启动。
2.  **启动后端服务**:
    *   在项目根目录，为每个服务（如 `gateway`, `geometry_service` 等）打开一个单独的终端。
    *   激活 Python 虚拟环境。
    *   使用 `uvicorn` 命令启动服务，并开启热重载。
    ```bash
    # 终端 1: 启动网关
    uvicorn gateway.main:app --reload --port 8000

    # 终端 2: 启动几何服务
    uvicorn services.geometry_service.main:app --reload --port 8001
    
    # ... 其他服务
    ```
3.  **启动前端**:
    *   进入 `frontend/` 目录。
    *   运行 `npm install` (首次) 和 `npm run dev`。

### 3.2. 调试

*   **后端**: 可以直接在 VS Code, PyCharm 等 IDE 中设置断点，附加到正在运行的 `uvicorn` 进程上进行调试。
*   **前端**: 使用浏览器自带的开发者工具进行调试。

## 4. 统一网关 (Unified Gateway)

本地开发模式下，所有请求都通过一个简化的**统一网关** (`gateway`) 来处理，该网关直接在本地运行。这取代了原先基于 Docker 和 Nginx 的复杂路由。

## 5. 向量数据库的集成 (可选)

当需要集成向量数据库 (如 `ChromaDB`, `Weaviate`) 时：

1.  在本地环境中直接安装并运行该数据库。
2.  在相关的 Python 服务中添加对应的客户端库。
3.  通过环境变量或配置文件，将服务的连接指向本地数据库实例。

这种方式保持了架构的简洁性，避免了为单个依赖引入复杂的容器化管理。 