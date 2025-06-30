# 深基坑分析系统集成项目规范更新

**文档版本**: 1.2.0
**更新日期**: 2024-07-02
**状态**: 正式发布

## 1. 概述

本文档是《深基坑分析系统集成项目规范》(INTEGRATED_PROJECT_SPEC.md)的补充更新，主要针对工作流1（物理AI系统）和工作流2（核心CAE功能）的最新开发成果，为工作流3（前端开发）团队提供更新的接口规范和功能需求。

### 1.1 更新摘要

- **新增功能**: 参数反演与复杂边界条件处理、自适应网格细化、FEM-PINN双向数据交换
- **接口更新**: 新增了6个API接口，修改了2个现有接口
- **数据模型扩展**: 增加了参数反演和网格细化相关的数据模型
- **UI交互规范**: 新增了3个主要交互界面的设计规范

## 2. 新增功能规范

### 2.1 参数反演与复杂边界条件处理

#### 2.1.1 功能描述

参数反演模块提供土体和结构参数的智能反演功能，能够基于监测数据或目标响应反推模型参数。复杂边界条件处理支持多种类型的边界条件，包括混合边界、非线性边界和时变边界。

#### 2.1.2 核心能力

- 多参数同时反演（最多支持20个参数）
- 复杂边界条件处理（支持8种边界类型）
- 约束条件自适应权重
- 参数不确定性量化（置信区间分析）
- GPU加速支持

#### 2.1.3 接口规范

**参数反演API**:
```
POST /api/ai/param-inversion
```

请求体:
```json
{
  "project_id": 1001,
  "parameters": [
    {
      "name": "youngs_modulus",
      "lower_bound": 10000,
      "upper_bound": 50000,
      "initial_value": 20000
    },
    {
      "name": "poisson_ratio",
      "lower_bound": 0.1,
      "upper_bound": 0.49,
      "initial_value": 0.3
    }
  ],
  "observation_data": {
    "type": "displacement",
    "file": "data/observations/monitoring_data.csv",
    "weight": 1.0
  },
  "options": {
    "optimizer": "adam",
    "learning_rate": 0.001,
    "max_iterations": 1000,
    "convergence_tol": 1e-5,
    "enable_uncertainty": true,
    "adaptive_weights": true
  }
}
```

响应体:
```json
{
  "task_id": "inv_task_12345",
  "status": "started",
  "estimated_time": 120
}
```

**复杂边界条件API**:
```
POST /api/ai/complex-boundary
```

请求体:
```json
{
  "project_id": 1001,
  "boundaries": [
    {
      "bc_id": "bc_001",
      "bc_type": "DIRICHLET",
      "entity_ids": [1, 2, 3],
      "value": 0.0,
      "components": [0, 1, 2]
    },
    {
      "bc_id": "bc_002",
      "bc_type": "TIME_DEPENDENT",
      "entity_ids": [10, 11, 12],
      "base_bc_type": "NEUMANN",
      "initial_value": 10.0,
      "time_function_type": "linear",
      "time_function_params": {
        "rate": 2.0
      }
    }
  ]
}
```

### 2.2 自适应网格细化

#### 2.2.1 功能描述

自适应网格细化功能能够基于误差估计自动优化网格，提高计算精度和效率。支持多种细化策略和误差指标，能够针对关键区域进行重点细化。

#### 2.2.2 核心能力

- 多种细化策略（能量误差、梯度跳变等）
- 目标区域细化
- 网格质量控制
- 智能平滑算法
- 渐进式细化

#### 2.2.3 接口规范

**网格细化API**:
```
POST /api/compute/mesh/refine
```

请求体:
```json
{
  "project_id": 1001,
  "mesh_id": "mesh_12345",
  "refinement_options": {
    "criterion": "ENERGY_ERROR",
    "strategy": "ADAPTIVE",
    "error_threshold": 0.05,
    "max_iterations": 3,
    "quality_metric": "COMBINED",
    "targeted_regions": [
      {
        "id": 1,
        "level": 2
      }
    ]
  },
  "result_id": "result_67890"
}
```

响应体:
```json
{
  "task_id": "refine_task_12345",
  "status": "started",
  "estimated_time": 30
}
```

