# PyVista 3D流场可视化技术指南

## 概述

本文档详细介绍example6中PyVista 3D流场可视化系统的实现原理、技术细节和使用方法。

## PyVista集成架构

### 1. 核心组件结构

```
流场可视化系统
├── 控制面板 (左侧)
│   ├── 流场参数显示
│   ├── 3D可视化选项
│   ├── 矢量密度控制  
│   └── 视图控制
└── PyVista 3D视图 (右侧)
    ├── 交互式3D场景
    ├── 专业CFD渲染
    └── 实时参数更新
```

### 2. 类层次结构

```python
ProfessionalVisualizationPanel
├── create_flow_analysis()           # 创建流场分析界面
├── setup_flow_scene()              # 初始化3D场景
├── create_flow_mesh()               # 生成结构化网格
├── calculate_flow_field()           # 计算流场数据
├── update_flow_visualization()      # 更新3D可视化
└── 辅助方法
    ├── reset_flow_view()           # 重置视图
    ├── save_flow_visualization()   # 保存图像
    └── update_flow_with_parameters() # 参数更新
```

## 3D网格生成技术

### 网格结构定义

```python
def create_flow_mesh(self):
    """创建3D结构化网格"""
    # 定义计算域
    x_range = (-8, 8)    # X方向: -8m 到 +8m
    y_range = (-4, 12)   # Y方向: -4m 到 +12m  
    z_range = (-2, 4)    # Z方向: -2m 到 +4m
    
    # 网格分辨率
    nx, ny, nz = 40, 32, 24  # 总计30,720个节点
    
    # 生成网格坐标
    x = np.linspace(*x_range, nx)
    y = np.linspace(*y_range, ny)
    z = np.linspace(*z_range, nz)
    
    # 创建结构化网格
    self.flow_mesh = pv.StructuredGrid()
    X, Y, Z = np.meshgrid(x, y, z, indexing='ij')
    self.flow_mesh.points = np.c_[X.ravel(), Y.ravel(), Z.ravel()]
    self.flow_mesh.dimensions = X.shape
```

### 网格优化策略

- **自适应网格**: 在桥墩附近区域加密
- **边界层处理**: Z方向采用非等间距分布
- **内存优化**: 大型网格使用分块处理

## 流场计算理论

### 基于势流理论的圆柱绕流

#### 数学模型

对于不可压缩无粘流体绕圆柱流动，使用复势理论：

```
Φ = U∞(z + a²/z)  # 复势函数
```

其中：
- `U∞`: 来流速度
- `a`: 圆柱半径
- `z = x + iy`: 复坐标

#### 速度场计算

```python
def calculate_cylinder_flow(self, X, Y, Z, U_inf, pier_radius):
    """圆柱绕流速度场计算"""
    
    # 极坐标变换
    dx = X - pier_x
    dy = Y - pier_y
    R = np.sqrt(dx**2 + dy**2)
    theta = np.arctan2(dy, dx)
    
    # 创建掩码（圆柱外部区域）
    mask = R > pier_radius
    
    # 势流解析解
    u = np.full_like(X, U_inf)  # 初始化为来流速度
    v = np.zeros_like(Y)
    
    # 在圆柱外部应用势流修正
    u[mask] = U_inf * (1 - pier_radius**2 / R[mask]**2 * np.cos(2*theta[mask]))
    v[mask] = -U_inf * pier_radius**2 / R[mask]**2 * np.sin(2*theta[mask])
    
    # 圆柱内部速度为0
    u[~mask] = 0
    v[~mask] = 0
    
    return u, v
```

### 三维效应修正

#### 深度影响因子

```python
def apply_depth_effects(self, u, v, w, Z):
    """应用深度对流场的影响"""
    # 使用双曲正切函数模拟边界层效应
    depth_factor = np.tanh((Z + 2) / 2)
    
    # 修正水平速度分量
    u *= depth_factor
    v *= depth_factor
    
    # 垂向速度受挤压效应影响较小
    return u, v, w
```

