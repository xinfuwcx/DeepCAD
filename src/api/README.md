# 深基坑CAE系统 - 后端API

这是深基坑CAE系统的后端API部分，负责处理前端请求并提供必要的服务。

## 技术栈

- Python
- FastAPI (Web框架)
- SQLAlchemy (ORM)
- PyVista (可视化)
- Gmsh (网格划分)
- Kratos (计算引擎，封装为Terra)

## 目录结构

```
src/
├── api/                # API接口
│   ├── routes/         # 路由定义
│   ├── models/         # 数据模型
│   ├── controllers/    # 控制器
│   ├── schemas/        # 数据验证和序列化
│   └── utils/          # API工具函数
├── server/             # 服务器配置
│   ├── config.py       # 服务器配置
│   ├── dependencies.py # 依赖项管理
│   └── app.py          # 应用程序入口
├── database/           # 数据库相关
│   ├── models/         # 数据库模型
│   ├── migrations/     # 数据库迁移
│   └── seed.py         # 种子数据
├── scripts/            # 脚本工具
│   ├── setup.py        # 安装脚本
│   └── clean.py        # 清理脚本
├── core/               # 核心功能实现
│   ├── modeling/       # 建模功能
│   ├── meshing/        # 网格划分
│   ├── simulation/     # 计算模拟
│   └── visualization/  # 结果可视化
└── ai/                 # AI相关功能
    ├── models/         # AI模型
    ├── training/       # 训练相关
    └── inference/      # 推理相关
```

## API端点

### 模型管理

- `GET /api/models` - 获取所有模型
- `GET /api/models/{id}` - 获取特定模型
- `POST /api/models` - 创建新模型
- `PUT /api/models/{id}` - 更新模型
- `DELETE /api/models/{id}` - 删除模型

### 几何操作

- `POST /api/geometry/create_domain` - 创建计算域
- `POST /api/geometry/add_layers` - 添加土层
- `POST /api/geometry/import_dxf` - 导入DXF文件
- `POST /api/geometry/create_excavation` - 创建基坑
- `POST /api/geometry/create_wall` - 创建地连墙
- `POST /api/geometry/create_tunnel` - 创建隧道
- `POST /api/geometry/create_anchor` - 创建预应力锚杆

### 网格划分

- `POST /api/mesh/generate` - 生成网格
- `GET /api/mesh/{id}` - 获取网格信息
- `PUT /api/mesh/{id}/refine` - 优化网格

### 计算分析

- `POST /api/compute/setup` - 设置计算参数
- `POST /api/compute/run` - 执行计算
- `GET /api/compute/status/{id}` - 获取计算状态
- `GET /api/compute/results/{id}` - 获取计算结果

### 可视化

- `GET /api/visualization/generate/{result_id}` - 生成可视化
- `GET /api/visualization/screenshot/{visualization_id}` - 获取可视化截图

### AI功能

- `POST /api/ai/train` - 训练AI模型
- `POST /api/ai/infer` - 使用AI进行推断
- `GET /api/ai/models` - 获取可用的AI模型

## 数据库设计

系统使用关系型数据库存储模型数据、计算结果和用户信息等。详细的数据库设计请参考`/docs/database.md`文档。

## 开发指南

### 环境要求

- Python 3.8+
- pip
- 虚拟环境工具 (如venv或conda)

### 安装依赖

```bash
pip install -r requirements.txt
```

### 运行开发服务器

```bash
uvicorn src.server.app:app --reload
```

### 自动生成API文档

FastAPI自动生成的API文档可通过以下URL访问：

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 代码规范

- 使用PEP 8规范
- 使用Doxygen风格的注释
- 使用类型提示
- 单元测试覆盖关键功能 