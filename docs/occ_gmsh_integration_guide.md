# OpenCASCADE与Gmsh集成技术指南

## 1. 概述

本文档详细说明DeepCAD项目中OpenCASCADE (OCC)与Gmsh的集成方案，以及DXF文件的处理流程。这是朱雀架构中几何处理和网格生成的核心技术基础。

## 2. OpenCASCADE与Gmsh的关系

### 2.1 技术选型

在朱雀架构中，我们使用的是**Gmsh自带的OpenCASCADE几何内核**，而非独立安装的OCC依赖。这种选择有以下优势：

1. **简化依赖管理**：不需要单独安装和配置OpenCASCADE库，减少了跨平台部署的复杂性
2. **一致性保证**：Gmsh与其内置的OCC版本兼容性已经过验证，避免版本不匹配问题
3. **API一致性**：通过Gmsh的Python API统一访问OCC功能，简化了开发流程
4. **容器化便利**：简化了Docker镜像构建过程，减小了镜像大小

### 2.2 Gmsh中的OCC支持

Gmsh从4.0版本开始内置了OpenCASCADE几何内核，通过`gmsh.model.occ`命名空间提供了对OCC功能的访问。这包括：

- 基本几何体创建（点、线、面、体）
- 布尔运算（并集、交集、差集）
- 变换操作（平移、旋转、缩放）
- 曲面操作（倒角、倒圆角）
- STEP、IGES等CAD格式的导入导出

## 3. 数据传输与配置

### 3.1 几何数据格式

几何数据在服务间传输采用标准化的JSON格式，包含以下关键信息：

```json
{
  "geometry_type": "cad",
  "entities": {
    "points": [...],
    "curves": [...],
    "surfaces": [...],
    "volumes": [...]
  },
  "operations": [
    {"type": "boolean", "operation": "cut", "targets": [1], "tools": [2]},
    ...
  ],
  "metadata": {
    "units": "meters",
    "coordinate_system": "cartesian",
    "version": "1.0"
  }
}
```

### 3.2 Gmsh配置

Gmsh的配置在网格服务中进行，主要包括：

```python
# 初始化Gmsh
gmsh.initialize()

# 设置OCC几何内核选项
gmsh.option.setNumber("Geometry.OCCFixDegenerated", 1)
gmsh.option.setNumber("Geometry.OCCFixSmallEdges", 1)
gmsh.option.setNumber("Geometry.OCCFixSmallFaces", 1)
gmsh.option.setNumber("Geometry.OCCSewFaces", 1)

# 设置网格生成选项
gmsh.option.setNumber("Mesh.Algorithm", 6)  # Frontal-Delaunay
gmsh.option.setNumber("Mesh.MeshSizeMin", min_size)
gmsh.option.setNumber("Mesh.MeshSizeMax", max_size)
```

## 4. DXF文件处理流程

### 4.1 前端与后端协作

虽然后端使用OCC处理几何，但前端仍需ezdxf来解析DXF文件并提取初始几何信息。完整的DXF处理流程如下：

1. **前端解析**：使用ezdxf在浏览器中解析DXF文件，提取基本几何元素
2. **数据转换**：将解析结果转换为标准几何数据格式
3. **数据传输**：将几何数据通过API发送到几何服务
4. **后端处理**：几何服务使用OCC进行进一步处理
5. **模型构建**：基于处理后的几何数据构建计算模型

这种前后端协作的方式可以减轻服务器负担，同时保持良好的用户体验。

### 4.2 前端DXF处理

前端使用ezdxf库解析DXF文件，主要流程为：