**网格质量评估API**:
```
GET /api/compute/mesh/quality/{mesh_id}
```

响应体:
```json
{
  "mesh_id": "mesh_12345",
  "quality_metrics": {
    "ASPECT_RATIO": 0.85,
    "SKEWNESS": 0.15,
    "JACOBIAN": 0.92,
    "MIN_ANGLE": 0.78,
    "COMBINED": 0.88
  },
  "statistics": {
    "n_elements": 10520,
    "n_nodes": 12680,
    "element_types": {
      "tetrahedra": 9876,
      "hexahedra": 644
    }
  }
}
```

### 2.3 FEM-PINN双向数据交换

#### 2.3.1 功能描述

FEM-PINN双向数据交换功能实现了有限元分析与物理信息神经网络之间的无缝数据交换，支持数据映射、参数同步和结果协调。

#### 2.3.2 核心能力

- 高效数据映射（FEM网格与PINN计算域之间）
- 实时数据交换
- 参数协调机制
- 映射精度控制
- 异步更新支持

#### 2.3.3 接口规范

**数据交换API**:
```
POST /api/ai/fem-pinn/exchange
```

请求体:
```json
{
  "project_id": 1001,
  "direction": "fem_to_pinn",
  "variables": ["displacements", "pore_pressures"],
  "fem_result_id": "result_67890",
  "mapping_options": {
    "method": "interpolation",
    "tolerance": 1e-6
  }
}
```

响应体:
```json
{
  "exchange_id": "exchange_12345",
  "status": "completed",
  "statistics": {
    "transferred_variables": ["displacements", "pore_pressures"],
    "fem_points": 12680,
    "pinn_points": 8000,
    "mapping_error": 0.0021
  }
}
```

**映射矩阵API**:
```
GET /api/ai/fem-pinn/mapping/{project_id}
```

响应体:
```json
{
  "project_id": 1001,
  "fem_to_pinn_map": {
    "type": "sparse_matrix",
    "rows": 8000,
    "cols": 12680,
    "nnz": 36540,
    "created_at": "2024-07-01T15:30:45Z"
  },
  "pinn_to_fem_map": {
    "type": "sparse_matrix",
    "rows": 12680,
    "cols": 8000,
    "nnz": 36540,
    "created_at": "2024-07-01T15:30:45Z"
  }
}
```

## 3. 数据模型扩展

### 3.1 参数反演数据模型

```typescript
interface InversionParameter {
  name: string;
  lower_bound: number;
  upper_bound: number;
  initial_value?: number;
  description?: string;
}

interface ObservationData {
  type: 'displacement' | 'pressure' | 'strain' | 'stress' | 'custom';
  file: string;
  weight: number;
  time_points?: number[];
  location_filter?: number[];
}

interface InversionOptions {
  optimizer: 'adam' | 'lbfgs' | 'sgd';
  learning_rate: number;
  max_iterations: number;
  convergence_tol: number;
  enable_uncertainty: boolean;
  adaptive_weights: boolean;
  device?: 'cpu' | 'cuda';
}

interface InversionResult {
  parameters: Record<string, number>;
  loss: number;
  iterations: number;
  elapsed_time: number;
  uncertainty?: {
    confidence_intervals: Record<string, [number, number]>;
    param_stats: Record<string, {
      mean: number;
      std: number;
      min: number;
      max: number;
    }>;
  };
  history: {
    loss: number[];
    params: Record<string, number>[];
    grad_norm: number[];
  };
}

interface InversionTask {
  task_id: string;
  project_id: number;
  status: 'pending' | 'started' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  updated_at: string;
  result?: InversionResult;
  error_message?: string;
}
```

### 3.2 网格细化数据模型

