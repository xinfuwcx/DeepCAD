# OCC和Trame技术路线整合

本文档总结了深基坑CAE系统中OpenCascade (OCC)几何建模和Trame可视化技术路线的整合工作。

## 1. 技术路线概述

深基坑CAE系统采用了以下技术路线进行几何建模和可视化：

- **几何建模**：使用OpenCascade (OCC)进行高级几何建模
- **网格生成**：Netgen/NGSolve集成，支持多种网格类型
- **分析引擎**：基于Kratos的FEM计算核心
- **结果可视化**：使用Trame+VTK进行高性能科学可视化

这种技术路线的组合充分利用了各个技术栈的优势，实现了高效的工程建模与分析。

## 2. 数据流与转换

系统通过优化的数据转换器实现了不同技术组件之间的数据交换：

```
OCC几何体 → VTK网格 → Kratos计算 → VTK结果 → Trame可视化
```

核心组件：
- `DataConverter`：高效的数据转换与压缩组件
- `TrameFEMVisualizer`：基于Trame的FEM结果可视化器

## 3. 已实现功能

### 3.1 几何建模与转换

- [x] OCC几何体的高效转换为VTK格式
- [x] 多线程并行处理大型几何体
- [x] 网格数据压缩与优化
- [x] 各级几何细节支持(LOD)

### 3.2 FEM结果可视化

- [x] 基于Trame的交互式可视化服务
- [x] 多种结果类型支持(位移、应力、应变等)
- [x] 自定义色标和显示设置
- [x] 切片视图功能
- [x] 截图与视图保存功能
- [x] 主题切换与UI定制

### 3.3 前端集成

- [x] React组件封装Trame可视化器
- [x] 基于iframe的无缝集成
- [x] 文件上传与管理界面
- [x] 结果类型动态切换

## 4. 核心代码组件

### 4.1 后端组件

#### 数据转换器 (DataConverter)

```python
class DataConverter:
    """高效的数据转换器，用于优化CAE数据与前端可视化系统的数据交换"""
    
    def __init__(self, use_compression=True, compression_level=6, use_cache=True):
        # 初始化转换器配置...
    
    def convert_occ_shape(self, shape, shape_id, detail_level="medium"):
        # OCC形状转换为VTK/Three.js兼容格式...
        
    def convert_fem_results(self, results, result_type="displacement"):
        # 转换FEM结果数据为可视化格式...
```

#### Trame可视化器 (TrameFEMVisualizer)

```python
class TrameFEMVisualizer:
    """基于trame的FEM结果可视化器"""
    
    def __init__(self, cache_dir=None, title="FEM分析结果可视化"):
        # 初始化trame服务器和UI组件...
    
    def visualize_fem_results(self, mesh_file, result_data=None, result_file=None):
        # 可视化FEM结果...
        
    def start(self, port=8080, **kwargs):
        # 启动可视化服务器...
```

### 4.2 前端组件

#### Trame FEM查看器 (TrameFEMViewer)

```tsx
const TrameFEMViewer: React.FC<TrameFEMViewerProps> = ({
  meshFile,
  resultFile,
  resultData,
  title = "FEM分析结果可视化",
  showToolbar = true,
  width = '100%',
  height = '100%',
  onError,
  onReady
}) => {
  // React组件实现...
}
```

#### 可视化API路由

```python
@router.post("/launch")
async def launch_visualizer(port: int = 8080):
    """启动可视化服务器"""
    # 实现...

@router.post("/load-results")
async def load_results(mesh_file: str, result_file: Optional[UploadFile] = None):
    """加载FEM结果数据"""
    # 实现...
```

## 5. 性能优化

为确保系统在处理大型模型时的高性能，实现了以下优化：

1. **多线程并行处理**：使用ThreadPoolExecutor进行网格和结果数据的并行处理
2. **数据压缩**：使用zlib库压缩传输数据，减少网络负载
3. **缓存机制**：实现多级缓存(内存和文件)，避免重复处理
4. **渐进式加载**：支持不同级别的细节(LOD)，根据需要加载适当细节

## 6. 下一步计划

- [ ] 实现更多高级网格操作功能
- [ ] 优化大规模模型的内存使用
- [ ] 增强结果数据的时间序列支持
- [ ] 改进切片和剖面功能
- [ ] 开发更多交互式工具，如测量、标注等

## 7. 使用示例

### 7.1 后端使用示例

```python
# 创建可视化器
visualizer = TrameFEMVisualizer(title="深基坑FEM分析结果可视化")

# 加载网格和结果
visualizer.visualize_fem_results(
    mesh_file="path/to/mesh.vtk",
    result_file="path/to/results.vtk"
)

# 启动服务器
visualizer.start(port=8080, open_browser=True)
```

### 7.2 前端使用示例

```tsx
<TrameFEMViewer
  meshFile="/data/uploads/excavation_mesh.vtk"
  resultFile="/data/results/displacement_result.vtk"
  title="支护结构分析结果"
  height="600px"
  onError={(error) => console.error(error)}
/>
```

## 8. 技术依赖

- OpenCascade Core >= 7.6.0
- VTK >= 9.0.0
- Trame >= 2.0.0
- React >= 17.0.0
- FastAPI >= 0.68.0

---

*本文档由开发团队维护，最后更新：2024-07-01* 