```typescript
// 前端DXF处理示例代码
async function processDxfFile(file: File): Promise<GeometryData> {
  // 读取文件内容
  const arrayBuffer = await file.arrayBuffer();
  
  // 使用ezdxf解析DXF文件
  const dxf = await ezdxf.readDxf(arrayBuffer);
  
  // 提取几何元素
  const points = extractPoints(dxf);
  const lines = extractLines(dxf);
  const polylines = extractPolylines(dxf);
  const arcs = extractArcs(dxf);
  const circles = extractCircles(dxf);
  
  // 转换为标准几何数据格式
  return {
    geometry_type: "dxf",
    entities: {
      points,
      curves: [...lines, ...polylines, ...arcs, ...circles],
      surfaces: [],
      volumes: []
    },
    metadata: {
      units: detectUnits(dxf),
      coordinate_system: "cartesian",
      version: "1.0"
    }
  };
}
```

### 4.3 后端几何处理

后端几何服务接收到几何数据后，使用Gmsh的OCC接口进行处理：

```python
# 后端几何处理示例代码
def process_geometry_data(geometry_data: dict) -> str:
    """处理几何数据并返回生成的几何模型ID"""
    
    # 初始化Gmsh和OCC
    gmsh.initialize()
    gmsh.model.add("geometry_model")
    
    # 创建点
    point_tags = {}
    for point in geometry_data["entities"]["points"]:
        tag = gmsh.model.occ.addPoint(point["x"], point["y"], point["z"])
        point_tags[point["id"]] = tag
    
    # 创建曲线
    curve_tags = {}
    for curve in geometry_data["entities"]["curves"]:
        if curve["type"] == "line":
            tag = gmsh.model.occ.addLine(
                point_tags[curve["start_point"]], 
                point_tags[curve["end_point"]]
            )
        elif curve["type"] == "circle":
            tag = gmsh.model.occ.addCircle(
                curve["center"]["x"], 
                curve["center"]["y"], 
                curve["center"]["z"], 
                curve["radius"]
            )
        # ... 处理其他曲线类型
        
        curve_tags[curve["id"]] = tag
    
    # 创建曲面
    # ... 创建曲面代码
    
    # 执行布尔运算
    for operation in geometry_data.get("operations", []):
        if operation["type"] == "boolean":
            if operation["operation"] == "cut":
                targets = [(3, target) for target in operation["targets"]]
                tools = [(3, tool) for tool in operation["tools"]]
                gmsh.model.occ.cut(targets, tools)
            # ... 处理其他布尔操作
    
    # 同步几何
    gmsh.model.occ.synchronize()
    
    # 返回几何模型ID
    return "geometry_model"
```

## 5. 关键技术实现

### 5.1 基本几何操作

使用Gmsh的OCC接口实现基本几何操作：

```python
# 创建基本几何体
box = gmsh.model.occ.addBox(0, 0, 0, 1, 1, 1)
cylinder = gmsh.model.occ.addCylinder(0.5, 0.5, 0, 0, 0, 1, 0.3)
sphere = gmsh.model.occ.addSphere(0.5, 0.5, 0.5, 0.3)

# 布尔运算
cut = gmsh.model.occ.cut([(3, box)], [(3, cylinder)])
fuse = gmsh.model.occ.fuse([(3, box)], [(3, sphere)])
intersect = gmsh.model.occ.intersect([(3, box)], [(3, sphere)])

# 几何变换
gmsh.model.occ.rotate([(3, box)], 0, 0, 0, 0, 0, 1, math.pi/4)
gmsh.model.occ.translate([(3, sphere)], 0.2, 0, 0)
gmsh.model.occ.dilate([(3, cylinder)], 0, 0, 0, 1.5, 1.5, 1)

# 同步几何
gmsh.model.occ.synchronize()
```

### 5.2 DXF导入

使用Gmsh的OCC接口导入DXF文件：

```python
def import_dxf_with_occ(dxf_file: str) -> int:
    """使用OCC导入DXF文件"""
    try:
        # 导入DXF文件
        tags = gmsh.model.occ.importShapes(dxf_file)
        
        # 同步几何
        gmsh.model.occ.synchronize()
        
        # 返回导入的实体数量
        return len(tags)
    except Exception as e:
        logger.error(f"DXF导入失败: {e}")
        raise
```

### 5.3 网格生成

基于OCC几何模型生成网格：