```typescript
interface RefinementOptions {
  criterion: 'ENERGY_ERROR' | 'GRADIENT_JUMP' | 'DISPLACEMENT_JUMP' | 'STRESS_JUMP' | 'CUSTOM';
  strategy: 'UNIFORM' | 'ADAPTIVE' | 'TARGETED' | 'HIERARCHICAL';
  error_threshold: number;
  max_iterations: number;
  quality_metric: 'ASPECT_RATIO' | 'SKEWNESS' | 'JACOBIAN' | 'MIN_ANGLE' | 'COMBINED';
  targeted_regions?: Array<{
    id: number;
    level: number;
  }>;
}

interface MeshQuality {
  ASPECT_RATIO: number;
  SKEWNESS: number;
  JACOBIAN: number;
  MIN_ANGLE: number;
  COMBINED: number;
}

interface MeshStatistics {
  n_elements: number;
  n_nodes: number;
  element_types: Record<string, number>;
}

interface RefinementHistory {
  iteration: number;
  strategy: string;
  criterion: string;
  elements_to_refine: number;
  old_elements: number;
  new_elements: number;
  old_nodes: number;
  new_nodes: number;
  element_increase: number;
  node_increase: number;
  timestamp: string;
}

interface RefinementTask {
  task_id: string;
  project_id: number;
  mesh_id: string;
  status: 'pending' | 'started' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  updated_at: string;
  options: RefinementOptions;
  result?: {
    new_mesh_id: string;
    quality: MeshQuality;
    statistics: MeshStatistics;
    history: RefinementHistory[];
  };
  error_message?: string;
}
```

### 3.3 FEM-PINN交换数据模型

```typescript
interface FemPinnExchangeOptions {
  direction: 'fem_to_pinn' | 'pinn_to_fem' | 'bidirectional';
  variables: string[];
  fem_result_id?: string;
  pinn_result_id?: string;
  mapping_options: {
    method: 'interpolation' | 'projection' | 'nearest';
    tolerance: number;
  };
}

interface MappingMatrix {
  type: 'sparse_matrix' | 'dense_matrix';
  rows: number;
  cols: number;
  nnz?: number;
  created_at: string;
}

interface ExchangeStatistics {
  transferred_variables: string[];
  fem_points: number;
  pinn_points: number;
  mapping_error: number;
}

interface ExchangeTask {
  exchange_id: string;
  project_id: number;
  status: 'pending' | 'started' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  options: FemPinnExchangeOptions;
  result?: {
    fem_result_id?: string;
    pinn_result_id?: string;
    statistics: ExchangeStatistics;
  };
  error_message?: string;
}
```

## 4. UI交互规范

### 4.1 参数反演UI规范

#### 4.1.1 布局结构

参数反演UI应包含以下主要组件：

1. **参数配置面板**：
   - 参数列表（表格形式，支持添加/删除/编辑）
   - 反演选项配置（优化器、学习率等）
   - 观测数据导入工具

2. **反演控制面板**：
   - 启动/暂停/停止按钮
   - 进度指示器
   - 状态信息显示

3. **结果可视化区域**：
   - 参数收敛曲线
   - 不确定性可视化（置信区间、概率分布）
   - 拟合优度评估图表

#### 4.1.2 交互流程

1. 用户配置反演参数和选项
2. 导入观测数据
3. 启动反演过程
4. 实时显示反演进度和中间结果
5. 完成后展示最终参数值和不确定性分析
6. 提供应用参数至模型的选项

#### 4.1.3 设计规范

- 配色方案：科学分析风格，主色调为蓝色系
- 图表类型：折线图（收敛曲线）、散点图（拟合优度）、区间图（不确定性）
- 组件大小：参数配置面板占30%宽度，结果可视化占70%宽度
- 响应式设计：支持大屏和标准显示器自适应

### 4.2 网格细化UI规范

#### 4.2.1 布局结构

网格细化UI应包含以下主要组件：

1. **细化配置面板**：
   - 细化策略选择
   - 误差阈值设置
   - 质量指标选择
   - 迭代控制选项

2. **3D网格交互区域**：
   - 网格可视化显示
   - 目标区域选择工具
   - 误差分布可视化
   - 细化前后对比视图

3. **细化历史面板**：
   - 历史记录表格
   - 统计信息展示
   - 质量改进曲线

#### 4.2.2 交互流程

1. 用户加载初始网格
2. 配置细化策略和参数
3. 可选择性地指定目标区域
4. 启动细化过程
5. 实时显示细化进度和网格变化
6. 完成后展示细化统计和质量评估
7. 提供接受或拒绝新网格的选项

#### 4.2.3 设计规范

