# 深基坑CAE系统

基于FreeCAD架构设计的专业深基坑分析软件，集成了地质建模、支护结构设计、有限元分析和结果可视化功能。

## 系统架构

深基坑CAE系统采用FreeCAD的工作台概念，将不同专业功能组织为独立工作台：

- **地质建模工作台**：创建和编辑地质模型，定义土层参数
- **支护结构工作台**：设计地下连续墙、支撑、锚杆等支护结构
- **分析设置工作台**：配置分析参数，设置边界条件和荷载
- **结果可视化工作台**：查看和分析计算结果
- **监测数据工作台**：导入和分析现场监测数据

系统还采用了文档-对象模型，所有几何对象都是参数化的，修改参数会自动更新几何。

## 技术栈

- **前端**：React + TypeScript + Material UI
- **3D引擎**：chili3d（用于几何建模）
- **后端**：Python + FastAPI
- **分析引擎**：Kratos（用于有限元分析）

## 开发环境设置

### 前端开发

1. 安装依赖：

```bash
cd frontend
npm install
```

2. 启动开发服务器：

```bash
npm run dev
```

或使用模拟API：

```bash
npm run dev:mock
```

也可以直接使用提供的批处理脚本：

- `start_dev.bat` - 启动标准开发环境
- `start_dev_with_mock.bat` - 启动带模拟API的开发环境

### 后端开发

1. 安装Python依赖：

```bash
cd src
pip install -r requirements.txt
```

2. 启动后端服务器：

```bash
python server/app.py
```

## 构建与部署

构建前端：

```bash
cd frontend
npm run build
```

## 测试

运行测试：

```bash
cd frontend
npm test
```

## 文档

更多详细文档请参阅`docs`目录。

## 许可证

本项目采用ISC许可证。