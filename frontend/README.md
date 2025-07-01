# 深基坑CAE系统前端

基于chili3d的深基坑工程分析与设计系统前端部分

## 第一阶段开发完成内容

### 环境搭建
- 初始化项目结构
- 配置TypeScript环境
- 设置Vite构建工具
- 准备chili3d集成环境

### 基础组件
- 加载屏幕
- 主布局框架
- 头部导航组件
- 3D模型视图组件

### 工具与面板
- 建模工具栏
- 参数设置面板
- 模型上下文管理

### 服务层
- chili3d服务封装
- 模拟实现（后续替换为真实chili3d集成）

## 目录结构

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   └── LoadingScreen.tsx    # 加载画面
│   │   ├── layout/
│   │   │   ├── Header.tsx           # 顶部导航
│   │   │   └── MainLayout.tsx       # 主布局
│   │   └── modeling/
│   │       ├── ModelViewer.tsx      # 3D视图组件
│   │       ├── ParametersPanel.tsx  # 参数面板
│   │       └── Toolbar.tsx          # 工具栏
│   ├── context/
│   │   └── ModelContext.tsx         # 模型上下文
│   ├── services/
│   │   └── chili3dService.ts        # chili3d服务封装
│   ├── styles/
│   │   └── globalStyles.css         # 全局样式
│   ├── App.tsx                      # 应用入口组件
│   ├── main.tsx                     # React渲染入口
│   ├── vite.config.ts               # Vite配置
│   └── index.html                   # HTML入口
├── vendors/
│   └── README.md                    # chili3d集成指南
└── start_dev.bat                    # 开发环境启动脚本
```

## 如何运行

1. 安装依赖：
   ```bash
   npm install
   ```

2. 启动开发服务器：
   ```bash
   npm start
   ```
   或者运行 `start_dev.bat` 批处理文件

## 下一步计划

### chili3d集成
- 添加chili3d作为Git子模块
- 构建真实的chili3d API集成
- 替换模拟实现

### 专业功能
- 深基坑专业建模工具
- 工程参数配置面板
- 支护结构设计工具 