# Deep Excavation V3 - 高性能CAE分析服务器

## 概述

这是一个纯净、强大、API优先的CAE分析服务器，专为深基坑工程的复杂数值模拟而设计。该项目已经过彻底重构，摒弃了所有冗余的前端和旧模块，专注于提供稳定、高效的后端计算能力。

## V3 核心架构

本项目的核心是内存直通的V3分析流水线，它实现了从参数化模型到最终计算结果的无缝、高效衔接，全程无需文件I/O，保证了最高的计算效率。

其流程如下:

1.  **统一数据模型 (`V3ExcavationModel`)**: 接收一个结构化的JSON对象，该对象完整定义了土体、支护系统（包括排桩、腰梁、锚杆等）和材料属性。
2.  **网格生成适配器 (`NetgenAdapter`)**: 在内存中根据数据模型直接生成几何，并调用Netgen进行三维混合单元（梁单元+实体单元）的网格剖分。
3.  **有限元计算适配器 (`KratosAdapter`)**: 接收网格数据，在Kratos中构建有限元模型。此步骤包括：
    *   分配材料属性。
    *   施加边界条件和荷载。
    *   **建立关键约束**: 通过主从约束（Master-Slave Constraints）精确模拟腰梁与排桩、锚杆与腰梁之间的复杂相互作用。
    *   模拟分步施工过程。
    *   运行非线性求解器。
4.  **返回结构化结果**: 将包含位移、内力等关键工程数据的计算结果以JSON格式返回。

## 如何运行

### 环境准备
1.  **安装Kratos Multiphysics**: 确保您的系统中已正确安装Kratos，并已配置好相应的环境变量。
2.  **安装Python依赖**:
```bash
pip install -r requirements.txt
    ```

### 启动与测试
1.  **启动FastAPI服务器**:
```bash
    python -m src.server.app
    ```
    服务器将在 `http://localhost:8000` 上运行。

2.  **运行端到端测试**:
    打开一个新的PowerShell终端，执行我们最终的测试脚本，它将向服务器发送一个包含排桩、腰梁和锚杆的复杂工程模型，并打印出详细的计算结果。
    ```powershell
    powershell -ExecutionPolicy Bypass -File test_final_challenge.ps1
    ```

## API 端点
*   **Endpoint**: `POST /api/v3/run-analysis`
*   **Request Body**: 一个符合 `V3ExcavationModel` 结构的JSON对象。
*   **Response**: 一个包含模型参数、网格信息和有限元计算结果的JSON对象。 