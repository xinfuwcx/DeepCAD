# DeepCAD-SCOUR Example6 开发者API文档

## 概述

本文档为example6系统开发者提供详细的API接口说明、扩展开发指南和架构设计文档。

## 核心API接口

### 1. 冲刷计算核心API

#### EmpiricalScourSolver 类

```python
from core.empirical_solver import EmpiricalScourSolver, ScourParameters, ScourResult

class EmpiricalScourSolver:
    """桥墩冲刷经验公式求解器"""
    
    def __init__(self):
        """初始化求解器"""
        self.methods = {
            'hec18': self.calculate_hec18_scour,
            'richardson_davis': self.calculate_richardson_davis_scour,
            'melville_coleman': self.calculate_melville_coleman_scour
        }
        
    def calculate_scour(self, params: ScourParameters, method: str = 'hec18') -> ScourResult:
        """
        计算桥墩冲刷深度
        
        Args:
            params: 冲刷计算参数对象
            method: 计算方法 ('hec18', 'richardson_davis', 'melville_coleman')
            
        Returns:
            ScourResult: 计算结果对象
            
        Raises:
            ValueError: 无效的计算方法
            ScourCalculationError: 计算过程出错
        """
        if method not in self.methods:
            raise ValueError(f"未知的计算方法: {method}")
            
        try:
            return self.methods[method](params)
        except Exception as e:
            raise ScourCalculationError(f"计算失败: {str(e)}")
```

#### 数据结构定义

```python
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional

class PierShape(Enum):
    """桥墩形状枚举"""
    CIRCULAR = "circular"
    SQUARE = "square" 
    RECTANGULAR = "rectangular"
    SHARP_NOSE = "sharp_nose"
    ROUND_NOSE = "round_nose"
    GROUP = "group"

@dataclass
class ScourParameters:
    """冲刷计算输入参数"""
    
    # 桥墩几何参数
    pier_width: float          # 桥墩宽度 (m)
    pier_length: float         # 桥墩长度 (m)
    pier_diameter: float       # 等效直径 (m)
    pier_shape: PierShape      # 桥墩形状
    
    # 水力参数
    flow_velocity: float       # 流速 (m/s)
    water_depth: float         # 水深 (m)
    flow_angle: float          # 攻击角 (度)
    
    # 河床参数
    bed_material: str          # 河床材料
    d50_sediment: float        # 中值粒径 (mm)
    sediment_density: float    # 泥沙密度 (kg/m³)
    cohesion: float           # 粘聚力 (Pa)
    
    # 结构参数
    foundation_depth: float    # 基础埋深 (m)
    protection_type: str       # 防护类型
    
    def validate(self) -> List[str]:
        """参数验证"""
        warnings = []
        
        if self.pier_width <= 0:
            warnings.append("桥墩宽度必须大于0")
            
        if self.flow_velocity <= 0:
            warnings.append("流速必须大于0")
            
        if self.water_depth <= 0:
            warnings.append("水深必须大于0")
            
        if self.d50_sediment <= 0:
            warnings.append("中值粒径必须大于0")
            
        # 物理合理性检查
        froude = self.flow_velocity / (9.81 * self.water_depth)**0.5
        if froude > 1.2:
            warnings.append(f"Froude数过高 ({froude:.2f}), 结果可信度降低")
            
        return warnings

@dataclass  
class ScourResult:
    """冲刷计算结果"""
    
    scour_depth: float         # 冲刷深度 (m)
    scour_width: float         # 冲刷宽度 (m) 
    equilibrium_time: float    # 平衡时间 (hours)
    method: str               # 计算方法
    confidence: float         # 可信度 (0-1)
    froude_number: float      # Froude数
    reynolds_number: float    # Reynolds数
    success: bool = True      # 计算成功标志
    warnings: List[str] = None # 警告信息
    
    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []
            
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            'scour_depth': self.scour_depth,
            'scour_width': self.scour_width,
            'equilibrium_time': self.equilibrium_time,
            'method': self.method,
            'confidence': self.confidence,
            'froude_number': self.froude_number,
            'reynolds_number': self.reynolds_number,
            'success': self.success,
            'warnings': self.warnings
        }
```

### 2. 可视化API

#### ProfessionalVisualizationPanel 类

