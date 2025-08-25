# SimPEG 专业地球物理界面技术规范

## 项目概述

基于 DeepCAD 现有架构，构建一个完整的 SimPEG 地球物理正反演界面，支持重力、磁法、电法、电磁法等多种地球物理方法的建模、正演和反演功能。

## 系统架构

### 1. 整体架构设计

```
SimPEG-GUI (example8)
├── gui/                    # PyQt6 界面层
│   ├── main_window.py     # 主窗口
│   ├── widgets/           # 自定义控件
│   ├── dialogs/           # 对话框
│   └── resources/         # 界面资源
├── modules/               # 核心功能模块
│   ├── mesh_builder.py    # 网格构建器
│   ├── survey_designer.py # 观测系统设计
│   ├── forward_solver.py  # 正演求解器
│   ├── inversion_engine.py# 反演引擎
│   ├── data_manager.py    # 数据管理
│   └── visualization.py   # 可视化模块
├── methods/               # 地球物理方法
│   ├── gravity/           # 重力方法
│   ├── magnetics/         # 磁法
│   ├── electromagnetics/ # 电磁法
│   ├── resistivity/       # 电阻率法
│   └── natural_source/    # 天然源法
├── io/                    # 数据输入输出
├── utils/                 # 工具函数
└── examples/              # 示例项目
```

### 2. 技术栈

- **界面框架**: PyQt6
- **3D 可视化**: PyVista + VTK
- **科学计算**: SimPEG + Discretize
- **网格生成**: Discretize (TensorMesh, TreeMesh, CurvilinearMesh)
- **数据处理**: NumPy, Pandas, SciPy
- **地质建模**: GemPy (可选集成)

## 功能模块详细设计

### 3. 主界面 (main_window.py)

#### 3.1 布局结构
```python
class SimPEGMainWindow(QMainWindow):
    """SimPEG 主界面"""
    
    def __init__(self):
        # 菜单栏: 文件、编辑、视图、工具、帮助
        # 工具栏: 常用操作快捷按钮
        # 中央区域: 标签页式工作区
        # 左侧面板: 项目树、属性面板
        # 右侧面板: 参数设置、结果显示
        # 底部面板: 日志、进度条
```

#### 3.2 核心标签页
1. **项目管理** (Project)
2. **网格设计** (Mesh Design)
3. **观测系统** (Survey Design)
4. **正演建模** (Forward Modeling)
5. **反演计算** (Inversion)
6. **结果分析** (Results & Visualization)

### 4. 网格构建模块 (mesh_builder.py)

#### 4.1 支持的网格类型
```python
class MeshBuilder:
    """网格构建器"""
    
    def create_tensor_mesh(self, cell_sizes, origin):
        """创建张量网格 (TensorMesh)"""
        
    def create_tree_mesh(self, base_mesh, refinement_func):
        """创建树形网格 (TreeMesh) - 自适应加密"""
        
    def create_curvilinear_mesh(self, coordinates):
        """创建曲线网格 (CurvilinearMesh)"""
        
    def from_gempy_model(self, gempy_model):
        """从 GemPy 地质模型创建网格"""
        
    def import_external_mesh(self, file_path, format='vtk'):
        """导入外部网格文件"""
```

#### 4.2 网格优化功能
- 自适应网格加密
- 边界条件设置
- 网格质量检查
- 内存使用优化

### 5. 观测系统设计 (survey_designer.py)

#### 5.1 观测几何
```python
class SurveyDesigner:
    """观测系统设计器"""
    
    def design_gravity_survey(self, stations, components=['gz']):
        """重力观测系统"""
        
    def design_magnetic_survey(self, stations, components=['tmi', 'bx', 'by', 'bz']):
        """磁法观测系统"""
        
    def design_dc_survey(self, electrodes, survey_type='dipole-dipole'):
        """直流电法观测系统"""
        
    def design_em_survey(self, transmitters, receivers, frequencies):
        """电磁法观测系统"""
        
    def design_mt_survey(self, stations, frequencies, components):
        """大地电磁法观测系统"""
```

