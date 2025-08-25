# DeepCAD-SCOUR Example6 技术文档

## 系统概述

DeepCAD-SCOUR Example6 是一个专业的桥墩冲刷分析系统，结合了经验公式计算、3D可视化和流场分析功能。系统采用PyQt6构建现代化界面，集成PyVista实现专业CFD风格的3D流场可视化。

## 系统架构

### 核心组件

```
example6/
├── main.py                     # 主程序入口
├── beautiful_main.py          # 原版美观界面
├── enhanced_beautiful_main.py # 增强版专业界面（最新）
├── core/
│   ├── empirical_solver.py    # 经验公式求解器
│   ├── fenics_solver.py       # FEniCS有限元求解器
│   └── gmsh_meshing.py        # GMSH网格生成
├── gui/
│   └── enhanced_3d_viewport.py # 增强3D视口
└── outputs/                   # 输出结果目录
```

### 软件架构设计

```
┌─────────────────────────────────────┐
│           用户界面层 (UI Layer)        │
├─────────────────────────────────────┤
│  EnhancedBeautifulMainWindow       │
│  ├─ 参数输入面板                     │
│  ├─ 3D主视图                        │
│  ├─ 剖面分析                        │
│  └─ 流场详析 (PyVista 3D)           │
├─────────────────────────────────────┤
│        可视化层 (Visualization)      │
├─────────────────────────────────────┤
│  ProfessionalVisualizationPanel   │
│  ├─ Matplotlib 2D/3D 绘图          │
│  ├─ PyVista 3D 流场可视化           │
│  └─ 专业CFD配色方案                  │
├─────────────────────────────────────┤
│         计算层 (Computation)        │
├─────────────────────────────────────┤
│  EmpiricalScourSolver              │
│  ├─ HEC-18 冲刷深度计算             │
│  ├─ Richardson-Davis 公式           │
│  ├─ Melville-Coleman 方法          │
│  └─ 多方法对比验证                   │
├─────────────────────────────────────┤
│          数据层 (Data Layer)        │
├─────────────────────────────────────┤
│  ScourParameters / ScourResult     │
│  ├─ 输入参数验证                     │
│  ├─ 结果数据结构                     │
│  └─ 数据序列化                       │
└─────────────────────────────────────┘
```

## 技术实现细节

### 1. 界面框架

#### 主窗口类层次
```python
EnhancedBeautifulMainWindow(QMainWindow)
├─ setup_ui()                    # 界面初始化
├─ create_parameter_panel()      # 参数输入面板
├─ create_control_panel()        # 控制面板  
├─ create_results_panel()        # 结果显示面板
└─ setup_status_bar()           # 状态栏

ProfessionalVisualizationPanel(QWidget)
├─ create_main_3d_view()        # 主3D视图
├─ create_section_analysis()    # 剖面分析
└─ create_flow_analysis()       # 流场详析 (PyVista)
```

#### 专业UI设计特性
- **Figma风格现代设计**: 渐变背景、圆角按钮、阴影效果
- **响应式布局**: 自适应窗口大小调整
- **专业配色方案**: CFD软件风格的颜色映射
- **实时参数验证**: 输入时即时反馈

### 2. 桥墩冲刷计算算法

#### 2.1 HEC-18 方法
```python
def calculate_hec18_scour(self, params: ScourParameters) -> float:
    """HEC-18 冲刷深度计算"""
    # Froude数计算
    Fr = params.flow_velocity / math.sqrt(9.81 * params.water_depth)
    
    # K1: 桩形系数
    K1 = self.get_pier_shape_factor(params.pier_shape)
    
    # K2: 攻击角系数  
    K2 = self.get_attack_angle_factor(params.flow_angle)
    
    # K3: 河床条件系数
    K3 = self.get_bed_condition_factor(params.bed_material)
    
    # K4: 装甲层系数
    K4 = self.get_armor_factor(params.bed_material)
    
    # 基本冲刷深度公式
    scour_depth = 2.0 * K1 * K2 * K3 * K4 * (params.pier_width ** 0.65) * \
                  (params.water_depth ** 0.35) * (Fr ** 0.43)
    
    return scour_depth
```

#### 2.2 Richardson-Davis 方法  
```python
def calculate_richardson_davis_scour(self, params: ScourParameters) -> float:
    """Richardson-Davis 改进方法"""
    # 粒径参数
    d50 = params.d50_sediment
    
    # 密度比
    s = params.sediment_density / 1000.0  # 相对水的密度
    
    # 临界Shields参数
    theta_c = 0.047
    
    # Shields参数
    theta = (params.flow_velocity ** 2) / ((s - 1) * 9.81 * d50)
    
    # 相对冲刷深度
    if theta > theta_c:
        relative_scour = 1.5 * (theta / theta_c - 1) ** 0.5
    else:
        relative_scour = 0
        
    scour_depth = relative_scour * params.pier_width
    return max(0, scour_depth)
```