```python
from PyQt6.QtWidgets import QWidget
import matplotlib.pyplot as plt
import pyvista as pv

class ProfessionalVisualizationPanel(QWidget):
    """专业可视化面板API"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.setup_colormaps()
        
    def update_visualization(self, result: ScourResult, params: ScourParameters):
        """
        更新可视化显示
        
        Args:
            result: 计算结果
            params: 输入参数
        """
        # 更新3D主视图
        self.update_3d_scene(result, params)
        
        # 更新剖面视图
        self.update_section_views(result, params)
        
        # 更新流场可视化
        if hasattr(self, 'flow_plotter'):
            self.update_flow_visualization(result, params)
    
    def export_visualization(self, filename: str, format: str = 'png', dpi: int = 300):
        """
        导出可视化图像
        
        Args:
            filename: 输出文件名
            format: 图像格式 ('png', 'jpg', 'svg', 'pdf')
            dpi: 分辨率
        """
        if format.lower() in ['png', 'jpg']:
            self.canvas_3d.print_figure(filename, dpi=dpi)
        elif format.lower() == 'svg':
            self.canvas_3d.print_figure(filename, format='svg')
        elif format.lower() == 'pdf':
            self.canvas_3d.print_figure(filename, format='pdf')
```

#### 3D流场API

```python
class FlowVisualization3D:
    """3D流场可视化API"""
    
    def __init__(self, plotter):
        self.plotter = plotter
        self.flow_mesh = None
        
    def create_flow_mesh(self, bounds: tuple, resolution: tuple) -> pv.StructuredGrid:
        """
        创建流场计算网格
        
        Args:
            bounds: 计算域边界 ((xmin,xmax), (ymin,ymax), (zmin,zmax))
            resolution: 网格分辨率 (nx, ny, nz)
            
        Returns:
            pv.StructuredGrid: PyVista结构化网格对象
        """
        (xmin, xmax), (ymin, ymax), (zmin, zmax) = bounds
        nx, ny, nz = resolution
        
        x = np.linspace(xmin, xmax, nx)
        y = np.linspace(ymin, ymax, ny)  
        z = np.linspace(zmin, zmax, nz)
        
        mesh = pv.StructuredGrid()
        X, Y, Z = np.meshgrid(x, y, z, indexing='ij')
        mesh.points = np.c_[X.ravel(), Y.ravel(), Z.ravel()]
        mesh.dimensions = X.shape
        
        return mesh
    
    def calculate_cylinder_flow(self, mesh: pv.StructuredGrid, 
                               pier_center: tuple, pier_radius: float, 
                               inlet_velocity: float) -> pv.StructuredGrid:
        """
        计算圆柱绕流场
        
        Args:
            mesh: 计算网格
            pier_center: 桥墩中心坐标 (x, y, z)
            pier_radius: 桥墩半径
            inlet_velocity: 来流速度
            
        Returns:
            pv.StructuredGrid: 包含流场数据的网格
        """
        points = mesh.points
        x, y, z = points[:, 0], points[:, 1], points[:, 2]
        
        # 计算圆柱绕流
        dx = x - pier_center[0]
        dy = y - pier_center[1]
        R = np.sqrt(dx**2 + dy**2)
        theta = np.arctan2(dy, dx)
        
        # 势流解
        mask = R > pier_radius
        u = np.full_like(x, inlet_velocity)
        v = np.zeros_like(y)
        w = np.zeros_like(z)
        
        u[mask] = inlet_velocity * (1 - pier_radius**2 / R[mask]**2 * np.cos(2*theta[mask]))
        v[mask] = -inlet_velocity * pier_radius**2 / R[mask]**2 * np.sin(2*theta[mask])
        
        u[~mask] = 0
        v[~mask] = 0
        w[~mask] = 0
        
        # 添加数据到网格
        mesh.point_data['velocity'] = np.c_[u, v, w]
        mesh.point_data['velocity_magnitude'] = np.sqrt(u**2 + v**2 + w**2)
        mesh.point_data['pressure'] = 0.5 * 1000 * (inlet_velocity**2 - (u**2 + v**2 + w**2))
        
        return mesh
    
    def add_velocity_vectors(self, mesh: pv.StructuredGrid, scale_factor: float = 0.3):
        """添加速度矢量显示"""
        arrows = mesh.glyph(orient='velocity', scale='velocity_magnitude', factor=scale_factor)
        self.plotter.add_mesh(arrows, cmap='turbo', opacity=0.8)
        
    def add_streamlines(self, mesh: pv.StructuredGrid, seed_points: pv.PolyData):
        """添加流线显示"""
        streamlines = mesh.streamlines_from_source(source=seed_points, vectors='velocity')
        self.plotter.add_mesh(streamlines, color='yellow', line_width=2)
```

