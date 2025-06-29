# Netgen网格生成指南

## 简介

Netgen是一个高质量的开源三维网格生成器，特别适合有限元分析(FEM)。本指南将介绍如何在深基坑分析系统中安装、配置和使用Netgen。

## 安装Netgen

### 通过pip安装

最简单的方法是通过pip安装预编译的netgen-mesher包：

```bash
pip install netgen-mesher==6.2.2504
```

这将安装Netgen的Python绑定，使您能够在Python代码中使用Netgen的功能。

### 验证安装

安装完成后，可以运行我们提供的检查脚本来验证Netgen是否正确安装：

```bash
python tools/setup/check_netgen.py
```

或者直接运行批处理文件：

```bash
scripts/check_netgen.bat
```

## Netgen的基本概念

### 几何建模

Netgen支持多种几何表示方法：

1. **CSG (Constructive Solid Geometry)** - 通过基本几何体（如立方体、球体、圆柱体）的布尔运算构建复杂几何
2. **STL文件** - 导入三角形网格表面
3. **STEP/IGES文件** - 导入CAD模型（需要OpenCascade支持）

### 网格生成

Netgen可以生成以下类型的网格：

1. **三角形/四边形表面网格**
2. **四面体/六面体体积网格**
3. **混合网格**（同时包含四面体和六面体单元）

## 在深基坑分析中使用Netgen

### 基本工作流程

1. **定义几何模型** - 使用CSG或导入CAD模型
2. **设置网格参数** - 如网格尺寸、局部细化等
3. **生成网格** - 调用Netgen的网格生成函数
4. **导出网格** - 保存为所需格式（如VOL、VTK、UNV等）
5. **进行有限元分析** - 将网格导入Kratos等求解器

### 代码示例

以下是使用Netgen创建简单深基坑模型的Python代码示例：

```python
import netgen.meshing as ngmesh
import netgen.csg as csg

# 创建几何模型
geo = csg.CSGeometry()

# 创建土体 (大立方体)
soil_box = csg.OrthoBrick(
    csg.Pnt(-30, -30, -30), 
    csg.Pnt(30, 30, 0)
)

# 创建基坑 (小立方体)
excavation_box = csg.OrthoBrick(
    csg.Pnt(-10, -10, -10), 
    csg.Pnt(10, 10, 0)
)

# 从土体中减去基坑
soil = soil_box - excavation_box

# 添加到几何模型
geo.Add(soil.mat("soil"))

# 设置网格参数
mesh_params = ngmesh.MeshingParameters(maxh=2.0)

# 生成网格
mesh = ngmesh.GenerateMesh(geo, mesh_params)

# 保存网格
mesh.Export("excavation_model.vol", "Netgen")
```

## 高级功能

### 局部网格细化

可以通过以下方式实现局部网格细化：

1. **点的局部尺寸** - 在关键点附近细化网格
2. **边界层网格** - 在边界附近创建高质量的层状网格
3. **尺寸函数** - 使用自定义函数控制网格尺寸分布

### 网格质量控制

Netgen提供多种网格质量控制参数：

- **grading** - 控制相邻单元大小的变化率
- **optimize_steps** - 优化步骤数
- **optsteps3d** - 3D优化步骤数
- **elllocalh** - 基于曲率的局部网格细化

## 实例：深基坑工程网格生成

我们提供了一个完整的深基坑工程网格生成示例：

```bash
python examples/netgen_excavation_mesh.py
```

或者直接运行批处理文件：

```bash
scripts/run_netgen_excavation_mesh.bat
```

该示例创建了一个包含土体和围护墙的深基坑模型，并生成适合有限元分析的网格。

## 常见问题

### Q: 如何处理复杂的地质分层？

A: 可以使用多个几何体表示不同的地质层，每个几何体使用不同的材料属性。

### Q: 如何导入实际工程的CAD模型？

A: Netgen支持导入STEP/IGES格式的CAD模型，需要确保安装了带OpenCascade支持的Netgen版本。

### Q: 如何在围护结构附近细化网格？

A: 可以使用局部尺寸函数或边界层网格功能，在围护结构附近创建更细的网格。

## 参考资源

- [Netgen官方文档](https://docu.ngsolve.org/latest/index.html)
- [NGSolve文档](https://docu.ngsolve.org/latest/index.html)
- [Netgen GitHub仓库](https://github.com/NGSolve/netgen) 