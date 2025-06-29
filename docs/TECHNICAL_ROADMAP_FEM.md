# 深基坑分析系统技术路线 (FEM版)

## 1. 技术路线概述

### 1.1 核心技术栈

当前深基坑分析系统采用以下核心技术栈：

```
几何建模 → 网格生成 → 有限元分析 → 结果可视化 → 物理AI辅助
(Three.js/OCC) → (Netgen) → (Kratos FEM) → (Trame) → (Physics AI)
```

### 1.2 技术路线转变

我们已完成从等几何分析(IGA)到纯有限元方法(FEM)的技术路线转变：

| 技术领域 | 原技术路线 | 现技术路线 | 优势 |
|---------|-----------|-----------|------|
| 几何建模 | NURBS曲面 | 传统CAD+CSG | 更广泛的几何兼容性 |
| 网格生成 | IGA控制网格 | Netgen四/六面体网格 | 更高质量的网格 |
| 计算方法 | Kratos-IGA | Kratos-FEM | 更成熟的算法和更广泛的材料模型 |
| 结果处理 | IGA后处理 | FEM通用后处理 | 标准化的结果格式 |

## 2. 网格生成技术

### 2.1 Netgen网格生成器

Netgen是一个高质量的三维网格生成器，我们已将其集成到深基坑分析系统中：

- **版本**: netgen-mesher 6.2.2504
- **支持单元类型**: 四面体、六面体、混合网格
- **网格质量控制**: 支持网格密度控制、局部加密、边界层网格
- **物理组管理**: 支持几何实体到物理组的映射

### 2.2 Netgen-Kratos集成

我们已开发Netgen与Kratos的无缝集成方案：

```python
# 网格生成与转换流程
def generate_and_convert_mesh(geometry_file, mesh_density=1.0):
    # 1. 使用Netgen生成网格
    mesh = ngmesh.Mesh(dim=3)
    geo = ngcore.OCCGeometry(geometry_file)
    mesh.GenerateVolumeMesh(maxh=mesh_density)
    
    # 2. 定义物理组
    for i, face in enumerate(geo.faces):
        mesh.SetBCName(i, f"surface_{i}")
    
    # 3. 转换为Kratos可用格式
    kratos_mesh = KratosMesh()
    for node in mesh.nodes:
        kratos_mesh.add_node(node.id, node.coordinates)
    for element in mesh.elements:
        kratos_mesh.add_element(element.id, element.nodes, element.physical_group)
    
    return kratos_mesh
```

## 3. 有限元分析框架

### 3.1 Kratos多物理场框架

Kratos是我们采用的核心FEM计算框架：

- **版本**: Kratos Multiphysics (最新稳定版)
- **应用模块**: 
  - GeoMechanicsApplication (土力学)
  - StructuralMechanicsApplication (结构力学)
  - PoromechanicsApplication (孔隙力学)
  - ConvectionDiffusionApplication (渗流分析)

### 3.2 材料模型支持

当前支持的土体本构模型：

- Mohr-Coulomb模型
- Drucker-Prager模型
- Modified Cam-Clay模型
- 小应变弹塑性模型
- 大应变弹塑性模型

### 3.3 分析类型

系统支持以下分析类型：

- 静力结构分析
- 稳态/瞬态渗流分析
- 渗流-结构耦合分析
- 分步施工模拟分析

## 4. 数据流架构

### 4.1 数据流程图

```
[几何数据] → [网格数据] → [计算模型] → [分析结果] → [可视化数据]
   ↑            ↑            ↑            ↓            ↓
   │            │            │            │            │
[CAD导入]   [Netgen]     [Kratos]    [结果处理]    [Trame]
```

### 4.2 数据格式

| 数据类型 | 格式 | 描述 |
|---------|------|------|
| 几何数据 | STEP, IGES, BREP | CAD标准格式 |
| 网格数据 | MSH, VTK | Netgen输出格式 |
| 计算模型 | JSON, HDF5 | Kratos输入格式 |
| 分析结果 | HDF5, VTK | 结构化结果数据 |
| 可视化数据 | VTK, JSON | Trame可视化格式 |

## 5. 物理组管理

### 5.1 物理组定义

物理组是几何实体与材料属性、边界条件的映射关系：

```python
# 物理组数据结构
physical_groups = {
    "soil_1": {
        "material": "clay",
        "elements": [1, 2, 3, 4, 5],
        "color": "#A67D3D",
        "visible": True
    },
    "diaphragm_wall": {
        "material": "concrete",
        "elements": [6, 7, 8],
        "color": "#7B8994",
        "visible": True
    },
    "anchor": {
        "material": "steel",
        "elements": [9, 10],
        "color": "#3D7EA6",
        "visible": True
    }
}
```

### 5.2 物理组映射流程

1. 几何建模阶段：定义几何实体并分配物理组名称
2. 网格生成阶段：保留物理组信息到网格单元
3. 分析设置阶段：为物理组分配材料属性和边界条件
4. 后处理阶段：基于物理组进行结果筛选和可视化

## 6. 前端架构

### 6.1 页面结构

```
App
├── WelcomePage
├── Dashboard
├── ModelingPage
├── MeshingPage
├── FemAnalysisPage  (替代原IgaAnalysisPage)
├── ResultVisualization
└── ProjectManagement
```

### 6.2 FEM分析页面组件

```tsx
// FEM分析页面核心组件
const FemAnalysisPage = () => {
  return (
    <MainLayout>
      <LeftPanel>
        <ModelSelector />
        <MeshSettings />
        <PhysicalGroupsList />
      </LeftPanel>
      
      <CenterPanel>
        <ModelViewer3D />
        <AnalysisControls />
      </CenterPanel>
      
      <RightPanel>
        <MaterialEditor />
        <BoundaryConditionEditor />
        <SolverSettings />
      </RightPanel>
    </MainLayout>
  );
};
```

## 7. 开发路线图

### 7.1 已完成项目

- ✅ Netgen网格生成器集成
- ✅ Netgen-Kratos数据转换接口
- ✅ FEM分析页面UI开发
- ✅ 物理组管理系统
- ✅ 基本材料模型库

### 7.2 进行中项目

- 🔄 高级非线性材料模型实现
- 🔄 分步施工模拟功能
- 🔄 渗流-结构耦合分析
- 🔄 结果可视化增强

### 7.3 计划项目

- 📅 物理AI辅助参数反演
- 📅 多物理场耦合分析扩展
- 📅 云计算支持
- 📅 移动端适配

## 8. 技术优势

1. **成熟可靠**: 采用成熟的FEM技术，算法稳定性高
2. **高性能**: Netgen高质量网格提升计算效率和精度
3. **灵活扩展**: 模块化架构支持新材料模型和分析类型
4. **直观操作**: 基于物理组的工作流程更符合工程思维
5. **可视化能力**: Trame提供专业的科学可视化能力

## 9. 总结

深基坑分析系统已成功完成从IGA到FEM的技术路线转变，构建了一个更成熟、更可靠的技术栈。基于Netgen的网格生成和Kratos的有限元分析框架，系统能够处理更复杂的工程问题，提供更准确的分析结果。 