## 扩展开发接口

### 1. 新计算方法扩展

#### 方法插件接口

```python
from abc import ABC, abstractmethod

class ScourMethodPlugin(ABC):
    """冲刷计算方法插件基类"""
    
    @abstractmethod
    def get_method_name(self) -> str:
        """返回方法名称"""
        pass
        
    @abstractmethod  
    def get_method_description(self) -> str:
        """返回方法描述"""
        pass
        
    @abstractmethod
    def get_applicable_conditions(self) -> dict:
        """返回适用条件"""
        pass
        
    @abstractmethod
    def calculate(self, params: ScourParameters) -> ScourResult:
        """执行冲刷计算"""
        pass
        
    @abstractmethod
    def validate_parameters(self, params: ScourParameters) -> List[str]:
        """验证输入参数"""
        pass

# 自定义方法实现示例
class CustomScourMethod(ScourMethodPlugin):
    """自定义冲刷计算方法示例"""
    
    def get_method_name(self) -> str:
        return "custom_method"
        
    def get_method_description(self) -> str:
        return "基于神经网络的冲刷深度预测"
        
    def get_applicable_conditions(self) -> dict:
        return {
            'pier_shapes': ['circular', 'square'],
            'froude_range': (0.1, 0.8),
            'sediment_types': ['sand', 'gravel']
        }
        
    def calculate(self, params: ScourParameters) -> ScourResult:
        # 实现自定义计算逻辑
        # 例如：调用训练好的机器学习模型
        
        predicted_depth = self.ml_model.predict(self.extract_features(params))
        
        return ScourResult(
            scour_depth=predicted_depth,
            method=self.get_method_name(),
            confidence=0.9,
            success=True
        )
        
    def validate_parameters(self, params: ScourParameters) -> List[str]:
        warnings = []
        
        if params.pier_shape not in [PierShape.CIRCULAR, PierShape.SQUARE]:
            warnings.append("该方法仅适用于圆形或方形桥墩")
            
        froude = params.flow_velocity / (9.81 * params.water_depth)**0.5
        if not (0.1 <= froude <= 0.8):
            warnings.append("Froude数超出适用范围 [0.1, 0.8]")
            
        return warnings

# 注册自定义方法
solver = EmpiricalScourSolver()
solver.register_method("custom", CustomScourMethod())
```

### 2. 可视化扩展

#### 自定义可视化组件

```python
class CustomVisualizationWidget(QWidget):
    """自定义可视化组件基类"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        
    def setup_ui(self):
        """设置UI布局"""
        pass
        
    def update_data(self, result: ScourResult, params: ScourParameters):
        """更新显示数据"""
        pass
        
    def export_data(self, filename: str):
        """导出数据"""
        pass

class ScourRiskVisualization(CustomVisualizationWidget):
    """冲刷风险可视化组件示例"""
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        
        # 创建风险等级图表
        self.risk_chart = self.create_risk_chart()
        layout.addWidget(self.risk_chart)
        
        # 创建时间序列预测图
        self.time_series_chart = self.create_time_series_chart()
        layout.addWidget(self.time_series_chart)
        
    def update_data(self, result: ScourResult, params: ScourParameters):
        # 更新风险等级显示
        risk_level = self.assess_risk_level(result, params)
        self.risk_chart.update_risk_level(risk_level)
        
        # 更新时间序列预测
        time_series = self.predict_scour_evolution(result, params)
        self.time_series_chart.update_series(time_series)
```

### 3. 数据接口扩展

#### 数据导入导出接口

