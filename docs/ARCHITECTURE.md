# 深基坑CAE系统架构文档

## 系统架构概述

深基坑CAE系统采用前后端分离的现代架构，通过以下核心技术组件实现高效的工程分析与可视化：

- **几何建模与前端显示**：OpenCascade Core (OCC) + Three.js
- **求解器**：Kratos多物理场框架 + IGA (等几何分析)应用
- **后处理可视化**：Trame框架
- **智能分析**：物理AI系统 (基于PDE约束反演 + PyTorch)

## 核心技术栈

### 1. 几何建模层 (OCC-Three)

| 组件 | 技术选型 | 功能 |
|------|----------|------|
| 几何内核 | OpenCascade (PyOCCT) | NURBS曲面建模、实体操作、CAD转换 |
| 前端渲染 | Three.js | 3D几何交互展示、实时渲染 |
| 格式转换 | OCC → JSON/glTF → Three.js | 几何数据在前后端传输 |
| 几何算法 | OCC内置几何算法 | 布尔运算、曲面分割、偏移等 |

### 2. 分析求解层 (Kratos-IGA)

| 组件 | 技术选型 | 功能 |
|------|----------|------|
| 求解框架 | KratosMultiphysics | 多物理场耦合计算 |
| 几何分析 | IgaApplication | 等几何分析、NURBS支持 |
| 地质力学 | GeomechanicsApplication | 土体本构模型、土-结构相互作用 |
| 结构分析 | StructuralMechanicsApplication | 支护结构分析 |
| 优化模块 | OptimizationApplication | 结构优化、参数辨识 |

### 3. 可视化层 (Trame)

| 组件 | 技术选型 | 功能 |
|------|----------|------|
| 渲染引擎 | VTK | 高性能科学可视化 |
| 界面框架 | Trame | Web版高级可视化 |
| 数据交互 | WebSocket | 高效数据传输 |
| 后处理 | ParaView组件 | 切片、等值面、流线等 |

### 4. 物理AI层

| 组件 | 技术选型 | 功能 |
|------|----------|------|
| 机器学习框架 | PyTorch | 深度学习、PINN模型 |
| 反演分析 | 基于PDE约束优化 | 土体参数反演 |
| IoT数据处理 | 时序数据处理库 | 监测数据分析 |
| 代理模型 | 神经网络代理模型 | 快速评估与预测 |

## 系统数据流

```
+----------------+        +-----------------+       +----------------+
| 几何建模模块   |  --->  | 分析求解模块    |  ---> | 后处理可视化   |
| (OCC-Three.js) |        | (Kratos-IGA)    |       | (Trame)        |
+----------------+        +-----------------+       +----------------+
                                  ^                         |
                                  |                         v
                          +----------------+        +----------------+
                          | 物理AI模块     | <----> | IoT数据管理    |
                          | (PyTorch)      |        | (数据采集/处理)|
                          +----------------+        +----------------+
```

## 详细模块设计

### 1. 几何建模模块 (OCC-Three)

#### 1.1 后端几何组件

后端使用PyOCCT（OpenCascade的Python绑定）处理核心几何计算：

```python
# src/core/modeling/occ_wrapper.py
class OCCGeometryWrapper:
    """OpenCascade几何内核包装器"""
    # 包含几何创建、布尔运算、NURBS操作等功能
    
# src/core/modeling/nurbs_builder.py
class NURBSBuilder:
    """NURBS实体构建器"""
    # 用于构建和操作NURBS曲线、曲面
```

#### 1.2 前端渲染组件

前端使用Three.js进行渲染和交互：

```typescript
// frontend/src/components/modeling/ThreeViewer.tsx
const ThreeViewer: React.FC = () => {
    // 包含Three.js场景初始化、渲染、交互处理
};

// 几何编辑器组件
const GeometryEditor: React.FC = () => {
    // 包含工具栏、属性面板、3D视图
};
```

#### 1.3 数据转换流程

```
OpenCascade(几何操作) → BRep/STEP/JSON → 传输 → Three.js渲染
```

### 2. Kratos-IGA分析模块

#### 2.1 NURBS到IGA转换

```python
# src/core/simulation/nurbs_to_iga_converter.py
class NURBSToIGAConverter:
    """将NURBS几何转换为IGA模型"""
    # 包含控制点提取、权重计算、模型部件创建等功能
```

#### 2.2 求解器配置