### 3. PyVista 3D流场可视化

#### 3.1 流场网格生成
```python
def create_flow_mesh(self):
    """创建3D流场网格"""
    # 创建结构化网格
    x = np.linspace(-8, 8, 40)    # 40个X方向节点
    y = np.linspace(-4, 12, 32)   # 32个Y方向节点  
    z = np.linspace(-2, 4, 24)    # 24个Z方向节点
    
    self.flow_mesh = pv.StructuredGrid()
    X, Y, Z = np.meshgrid(x, y, z, indexing='ij')
    self.flow_mesh.points = np.c_[X.ravel(), Y.ravel(), Z.ravel()]
    self.flow_mesh.dimensions = X.shape
    
    # 计算流场数据
    self.calculate_flow_field(X, Y, Z)
```

#### 3.2 圆柱绕流计算
```python
def calculate_flow_field(self, X, Y, Z):
    """基于势流理论的圆柱绕流计算"""
    # 桥墩几何参数
    pier_radius = 0.8
    U_inf = 1.5  # 来流速度
    
    # 计算极坐标
    R = np.sqrt(dx**2 + dy**2)  
    theta = np.arctan2(dy, dx)
    
    # 势流解析解
    u[mask] = U_inf * (1 - pier_radius**2 / R[mask]**2 * np.cos(2*theta[mask]))
    v[mask] = -U_inf * pier_radius**2 / R[mask]**2 * np.sin(2*theta[mask])
    
    # 添加湍流扰动
    turbulence_intensity = 0.15
    u += turbulence_intensity * U_inf * np.sin(3*theta) * np.exp(-0.5*(R-pier_radius))
    
    # 三维深度效应
    depth_factor = np.tanh((Z + 2) / 2)
    u *= depth_factor
    v *= depth_factor
```

#### 3.3 可视化组件
```python
# 速度矢量场
arrows = sparse_mesh.glyph(orient='velocity', scale='velocity_magnitude', 
                          factor=0.3, geom=pv.Arrow())

# 压力等值面
iso_surface = self.flow_mesh.contour(scalars='pressure', isosurfaces=8)

# 流线追踪
seed_points = pv.Sphere(radius=1, center=(-4, 0, 0))
streamlines = self.flow_mesh.streamlines_from_source(
    source=seed_points, vectors='velocity', max_steps=500
)
```

### 4. 专业CFD配色方案

#### 4.1 颜色映射定义
```python
class ProfessionalColorMaps:
    @staticmethod
    def get_velocity_colormap():
        """专业速度场配色 (蓝->青->绿->黄->红)"""
        colors = ['#000080', '#0040FF', '#00FFFF', '#40FF40', 
                 '#FFFF00', '#FF8000', '#FF0000']
        return mcolors.LinearSegmentedColormap.from_list(
            'prof_velocity', colors, N=256
        )
    
    @staticmethod  
    def get_pressure_colormap():
        """专业压力场配色 (深蓝->白->深红)"""
        colors = ['#000080', '#4080FF', '#80C0FF', '#FFFFFF',
                 '#FF8080', '#FF4040', '#800000']
        return mcolors.LinearSegmentedColormap.from_list(
            'prof_pressure', colors, N=256
        )
```

## 数据结构定义

### 输入参数结构
```python
@dataclass
class ScourParameters:
    # 桥墩几何参数
    pier_width: float          # 桥墩宽度 (m)
    pier_length: float         # 桥墩长度 (m)  
    pier_diameter: float       # 等效直径 (m)
    pier_shape: PierShape      # 桥墩形状枚举
    
    # 水力参数
    flow_velocity: float       # 流速 (m/s)
    water_depth: float         # 水深 (m)
    flow_angle: float          # 来流角度 (度)
    
    # 河床参数  
    bed_material: str          # 河床材料类型
    d50_sediment: float        # 中值粒径 (mm)
    sediment_density: float    # 泥沙密度 (kg/m³)
    cohesion: float           # 粘聚力 (Pa)
    
    # 结构参数
    foundation_depth: float    # 基础埋深 (m)
    protection_type: str       # 防护类型
```

### 计算结果结构
```python
@dataclass  
class ScourResult:
    scour_depth: float         # 冲刷深度 (m)
    scour_width: float         # 冲刷宽度 (m)
    equilibrium_time: float    # 平衡时间 (hours)
    method: str               # 计算方法
    confidence: float         # 可信度 (0-1)
    froude_number: float      # 弗劳德数
    reynolds_number: float    # 雷诺数
    success: bool            # 计算成功标志
    warnings: list           # 警告信息列表
```

