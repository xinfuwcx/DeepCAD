# PyVista数据集成完整流程解析

## 概述

PyVista在我们的CAE系统中扮演**数据桥梁**的关键角色，它将Kratos求解器的计算结果转换为Web前端可以直接使用的可视化数据。

## 完整数据流程

### 第一步：Kratos计算输出
```python
# Kratos求解器输出VTK格式文件
def run_seepage_analysis(mesh_file, materials, boundary_conditions):
    # Kratos计算过程...
    
    # 输出VTK格式结果文件
    vtk_output = KratosMultiphysics.VtkOutput(model_part)
    vtk_output.PrintOutput("results.vtk")
    
    return "results.vtk"  # 返回VTK文件路径
```

**Kratos输出的VTK文件包含**：
- 网格几何信息（节点坐标、单元连接）
- 物理场数据（压力、位移、应力等）
- 材料属性信息
- 时间步信息

### 第二步：PyVista数据处理
```python
import pyvista as pv

def process_kratos_results_with_pyvista(vtk_file_path):
    """使用PyVista处理Kratos结果"""
    
    # 1. 读取Kratos输出的VTK文件
    mesh = pv.read(vtk_file_path)
    
    # 2. 数据信息提取
    print(f"节点数量: {mesh.n_points}")
    print(f"单元数量: {mesh.n_cells}")
    print(f"可用字段: {mesh.array_names}")
    
    # 3. 数据处理和计算
    # 计算梯度
    if 'PRESSURE' in mesh.array_names:
        mesh = mesh.compute_derivative('PRESSURE', gradient=True)
    
    # 计算等值面
    if 'PRESSURE' in mesh.array_names:
        contours = mesh.contour(scalars='PRESSURE', isosurfaces=10)
    
    # 计算切片
    slices = mesh.slice_orthogonal()
    
    # 4. 质量控制和验证
    quality_metrics = {
        'volume': mesh.volume,
        'bounds': mesh.bounds,
        'center': mesh.center,
        'field_ranges': {
            field: [mesh[field].min(), mesh[field].max()] 
            for field in mesh.array_names
        }
    }
    
    return {
        'original_mesh': mesh,
        'contours': contours,
        'slices': slices,
        'quality_metrics': quality_metrics
    }
```

### 第三步：Web格式数据转换
```python
def convert_pyvista_to_web_format(pyvista_data):
    """将PyVista数据转换为Web前端格式"""
    
    mesh = pyvista_data['original_mesh']
    web_data = {}
    
    for field_name in mesh.array_names:
        # 提取几何数据
        vertices = mesh.points.flatten().tolist()
        
        # 提取拓扑数据（面片索引）
        faces = []
        for cell in mesh.cells:
            if len(cell) == 4:  # 三角形面片
                faces.extend(cell[1:])  # 跳过第一个元素（面片类型）
        
        # 提取标量场数据
        scalars = mesh[field_name].tolist()
        
        # 计算数据范围
        field_range = [mesh[field_name].min(), mesh[field_name].max()]
        
        web_data[field_name] = {
            'vertices': vertices,      # Three.js需要的顶点数据
            'faces': faces,           # Three.js需要的面片索引
            'scalars': scalars,       # 用于颜色映射的标量数据
            'field_name': field_name,
            'range': field_range
        }
    
    return web_data
```

