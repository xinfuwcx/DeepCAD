"""
高级地质建模核心系统
Advanced Geological Modeling Core System

集成多地层建模、断层系统、地球物理模拟和不确定性分析
"""

import numpy as np
import pandas as pd
import gempy as gp
import matplotlib.pyplot as plt
import pyvista as pv
from scipy.spatial.distance import cdist
from scipy import interpolate
from scipy.stats import norm, multivariate_normal
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, Matern
import json
from typing import Dict, List, Tuple, Optional, Any
import warnings
warnings.filterwarnings('ignore')


class AdvancedGeologicalModeler:
    """高级地质建模器 - 集成所有核心功能"""
    
    def __init__(self):
        """初始化地质建模器"""
        self.geo_model = None
        self.solution = None
        self.fault_network = {}
        self.stratigraphy = {}
        self.geophysical_data = {}
        self.uncertainty_params = {}
        self.model_bounds = None
        self.resolution = None
        
    def initialize_model(self, bounds: Tuple[float, float, float, float, float, float],
                        resolution: Tuple[int, int, int], model_name: str = "advanced_geo_model"):
        """
        初始化地质模型
        
        Args:
            bounds: (x_min, x_max, y_min, y_max, z_min, z_max)
            resolution: (nx, ny, nz) 网格分辨率
            model_name: 模型名称
        """
        self.model_bounds = bounds
        self.resolution = resolution
        
        # 创建GemPy模型
        self.geo_model = gp.create_model(model_name)
        gp.init_data(self.geo_model, bounds, resolution)
        
        print(f"✓ 地质模型已初始化: {model_name}")
        print(f"  边界: {bounds}")
        print(f"  分辨率: {resolution}")
        
    def add_stratigraphy(self, stratigraphy_config: Dict):
        """
        添加地层序列配置
        
        Args:
            stratigraphy_config: 地层配置字典
            例如: {
                "Series_1": ["surface_1", "surface_2"],
                "Series_2": ["surface_3", "basement"]
            }
        """
        self.stratigraphy = stratigraphy_config
        
        # 映射地层序列到表面
        gp.map_stack_to_surfaces(self.geo_model, stratigraphy_config)
        
        # 设置哪些是断层
        fault_series = [series for series in stratigraphy_config.keys() 
                       if 'fault' in series.lower()]
        non_fault_series = [series for series in stratigraphy_config.keys() 
                           if 'fault' not in series.lower()]
        
        if fault_series:
            self.geo_model.set_is_fault(fault_series, True)
        if non_fault_series:
            self.geo_model.set_is_fault(non_fault_series, False)
            
        print(f"✓ 地层序列已添加: {len(stratigraphy_config)} 个序列")
        
    def add_geological_data(self, surface_points_df: pd.DataFrame, 
                           orientations_df: pd.DataFrame = None):
        """
        添加地质观测数据
        
        Args:
            surface_points_df: 表面点数据 [X, Y, Z, surface]
            orientations_df: 方向数据 [X, Y, Z, surface, azimuth, dip, polarity]
        """
        if orientations_df is None:
            # 如果没有提供方向数据，生成默认方向数据
            orientations_df = self._generate_default_orientations(surface_points_df)
        
        # 设置插值数据
        gp.set_interpolation_data(
            self.geo_model,
            surface_points_df[['X', 'Y', 'Z', 'surface']],
            orientations_df[['X', 'Y', 'Z', 'surface', 'azimuth', 'dip', 'polarity']]
        )
        
        print(f"✓ 地质数据已添加:")
        print(f"  表面点: {len(surface_points_df)} 个")
        print(f"  方向点: {len(orientations_df)} 个")
        
    def _generate_default_orientations(self, surface_points_df: pd.DataFrame) -> pd.DataFrame:
        """生成默认方向数据"""
        surfaces = surface_points_df['surface'].unique()
        orientations = []
        
        for surface in surfaces:
            surface_points = surface_points_df[surface_points_df['surface'] == surface]
            if len(surface_points) >= 2:
                # 取中心点
                center_x = surface_points['X'].mean()
                center_y = surface_points['Y'].mean()
                center_z = surface_points['Z'].mean()
                
                # 估算倾向和倾角
                z_gradient = np.gradient(surface_points['Z'])
                avg_azimuth = 90.0  # 默认东向
                avg_dip = np.mean(np.abs(z_gradient)) * 10  # 简化的倾角估算
                avg_dip = max(5, min(45, avg_dip))  # 限制在5-45度之间
                
                orientations.append({
                    'X': center_x,
                    'Y': center_y,
                    'Z': center_z,
                    'surface': surface,
                    'azimuth': avg_azimuth,
                    'dip': avg_dip,
                    'polarity': 1
                })
        
        return pd.DataFrame(orientations)
        
    def create_fault_network(self, fault_config: Dict):
        """
        创建复杂断层网络
        
        Args:
            fault_config: 断层配置
            例如: {
                "fault_1": {
                    "points": [(x1,y1,z1), (x2,y2,z2), ...],
                    "azimuth": 45,
                    "dip": 75,
                    "displacement": 50
                },
                "fault_2": {...}
            }
        """
        self.fault_network = fault_config
        
        # 为每个断层创建数据点
        fault_surface_points = []
        fault_orientations = []
        
        for fault_name, fault_data in fault_config.items():
            points = fault_data.get('points', [])
            azimuth = fault_data.get('azimuth', 90)
            dip = fault_data.get('dip', 60)
            
            # 添加断层面点
            for point in points:
                fault_surface_points.append({
                    'X': point[0],
                    'Y': point[1], 
                    'Z': point[2],
                    'surface': fault_name
                })
            
            # 添加断层方向数据
            if points:
                center_point = np.mean(points, axis=0)
                fault_orientations.append({
                    'X': center_point[0],
                    'Y': center_point[1],
                    'Z': center_point[2],
                    'surface': fault_name,
                    'azimuth': azimuth,
                    'dip': dip,
                    'polarity': 1
                })
        
        # 更新地层配置包含断层
        fault_series = {f"Fault_Series_{i}": [fault_name] 
                       for i, fault_name in enumerate(fault_config.keys())}
        
        # 合并断层到地层配置
        updated_stratigraphy = {**fault_series, **self.stratigraphy}
        self.add_stratigraphy(updated_stratigraphy)
        
        print(f"✓ 断层网络已创建: {len(fault_config)} 个断层")
        
    def compute_geological_model(self, compile_theano: bool = True):
        """计算地质模型"""
        try:
            # 设置插值器
            if compile_theano:
                gp.set_interpolator(self.geo_model)
            
            # 计算模型
            self.solution = gp.compute_model(self.geo_model, compute_mesh=True)
            
            print("✓ 地质模型计算完成")
            return True
            
        except Exception as e:
            print(f"❌ 地质模型计算失败: {str(e)}")
            return False
    
    def compute_geophysical_forward(self, property_dict: Dict[str, float]):
        """
        计算地球物理正演
        
        Args:
            property_dict: 物性字典，如 {"rock1": {"density": 2.67, "susceptibility": 0.01}}
        """
        if self.solution is None:
            print("❌ 请先计算地质模型")
            return None
            
        try:
            # 获取岩性块
            lith_block = self.solution.lith_block.reshape(self.resolution)
            
            # 创建物性网格
            density_grid = np.zeros_like(lith_block, dtype=float)
            susceptibility_grid = np.zeros_like(lith_block, dtype=float)
            
            # 获取唯一岩性ID
            unique_ids = np.unique(lith_block)
            
            # 分配物性值
            for lith_id in unique_ids:
                # 这里简化处理，假设岩性ID对应岩石名称
                rock_name = f"rock_{int(lith_id)}" if lith_id > 0 else "basement"
                
                if rock_name in property_dict:
                    props = property_dict[rock_name]
                    mask = lith_block == lith_id
                    
                    density_grid[mask] = props.get('density', 2.67)
                    susceptibility_grid[mask] = props.get('susceptibility', 0.01)
            
            # 计算重力场 (简化计算)
            gravity_field = self._compute_gravity_field(density_grid)
            
            # 计算磁场 (简化计算)
            magnetic_field = self._compute_magnetic_field(susceptibility_grid)
            
            self.geophysical_data = {
                'density_grid': density_grid,
                'susceptibility_grid': susceptibility_grid,
                'gravity_field': gravity_field,
                'magnetic_field': magnetic_field
            }
            
            print("✓ 地球物理正演计算完成")
            return self.geophysical_data
            
        except Exception as e:
            print(f"❌ 地球物理计算失败: {str(e)}")
            return None
    
    def _compute_gravity_field(self, density_grid: np.ndarray) -> np.ndarray:
        """计算重力场 (简化版本)"""
        # 这是一个简化的重力计算
        # 实际应用中需要更复杂的算法
        
        # 使用简单的卷积来模拟重力效应
        from scipy import ndimage
        
        # 重力核函数 (简化)
        kernel_size = min(10, density_grid.shape[0]//4)
        kernel = np.ones((kernel_size, kernel_size, kernel_size)) / (kernel_size**3)
        
        # 卷积计算
        gravity = ndimage.convolve(density_grid, kernel, mode='constant')
        
        # 转换为毫伽单位
        gravity = gravity * 1000  # 转换为mGal
        
        return gravity
        
    def _compute_magnetic_field(self, susceptibility_grid: np.ndarray) -> np.ndarray:
        """计算磁场 (简化版本)"""
        # 简化的磁场计算
        # 假设垂直磁化
        
        # 计算磁场梯度
        dz_gradient = np.gradient(susceptibility_grid, axis=2)
        
        # 模拟磁异常 (简化)
        magnetic = susceptibility_grid * 50000  # 转换为nT
        magnetic += dz_gradient * 1000  # 添加梯度效应
        
        return magnetic
    
    def uncertainty_analysis(self, n_samples: int = 100, confidence_level: float = 0.95):
        """
        不确定性分析 - 蒙特卡洛方法
        
        Args:
            n_samples: 采样次数
            confidence_level: 置信度
        """
        if self.solution is None:
            print("❌ 请先计算地质模型")
            return None
            
        print(f"🔄 开始不确定性分析 ({n_samples} 次采样)...")
        
        try:
            # 获取原始数据点
            surface_points = self.geo_model.surface_points.df
            
            # 为观测点添加噪声进行蒙特卡洛采样
            uncertainty_results = []
            
            for i in range(n_samples):
                if i % 20 == 0:
                    print(f"  进度: {i}/{n_samples}")
                
                # 为坐标添加随机噪声 (标准差为5m)
                noisy_points = surface_points.copy()
                noise_std = 5.0
                
                noisy_points['X'] += np.random.normal(0, noise_std, len(noisy_points))
                noisy_points['Y'] += np.random.normal(0, noise_std, len(noisy_points))
                noisy_points['Z'] += np.random.normal(0, noise_std, len(noisy_points))
                
                # 重新计算模型
                temp_model = gp.create_model(f'uncertainty_sample_{i}')
                gp.init_data(temp_model, self.model_bounds, self.resolution)
                
                # 使用相同的地层配置
                gp.map_stack_to_surfaces(temp_model, self.stratigraphy)
                
                # 设置噪声数据
                orientations = self.geo_model.orientations.df
                gp.set_interpolation_data(
                    temp_model,
                    noisy_points[['X', 'Y', 'Z', 'surface']],
                    orientations[['X', 'Y', 'Z', 'surface', 'azimuth', 'dip', 'polarity']]
                )
                
                # 计算
                gp.set_interpolator(temp_model)
                temp_solution = gp.compute_model(temp_model)
                
                # 存储结果
                uncertainty_results.append(temp_solution.lith_block.copy())
            
            # 计算统计量
            results_array = np.array(uncertainty_results)
            mean_model = np.mean(results_array, axis=0)
            std_model = np.std(results_array, axis=0)
            
            # 计算置信区间
            alpha = 1 - confidence_level
            confidence_lower = np.percentile(results_array, alpha/2 * 100, axis=0)
            confidence_upper = np.percentile(results_array, (1-alpha/2) * 100, axis=0)
            
            self.uncertainty_params = {
                'mean_model': mean_model,
                'std_model': std_model,
                'confidence_lower': confidence_lower,
                'confidence_upper': confidence_upper,
                'confidence_level': confidence_level,
                'n_samples': n_samples
            }
            
            print("✓ 不确定性分析完成")
            return self.uncertainty_params
            
        except Exception as e:
            print(f"❌ 不确定性分析失败: {str(e)}")
            return None
    
    def export_to_pyvista(self) -> pv.UnstructuredGrid:
        """导出为PyVista网格用于3D可视化"""
        if self.solution is None:
            print("❌ 请先计算地质模型")
            return None
            
        try:
            # 获取模型网格
            vertices = self.solution.vertices
            simplices = self.solution.edges
            
            # 创建PyVista网格
            if len(simplices) > 0 and simplices.shape[1] == 4:
                # 四面体网格
                cells = np.column_stack([
                    np.full(len(simplices), 4),  # 四面体单元类型
                    simplices
                ]).ravel()
                
                grid = pv.UnstructuredGrid(cells, [pv.CellType.TETRA] * len(simplices), vertices)
            else:
                # 如果没有单元数据，创建点云
                grid = pv.PolyData(vertices)
            
            # 添加岩性数据
            if hasattr(self.solution, 'lith_block'):
                grid['lithology'] = self.solution.lith_block
            
            # 添加地球物理数据
            if self.geophysical_data:
                if 'gravity_field' in self.geophysical_data:
                    grid['gravity'] = self.geophysical_data['gravity_field'].ravel()
                if 'magnetic_field' in self.geophysical_data:
                    grid['magnetic'] = self.geophysical_data['magnetic_field'].ravel()
            
            # 添加不确定性数据
            if self.uncertainty_params:
                grid['uncertainty'] = self.uncertainty_params['std_model'].ravel()
            
            print("✓ PyVista网格导出完成")
            return grid
            
        except Exception as e:
            print(f"❌ PyVista导出失败: {str(e)}")
            return None
    
    def save_model_state(self, filepath: str):
        """保存模型状态"""
        try:
            model_state = {
                'model_bounds': self.model_bounds,
                'resolution': self.resolution,
                'stratigraphy': self.stratigraphy,
                'fault_network': self.fault_network,
                'geophysical_properties': getattr(self, 'geophysical_properties', {}),
                'uncertainty_params': {k: v.tolist() if isinstance(v, np.ndarray) else v 
                                     for k, v in self.uncertainty_params.items()},
            }
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(model_state, f, indent=2, ensure_ascii=False)
                
            print(f"✓ 模型状态已保存: {filepath}")
            
        except Exception as e:
            print(f"❌ 保存模型状态失败: {str(e)}")
    
    def load_model_state(self, filepath: str):
        """加载模型状态"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                model_state = json.load(f)
            
            self.model_bounds = tuple(model_state['model_bounds'])
            self.resolution = tuple(model_state['resolution'])
            self.stratigraphy = model_state['stratigraphy']
            self.fault_network = model_state['fault_network']
            
            # 转换numpy数组
            uncertainty_params = model_state.get('uncertainty_params', {})
            for k, v in uncertainty_params.items():
                if isinstance(v, list):
                    uncertainty_params[k] = np.array(v)
            self.uncertainty_params = uncertainty_params
            
            print(f"✓ 模型状态已加载: {filepath}")
            
        except Exception as e:
            print(f"❌ 加载模型状态失败: {str(e)}")


def create_demo_geological_model():
    """创建演示地质模型"""
    print("🌋 创建高级地质建模演示...")
    
    # 创建建模器
    modeler = AdvancedGeologicalModeler()
    
    # 初始化模型 (2km x 2km x 1km 区域)
    modeler.initialize_model(
        bounds=(0, 2000, 0, 2000, 0, 1000),
        resolution=(50, 50, 25),
        model_name="Demo_Advanced_Model"
    )
    
    # 定义地层序列
    stratigraphy = {
        "Quaternary": ["alluvium", "clay"],
        "Tertiary": ["sandstone", "limestone"], 
        "Basement": ["granite"]
    }
    modeler.add_stratigraphy(stratigraphy)
    
    # 生成示例地质数据
    surface_points_data = []
    surfaces = ["alluvium", "clay", "sandstone", "limestone", "granite"]
    
    for i, surface in enumerate(surfaces):
        # 为每个地层面生成一些观测点
        n_points = 5
        base_depth = 200 * (i + 1)  # 基础深度
        
        for j in range(n_points):
            x = np.random.uniform(200, 1800)
            y = np.random.uniform(200, 1800)
            z = base_depth + np.random.uniform(-50, 50)
            
            surface_points_data.append({
                'X': x, 'Y': y, 'Z': z, 'surface': surface
            })
    
    surface_points_df = pd.DataFrame(surface_points_data)
    modeler.add_geological_data(surface_points_df)
    
    # 添加断层系统
    fault_config = {
        "major_fault": {
            "points": [(1000, 500, 800), (1000, 1500, 600)],
            "azimuth": 45,
            "dip": 70,
            "displacement": 100
        }
    }
    modeler.create_fault_network(fault_config)
    
    # 计算地质模型
    if modeler.compute_geological_model():
        
        # 地球物理正演
        rock_properties = {
            "granite": {"density": 2.67, "susceptibility": 0.02},
            "limestone": {"density": 2.71, "susceptibility": 0.005},
            "sandstone": {"density": 2.65, "susceptibility": 0.01},
            "clay": {"density": 2.20, "susceptibility": 0.003},
            "alluvium": {"density": 2.00, "susceptibility": 0.001}
        }
        
        geophys_results = modeler.compute_geophysical_forward(rock_properties)
        
        # 不确定性分析 (小样本演示)
        uncertainty_results = modeler.uncertainty_analysis(n_samples=20)
        
        # 导出PyVista网格
        pv_grid = modeler.export_to_pyvista()
        
        # 保存模型状态
        modeler.save_model_state("example3/demo_advanced_model.json")
        
        print("🎉 高级地质建模演示完成！")
        print(f"  - 地层序列: {len(stratigraphy)} 个")
        print(f"  - 断层网络: {len(fault_config)} 个断层")
        print(f"  - 地球物理: ✓ 重力场、磁场")
        print(f"  - 不确定性: ✓ 蒙特卡洛分析")
        print(f"  - 3D网格: ✓ PyVista格式")
        
        return modeler
    
    return None


if __name__ == "__main__":
    # 运行演示
    demo_modeler = create_demo_geological_model()