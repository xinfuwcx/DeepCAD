# 分步施工模拟功能技术文档

## 1. 功能概述

分步施工模拟（Staged Construction Simulation）是深基坑分析系统的核心功能之一，用于模拟深基坑工程实际施工过程中的各个阶段，包括初始应力场生成、分步开挖、支护结构安装、降水等工序。通过分步施工模拟，可以准确预测各施工阶段的地层位移、支护结构内力、孔隙水压力等关键参数，为工程设计和施工提供科学依据。

## 2. 技术原理

分步施工模拟基于有限元方法的序列分析技术，其核心原理包括：

### 2.1 单元激活/失活技术

- **失活（Deactivation）**：在开挖过程中，通过将开挖区域的土体单元"失活"，模拟土体被挖走的过程。失活的单元不再参与计算，但其之前施加的应力会被保留并转化为等效节点力作用于剩余结构上。

- **激活（Activation）**：在支护结构安装过程中，将墙体、支撑、锚索等结构单元"激活"，使其参与后续计算。激活时，单元会从初始应力为零的状态开始受力，准确模拟施工顺序。

### 2.2 分析步管理

- **步序控制**：严格按照实际施工顺序设置分析步，确保计算结果准确反映施工过程。
  
- **应力状态继承**：每个分析步会从上一步的最终应力状态开始计算，确保应力历史的连续性。

### 2.3 初始应力场生成

- **K0程序法**：根据静止侧压力系数K0生成初始应力场，适用于水平地层。
  
- **重力加载法**：通过施加重力荷载逐步建立初始应力场，适用于复杂地形地貌。

### 2.4 接触分析技术

- **支护结构与土体接触**：通过接触单元模拟支护结构与土体之间的相互作用，包括摩擦、滑移和分离现象。

## 3. 系统架构

分步施工模拟功能的系统架构如下：

```
前端用户界面 (StagedConstructionPanel)
           ↓
API接口 (compute_router.py)
           ↓
分步施工模拟核心模块 (staged_construction.py)
           ↓
计算引擎 (TerraWrapper)
```

### 3.1 核心模块

- **StagedConstructionAnalysis 类**：分步施工模拟的主控类，管理施工阶段、执行分析和处理结果。
  
- **ConstructionStage 类**：表示单个施工阶段，包含阶段类型、参数和状态信息。
  
- **StageType 枚举**：定义施工阶段类型，如初始、开挖、支护安装等。

### 3.2 计算流程

1. 创建分析对象，指定项目ID和模型文件
2. 添加初始阶段，建立初始应力场
3. 按施工顺序添加各施工阶段（开挖、支护安装等）
4. 执行分析，逐阶段计算
5. 获取和处理各阶段结果
6. 导出最终结果

## 4. 主要功能特性

### 4.1 支持的阶段类型

- **初始阶段（Initial）**：建立初始应力场，设置初始水位和边界条件
  
- **开挖阶段（Excavation）**：模拟分层开挖过程，移除指定的土体单元

- **支护安装阶段**：
  - **围护墙安装（Wall Installation）**：模拟地下连续墙、钢板桩等围护结构的安装
  - **锚杆安装（Anchor Installation）**：模拟预应力锚杆的安装和预应力施加
  - **支撑安装（Strut Installation）**：模拟水平支撑、斜撑等支撑结构的安装

- **降水阶段（Dewatering）**：模拟基坑降水导致的水位变化

- **荷载施加阶段（Load Application）**：模拟施工荷载、临时荷载等的施加

- **固结阶段（Consolidation）**：模拟长期固结过程，分析长期沉降

- **完工阶段（Completion）**：模拟最终完工状态，用于评估长期稳定性

### 4.2 关键参数设置

- **K0系数**：控制初始应力场中的水平应力与垂直应力比例

- **水位变化**：每个阶段可独立设置水位高程，模拟降水效果

- **预应力值**：锚杆安装阶段可设置预应力值，模拟锚索张拉

- **时间步长**：用于瞬态分析或考虑时间效应的分析

### 4.3 结果输出

- **位移场**：各阶段的土体和结构位移
  
- **应力场**：各阶段的土体应力和结构内力
  
- **孔隙水压**：渗流场计算时的孔隙水压力分布
  
- **塑性区**：土体塑性区的发展过程
  
- **安全系数**：各阶段的整体安全系数

## 5. 使用指南

### 5.1 基本工作流程

