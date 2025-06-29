# Netgen与Kratos集成指南

## 简介

本文档详细介绍了如何将Netgen网格生成工具与Kratos多物理场分析框架集成，实现从几何建模→网格生成→有限元分析的完整工作流程。这种集成充分利用了Netgen在高质量网格生成方面的优势和Kratos在多物理场分析方面的强大功能。

## 工作流程概述

1. **几何建模** - 使用OpenCascade或其他CAD工具创建几何模型
2. **网格生成** - 使用Netgen生成高质量有限元网格
3. **网格转换** - 将Netgen网格转换为Kratos可识别的格式
4. **物理属性设置** - 在Kratos中设置材料属性、边界条件等
5. **求解分析** - 使用Kratos进行有限元分析
6. **结果后处理** - 使用Trame/VTK进行结果可视化

## 安装要求

- Netgen-mesher 6.2.2504或更高版本
- Kratos Multiphysics (包括StructuralMechanicsApplication等)
- Python 3.8或更高版本
- meshio (用于网格格式转换)

## 网格生成与转换

### 使用Netgen生成网格

```python
import netgen.meshing as ngmesh
import netgen.csg as csg

# 创建几何模型
geo = csg.CSGeometry()

# 创建基本几何体 (例如：深基坑模型)
soil_box = csg.OrthoBrick(
    csg.Pnt(-30, -30, -30), 
    csg.Pnt(30, 30, 0)
)
excavation_box = csg.OrthoBrick(
    csg.Pnt(-10, -10, -10), 
    csg.Pnt(10, 10, 0)
)
soil = soil_box - excavation_box
geo.Add(soil.mat("soil"))

# 设置网格参数
mesh_params = ngmesh.MeshingParameters(maxh=2.0)
mesh_params.grading = 0.3  # 控制网格尺寸渐变

# 生成网格
mesh = ngmesh.GenerateMesh(geo, mesh_params)

# 导出为VTK格式 (Kratos可读取)
mesh.Export("excavation_model.vtk", "VTK")
```

### 使用meshio转换网格格式

如果需要其他格式转换，可以使用meshio库：

```python
import meshio

# 读取Netgen生成的网格
mesh_netgen = meshio.read("excavation_model.vtk")

# 转换为Kratos可用的MDPA格式
# 注意：这里需要额外处理，将网格信息转换为MDPA格式
# 这通常涉及节点、单元和属性的转换

# 保存为MDPA格式
# meshio不直接支持MDPA，需要自定义转换
# 这里省略具体实现...
```

## Kratos分析设置

### 基本分析流程

```python
import KratosMultiphysics
import KratosMultiphysics.StructuralMechanicsApplication as StructuralMechanicsApplication

# 创建Kratos模型
model = KratosMultiphysics.Model()
model_part = model.CreateModelPart("MainModelPart")

# 设置模型部分属性
model_part.ProcessInfo[KratosMultiphysics.DOMAIN_SIZE] = 3  # 3D问题

# 导入网格 (从Netgen生成的VTK或转换后的MDPA)
model_part_io = KratosMultiphysics.ModelPartIO("excavation_model")
model_part_io.ReadModelPart(model_part)

# 设置材料属性
props = model_part.GetProperties()[1]
props.SetValue(KratosMultiphysics.YOUNG_MODULUS, 2.0e7)  # 杨氏模量
props.SetValue(KratosMultiphysics.POISSON_RATIO, 0.3)    # 泊松比
props.SetValue(KratosMultiphysics.DENSITY, 2000)         # 密度

# 设置边界条件
# ...

# 创建求解器
solver = KratosMultiphysics.ResidualBasedNewtonRaphsonStrategy(model_part, scheme, linear_solver, convergence_criteria)

# 求解
solver.Solve()

# 输出结果
gid_output = KratosMultiphysics.GidOutput("results_file")
gid_output.PrintOutput()
```

## 深基坑分析示例

### 完整工作流程示例

```python
# 1. 几何建模与网格生成 (Netgen)
def generate_excavation_mesh():
    # ... (使用上面的Netgen代码)
    return mesh

# 2. 网格转换
def convert_mesh_to_kratos(mesh):
    # ... (转换代码)
    pass

# 3. Kratos分析设置
def setup_kratos_analysis(model_part):
    # ... (Kratos设置代码)
    return solver

# 4. 主流程
def main():
    # 生成网格
    mesh = generate_excavation_mesh()
    
    # 转换网格
    convert_mesh_to_kratos(mesh)
    
    # 设置Kratos分析
    model = KratosMultiphysics.Model()
    model_part = model.CreateModelPart("ExcavationModel")
    solver = setup_kratos_analysis(model_part)
    
    # 求解
    solver.Solve()
    
    # 输出结果
    # ...

if __name__ == "__main__":
    main()
```

## 高级功能

### 分阶段开挖模拟

对于深基坑工程，通常需要模拟分阶段开挖过程：

```python
# 在Kratos中设置分阶段开挖
def setup_excavation_stages(model_part, num_stages=3):
    for stage in range(num_stages):
        # 为每个阶段创建子模型部分
        stage_model_part = model_part.CreateSubModelPart(f"Stage_{stage+1}")
        
        # 设置该阶段要开挖的单元
        excavation_depth = (stage + 1) * (total_depth / num_stages)
        # ... (选择对应深度的单元)
        
        # 设置该阶段的边界条件
        # ...
    
    return model_part
```

### 土-结构相互作用

模拟支护结构与土体的相互作用：

```python
# 在Kratos中设置接触分析
def setup_soil_structure_interaction(model_part):
    # 创建接触条件
    contact_properties = model_part.CreateNewProperties(1000)
    contact_properties.SetValue(KratosMultiphysics.FRICTION_COEFFICIENT, 0.3)
    
    # 设置主从面
    # ...
    
    # 创建接触过程
    contact_process = KratosMultiphysics.ContactStructuralMechanicsApplication.ALMContactProcess(model_part)
    
    return contact_process
```

## 常见问题与解决方案

### 网格质量问题

- **问题**：Netgen生成的四面体网格在某些区域质量较低
- **解决方案**：调整网格参数，如`mesh_params.grading`或在关键区域使用局部细化

### 格式转换问题

- **问题**：Netgen网格格式与Kratos期望格式不匹配
- **解决方案**：使用中间格式(如VTK)或编写自定义转换脚本

### 收敛性问题

- **问题**：Kratos分析不收敛
- **解决方案**：检查材料参数、调整求解器参数、改进网格质量或增加加载步数

## 参考资源

- [Netgen/NGSolve官方文档](https://docu.ngsolve.org/latest/index.html)
- [Kratos Multiphysics文档](https://kratosmultiphysics.github.io/Kratos/)
- [meshio文档](https://github.com/nschloe/meshio)

## 总结

Netgen和Kratos的集成为深基坑分析提供了强大的工具链，结合了Netgen在网格生成方面的优势和Kratos在多物理场分析方面的能力。通过本文档的指南，用户可以建立从几何建模到结果分析的完整工作流程，实现高效、准确的深基坑工程分析。 