#### 湍流扰动模型

```python
def add_turbulence_effects(self, u, v, w, X, Y, Z, turbulence_intensity):
    """添加湍流扰动效应"""
    
    # 计算湍流特征尺度
    R = np.sqrt((X - pier_x)**2 + (Y - pier_y)**2)
    theta = np.arctan2(Y - pier_y, X - pier_x)
    
    # 湍流强度随距离衰减
    decay_factor = np.exp(-0.5*(R - pier_radius))
    
    # 三维湍流脉动
    u_turb = turbulence_intensity * U_inf * np.sin(3*theta) * decay_factor
    v_turb = turbulence_intensity * U_inf * np.cos(3*theta) * decay_factor  
    w_turb = turbulence_intensity * U_inf * np.sin(2*np.pi*Z) * np.exp(-0.3*R)
    
    return u + u_turb, v + v_turb, w + w_turb
```

## 可视化组件详解

### 1. 速度矢量场显示

```python
def render_velocity_vectors(self):
    """渲染速度矢量场"""
    
    # 控制矢量密度
    step = max(1, 100 - self.vector_density_slider.value())
    sparse_mesh = self.flow_mesh.extract_points(
        np.arange(0, self.flow_mesh.n_points, step)
    )
    
    # 生成箭头glyphs
    arrows = sparse_mesh.glyph(
        orient='velocity',           # 矢量方向
        scale='velocity_magnitude',  # 矢量长度
        factor=0.3,                 # 缩放因子
        geom=pv.Arrow()             # 箭头几何体
    )
    
    # 添加到场景
    self.flow_plotter.add_mesh(
        arrows, 
        cmap='turbo',              # 彩色映射
        opacity=0.8,               # 透明度
        scalar_bar_args={          # 色彩条配置
            'title': '速度 (m/s)', 
            'color': 'white'
        }
    )
```

### 2. 压力等值面渲染

```python
def render_pressure_isosurfaces(self):
    """渲染压力等值面"""
    
    # 生成等值面
    iso_surface = self.flow_mesh.contour(
        scalars='pressure',         # 标量场
        isosurfaces=8              # 等值面数量
    )
    
    # 专业CFD配色
    self.flow_plotter.add_mesh(
        iso_surface,
        cmap='RdBu_r',             # 红蓝反向配色
        opacity=0.6,               # 半透明显示
        scalar_bar_args={
            'title': '压力 (Pa)',
            'color': 'white',
            'n_labels': 5
        }
    )
```

### 3. 流线追踪算法

```python
def render_streamlines(self):
    """渲染流线"""
    try:
        # 定义种子点
        seed_points = pv.Sphere(
            radius=1.0,               # 种子区域半径
            center=(-4, 0, 0)         # 上游种子位置
        )
        
        # 流线积分
        streamlines = self.flow_mesh.streamlines_from_source(
            source=seed_points,        # 种子点源
            vectors='velocity',        # 速度矢量场
            max_steps=500,            # 最大积分步数
            initial_step_length=0.1   # 初始步长
        )
        
        # 渲染流线
        self.flow_plotter.add_mesh(
            streamlines,
            color='yellow',           # 流线颜色
            opacity=0.9,              # 不透明度
            line_width=2              # 线宽
        )
        
    except Exception as e:
        print(f"流线生成失败: {e}")
        # 降级到简化显示
        self.render_simplified_flow_lines()
```

### 4. 涡量场可视化

```python
def render_vorticity_field(self):
    """渲染涡量场"""
    
    # 计算涡量等值面
    vorticity_surface = self.flow_mesh.contour(
        scalars='vorticity',
        isosurfaces=6
    )
    
    # 使用专业涡量配色
    self.flow_plotter.add_mesh(
        vorticity_surface,
        cmap='PRGn',               # 紫绿配色方案
        opacity=0.5,
        scalar_bar_args={
            'title': '涡量 (1/s)',
            'color': 'white'
        }
    )
```