```python
# src/core/simulation/iga_solver_config.py
class IgaSolverConfig:
    """IGA求解器配置"""
    # 包含求解器类型、分析类型、时间步进等设置
```

#### 2.3 材料与边界条件

```python
# src/core/modeling/physical_groups.py
class PhysicalGroupManager:
    """物理组管理器"""
    # 处理材料属性和边界条件分配
```

### 3. Trame后处理可视化

```python
# src/core/visualization/trame_visualization.py
class TrameVisualizationServer:
    """基于Trame的可视化服务器"""
    # 包含3D视图、结果展示、交互控制等功能
```

### 4. 物理AI系统

#### 4.1 核心系统

```python
# src/core/ai/physics_ai_system.py
class PhysicsAISystem:
    """物理AI系统核心"""
    # 集成反演分析、优化及IoT数据处理
```

#### 4.2 IoT数据管理

```python
# src/core/ai/iot_data_manager.py
class IoTDataManager:
    """IoT数据管理器"""
    # 处理传感器数据的获取、预处理和存储
```

#### 4.3 反演分析器

```python
# src/core/ai/inverse_analyzer.py
class InverseAnalyzer:
    """基于PDE约束的反演分析器"""
    # 实现参数辨识功能
```

#### 4.4 神经网络模型

```python
# src/core/ai/ml_predictor.py
class MachineLearningPredictor:
    """机器学习预测器"""
    # 集成标准ML和物理信息神经网络
```

## 系统交互流程

1. **建模阶段**：用户在前端界面通过OCC-Three创建/编辑几何模型
2. **分析设置**：配置材料属性、边界条件和求解参数
3. **网格与求解**：后端将几何转换为IGA模型并执行求解
4. **结果展示**：通过Trame可视化计算结果
5. **反演分析**：导入IoT监测数据，执行参数反演
6. **预测评估**：使用训练好的物理AI模型进行预测分析

## 技术依赖关系

```
OCC-Three → NURBS模型 → IGA分析 → Kratos求解 → 结果数据 → Trame可视化
                                  ↑
                                  ↓
             IoT数据 → 数据处理 → 物理AI → PyTorch模型 → 参数优化/预测
```

## 部署架构

```
+-------------------+        +-------------------+
| 前端应用服务器     |  <---> | 后端API服务器     |
| (React + Vite)    |        | (FastAPI)         |
+-------------------+        +---------+---------+
                                      ↑
                          +-----------+-----------+
                          |                       |
              +-----------+-----------+  +--------+--------+
              | Kratos计算服务        |  | Trame可视化服务 |
              | (Python + Kratos)    |  | (Python + VTK)  |
              +---------------------+  +-----------------+
```

## 前端组件设计

### 核心页面组件

1. **欢迎页面** (`WelcomePage.tsx`) 
2. **主界面** (`MainLayout.tsx`)
3. **几何建模页** (`ModelingPage.tsx`)
4. **分析设置页** (`AnalysisSetupPage.tsx`)
5. **结果查看页** (`ResultsViewerPage.tsx`)
6. **物理AI页面** (`PhysicsAIPage.tsx`)

### 功能组件

1. **几何建模组件** (`ThreeViewer.tsx`, `GeometryToolbar.tsx`)
2. **材料设置组件** (`MaterialDialog.tsx`, `LayersPanel.tsx`)  
3. **边界条件组件** (`BoundaryConditionsPanel.tsx`)
4. **IoT数据组件** (`IoTDataPanel.tsx`)
5. **反演分析组件** (`InverseAnalysisPanel.tsx`)
6. **结果可视化组件** (`ResultsViewer.tsx`)

## 配置文件结构

- `kratos_config.json`：Kratos模块配置
- `excavation_config.py`：深基坑系统配置
- `trame_config.json`：可视化配置
- `physics_ai_config.json`：物理AI系统配置

## 系统扩展性设计

本架构支持多种扩展途径：

1. **几何建模扩展**：通过扩展OCC包装器支持更多几何功能
2. **物理模型扩展**：添加新的Kratos模块或本构模型
3. **AI模型扩展**：集成新的神经网络架构或优化算法
4. **可视化扩展**：增加Trame/VTK自定义可视化组件

## 系统限制与约束

1. **计算性能**：复杂IGA分析计算量大，可能需要GPU加速
2. **前端渲染**：大型模型在WebGL中可能存在性能瓶颈
3. **数据传输**：大型结果数据需要优化传输策略
4. **AI模型训练**：PINN模型训练需要大量计算资源 