- 配色方案：技术风格，以蓝灰色为主
- 3D交互：支持旋转、缩放、平移和区域选择
- 误差可视化：使用热力图着色方案（红色表示高误差）
- 组件大小：配置面板占25%宽度，3D区域占50%宽度，历史面板占25%宽度
- 响应式设计：支持大屏和标准显示器自适应

### 4.3 FEM-PINN交互UI规范

#### 4.3.1 布局结构

FEM-PINN交互UI应包含以下主要组件：

1. **数据交换配置面板**：
   - 交换方向选择
   - 变量选择列表
   - 映射方法配置
   - 自动/手动更新控制

2. **双域可视化区域**：
   - FEM网格和PINN域并排显示
   - 数据流向动画
   - 映射误差可视化
   - 变量分布热力图

3. **参数协调面板**：
   - 参数对比表格
   - 冲突检测和解决工具
   - 同步历史记录
   - 参数不确定性显示

#### 4.3.2 交互流程

1. 用户选择FEM结果和PINN模型
2. 配置数据交换参数
3. 启动交换过程
4. 实时显示数据流动和映射结果
5. 完成后展示交换统计和误差评估
6. 提供参数同步和冲突解决工具

#### 4.3.3 设计规范

- 配色方案：科技感设计，FEM区域使用蓝色系，PINN区域使用绿色系
- 数据流动：使用粒子动画表示数据传输方向和强度
- 误差可视化：使用彩虹色谱表示映射误差分布
- 组件大小：配置面板占20%宽度，双域可视化占60%宽度，参数面板占20%宽度
- 响应式设计：支持大屏和标准显示器自适应

## 5. 工作流集成规范

### 5.1 工作流1和工作流2的集成点

| 集成点 | 数据流向 | 接口 | 更新频率 |
|--------|----------|------|----------|
| 参数传递 | 工作流1 → 工作流2 | `/api/ai/param-inversion` | 按需/完成后 |
| 结果传递 | 工作流2 → 工作流1 | `/api/compute/results` | 每次计算后 |
| 网格映射 | 双向 | `/api/ai/fem-pinn/mapping` | 网格更新时 |
| 数据交换 | 双向 | `/api/ai/fem-pinn/exchange` | 实时/按需 |
| 误差估计 | 工作流1 → 工作流2 | `/api/ai/error-estimation` | 按需 |

### 5.2 工作流1和工作流3的集成点

| 集成点 | 数据流向 | 接口 | UI组件 |
|--------|----------|------|--------|
| 参数配置 | 工作流3 → 工作流1 | `/api/ai/param-inversion` | 参数配置面板 |
| 反演结果 | 工作流1 → 工作流3 | `/api/ai/param-inversion/{task_id}` | 结果可视化区域 |
| PINN可视化 | 工作流1 → 工作流3 | `/api/ai/prediction` | AI预测可视化 |
| 状态监控 | 工作流1 → 工作流3 | `/api/ai/model-status` | 状态仪表板 |
| 不确定性分析 | 工作流1 → 工作流3 | `/api/ai/uncertainty` | 不确定性可视化 |

### 5.3 工作流2和工作流3的集成点

| 集成点 | 数据流向 | 接口 | UI组件 |
|--------|----------|------|--------|
| 网格管理 | 双向 | `/api/compute/mesh` | 网格编辑器 |
| 网格细化 | 工作流3 → 工作流2 | `/api/compute/mesh/refine` | 细化配置面板 |
| 质量评估 | 工作流2 → 工作流3 | `/api/compute/mesh/quality` | 质量可视化 |
| 分析控制 | 工作流3 → 工作流2 | `/api/compute/analysis` | 分析控制面板 |
| 结果可视化 | 工作流2 → 工作流3 | `/api/compute/results` | 结果可视化工具 |

## 6. 更新日志

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2024-07-02 | 1.2.0 | 初始版本：增加参数反演、网格细化和FEM-PINN交互规范 |

## 7. 附录

### 7.1 技术栈更新

前端技术栈保持不变，使用React + Three.js + Material UI。

### 7.2 开发里程碑