## 性能优化

### 1. 3D渲染优化
- **网格简化**: 根据视图距离动态调整网格密度
- **LOD技术**: 多层次细节显示
- **异步计算**: 大计算量任务放入后台线程

### 2. 内存管理
- **数据缓存**: 计算结果智能缓存
- **延迟加载**: PyVista组件按需初始化
- **内存回收**: 及时释放大型数组

### 3. 计算效率
```python
# 向量化计算替代循环
mask = R > pier_radius  # 布尔索引
u[mask] = vectorized_calculation(...)  # NumPy向量化

# 多线程计算支持
class ScourCalculationThread(QThread):
    def run(self):
        # 后台计算，不阻塞UI
        result = self.solver.calculate_scour(self.parameters)
        self.calculation_finished.emit(result)
```

## 错误处理和验证

### 1. 参数验证
```python
def validate_parameters(self, params: ScourParameters) -> List[str]:
    """参数合理性检查"""
    warnings = []
    
    # 物理约束检查
    if params.flow_velocity <= 0:
        warnings.append("流速必须大于0")
        
    if params.water_depth <= params.pier_width:
        warnings.append("水深应大于桥墩宽度")
        
    # 工程实践范围检查
    froude_number = params.flow_velocity / math.sqrt(9.81 * params.water_depth)
    if froude_number > 1.0:
        warnings.append(f"弗劳德数过高 ({froude_number:.2f}>1.0)，结果可信度降低")
        
    return warnings
```

### 2. 异常处理策略
```python
# 分级错误处理
try:
    # 主计算逻辑
    result = self.calculate_primary_method(params)
except CriticalCalculationError as e:
    # 严重错误：停止计算
    return ScourResult(success=False, warnings=[str(e)])
    
except MinorCalculationWarning as e:
    # 轻微警告：继续计算但记录警告
    result.warnings.append(str(e))
    
except Exception as e:
    # 未预期错误：降级处理
    result = self.calculate_fallback_method(params)
    result.warnings.append(f"主算法失败，使用备选方法: {str(e)}")
```

## 扩展性设计

### 1. 插件架构
```python
class ScourMethodPlugin:
    """冲刷计算方法插件基类"""
    
    @abstractmethod
    def calculate(self, params: ScourParameters) -> ScourResult:
        pass
        
    @abstractmethod  
    def get_method_name(self) -> str:
        pass
        
    @abstractmethod
    def get_applicable_conditions(self) -> Dict[str, Any]:
        pass

# 新方法注册
solver.register_method("custom_method", CustomScourPlugin())
```

### 2. 数据导入导出接口
```python
# 支持多种格式
def export_results(self, results: ScourResult, format: str):
    exporters = {
        'json': JSONExporter(),
        'csv': CSVExporter(), 
        'xlsx': ExcelExporter(),
        'pdf': PDFReportExporter()
    }
    return exporters[format].export(results)
```

## 测试和质量保证

### 1. 单元测试覆盖
```python
class TestScourCalculation(unittest.TestCase):
    def test_hec18_basic_case(self):
        """测试HEC-18基础算例"""
        params = ScourParameters(
            pier_width=2.0, water_depth=4.0,
            flow_velocity=1.5, pier_shape=PierShape.CIRCULAR
        )
        
        result = self.solver.calculate_hec18_scour(params)
        self.assertAlmostEqual(result, 2.85, places=2)  # 预期值
        
    def test_parameter_validation(self):
        """测试参数验证功能"""
        invalid_params = ScourParameters(flow_velocity=-1.0)  # 无效参数
        warnings = self.solver.validate_parameters(invalid_params)
        self.assertTrue(len(warnings) > 0)
```

### 2. 集成测试
- **界面响应测试**: 确保所有按钮和控件正常工作
- **计算精度验证**: 与已知算例对比结果
- **性能基准测试**: 大规模数据处理能力

## 部署和维护

### 1. 依赖管理
```
# requirements.txt
PyQt6>=6.5.0
numpy>=1.24.0
matplotlib>=3.7.0
pyvista>=0.45.0
pyvistaqt>=0.11.0
scipy>=1.11.0
```

### 2. 版本控制策略
- **主版本**: 重大架构变更
- **次版本**: 新功能添加  
- **修订版**: Bug修复和小改进

### 3. 文档维护
- **API文档**: Sphinx自动生成
- **用户手册**: 详细操作指南
- **开发者文档**: 代码结构说明

---

*此文档版本: v3.1*  
*最后更新: 2024年*  
*维护者: DeepCAD开发团队*