### 第四步：Three.js可视化渲染
```typescript
// 前端接收PyVista处理后的数据
interface VisualizationData {
    vertices: number[];    // PyVista提取的顶点坐标
    faces: number[];      // PyVista提取的面片索引
    scalars: number[];    // PyVista提取的物理场数据
    field_name: string;   // 物理场名称（如PRESSURE）
    range: [number, number]; // 数据范围
}

// 在Three.js中创建网格
function createMeshFromPyVistaData(data: VisualizationData): THREE.Mesh {
    // 1. 创建几何体
    const geometry = new THREE.BufferGeometry();
    
    // 2. 设置PyVista提供的顶点数据
    const vertices = new Float32Array(data.vertices);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    
    // 3. 设置PyVista提供的面片索引
    const indices = new Uint32Array(data.faces);
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    
    // 4. 设置PyVista提供的标量数据
    const scalars = new Float32Array(data.scalars);
    geometry.setAttribute('scalar', new THREE.BufferAttribute(scalars, 1));
    
    // 5. 创建基于标量场的着色器材质
    const material = new THREE.ShaderMaterial({
        uniforms: {
            scalarMin: { value: data.range[0] },
            scalarMax: { value: data.range[1] },
            colorMap: { value: createRainbowTexture() }
        },
        vertexShader: `
            attribute float scalar;
            varying float vScalar;
            void main() {
                vScalar = scalar;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float scalarMin;
            uniform float scalarMax;
            uniform sampler2D colorMap;
            varying float vScalar;
            void main() {
                float normalizedScalar = (vScalar - scalarMin) / (scalarMax - scalarMin);
                vec3 color = texture2D(colorMap, vec2(normalizedScalar, 0.5)).rgb;
                gl_FragColor = vec4(color, 1.0);
            }
        `
    });
    
    return new THREE.Mesh(geometry, material);
}
```

## 关键技术点解析

### 1. **为什么使用PyVista？**

**PyVista的核心优势**：
- **VTK生态兼容**：Kratos原生输出VTK格式，PyVista是VTK的Python封装
- **强大的数据处理**：等值面、切片、梯度计算等后处理功能
- **Web友好**：可以轻松提取Three.js需要的几何和标量数据
- **Python生态**：与NumPy、SciPy无缝集成

### 2. **数据转换的必要性**

```python
# Kratos VTK输出 → PyVista对象 → Web JSON数据

# VTK原始数据（二进制，复杂结构）
vtk_data = {
    'points': numpy_array_3d,
    'cells': vtk_cell_array,
    'scalars': vtk_data_array
}

# PyVista处理后（Python友好）
pyvista_mesh = pv.UnstructuredGrid(points, cells)
pyvista_mesh['PRESSURE'] = pressure_data

# Web格式（JavaScript友好）
web_data = {
    'vertices': [x1,y1,z1, x2,y2,z2, ...],  # 扁平化数组
    'faces': [0,1,2, 1,2,3, ...],           # 三角形索引
    'scalars': [p1, p2, p3, ...],           # 压力值
    'range': [min_pressure, max_pressure]
}
```

### 3. **实时数据处理流程**

```python
class PyVistaWebBridge:
    """PyVista到Web的数据桥梁"""
    
    def __init__(self):
        self.cache = {}  # 缓存处理结果
        
    async def process_kratos_result(self, vtk_file: str) -> Dict[str, Any]:
        """处理Kratos结果为Web格式"""
        
        # 1. 检查缓存
        file_hash = self.calculate_file_hash(vtk_file)
        if file_hash in self.cache:
            return self.cache[file_hash]
        
        # 2. PyVista读取和处理
        mesh = pv.read(vtk_file)
        
        # 3. 后处理计算
        processed_data = {}
        
        for field in mesh.array_names:
            # 计算等值面
            contours = mesh.contour(scalars=field, isosurfaces=8)
            
            # 转换为Web格式
            web_format = self.convert_to_web_format(contours, field)
            processed_data[field] = web_format
        
        # 4. 缓存结果
        self.cache[file_hash] = processed_data
        
        return processed_data
    
    def convert_to_web_format(self, mesh: pv.PolyData, field: str) -> Dict:
        """转换为Three.js可直接使用的格式"""
        return {
            'vertices': mesh.points.flatten().tolist(),
            'faces': self.extract_triangle_indices(mesh),
            'scalars': mesh[field].tolist(),
            'normals': mesh.point_normals.flatten().tolist(),
            'range': [mesh[field].min(), mesh[field].max()],
            'metadata': {
                'field_name': field,
                'n_points': mesh.n_points,
                'n_cells': mesh.n_cells
            }
        }
```

## 实际应用示例

### 后端API实现
```python
from fastapi import APIRouter
from .unified_cae_engine import UnifiedCAEEngine

router = APIRouter()

@router.post("/run_analysis")
async def run_cae_analysis(parameters: dict):
    """运行CAE分析并返回可视化数据"""
    
    # 1. 初始化CAE引擎
    engine = UnifiedCAEEngine()
    
    # 2. 运行完整分析
    result = await engine.run_complete_analysis(parameters)
    
    if result['status'] == 'success':
        # 3. 使用PyVista处理结果
        bridge = PyVistaWebBridge()
        visualization_data = await bridge.process_kratos_result(
            result['analysis_result'].result_file
        )
        
        # 4. 返回Web友好的数据
        return {
            'status': 'success',
            'visualization_data': visualization_data,
            'analysis_summary': {
                'mesh_nodes': result['mesh_model'].node_count,
                'mesh_elements': result['mesh_model'].element_count,
                'available_fields': list(visualization_data.keys())
            }
        }
    else:
        return result
```

### 前端数据接收
```typescript
// 前端接收并显示PyVista处理的数据
const handleAnalysisComplete = async (analysisData: any) => {
    const { visualization_data } = analysisData;
    
    // 遍历所有物理场
    Object.entries(visualization_data).forEach(([fieldName, fieldData]) => {
        // 创建Three.js网格对象
        const mesh = createMeshFromPyVistaData(fieldData as VisualizationData);
        
        // 添加到场景
        scene.add(mesh);
        
        // 更新UI控制
        setAvailableFields(prev => [...prev, fieldName]);
    });
    
    // 自动显示第一个字段
    const firstField = Object.keys(visualization_data)[0];
    if (firstField) {
        setActiveField(firstField);
    }
};
```

## 总结

**PyVista在系统中的作用**：
1. **数据桥梁**：连接Kratos计算结果与Web可视化
2. **格式转换器**：VTK → Python对象 → Web JSON
3. **后处理引擎**：等值面、切片、梯度计算
4. **质量控制**：数据验证和范围检查

**关键优势**：
- **无损转换**：保持Kratos计算精度
- **高效处理**：利用VTK的优化算法
- **Web友好**：输出Three.js直接可用的数据格式
- **实时性**：支持增量更新和缓存机制

这样，我们实现了从专业CFD/FEM求解器到现代Web可视化的完整数据管道，让用户可以在浏览器中实时查看和交互专业级的工程分析结果。 