```python
def generate_mesh(model_name: str, mesh_size: float) -> str:
    """生成网格并返回网格文件路径"""
    try:
        # 设置网格尺寸
        gmsh.option.setNumber("Mesh.MeshSizeMin", mesh_size / 2)
        gmsh.option.setNumber("Mesh.MeshSizeMax", mesh_size)
        
        # 生成网格
        gmsh.model.mesh.generate(3)  # 3D网格
        
        # 保存网格文件
        mesh_file = f"{model_name}.msh"
        gmsh.write(mesh_file)
        
        # 转换为其他格式
        vtk_file = f"{model_name}.vtk"
        gmsh.write(vtk_file)
        
        return mesh_file
    except Exception as e:
        logger.error(f"网格生成失败: {e}")
        raise
```

## 6. 最佳实践

### 6.1 几何修复

处理实际工程中的DXF文件时，常常需要进行几何修复：

```python
# 设置几何修复选项
gmsh.option.setNumber("Geometry.Tolerance", 1e-8)
gmsh.option.setNumber("Geometry.OCCFixDegenerated", 1)
gmsh.option.setNumber("Geometry.OCCFixSmallEdges", 1)
gmsh.option.setNumber("Geometry.OCCFixSmallFaces", 1)
gmsh.option.setNumber("Geometry.OCCSewFaces", 1)
```

### 6.2 性能优化

对于大型几何模型，可以采用以下优化措施：

1. **并行计算**：启用Gmsh的并行计算功能
   ```python
   gmsh.option.setNumber("Mesh.MaxNumThreads", os.cpu_count())
   ```

2. **分层网格生成**：先生成表面网格，再生成体网格
   ```python
   gmsh.model.mesh.generate(2)  # 先生成表面网格
   gmsh.model.mesh.generate(3)  # 再生成体网格
   ```

3. **网格尺寸场**：使用背景网格控制网格尺寸分布
   ```python
   # 在特定区域设置更细的网格
   gmsh.model.mesh.field.add("Box", 1)
   gmsh.model.mesh.field.setNumber(1, "VIn", fine_mesh_size)
   gmsh.model.mesh.field.setNumber(1, "VOut", coarse_mesh_size)
   gmsh.model.mesh.field.setNumber(1, "XMin", x_min)
   # ... 设置其他参数
   gmsh.model.mesh.field.setAsBackgroundMesh(1)
   ```

### 6.3 错误处理

在生产环境中，应当实现完善的错误处理机制：

```python
try:
    # 几何操作
    gmsh.model.occ.importShapes(dxf_file)
    gmsh.model.occ.synchronize()
except Exception as e:
    logger.error(f"几何导入失败: {e}")
    # 尝试修复
    try:
        gmsh.option.setNumber("Geometry.OCCFixDegenerated", 1)
        gmsh.model.occ.importShapes(dxf_file)
        gmsh.model.occ.synchronize()
        logger.info("几何修复成功")
    except Exception as repair_error:
        logger.error(f"几何修复失败: {repair_error}")
        raise
```

## 7. 容器化配置

在Docker容器中配置Gmsh和OCC的示例：

```dockerfile
FROM python:3.9-slim

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libglu1-mesa-dev \
    libxcursor-dev \
    libxinerama-dev \
    libxrandr-dev \
    libxi-dev \
    libgl1-mesa-dev \
    && rm -rf /var/lib/apt/lists/*

# 安装Python依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制服务代码
COPY . /app
WORKDIR /app

# 启动服务
CMD ["python", "main.py"]
```

requirements.txt中包含：

```
gmsh==4.11.1
meshio==5.3.4
numpy==1.24.3
```

## 8. 总结

本文档详细说明了DeepCAD项目中OpenCASCADE与Gmsh的集成方案，以及DXF文件的处理流程。通过使用Gmsh自带的OCC几何内核，我们简化了依赖管理，提高了系统的可移植性和稳定性。前端使用ezdxf解析DXF文件，后端使用OCC进行几何处理，这种前后端协作的方式既减轻了服务器负担，又保持了良好的用户体验。 