# 深基坑工程分析平台

## 项目概述

深基坑工程分析平台是一个集成了多种工程分析功能的Web应用，专注于深基坑工程的模拟和可视化。平台提供了结构分析、渗流分析等功能，并通过3D可视化展示分析结果。

## 主要功能

- 基于DXF文件的几何模型导入
- 多层土体建模与分析
- 渗流分析及可视化
- 3D交互式结果展示
- 结果导出与报告生成

## 技术栈

### 前端
- React
- Three.js (3D渲染)
- Material UI
- Tailwind CSS
- Vite (构建工具)

### 后端
- FastAPI
- Pydantic
- NumPy/SciPy
- Kratos (FEM求解器)

## 项目结构

```
deep_excavation/
├── frontend/             # 前端相关代码
│   ├── components/       # 组件文件夹
│   ├── services/         # 服务类
│   ├── pages/            # 页面组件
│   └── public/           # 静态资源
│
├── backend/              # 后端相关代码
│   ├── api/              # API 接口
│   ├── core/             # 核心业务逻辑
│   ├── server/           # 服务器配置
│   └── utils/            # 工具函数
│
├── app/                  # 应用入口点
├── data/                 # 数据文件夹
└── docs/                 # 文档
```

## 快速开始

### 后端安装与运行

1. 安装Python依赖:
```bash
pip install -r backend/requirements.txt
```

2. 启动后端服务:
```bash
python run_backend.py
```

### 前端安装与运行

1. 安装Node.js依赖:
```bash
cd frontend
npm install
```

2. 启动开发服务器:
```bash
npm run dev
```
或使用提供的脚本:
```bash
python run_frontend.py
```

## 渗流分析功能

平台的渗流分析功能允许用户:

1. 导入基坑DXF文件
2. 配置土层参数和水力边界条件
3. 执行渗流数值分析
4. 查看3D渲染的渗流结果，包括水头分布和渗流向量
5. 导出结果图像和数据

## 开发与贡献

欢迎贡献代码和提出建议。请按照以下步骤参与开发:

1. Fork项目仓库
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

[MIT](LICENSE) 