#### 5.2 观测参数
- 测点/测线布设
- 观测精度设置
- 噪声水平定义
- 观测时间/频率范围

### 6. 正演求解器 (forward_solver.py)

#### 6.1 物理模型
```python
class ForwardSolver:
    """正演求解器"""
    
    def setup_gravity_simulation(self, mesh, density_model):
        """重力正演仿真"""
        
    def setup_magnetic_simulation(self, mesh, susceptibility_model, 
                                background_field):
        """磁法正演仿真"""
        
    def setup_dc_simulation(self, mesh, conductivity_model):
        """直流电法正演仿真"""
        
    def setup_em_simulation(self, mesh, conductivity_model, 
                          frequency_domain=True):
        """电磁法正演仿真"""
```

#### 6.2 求解器配置
- 求解器选择 (直接法/迭代法)
- 精度控制
- 并行计算设置
- 边界条件处理

### 7. 反演引擎 (inversion_engine.py)

#### 7.1 反演策略
```python
class InversionEngine:
    """反演计算引擎"""
    
    def setup_least_squares_inversion(self, data_misfit, regularization):
        """最小二乘反演"""
        
    def setup_robust_inversion(self, data_misfit, regularization, 
                             robust_norm='huber'):
        """稳健反演"""
        
    def setup_joint_inversion(self, multiple_data_misfits, 
                            coupling_regularization):
        """联合反演"""
        
    def setup_cooperative_inversion(self, data_misfits, 
                                  structural_coupling):
        """协作反演"""
```

#### 7.2 正则化方法
- 平滑约束 (Smoothness)
- 小性约束 (Smallness)
- 总变分约束 (Total Variation)
- 交叉梯度约束 (Cross-gradient)
- 先验模型约束

### 8. 地球物理方法实现

#### 8.1 重力方法 (gravity/)
```python
# gravity/gravity_module.py
class GravityModule:
    """重力方法模块"""
    
    def __init__(self):
        self.simulation_type = "integral"  # 或 "differential"
        self.components = ['gz']  # 重力分量
        
    def create_survey(self, receiver_locations):
        """创建重力观测"""
        
    def run_forward(self, density_model):
        """重力正演"""
        
    def run_inversion(self, observed_data, starting_model):
        """重力反演"""
```

#### 8.2 磁法 (magnetics/)
```python
# magnetics/magnetic_module.py
class MagneticModule:
    """磁法模块"""
    
    def __init__(self):
        self.background_field = [50000, 60, 0]  # [强度, 倾角, 偏角]
        self.components = ['tmi']  # 总磁场异常
        
    def set_background_field(self, intensity, inclination, declination):
        """设置背景磁场"""
        
    def run_forward(self, susceptibility_model, remanent_magnetization=None):
        """磁法正演"""
```

#### 8.3 电法 (resistivity/)
```python
# resistivity/dc_module.py
class DCResistivityModule:
    """直流电阻率法模块"""
    
    def __init__(self):
        self.survey_types = ['wenner', 'schlumberger', 'dipole-dipole']
        
    def design_wenner_array(self, a_spacings, center_locations):
        """温纳排列"""
        
    def design_dipole_dipole_array(self, ab_separation, mn_separation, 
                                 n_levels):
        """偶极-偶极排列"""
```

#### 8.4 电磁法 (electromagnetics/)
```python
# electromagnetics/fem_module.py
class FEMModule:
    """频率域电磁法模块"""
    
    def __init__(self):
        self.frequencies = np.logspace(-2, 4, 25)  # 频率范围
        
    def setup_csem_survey(self, tx_locations, rx_locations):
        """可控源电磁法"""
        
    def setup_fem_survey(self, loop_locations, frequencies):
        """频率域电磁法"""

# electromagnetics/tem_module.py  
class TEMModule:
    """时间域电磁法模块"""
    
    def setup_tem_survey(self, loop_locations, time_channels):
        """时间域电磁法"""
```