```python
class DataIOInterface(ABC):
    """数据输入输出接口基类"""
    
    @abstractmethod
    def import_parameters(self, source) -> ScourParameters:
        """导入参数数据"""
        pass
        
    @abstractmethod
    def export_results(self, result: ScourResult, destination) -> bool:
        """导出结果数据"""
        pass

class ExcelDataIO(DataIOInterface):
    """Excel数据输入输出实现"""
    
    def import_parameters(self, excel_file: str) -> ScourParameters:
        import pandas as pd
        
        df = pd.read_excel(excel_file, sheet_name='Parameters')
        
        return ScourParameters(
            pier_width=df.loc[0, 'pier_width'],
            pier_length=df.loc[0, 'pier_length'],
            flow_velocity=df.loc[0, 'flow_velocity'],
            water_depth=df.loc[0, 'water_depth'],
            # ... 其他参数
        )
        
    def export_results(self, result: ScourResult, excel_file: str) -> bool:
        import pandas as pd
        
        # 创建结果数据框
        results_df = pd.DataFrame([result.to_dict()])
        
        # 写入Excel
        with pd.ExcelWriter(excel_file) as writer:
            results_df.to_excel(writer, sheet_name='Results', index=False)
            
        return True

class DatabaseIO(DataIOInterface):
    """数据库数据输入输出实现"""
    
    def __init__(self, connection_string: str):
        self.conn_str = connection_string
        
    def import_parameters(self, query_params: dict) -> ScourParameters:
        # 从数据库查询参数
        # 实现数据库查询逻辑
        pass
        
    def export_results(self, result: ScourResult, table_name: str) -> bool:
        # 将结果保存到数据库
        # 实现数据库插入逻辑
        pass
```

## 性能优化API

### 1. 并行计算接口

```python
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

class ParallelScourCalculator:
    """并行冲刷计算器"""
    
    def __init__(self, max_workers: int = None):
        self.max_workers = max_workers or mp.cpu_count()
        
    def batch_calculate(self, param_list: List[ScourParameters], 
                       method: str = 'hec18') -> List[ScourResult]:
        """
        批量并行计算
        
        Args:
            param_list: 参数列表
            method: 计算方法
            
        Returns:
            List[ScourResult]: 结果列表
        """
        
        with ProcessPoolExecutor(max_workers=self.max_workers) as executor:
            solver = EmpiricalScourSolver()
            
            futures = [
                executor.submit(solver.calculate_scour, params, method)
                for params in param_list
            ]
            
            results = [future.result() for future in futures]
            
        return results
        
    def parameter_sweep(self, base_params: ScourParameters,
                       sweep_config: dict) -> dict:
        """
        参数扫描分析
        
        Args:
            base_params: 基准参数
            sweep_config: 扫描配置
            
        Returns:
            dict: 扫描结果
        """
        
        # 生成参数组合
        param_combinations = self.generate_parameter_combinations(
            base_params, sweep_config
        )
        
        # 并行计算
        results = self.batch_calculate(param_combinations)
        
        # 组织结果
        return self.organize_sweep_results(results, sweep_config)
```

### 2. 缓存机制

```python
import hashlib
import pickle
import os
from functools import lru_cache

class ScourCalculationCache:
    """冲刷计算结果缓存"""
    
    def __init__(self, cache_dir: str = './cache'):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
        
    def get_cache_key(self, params: ScourParameters, method: str) -> str:
        """生成缓存键值"""
        params_str = str(params.__dict__) + method
        return hashlib.md5(params_str.encode()).hexdigest()
        
    def get_cached_result(self, params: ScourParameters, method: str) -> Optional[ScourResult]:
        """获取缓存结果"""
        cache_key = self.get_cache_key(params, method)
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.pkl")
        
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'rb') as f:
                    return pickle.load(f)
            except:
                return None
        return None
        
    def cache_result(self, params: ScourParameters, method: str, result: ScourResult):
        """缓存计算结果"""
        cache_key = self.get_cache_key(params, method)
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.pkl")
        
        try:
            with open(cache_file, 'wb') as f:
                pickle.dump(result, f)
        except:
            pass  # 缓存失败不影响主程序

# 带缓存的求解器包装
class CachedScourSolver:
    def __init__(self, solver: EmpiricalScourSolver, cache: ScourCalculationCache):
        self.solver = solver
        self.cache = cache
        
    def calculate_scour(self, params: ScourParameters, method: str = 'hec18') -> ScourResult:
        # 尝试获取缓存结果
        cached_result = self.cache.get_cached_result(params, method)
        if cached_result:
            return cached_result
            
        # 计算新结果
        result = self.solver.calculate_scour(params, method)
        
        # 缓存结果
        if result.success:
            self.cache.cache_result(params, method, result)
            
        return result
```