## 交互控制系统

### 参数实时更新机制

```python
def update_flow_with_parameters(self, result: ScourResult):
    """基于计算结果实时更新流场"""
    
    # 提取实际物理参数
    actual_velocity = result.froude_number * (9.81 * 4.0)**0.5
    actual_reynolds = result.reynolds_number
    
    # 重新计算流场
    self.calculate_flow_field_with_params(
        X, Y, Z, actual_velocity, result
    )
    
    # 更新湍流参数
    turbulence_intensity = self.calculate_turbulence_intensity(actual_reynolds)
    
    # 刷新可视化
    self.update_flow_visualization()
```

### 视图控制接口

```python
class FlowViewControls:
    def reset_view(self):
        """重置为等轴测视图"""
        self.flow_plotter.view_isometric()
        self.flow_plotter.reset_camera()
    
    def set_top_view(self):
        """设置俯视图"""
        self.flow_plotter.view_xy()
        
    def set_side_view(self):
        """设置侧视图"""
        self.flow_plotter.view_xz()
        
    def enable_fly_mode(self):
        """启用飞行模式"""
        self.flow_plotter.enable_fly_to_mode()
```

## 性能优化技术

### 1. 网格层次管理

```python
class AdaptiveMeshManager:
    def __init__(self):
        self.mesh_levels = {
            'coarse': (20, 16, 12),    # 粗网格：3,840节点
            'medium': (40, 32, 24),    # 中等网格：30,720节点  
            'fine': (80, 64, 48)       # 精细网格：245,760节点
        }
    
    def select_mesh_level(self, view_distance, performance_mode):
        """根据视图距离和性能模式选择网格精度"""
        if performance_mode == 'high_performance':
            return 'coarse'
        elif view_distance > 50:
            return 'medium'  
        else:
            return 'fine'
```

### 2. 异步计算策略

```python
class AsyncFlowCalculation(QThread):
    calculation_finished = pyqtSignal(object)
    
    def __init__(self, mesh_params, flow_params):
        super().__init__()
        self.mesh_params = mesh_params
        self.flow_params = flow_params
    
    def run(self):
        """后台计算流场"""
        try:
            # 大计算量任务
            flow_data = self.calculate_complex_flow_field(
                self.mesh_params, self.flow_params
            )
            self.calculation_finished.emit(flow_data)
            
        except Exception as e:
            self.calculation_finished.emit(None)
```

### 3. 内存管理

```python
def optimize_memory_usage(self):
    """优化内存使用"""
    
    # 清理旧数据
    if hasattr(self, 'old_flow_mesh'):
        del self.old_flow_mesh
        
    # 压缩数组数据类型
    if self.flow_mesh.n_points < 65536:
        # 小网格使用16位索引
        self.flow_mesh.point_data['indices'] = \
            self.flow_mesh.point_data['indices'].astype(np.uint16)
    
    # 定期垃圾回收
    import gc
    gc.collect()
```

## 专业CFD配色系统

### 颜色映射定义

```python
class CFDColorMaps:
    """专业CFD配色方案"""
    
    @staticmethod
    def velocity_colormap():
        """速度场标准配色：蓝->青->绿->黄->橙->红"""
        return mcolors.LinearSegmentedColormap.from_list(
            'cfd_velocity',
            ['#000080', '#0040FF', '#00FFFF', '#40FF40', 
             '#FFFF00', '#FF8000', '#FF0000'],
            N=256
        )
    
    @staticmethod  
    def pressure_colormap():
        """压力场标准配色：深蓝->白->深红"""
        return mcolors.LinearSegmentedColormap.from_list(
            'cfd_pressure',
            ['#000080', '#4080FF', '#80C0FF', '#FFFFFF',
             '#FF8080', '#FF4040', '#800000'],
            N=256
        )
        
    @staticmethod
    def vorticity_colormap():  
        """涡量场配色：紫->绿渐变"""
        return plt.cm.PRGn  # 专业涡量显示配色
```