#### 8.5 天然源法 (natural_source/)
```python
# natural_source/mt_module.py
class MTModule:
    """大地电磁法模块"""
    
    def __init__(self):
        self.frequencies = np.logspace(-3, 3, 25)
        self.components = ['zxx', 'zxy', 'zyx', 'zyy']
        
    def setup_mt1d_survey(self, station_locations):
        """一维大地电磁法"""
        
    def setup_mt2d_survey(self, profile_locations):
        """二维大地电磁法"""
        
    def setup_mt3d_survey(self, station_grid):
        """三维大地电磁法"""
```

### 9. 数据管理 (data_manager.py)

#### 9.1 数据格式支持
```python
class DataManager:
    """数据管理器"""
    
    def import_gravity_data(self, file_path, format='xyz'):
        """导入重力数据"""
        
    def import_magnetic_data(self, file_path, format='xyz'):
        """导入磁法数据"""
        
    def import_resistivity_data(self, file_path, format='ares'):
        """导入电阻率数据"""
        
    def export_results(self, results, file_path, format='vtk'):
        """导出结果"""
```

#### 9.2 数据预处理
- 数据质量检查
- 异常值检测和处理
- 数据插值和网格化
- 噪声水平估计

### 10. 可视化模块 (visualization.py)

#### 10.1 2D 可视化
```python
class Visualization2D:
    """二维可视化"""
    
    def plot_data_map(self, locations, data, colormap='viridis'):
        """数据平面图"""
        
    def plot_cross_section(self, model, line_coordinates):
        """剖面图"""
        
    def plot_pseudosection(self, resistivity_data):
        """视电阻率拟断面图"""
        
    def plot_inversion_convergence(self, misfit_history):
        """反演收敛曲线"""
```

#### 10.2 3D 可视化
```python
class Visualization3D:
    """三维可视化 (基于 PyVista)"""
    
    def plot_3d_model(self, mesh, model, opacity=0.8):
        """三维模型显示"""
        
    def plot_survey_geometry(self, transmitters, receivers):
        """观测系统几何"""
        
    def plot_slice_viewer(self, model, mesh):
        """切片查看器"""
        
    def create_animation(self, model_sequence, output_path):
        """创建动画"""
```

### 11. 界面组件设计

#### 11.1 参数设置面板
```python
class ParameterPanel(QWidget):
    """参数设置面板"""
    
    def __init__(self, method_type):
        # 根据地球物理方法类型动态生成参数界面
        self.setup_parameter_widgets()
        
    def setup_gravity_parameters(self):
        """重力方法参数"""
        
    def setup_magnetic_parameters(self):
        """磁法参数"""
        
    def setup_resistivity_parameters(self):
        """电阻率法参数"""
```

#### 11.2 进度监控组件
```python
class ProgressMonitor(QWidget):
    """进度监控组件"""
    
    def __init__(self):
        self.setup_progress_display()
        
    def update_forward_progress(self, iteration, total):
        """更新正演进度"""
        
    def update_inversion_progress(self, iteration, misfit, target):
        """更新反演进度"""
```

#### 11.3 结果展示组件
```python
class ResultsViewer(QWidget):
    """结果查看器"""
    
    def __init__(self):
        self.setup_tabs()  # 模型、数据拟合、统计信息
        
    def display_model(self, model, mesh):
        """显示模型结果"""
        
    def display_data_fit(self, observed, predicted):
        """显示数据拟合"""
        
    def display_statistics(self, inversion_stats):
        """显示统计信息"""
```

### 12. 工作流程设计

#### 12.1 典型工作流程
1. **项目创建** → 选择地球物理方法
2. **网格设计** → 构建计算网格
3. **观测系统** → 设计测点布局
4. **物性模型** → 建立初始模型
5. **正演计算** → 计算理论响应
6. **数据导入** → 加载观测数据
7. **反演设置** → 配置反演参数
8. **反演计算** → 执行反演过程
9. **结果分析** → 查看和解释结果
10. **报告生成** → 输出工作报告