## 测试框架

### 1. 单元测试

```python
import unittest
import numpy as np

class TestScourCalculation(unittest.TestCase):
    """冲刷计算单元测试"""
    
    def setUp(self):
        self.solver = EmpiricalScourSolver()
        self.test_params = ScourParameters(
            pier_width=2.0,
            pier_length=2.0,
            pier_diameter=2.0,
            pier_shape=PierShape.CIRCULAR,
            flow_velocity=2.5,
            water_depth=6.0,
            flow_angle=0.0,
            bed_material='sand',
            d50_sediment=0.5,
            sediment_density=2650.0,
            cohesion=0.0,
            foundation_depth=3.0,
            protection_type='none'
        )
        
    def test_hec18_basic_calculation(self):
        """测试HEC-18基础计算"""
        result = self.solver.calculate_hec18_scour(self.test_params)
        
        self.assertTrue(result.success)
        self.assertGreater(result.scour_depth, 0)
        self.assertLess(result.scour_depth, 10)  # 合理范围
        self.assertEqual(result.method, 'HEC-18')
        
    def test_parameter_validation(self):
        """测试参数验证"""
        invalid_params = ScourParameters(
            pier_width=-1.0,  # 无效值
            **{k: v for k, v in self.test_params.__dict__.items() 
               if k != 'pier_width'}
        )
        
        warnings = invalid_params.validate()
        self.assertGreater(len(warnings), 0)
        
    def test_froude_reynolds_calculation(self):
        """测试Froude数和Reynolds数计算"""
        result = self.solver.calculate_hec18_scour(self.test_params)
        
        expected_froude = self.test_params.flow_velocity / np.sqrt(9.81 * self.test_params.water_depth)
        expected_reynolds = (self.test_params.flow_velocity * 
                           self.test_params.pier_diameter / 1e-6)
        
        self.assertAlmostEqual(result.froude_number, expected_froude, places=3)
        self.assertAlmostEqual(result.reynolds_number, expected_reynolds, places=0)
        
    def test_method_consistency(self):
        """测试多方法结果一致性"""
        results = {}
        
        for method in ['hec18', 'richardson_davis', 'melville_coleman']:
            try:
                results[method] = self.solver.calculate_scour(self.test_params, method)
            except:
                continue
                
        # 检查结果合理性
        depths = [r.scour_depth for r in results.values() if r.success]
        if len(depths) > 1:
            cv = np.std(depths) / np.mean(depths)  # 变异系数
            self.assertLess(cv, 0.5)  # 变异系数不超过50%

class TestVisualizationAPI(unittest.TestCase):
    """可视化API测试"""
    
    def test_colormap_creation(self):
        """测试专业配色创建"""
        from enhanced_beautiful_main import ProfessionalColorMaps
        
        velocity_cmap = ProfessionalColorMaps.get_velocity_colormap()
        self.assertIsNotNone(velocity_cmap)
        
    @unittest.skipIf(not PYVISTA_AVAILABLE, "PyVista not available")
    def test_3d_mesh_creation(self):
        """测试3D网格创建"""
        viz = FlowVisualization3D(None)
        
        bounds = ((-5, 5), (-3, 10), (-1, 3))
        resolution = (20, 16, 12)
        
        mesh = viz.create_flow_mesh(bounds, resolution)
        
        self.assertEqual(mesh.n_points, 20 * 16 * 12)
        self.assertEqual(mesh.dimensions, (20, 16, 12))
```

### 2. 基准测试