### 动态色彩范围调整

```python
def auto_adjust_color_range(self, scalar_data, field_type):
    """自动调整颜色映射范围"""
    
    if field_type == 'velocity':
        # 速度场：0到最大值
        vmin, vmax = 0, np.max(scalar_data)
    elif field_type == 'pressure':
        # 压力场：对称范围
        abs_max = np.max(np.abs(scalar_data))
        vmin, vmax = -abs_max, abs_max
    elif field_type == 'vorticity':
        # 涡量场：对称范围，去除极值
        percentile_95 = np.percentile(np.abs(scalar_data), 95)
        vmin, vmax = -percentile_95, percentile_95
    
    return vmin, vmax
```

## 导出和保存功能

### 高质量图像导出

```python
def export_high_quality_image(self, filename, dpi=300):
    """导出高分辨率图像"""
    
    # 临时提高渲染质量
    original_window_size = self.flow_plotter.window_size
    
    # 设置高分辨率
    high_res_size = [1920, 1080]
    self.flow_plotter.window_size = high_res_size
    
    # 启用抗锯齿
    self.flow_plotter.enable_anti_aliasing()
    
    try:
        # 截图保存
        self.flow_plotter.screenshot(
            filename, 
            window_size=high_res_size,
            return_img=False
        )
        
    finally:
        # 恢复原设置
        self.flow_plotter.window_size = original_window_size
```

### 3D场景数据导出

```python
def export_3d_scene_data(self, output_format='vtk'):
    """导出3D场景数据"""
    
    if output_format == 'vtk':
        # VTK格式：保留所有场数据
        self.flow_mesh.save('flow_field.vtk')
        
    elif output_format == 'obj':
        # OBJ格式：仅几何数据
        surface_mesh = self.flow_mesh.extract_surface()
        surface_mesh.save('flow_surface.obj')
        
    elif output_format == 'ply':
        # PLY格式：点云数据
        self.flow_mesh.save('flow_points.ply')
```

## 故障排除和调试

### 常见问题解决

1. **PyVista初始化失败**
   ```python
   # 检查OpenGL支持
   if not pv.system_supports_plotting():
       print("系统不支持PyVista 3D渲染")
       return False
   ```

2. **流线生成失败**
   ```python
   # 检查速度场数据完整性
   velocity_magnitude = np.linalg.norm(
       self.flow_mesh.point_data['velocity'], axis=1
   )
   if np.any(np.isnan(velocity_magnitude)):
       print("速度场包含无效数据")
   ```

3. **内存不足**
   ```python
   # 自动降级到低分辨率网格
   if psutil.virtual_memory().percent > 85:
       self.switch_to_low_resolution_mesh()
   ```

### 调试工具

```python
class FlowVisualizationDebugger:
    def check_mesh_quality(self, mesh):
        """检查网格质量"""
        return {
            'n_points': mesh.n_points,
            'n_cells': mesh.n_cells,
            'bounds': mesh.bounds,
            'data_arrays': list(mesh.point_data.keys())
        }
        
    def validate_flow_field(self, u, v, w):
        """验证流场数据"""
        return {
            'has_nan': np.any(np.isnan([u, v, w])),
            'velocity_range': [np.min(u), np.max(u)],
            'divergence_free': self.check_divergence(u, v, w)
        }
```

## 最佳实践建议

1. **网格设计**: 在感兴趣区域使用更高分辨率
2. **颜色映射**: 使用物理上有意义的色彩范围
3. **交互性**: 提供多种视图角度和缩放选项
4. **性能**: 根据硬件能力调整渲染质量
5. **用户体验**: 提供清晰的控制界面和状态反馈

---

*PyVista 3D可视化指南 v1.0*  
*Example6桥墩冲刷分析系统*