#### 12.2 项目文件结构
```
project_name.simpeg/
├── project.json          # 项目配置
├── mesh/                 # 网格文件
├── survey/               # 观测系统
├── data/                 # 观测数据
├── models/               # 物性模型
├── results/              # 反演结果
└── reports/              # 生成报告
```

### 13. 高级功能

#### 13.1 联合反演
- 重力-磁法联合反演
- 电法-电磁法联合反演
- 多物理场耦合反演
- 岩石物理约束反演

#### 13.2 不确定性分析
- 模型参数不确定性
- 数据噪声影响分析
- 敏感性测试
- 置信区间估计

#### 13.3 机器学习集成
- 深度学习初始模型
- 智能参数优化
- 模式识别辅助解释
- 自动化质量控制

### 14. 性能优化

#### 14.1 计算优化
- 多线程/多进程并行
- GPU 加速计算
- 内存使用优化
- 大规模问题处理

#### 14.2 界面优化
- 异步计算任务
- 进度实时更新
- 响应式界面设计
- 大数据集高效显示

### 15. 扩展性设计

#### 15.1 插件机制
```python
class MethodPlugin:
    """地球物理方法插件基类"""
    
    def register_method(self):
        """注册新方法"""
        
    def create_parameter_panel(self):
        """创建参数面板"""
        
    def run_forward(self):
        """执行正演"""
        
    def run_inversion(self):
        """执行反演"""
```

#### 15.2 自定义扩展
- 用户自定义正则化
- 自定义可视化方案
- 第三方求解器集成
- 外部数据格式支持

### 16. 质量保证

#### 16.1 单元测试
- 各模块功能测试
- 数值精度验证
- 边界条件测试
- 性能基准测试

#### 16.2 集成测试
- 端到端工作流程测试
- 多方法组合测试
- 大规模数据集测试
- 跨平台兼容性测试

### 17. 部署和分发

#### 17.1 打包方案
- PyInstaller 可执行文件
- Conda 环境包
- Docker 容器化
- 云端 Web 应用

#### 17.2 依赖管理
```yaml
# environment.yml
dependencies:
  - python=3.9
  - numpy
  - scipy
  - matplotlib
  - pyqt6
  - pyvista
  - simpeg
  - discretize
  - gempy
  - pandas
```

### 18. 文档和培训

#### 18.1 用户文档
- 快速入门指南
- 详细用户手册
- API 参考文档
- 示例教程集

#### 18.2 开发者文档
- 架构设计文档
- 代码贡献指南
- 插件开发指南
- 测试规范文档

## 实施计划

### 阶段 1: 基础框架 (4周)
- 主界面框架搭建
- 基础模块接口定义
- 网格构建功能
- 简单可视化功能

### 阶段 2: 核心方法 (6周)
- 重力方法完整实现
- 磁法基础功能
- 数据管理模块
- 正演求解器框架

### 阶段 3: 反演功能 (6周)
- 反演引擎开发
- 正则化方法集成
- 参数优化功能
- 结果分析工具

### 阶段 4: 高级功能 (4周)
- 多方法集成
- 联合反演功能
- 性能优化
- 用户体验完善

### 阶段 5: 测试发布 (2周)
- 全面测试验证
- 文档编写
- 打包发布
- 用户反馈收集

## 总结

这个技术规范为构建专业级的 SimPEG 地球物理界面提供了完整的框架。通过模块化设计、插件机制和可扩展架构，可以满足不同用户的需求，从简单的正演建模到复杂的多物理场联合反演。

关键特点：
1. **专业性**: 涵盖主要地球物理方法
2. **易用性**: 直观的图形界面和工作流程
3. **扩展性**: 插件机制和开放架构
4. **性能**: 优化的计算和显示性能
5. **集成性**: 与现有 DeepCAD 生态无缝集成

这将是一个功能强大、用户友好的地球物理正反演软件平台。