1. 在前端界面创建分析，指定项目ID和模型文件
2. 添加初始阶段，设置K0系数和初始水位
3. 按照实际施工顺序添加各施工阶段
4. 为每个阶段设置相应的参数
5. 运行分析
6. 查看各阶段的计算结果
7. 导出最终结果

### 5.2 示例代码

#### 创建分析对象：

```python
from src.core.simulation.staged_construction import StagedConstructionAnalysis

analysis = StagedConstructionAnalysis(
    project_id="demo_project",
    model_file="/path/to/model.geo",
    config={"solver_type": "direct", "max_iterations": 50}
)
```

#### 添加初始阶段：

```python
analysis.add_initial_stage(
    name="初始平衡阶段",
    parameters={
        "water_level": -5.0,
        "initial_stress_method": "k0_procedure",
        "k0": 0.5
    }
)
```

#### 添加开挖阶段：

```python
analysis.add_excavation_stage(
    name="第一层开挖",
    elements=[101, 102, 103, 104, 105],
    water_level=-5.0,
    parameters={"excavation_depth": 3.0}
)
```

#### 添加支护安装阶段：

```python
from src.core.simulation.staged_construction import StageType

analysis.add_support_stage(
    name="安装第一道支撑",
    stage_type=StageType.STRUT_INSTALLATION,
    entities={"strut": [301, 302, 303, 304]},
    parameters={"strut_level": -2.5}
)
```

#### 运行分析：

```python
results = analysis.run_analysis()
```

#### 获取结果：

```python
stage_results = analysis.get_results("stage_1")
```

### 5.3 API接口

分步施工模拟功能提供了以下API接口：

- **POST /compute/staged-construction/create**：创建分析
- **POST /compute/staged-construction/{analysis_id}/add-stage**：添加施工阶段
- **POST /compute/staged-construction/{analysis_id}/run**：运行分析
- **GET /compute/staged-construction/{analysis_id}/status**：获取分析状态
- **GET /compute/staged-construction/{analysis_id}/results/{stage_id}**：获取阶段结果
- **POST /compute/staged-construction/{analysis_id}/export**：导出结果

## 6. 工程适用场景

分步施工模拟功能适用于以下工程场景：

### 6.1 深基坑工程

- **分步开挖分析**：准确模拟深基坑分层开挖过程，预测围护结构变形和内力发展规律
  
- **支护结构设计**：评估不同支护方案的效果，优化支护结构设计
  
- **降水影响评估**：分析基坑降水对周边环境的影响，预测地下水位变化和土体沉降

### 6.2 隧道工程

- **隧道开挖模拟**：模拟隧道分段开挖和支护过程，分析围岩变形和支护受力
  
- **盾构掘进模拟**：模拟盾构机推进、管片拼装等过程，评估地表沉降

### 6.3 边坡工程

- **分层开挖**：模拟边坡分层开挖过程，分析各阶段稳定性
  
- **加固措施评估**：评估锚杆、挡墙等加固措施的效果

## 7. 性能与局限性

### 7.1 性能指标

- **计算规模**：支持10万级网格单元的大规模计算
  
- **阶段数量**：支持100个以上的施工阶段
  
- **计算效率**：采用高效求解器，大幅提升计算速度

### 7.2 已知局限性

- **非线性收敛性**：在高度非线性问题中可能存在收敛困难
  
- **网格质量要求**：对网格质量要求较高，低质量网格可能导致计算不稳定
  
- **内存占用**：大规模问题的内存占用较高

## 8. 未来发展计划

### 8.1 近期计划

- **优化收敛性**：实现自适应加载步长控制，提高非线性问题收敛性
  
- **并行计算**：引入并行计算技术，提高大规模问题的计算效率
  
- **耦合分析增强**：完善与渗流分析的双向耦合能力

### 8.2 中长期规划

- **GPU加速**：实现GPU加速计算，进一步提高计算效率
  
- **AI辅助预测**：结合物理AI技术，实现施工过程的实时预测与反馈
  
- **三维可视化增强**：提供更直观的三维动态施工过程可视化

## 9. 参考资料

1. David M. Potts, Lidija Zdravković. "Finite element analysis in geotechnical engineering: theory and application", Thomas Telford, London, 2001.

2. Plaxis, "Material Models Manual", Delft University of Technology & Plaxis b.v., The Netherlands, 2018.

3. 陈祖煜, 罗强. "土力学与地基基础", 清华大学出版社, 2011.

4. 中国建筑科学研究院. "建筑基坑工程技术规范(JGJ 120-2012)", 中国建筑工业出版社, 2012. 