```python
import time
import cProfile
import pstats

class PerformanceBenchmark:
    """性能基准测试"""
    
    def __init__(self):
        self.solver = EmpiricalScourSolver()
        
    def benchmark_calculation_methods(self, n_runs: int = 100):
        """基准测试各计算方法性能"""
        
        test_params = ScourParameters(
            # ... 标准测试参数
        )
        
        methods = ['hec18', 'richardson_davis', 'melville_coleman']
        results = {}
        
        for method in methods:
            start_time = time.time()
            
            for _ in range(n_runs):
                self.solver.calculate_scour(test_params, method)
                
            elapsed = time.time() - start_time
            results[method] = {
                'total_time': elapsed,
                'avg_time': elapsed / n_runs,
                'calculations_per_sec': n_runs / elapsed
            }
            
        return results
        
    def profile_calculation(self, method: str = 'hec18'):
        """性能分析"""
        test_params = ScourParameters(
            # ... 测试参数
        )
        
        profiler = cProfile.Profile()
        profiler.enable()
        
        # 执行多次计算
        for _ in range(100):
            self.solver.calculate_scour(test_params, method)
            
        profiler.disable()
        
        # 分析结果
        stats = pstats.Stats(profiler)
        stats.sort_stats('cumtime')
        stats.print_stats(10)  # 显示前10个最耗时函数
```

## 配置管理

### 1. 配置文件结构

```python
import json
import yaml
from typing import Dict, Any

class ConfigManager:
    """配置管理器"""
    
    def __init__(self, config_file: str = 'config.yaml'):
        self.config_file = config_file
        self.config = self.load_config()
        
    def load_config(self) -> Dict[str, Any]:
        """加载配置文件"""
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                if self.config_file.endswith('.yaml') or self.config_file.endswith('.yml'):
                    return yaml.safe_load(f)
                else:
                    return json.load(f)
        except FileNotFoundError:
            return self.get_default_config()
            
    def get_default_config(self) -> Dict[str, Any]:
        """获取默认配置"""
        return {
            'calculation': {
                'default_method': 'hec18',
                'enable_parallel': True,
                'max_workers': 4,
                'cache_enabled': True,
                'cache_dir': './cache'
            },
            'visualization': {
                'default_colormap': 'turbo',
                'mesh_resolution': 'medium',
                'enable_3d': True,
                'default_dpi': 300
            },
            'ui': {
                'theme': 'professional',
                'language': 'zh_CN',
                'auto_save': True,
                'auto_save_interval': 300  # 秒
            },
            'validation': {
                'strict_mode': False,
                'warning_threshold': 0.5,
                'enable_reference_check': True
            }
        }
        
    def get(self, key: str, default=None):
        """获取配置值"""
        keys = key.split('.')
        value = self.config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
                
        return value
        
    def set(self, key: str, value: Any):
        """设置配置值"""
        keys = key.split('.')
        config = self.config
        
        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]
            
        config[keys[-1]] = value
        
    def save_config(self):
        """保存配置文件"""
        with open(self.config_file, 'w', encoding='utf-8') as f:
            if self.config_file.endswith('.yaml') or self.config_file.endswith('.yml'):
                yaml.dump(self.config, f, default_flow_style=False, allow_unicode=True)
            else:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
```

### 2. 配置文件示例

```yaml
# config.yaml
calculation:
  default_method: "hec18"
  enable_parallel: true
  max_workers: 4
  cache_enabled: true
  cache_dir: "./cache"
  
  # 方法特定配置
  methods:
    hec18:
      safety_factor: 1.3
      enable_warnings: true
    richardson_davis:
      enable_shields_correction: true
    melville_coleman:
      enable_depth_correction: true

visualization:
  default_colormap: "turbo"
  mesh_resolution: "medium"  # low, medium, high
  enable_3d: true
  default_dpi: 300
  
  # 3D可视化配置
  pyvista:
    window_size: [1200, 800]
    background_color: "#1e1e1e"
    enable_antialiasing: true
    
  # 2D图表配置  
  matplotlib:
    style: "seaborn"
    figure_size: [10, 8]
    font_family: "SimHei"

ui:
  theme: "professional"  # light, dark, professional
  language: "zh_CN"      # zh_CN, en_US
  auto_save: true
  auto_save_interval: 300
  
  # 界面布局
  layout:
    main_splitter_ratio: [1, 2]
    panel_widths:
      parameters: 300
      results: 400
      
validation:
  strict_mode: false
  warning_threshold: 0.5
  enable_reference_check: true
  
  # 参数范围检查
  parameter_ranges:
    pier_width: [0.5, 15.0]
    flow_velocity: [0.5, 8.0]
    water_depth: [1.0, 50.0]
    froude_number: [0.1, 1.2]

logging:
  level: "INFO"          # DEBUG, INFO, WARNING, ERROR
  file: "scour_analysis.log"
  max_size: "10MB"
  backup_count: 5
```

