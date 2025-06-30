# 高级深基坑有限元分析模块

## 简介

本文档描述了深基坑CAE系统中的高级有限元分析模块，该模块基于Kratos多物理场分析框架，专门针对深基坑工程的特殊需求进行了扩展和优化。模块提供了复杂的土-结构相互作用分析、多阶段施工模拟和高级材料模型支持等功能。

## 主要特性

- **基于Kratos框架**：充分利用KratosMultiphysics的高性能计算能力
- **多阶段施工模拟**：支持分阶段开挖、支护结构安装和水位变化等工程过程
- **高级材料模型**：支持线性弹性、摩尔库仑塑性等多种地基材料模型
- **复杂边界条件**：支持自动生成初始地应力场和水压力边界条件
- **土-结构相互作用**：支持土体与支护结构的接触分析
- **结果处理与可视化**：集成VTK格式输出，支持多阶段结果比较

## 技术架构

高级有限元分析模块主要由以下几个部分组成：

1. **核心求解器**：AdvancedExcavationSolver类，提供高级有限元分析功能
2. **材料模型库**：支持线性弹性、摩尔库仑等多种材料模型
3. **阶段管理系统**：支持多阶段施工模拟
4. **结果处理系统**：支持结果提取、处理和导出

## 系统依赖

- **Kratos多物理场框架**：核心计算引擎
- **StructuralMechanicsApplication**：结构力学分析
- **GeomechanicsApplication**（可选）：地质力学分析
- **ContactStructuralMechanicsApplication**（可选）：接触分析

## 快速开始

### 基本使用流程

```python
from src.core.simulation.advanced_excavation_solver import (
    AdvancedExcavationSolver, 
    MaterialModelType, 
    AnalysisType
)

# 创建求解器
solver = AdvancedExcavationSolver()

# 设置分析参数
solver.set_model_parameters(
    analysis_type=AnalysisType.STATIC,
    solver_type="newton_raphson",
    max_iterations=50
)

# 加载网格
solver.load_mesh("excavation_model.mdpa")

# 添加材料
soil_id = solver.add_soil_material(
    name="粘土层",
    model_type=MaterialModelType.MOHR_COULOMB,
    parameters={
        "young_modulus": 3.0e7,
        "poisson_ratio": 0.3,
        "density": 1800.0,
        "cohesion": 15000.0,
        "friction_angle": 25.0,
        "dilatancy_angle": 0.0
    },
    group_id=1
)

# 添加施工阶段
solver.add_excavation_stage(
    name="第一次开挖",
    depth=5.0,
    elements_to_remove=[101, 102, 103],
    water_level=-5.0
)

# 初始化和求解
solver.initialize()
solver.solve()

# 获取结果
displacements = solver.get_displacement_results()
stresses = solver.get_stress_results()

# 导出结果
solver.export_results("results.vtk", format="vtk")
```

### 示例代码

完整示例请参见 `examples/advanced/advanced_excavation_analysis.py`

## 支持的材料模型

| 模型类型 | 参数 | 适用情况 |
|---------|------|---------|
| 线性弹性 | 弹性模量、泊松比、密度 | 简单问题、结构材料 |
| 摩尔库仑 | 弹性模量、泊松比、密度、黏聚力、内摩擦角、膨胀角 | 一般土体 |
| 德鲁克-普拉格 | 弹性模量、泊松比、密度、黏聚力、内摩擦角、膨胀角 | 一般土体、岩石 |
| 修正剑桥模型 | 弹性模量、泊松比、密度、黏聚力、压缩指数、膨胀指数、初始孔隙比 | 软土 |
| 硬化土模型 | 弹性模量、泊松比、密度、黏聚力、内摩擦角、膨胀角、参考压力、OCR | 复杂土体行为 |

## 支持的施工阶段类型

| 阶段类型 | 说明 |
|---------|------|
| 初始应力 | 建立初始地应力平衡 |
| 开挖 | 移除指定单元，模拟开挖过程 |
| 支护安装 | 添加支护结构单元 |
| 水位变化 | 改变水位高度 |
| 接触激活 | 激活土体与结构之间的接触 |
| 荷载激活 | 施加外部荷载 |

## 与其他模块集成

高级有限元分析模块可以与系统的其他模块无缝集成：

- **网格生成模块**：接收自动生成的网格
- **参数反演模块**：为参数优化提供正演计算支持
- **可视化模块**：输出标准格式结果用于可视化

## 未来发展方向

1. **添加更多高级材料模型**：UBC-SAND模型、PM4-SAND模型等
2. **地震分析支持**：加入动力分析能力
3. **热-水-力耦合分析**：支持多物理场耦合
4. **并行计算支持**：利用MPI和OpenMP加速大规模计算
5. **自适应网格细化**：基于误差指标自动细化网格

## 参考文献

1. Dadvand, P., Rossi, R., & Oñate, E. (2010). An object-oriented environment for developing finite element codes for multi-disciplinary applications. Archives of computational methods in engineering, 17(3), 253-297.
2. Kratos Multiphysics. (2022). Documentation. Retrieved from https://kratosmultiphysics.github.io/Kratos/
3. 王梓, 李典庆等. (2020). 深基坑工程数值分析方法与应用. 中国建筑工业出版社. 