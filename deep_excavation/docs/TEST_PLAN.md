# 深基坑CAE系统测试计划

## 概述

本测试计划适用于基于chili3d的深基坑CAE系统，包含前端界面、chili3d集成和后端API的测试方法和流程。

## 测试环境

- **开发环境**：Windows 10+，Node.js 18+
- **浏览器**：Chrome，Firefox，Edge
- **前端**：基于chili3d的React应用
- **后端**：模拟API服务 + Kratos分析引擎

## 测试分类

### 1. 单元测试

用于测试独立组件和服务功能：

```bash
# 安装测试依赖
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# 运行单元测试
npm test
```

测试范围：
- 组件渲染测试
- 服务函数测试
- 工具函数测试

### 2. 集成测试

测试组件间交互和与服务的集成：

```bash
# 运行集成测试
npm run test:integration
```

测试范围：
- ModelViewer与工具栏的交互
- 参数面板与模型更新的联动
- API服务与UI的交互

### 3. E2E测试

模拟用户操作的端到端测试：

```bash
# 安装Playwright
npm install --save-dev @playwright/test

# 运行E2E测试
npm run test:e2e
```

测试范围：
- 完整工作流测试
- 用户交互测试
- 界面响应测试

## 具体测试场景

### chili3d集成测试

1. **基础功能测试**：
   - 3D视图正确加载
   - 相机控制功能
   - 基本几何体创建功能

2. **模型操作测试**：
   - 选择对象
   - 移动/旋转/缩放操作
   - 布尔运算功能

3. **性能测试**：
   - 大型模型加载性能
   - 操作响应时间
   - 内存使用情况

### 深基坑专业功能测试

1. **土体建模测试**：
   - 创建多层土体模型
   - 修改土层参数
   - 土层可视化效果

2. **支护结构测试**：
   - 创建地下连续墙
   - 添加锚杆/支撑
   - 结构与土体的交互

3. **分析流程测试**：
   - 模型转换为网格
   - 分析计算流程
   - 结果可视化

## 模拟后端测试

1. **API调用测试**：
   - 使用Mock服务模拟API响应
   - 验证前端处理响应的正确性
   - 测试错误处理和重试机制

2. **数据交换测试**：
   - 前端几何数据转换为分析模型
   - 接收和处理分析结果
   - 参数更新和模型同步

## 持续集成测试

设置GitHub Actions进行持续集成测试：

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test
      - run: npm run test:integration
```

## 测试执行计划

1. **开发阶段**：
   - 每次代码提交前执行单元测试
   - 主要功能完成后执行集成测试
   - 重要里程碑执行E2E测试

2. **发布前测试**：
   - 执行完整测试套件
   - 性能基准测试
   - 跨浏览器兼容性测试

3. **定期回归测试**：
   - 每周执行自动化测试
   - 每月执行手动关键功能测试
   - 每季度执行全面回归测试

## 测试工具和框架

- **单元测试**：Vitest + Testing Library
- **模拟工具**：MSW (Mock Service Worker)
- **E2E测试**：Playwright
- **性能测试**：Lighthouse + 自定义性能指标收集 