| 里程碑 | 预计完成时间 | 主要交付物 |
|--------|--------------|------------|
| MS1: 参数反演UI | 2周 | 参数反演界面和API集成 |
| MS2: 网格细化UI | 3周 | 网格细化界面和3D交互功能 |
| MS3: FEM-PINN交互UI | 2周 | 数据交换界面和可视化功能 |
| MS4: 全流程集成 | 2周 | 完整工作流整合和测试 |

### 7.3 参考链接

- [参数反演技术说明](docs/param_inversion_technical.md)
- [网格细化算法详解](docs/mesh_refinement_algorithms.md)
- [FEM-PINN映射方法](docs/fem_pinn_mapping_methods.md)

# 深基坑CAE系统 - 技术路线更新文档

*本文档是对《集成项目规范文档》的补充更新，主要针对OCC和Three.js技术路线的实现情况进行说明。*

## OCC与Three.js技术路线实现状态

### 已完成组件

1. **OpenCascade几何内核封装 (OCC Wrapper)**
   - 已完成基本几何体创建功能：盒体、圆柱体
   - 已完成NURBS曲面创建与处理
   - 已完成OCC到Three.js格式的转换接口
   - 实现了优雅降级机制，当OCC不可用时转为模拟模式

2. **Three.js渲染组件**
   - 已完成Three.js核心渲染引擎
   - 实现了3D场景管理功能
   - 添加了基本交互控制：旋转、缩放、平移
   - 实现了ViewCube导航辅助工具
   - 添加了基础光照和材质系统

3. **核心数据交换接口**
   - 实现了OCC几何模型到Three.js格式的转换
   - 支持基本几何体、NURBS曲面的数据结构转换
   - 建立了通用的几何数据序列化机制

### 最新功能增强（2024年更新）

1. **高级几何建模功能**
   - 新增布尔操作支持（布尔减法和布尔并集）
   - 新增球体和圆锥体等高级几何体创建功能
   - 添加了参数化建模方法（快速创建基坑模型、支撑结构和锚杆系统）
   - 增强了几何体方向控制，支持任意轴向旋转
   - 支持STEP格式导出功能

2. **前端交互体验增强**
   - 重写粒子系统，实现动态连线效果
   - 添加交互式波纹效果和鼠标跟踪功能
   - 实现了后处理效果（辉光和抗锯齿）
   - 增加了性能监控和自适应优化
   - 支持高清材质和动态光照效果
   - 实现了资源自动清理机制

3. **数据传输优化**
   - 新增DataConverter模块用于高效转换和传输数据
   - 实现了数组压缩和Base64编码机制，大幅减少传输量
   - 添加了几何体细节级别控制（LOD）
   - 实现数据缓存机制，避免重复转换
   - 优化了四元数旋转计算，提高精度和性能
   - 新增完整的API路由支持模型和场景数据处理

## 技术集成情况

目前OCC和Three.js的技术路线已经全面打通，主要实现了：

1. 后端OpenCascade进行几何造型
2. 几何数据通过高效压缩机制传输
3. 前端Three.js进行渲染和增强交互

核心接口在`src/core/modeling/occ_wrapper.py`和`src/core/visualization/three_renderer.py`已经实现，并通过`src/core/visualization/data_converter.py`实现了高效数据交换。前端交互增强在`frontend/js/background3d.js`和相关文件中实现。API路由在`src/api/routes/visualization_router.py`中完善。

## 技术优势

1. **高效数据传输**
   - 使用zlib压缩和Base64编码，减少70-80%传输量
   - 实现缓存机制避免重复转换，提高响应速度
   - 支持按需加载和细节级别控制

2. **增强的交互体验**
   - 粒子系统创造沉浸式背景效果
   - 鼠标交互和波纹效果增强用户体验
   - 后处理特效提升视觉质量

3. **高级建模能力**
   - 布尔操作支持复杂模型构建
   - 参数化建模加速工作流程
   - 支持行业标准文件格式导出

## 下一步工作计划

1. 完善NURBS曲面与FEM网格的转换机制
2. 增强Three.js的实时分析结果可视化能力
3. 优化数据流和缓存策略，进一步提高性能
4. 实现分布式渲染支持大规模模型
5. 添加VR/AR支持，提供沉浸式体验
6. 完善API文档和使用示例 