# 基坑开挖案例

本案例演示了使用深基坑CAE系统进行基坑开挖分析的完整流程，包括几何建模、网格剖分、计算和结果可视化。

## 案例描述

本案例模拟一个矩形基坑的开挖过程，具体参数如下：

- **土体尺寸**：40m × 40m × 25m
- **基坑尺寸**：15m × 15m × 10m
- **地连墙**：沿基坑周边布置，厚度0.8m，深度12m，采用壳单元，材料为C35混凝土
- **土体材料**：摩尔-库仑本构模型
- **网格尺寸**：0.5m
- **开挖方式**：一次性开挖至10m深度

## 分析步骤

1. **几何建模**：创建土体和基坑的几何模型
2. **网格剖分**：使用Gmsh生成有限元网格
3. **计算模型创建**：定义材料、边界条件、荷载和开挖阶段
4. **分析计算**：使用Terra计算引擎进行地应力平衡和开挖分析
5. **结果处理**：提取位移和应力结果
6. **结果可视化**：生成位移云图、应力云图和剖面图

## 运行方法

直接双击运行`run_excavation_case.bat`脚本，或在命令行中执行以下命令：

```bash
# 运行案例
python examples/excavation_case.py

# 可视化结果
python examples/visualize_results.py --result "examples/case_results/result.vtk" --mesh "examples/case_results/mesh.msh"
```

## 参数详情

### 几何参数

```python
geometry_params = {
    "width": 40.0,        # 土体宽度
    "length": 40.0,       # 土体长度
    "depth": 25.0,        # 土体深度
    "excavation_width": 15.0,  # 基坑宽度
    "excavation_length": 15.0, # 基坑长度
    "excavation_depth": 10.0,  # 基坑深度
    "diaphragm_wall_thickness": 0.8,  # 地连墙厚度
    "diaphragm_wall_depth": 12.0      # 地连墙深度
}
```

### 网格参数

```python
mesh_params = {
    "mesh_size": 0.5,     # 网格大小
    "algorithm": 6,       # 四面体网格算法
    "format": "msh"       # 网格文件格式
}
```

### 材料参数

#### 土体材料（摩尔-库仑模型）

```python
{
    "name": "表层土",
    "material_model": "mohr_coulomb",
    "parameters": {
        "young_modulus": 3.0e7,    # 弹性模量 Pa
        "poisson_ratio": 0.3,      # 泊松比
        "cohesion": 15000.0,       # 粘聚力 Pa
        "friction_angle": 25.0,    # 内摩擦角 度
        "density": 1800.0          # 密度 kg/m³
    }
}
```

#### 地连墙材料（C35混凝土）

```python
{
    "name": "地连墙",
    "material_model": "linear_elastic",
    "parameters": {
        "young_modulus": 3.15e10,  # C35混凝土弹性模量 Pa
        "poisson_ratio": 0.2,      # 混凝土泊松比
        "density": 2500.0          # 混凝土密度 kg/m³
    }
}
```

### 边界条件

- 底部：固定约束
- 侧面：滚动约束
- 荷载：重力荷载（9.81 m/s²）

### 开挖阶段

1. 初始地应力平衡阶段
2. 基坑开挖阶段（一次开挖至10m深度）

## 结果文件

运行案例后，将在`examples/case_results`目录下生成以下文件：

- `project_config.json`：项目配置文件
- `geometry.geo`：几何模型文件
- `mesh.msh`：网格文件
- `model.json`：计算模型文件
- `result.vtk`：计算结果文件
- `result_summary.json`：结果摘要文件

可视化结果将保存在`examples/case_results/figures`目录下：

- `displacement_contour.png`：位移云图
- `stress_contour.png`：应力云图
- `excavation_section.png`：基坑剖面图
- `displacement_time_history.png`：位移时程曲线
- `excavation_3d.html`：3D交互式可视化

## 预期结果

通过本案例分析，可以得到以下结果：

1. 基坑开挖引起的地表沉降和侧向位移
2. 地连墙的变形和内力分布
3. 基坑周围土体的应力分布和变化
4. 开挖过程中的位移发展趋势

这些结果可以用于评估基坑开挖的安全性和对周围环境的影响，为工程设计和施工提供参考。

## 物理AI集成

本案例还可以与物理AI系统集成，实现以下功能：

1. 利用PINN模型预测基坑开挖过程中的位移和应力场
2. 通过反演分析确定土体参数
3. 结合IoT监测数据进行预警和预测

要启用物理AI功能，可以在`excavation_case.py`中添加以下代码：

```python
# 运行PINN模型
pinn_params = {
    "pde_type": "elasticity",
    "layers": [20, 20, 20],
    "iterations": 10000
}
pinn_result = system.train_pinn_model(pinn_params)

# 运行反演分析
inverse_params = {
    "data_type": "displacement",
    "pde_type": "elasticity",
    "initial_params": {
        "young_modulus": 3.0e7,
        "poisson_ratio": 0.3
    }
}
inverse_result = system.run_inverse_analysis(inverse_params)
```

## 参考文献

1. 《深基坑工程设计与施工技术规范》(JGJ 120-2012)
2. 《建筑基坑支护技术规程》(JGJ 120-2012)
3. Potts, D.M. and Zdravkovic, L. (2001) *Finite Element Analysis in Geotechnical Engineering: Application*. Thomas Telford, London.
4. Raissi, M., Perdikaris, P., and Karniadakis, G.E. (2019) *Physics-informed neural networks: A deep learning framework for solving forward and inverse problems involving nonlinear partial differential equations*. Journal of Computational Physics, 378, 686-707.



