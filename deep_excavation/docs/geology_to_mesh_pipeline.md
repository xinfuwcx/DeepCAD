# 技术文档：DeepCAD自动化地质建模与网格生成流水线

**版本**: 1.0  
**日期**: 2025-01-29  
**作者**: DeepCAD AI-Agent (O3) & User

## 1. 概述与目标

本文档旨在详细阐述DeepCAD系统中，从用户在前端输入原始地质数据，到后端全自动生成可用于Kratos多物理场分析的有限元网格的完整技术流水线。

该系统的核心目标是解决以下问题：
- **自动化**: 将传统上需要多次手动数据转换和软件切换的地质建模与网- **鲁棒性**: 确保流程对于复杂、不规则的地质体形状具有高成功率，避免因几何拓扑问题导致的失败。
- **一体化**: 在同一个Web平台内，无缝集成地质建模（GemPy）、几何处理（PyVista）、网格生成（Gmsh）和数值分析（Kratos）等多个核心引擎。

---

## 2. 核心技术栈

- **前端**: React, TypeScript, MUI, Zustand, Three.js
- **后端**: FastAPI, Python
- **地质建模**: GemPy
- **几何处理与可视化**: PyVista
- **CAD与网格生成**: Gmsh (及其OpenCASCADE内核)
- **有限元分析**: Kratos Multiphysics

---

## 3. 工作流详解

整个流水线可以分为六个主要阶段：

### 阶段一：前端数据输入 (`GeologicalModelCreator.tsx`)

1.  用户在"数据驱动建模"界面通过CSV文件上传地质数据，目前主要支持**地表点数据** (`surface_points`)。
2.  CSV文件包含`x`, `y`, `z`坐标和`surface`（地层名称）列。
3.  文件上传后，前端的`Papa.parse`库会解析数据，并将其构造成`GeologyModelParameters`接口定义的格式。
4.  同时，界面会自动从上传的数据中提取所有唯一的`surface`名称，并构建一个默认的`series_mapping`，例如`{"DefaultSeries": ["rock1", "rock2"]}`。
5.  用户点击"生成模型"按钮，触发`handleGenerateDataDrivenModel`函数。

### 阶段二：API请求与服务层

1.  `handleGenerateDataDrivenModel`函数调用`geologyService.ts`中的`createDataDrivenGeologicalModel`方法。
2.  该方法将`GeologyModelParameters`数据包装成一个符合后端FastAPI路由期望的`FeatureRequest`格式的POST请求体。
3.  请求被发送到后端的`/api/geology/create-geological-model`端点。
4.  `geology_router.py`接收请求，并将其传递给`geology_service.py`。服务层的主要职责是解耦API层和核心业务逻辑层。

### 阶段三：地质隐式建模 (`geology_modeler.py`)

1.  `GeologyModeler`的`create_model_in_memory`方法接收到来自服务层的、格式化好的Python字典数据。
2.  **调用GemPy**: 使用`gp.create_model`初始化一个地质模型。
3.  **数据注入**: 通过`gp.data.set_surface_points`等API，将地表点和地层序列信息注入到GemPy模型中。
4.  **模型计算**: 调用`gp.compute_model`，GemPy会根据插值算法（如Kriging）生成一个三维的隐式地质模型。
5.  **提取显式表面**: 循环遍历每个地层，调用`gempy.get_surface_mesh`方法，将隐式模型转换为一系列显式的、可视化的三角网格，每个网格都是一个`pyvista.PolyData`对象。

### 阶段四：CAD与网格生成 (`gmsh_occ_integration.py`)

这是整个流水线中最核心、技术挑战最大的部分。经过多次迭代，我们最终确定了**基于B-Spline曲面近似的方案**，它成功解决了其他方案（如直接离散实体导入、STL导入）中遇到的几何拓扑错误和稳健性问题。

1.  **接收PyVista表面**: `GmshOCCIntegration`类接收到一个包含多个`pyvista.PolyData`对象的列表。
2.  **B-Spline曲面近似**:
    -   对列表中的每一个`PolyData`表面，调用私有方法`_interpolate_surface_to_bspline`。
    -   该方法首先在表面的2D投影（XY平面）上创建一个规则的网格点阵。
    -   然后使用`scipy.interpolate.griddata`，将原始`PolyData`上的Z坐标插值到这个规则的网格点阵上。
    -   最后，使用`gmsh.model.occ.addBSplineSurface`，将这个插值后的、规则化的点阵直接创建为一个原生的Gmsh B-Spline曲面。这个步骤是成功的关键，因为它生成了Gmsh的CAD内核可以完美识别和操作的"干净"几何体。
3.  **创建边界框**: 创建一个足够大的立方体（Bounding Box），将所有的B-Spline曲面完全包裹在内。
4.  **布尔切割 (`Fragment`)**: 调用`gmsh.model.occ.fragment`，这是Gmsh最强大的功能之一。它将边界框与所有的B-Spline曲面进行布尔运算，自动生成所有由这些面切割而成的、封闭且水密的独立三维体（Volume）。
5.  **移除重复边界**: 调用`gmsh.model.occ.removeDuplicateBoundaries`。这是一个至关重要的步骤，它能确保相邻两个体积块共享同一个面，而不是各自拥有一个重叠的面，从而满足后续三维网格划分的拓扑要求。
6.  **体积识别与标记**: 自动识别所有新生成的体积块，并为它们分配物理组（Physical Group），以便在后续的分析中指定不同的材料属性。
7.  **生成三维网格**: 调用`gmsh.model.mesh.generate(3)`，在所有标记好的体积块上生成三维四面体网格。

### 阶段五：输出生成

网格生成成功后，`GmshOCCIntegration`类会执行两个输出操作：

1.  **为Kratos生成MDPA文件**: 调用`gmsh.write("temp_file.mdpa")`，将内存中的网格直接保存为Kratos求解器原生支持的`.mdpa`文件格式。该文件的路径被返回。
2.  **为前端生成可视化网格**: 调用`_extract_mesh_to_pyvista`方法，将内存中的同一个网格转换为`pyvista.UnstructuredGrid`对象，用于前端的可视化。

`GeologyModeler`接收到这两个输出后，将`.mdpa`文件路径保存起来供后续分析调用，同时使用`pyvista_web_bridge.py`中的`pyvista_mesh_to_json`函数将可视化网格序列化为JSON。

### 阶段六：前端状态更新与可视化

1.  序列化后的JSON数据沿着`服务层` -> `API层` -> `HTTP响应`返回给前端。
2.  `GeologicalModelCreator.tsx`在`await`调用后接收到此响应数据。
3.  它调用`useStore`中的`setTransientGeologicalMesh`动作，将返回的网格数据存入一个临时的、全局的Zustand状态`transientGeologicalMesh`中。
4.  **后续步骤 (待实现)**: 一个高阶的UI组件（如`MainPage.tsx`或`Viewport.tsx`）应订阅`transientGeologicalMesh`状态的变化。一旦状态更新，它将负责：
    a.  将JSON网格数据转换为`Three.js`的`BufferGeometry`和`Mesh`。
    b.  调用`viewportApi.addAnalysisMesh`将其渲染到3D场景中。
    c.  清空`transientGeologicalMesh`状态，完成一次性数据传递。

---

## 4. 结论

通过上述流水线，我们成功地实现了一个从原始数据到分析模型的全自动化流程。其中，创造性地使用B-Spline曲面近似技术来解决Gmsh的几何稳健性问题，是本次技术攻关的核心突破。

系统当前已经完成了数据流和核心逻辑的搭建，下一步的工作重心将是触发并运行Kratos分析，以及将分析结果进行后处理和可视化。 