## 错误处理和日志

### 1. 自定义异常类

```python
class ScourAnalysisError(Exception):
    """冲刷分析基础异常类"""
    pass

class ParameterValidationError(ScourAnalysisError):
    """参数验证异常"""
    def __init__(self, parameter: str, message: str):
        self.parameter = parameter
        super().__init__(f"参数'{parameter}'验证失败: {message}")

class CalculationError(ScourAnalysisError):
    """计算异常"""
    def __init__(self, method: str, message: str):
        self.method = method
        super().__init__(f"方法'{method}'计算失败: {message}")

class VisualizationError(ScourAnalysisError):
    """可视化异常"""
    pass
```

### 2. 日志系统

```python
import logging
from logging.handlers import RotatingFileHandler

class ScourLogger:
    """冲刷分析日志管理器"""
    
    def __init__(self, config_manager: ConfigManager):
        self.config = config_manager
        self.setup_logging()
        
    def setup_logging(self):
        """设置日志系统"""
        # 获取配置
        log_level = self.config.get('logging.level', 'INFO')
        log_file = self.config.get('logging.file', 'scour_analysis.log')
        max_size = self.config.get('logging.max_size', '10MB')
        backup_count = self.config.get('logging.backup_count', 5)
        
        # 解析文件大小
        size_bytes = self._parse_size(max_size)
        
        # 配置根日志器
        logging.basicConfig(
            level=getattr(logging, log_level),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                RotatingFileHandler(
                    log_file, maxBytes=size_bytes, backupCount=backup_count
                ),
                logging.StreamHandler()
            ]
        )
        
        self.logger = logging.getLogger('ScourAnalysis')
        
    def _parse_size(self, size_str: str) -> int:
        """解析文件大小字符串"""
        units = {'B': 1, 'KB': 1024, 'MB': 1024*1024, 'GB': 1024*1024*1024}
        
        import re
        match = re.match(r'(\d+)([A-Z]*)', size_str.upper())
        if match:
            number, unit = match.groups()
            return int(number) * units.get(unit, 1)
        return 10 * 1024 * 1024  # 默认10MB
        
    def log_calculation(self, params: ScourParameters, result: ScourResult):
        """记录计算过程"""
        self.logger.info(f"冲刷计算: 方法={result.method}, "
                        f"冲刷深度={result.scour_depth:.3f}m, "
                        f"Froude数={result.froude_number:.3f}")
        
    def log_error(self, error: Exception, context: str = ""):
        """记录错误信息"""
        self.logger.error(f"错误发生 [{context}]: {str(error)}", exc_info=True)
```

## 部署和打包

### 1. 依赖管理

```python
# requirements.txt 生成脚本
def generate_requirements():
    """生成requirements.txt文件"""
    dependencies = {
        'PyQt6': '>=6.5.0',
        'numpy': '>=1.24.0', 
        'matplotlib': '>=3.7.0',
        'scipy': '>=1.11.0',
        'pyvista': '>=0.45.0',
        'pyvistaqt': '>=0.11.0',
        'pandas': '>=2.0.0',
        'openpyxl': '>=3.1.0',
        'pyyaml': '>=6.0',
        'psutil': '>=5.9.0'
    }
    
    with open('requirements.txt', 'w') as f:
        for package, version in dependencies.items():
            f.write(f"{package}{version}\n")
```

### 2. 打包脚本

```python
# setup.py
from setuptools import setup, find_packages

setup(
    name="deepcad-scour-example6",
    version="3.1.0",
    description="专业桥墩冲刷分析系统",
    author="DeepCAD Team",
    author_email="support@deepcad.com",
    packages=find_packages(),
    install_requires=[
        'PyQt6>=6.5.0',
        'numpy>=1.24.0',
        'matplotlib>=3.7.0',
        'scipy>=1.11.0',
        'pyvista>=0.45.0',
        'pyvistaqt>=0.11.0',
    ],
    entry_points={
        'console_scripts': [
            'deepcad-scour=main:main',
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Science/Research",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
)
```

---

**开发者API文档完整，支持系统的扩展和二次开发。**

*DeepCAD-SCOUR Example6 开发者API文档 v3.1*  
*专业桥墩冲刷分析系统*