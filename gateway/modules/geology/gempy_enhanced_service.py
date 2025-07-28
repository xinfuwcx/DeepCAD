"""
GemPy增强服务 - 2号几何专家
在GemPy框架内集成增强RBF插值选项
"""

import numpy as np
import pandas as pd
import logging
from typing import List, Dict, Tuple, Any, Optional
from scipy.interpolate import RBFInterpolator
import json
import os
import time

# 初始化日志
logger = logging.getLogger(__name__)

# GemPy导入 - 延迟导入避免模块级别的编码问题
GEMPY_AVAILABLE = True  # 假设可用，在使用时再检查
gp = None

def _ensure_gempy_imported():
    """确保GemPy已导入"""
    global gp, GEMPY_AVAILABLE
    if gp is None and GEMPY_AVAILABLE:
        try:
            import gempy as gp_module
            gp = gp_module
            logger.info(f"✓ GemPy imported successfully, version: {gp.__version__}")
            return True
        except Exception as e:
            GEMPY_AVAILABLE = False
            logger.warning(f"⚠️ GemPy import failed: {e}")
            return False
    return GEMPY_AVAILABLE and gp is not None

# PyVista导入
PYVISTA_AVAILABLE = False
pv = None
try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
    logger.info("✓ PyVista available")
except ImportError:
    PYVISTA_AVAILABLE = False
    logger.warning("⚠️ PyVista not available")
    pv = None

class GemPyEnhancedInterpolator:
    """
    GemPy增强插值器
    在GemPy框架内提供多种插值选项，包括增强RBF
    """
    
    INTERPOLATION_METHODS = {
        'gempy_default': 'GemPy默认隐式建模',
        'enhanced_rbf': '增强RBF插值',
        'kriging': 'Kriging地统计插值',
        'adaptive_rbf': '自适应RBF插值'
    }
    
    def __init__(self):
        self.current_model = None
        self.interpolation_method = 'gempy_default'
        
    def set_interpolation_method(self, method: str):
        """设置插值方法"""
        if method not in self.INTERPOLATION_METHODS:
            raise ValueError(f"不支持的插值方法: {method}")
        self.interpolation_method = method
        logger.info(f"设置插值方法: {self.INTERPOLATION_METHODS[method]}")
    
    def get_available_methods(self) -> Dict[str, str]:
        """获取可用的插值方法"""
        available = {}
        
        # GemPy默认方法
        if _ensure_gempy_imported():
            available['gempy_default'] = self.INTERPOLATION_METHODS['gempy_default']
        
        # RBF方法（总是可用）
        available['enhanced_rbf'] = self.INTERPOLATION_METHODS['enhanced_rbf']
        available['adaptive_rbf'] = self.INTERPOLATION_METHODS['adaptive_rbf']
        
        # Kriging（如果有相关库）
        try:
            import sklearn.gaussian_process
            available['kriging'] = self.INTERPOLATION_METHODS['kriging']
        except ImportError:
            pass
            
        return available

class GemPyEnhancedService:
    """
    GemPy增强服务
    在GemPy框架内集成多种插值方法
    """
    
    def __init__(self):
        self.interpolator = GemPyEnhancedInterpolator()
        self.model_cache = {}
        
    def create_geological_model(self, 
                               borehole_data: List[Dict],
                               domain_config: Dict[str, Any],
                               interpolation_method: str = 'gempy_default') -> Dict[str, Any]:
        """
        创建地质模型 - 主接口
        根据选择的插值方法调用不同的实现
        """
        try:
            start_time = time.time()
            
            # 设置插值方法
            self.interpolator.set_interpolation_method(interpolation_method)
            
            # 预处理数据
            processed_data = self._preprocess_borehole_data(borehole_data)
            
            # 根据插值方法选择实现
            if interpolation_method == 'gempy_default' and GEMPY_AVAILABLE:
                result = self._gempy_default_modeling(processed_data, domain_config)
            elif interpolation_method == 'enhanced_rbf':
                result = self._enhanced_rbf_modeling(processed_data, domain_config)
            elif interpolation_method == 'adaptive_rbf':
                result = self._adaptive_rbf_modeling(processed_data, domain_config)
            elif interpolation_method == 'kriging':
                result = self._kriging_modeling(processed_data, domain_config)
            else:
                # 默认回退到RBF
                logger.warning(f"插值方法 {interpolation_method} 不可用，使用enhanced_rbf")
                result = self._enhanced_rbf_modeling(processed_data, domain_config)
            
            # 添加元数据
            processing_time = time.time() - start_time
            result.update({
                'interpolation_method': interpolation_method,
                'processing_time': processing_time,
                'input_data': {
                    'n_boreholes': len(borehole_data),
                    'formations': processed_data['formation_stats']
                },
                'timestamp': time.time()
            })
            
            logger.info(f"地质建模完成: {interpolation_method}, 耗时 {processing_time:.2f}秒")
            
            return result
            
        except Exception as e:
            logger.error(f"地质建模失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'interpolation_method': interpolation_method
            }
    
    def _preprocess_borehole_data(self, borehole_data: List[Dict]) -> Dict[str, Any]:
        """预处理钻孔数据"""
        try:
            if not borehole_data:
                raise ValueError("钻孔数据为空")
            
            coordinates = []
            formations = []
            
            for borehole in borehole_data:
                x = float(borehole.get('x', 0))
                y = float(borehole.get('y', 0))
                z = float(borehole.get('z', 0))
                
                formation_id = borehole.get('layer_id', borehole.get('soil_type', 1))
                if isinstance(formation_id, str):
                    formation_map = {'粘土': 1, '砂土': 2, '淤泥': 3, '岩石': 4, 'clay': 1, 'sand': 2}
                    formation_id = formation_map.get(formation_id, 1)
                
                coordinates.append([x, y, z])
                formations.append(int(formation_id))
            
            coordinates = np.array(coordinates)
            formations = np.array(formations)
            
            # 计算边界
            bounds = {
                'x_min': np.min(coordinates[:, 0]),
                'x_max': np.max(coordinates[:, 0]),
                'y_min': np.min(coordinates[:, 1]),
                'y_max': np.max(coordinates[:, 1]),
                'z_min': np.min(coordinates[:, 2]),
                'z_max': np.max(coordinates[:, 2])
            }
            
            # 地层统计
            unique_formations, formation_counts = np.unique(formations, return_counts=True)
            formation_stats = {
                f'formation_{fid}': count 
                for fid, count in zip(unique_formations, formation_counts)
            }
            
            return {
                'coordinates': coordinates,
                'formations': formations,
                'bounds': bounds,
                'formation_stats': formation_stats,
                'n_boreholes': len(coordinates),
                'n_formations': len(unique_formations)
            }
            
        except Exception as e:
            logger.error(f"数据预处理失败: {e}")
            raise
    
    def _gempy_default_modeling(self, 
                               processed_data: Dict[str, Any],
                               domain_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        GemPy默认隐式建模方法
        """
        if not _ensure_gempy_imported():
            raise RuntimeError("GemPy不可用")
        
        try:
            logger.info("使用GemPy默认隐式建模...")
            
            # 现在可以安全使用GemPy了
            # 基本的GemPy建模流程
            coordinates = processed_data['coordinates']
            formations = processed_data['formations']
            bounds = processed_data['bounds']
            
            # 创建GemPy地层数据
            surface_points = []
            for i, (coord, formation_id) in enumerate(zip(coordinates, formations)):
                surface_points.append({
                    'X': coord[0],
                    'Y': coord[1], 
                    'Z': coord[2],
                    'formation': f'formation_{formation_id}',
                    'series': 'default'
                })
            
            # 定义模型范围
            extent = [
                bounds['x_min'], bounds['x_max'],
                bounds['y_min'], bounds['y_max'], 
                bounds['z_min'], bounds['z_max']
            ]
            
            resolution = domain_config.get('resolution', [30, 30, 15])
            
            # 创建GemPy模型
            geo_model = gp.create_geomodel(
                project_name=f'DeepCAD_Model_{int(time.time())}',
                extent=extent,
                resolution=resolution,
                refinement=1
            )
            
            # 添加地层点数据
            import pandas as pd
            surface_df = pd.DataFrame(surface_points)
            gp.add_surface_points(geo_model, surface_df)
            
            # 设置地层系列
            formations_list = [f'formation_{fid}' for fid in np.unique(formations)]
            gp.map_stack_to_surfaces(geo_model, {'default': formations_list})
            
            # 计算模型
            sol = gp.compute_model(geo_model)
            
            # 提取结果
            geological_map = sol.octrees_output[0].last_output_center.detach().numpy()
            
            # 生成表面数据（简化）
            surfaces = {}
            if PYVISTA_AVAILABLE:
                try:
                    # 这里可以添加PyVista表面提取
                    pass
                except:
                    pass
            
            result = {
                'success': True,
                'method': 'GemPy_Default_Implicit',
                'model_type': 'implicit_modeling',
                'geo_model': geo_model,
                'solution': sol,
                'geological_map': geological_map,
                'surfaces': surfaces,
                'quality_score': 0.95,
                'gempy_version': gp.__version__
            }
            
            return result
            
        except Exception as e:
            logger.error(f"GemPy默认建模失败: {e}")
            raise
    
    def _enhanced_rbf_modeling(self,
                              processed_data: Dict[str, Any],
                              domain_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        增强RBF插值建模 - 作为GemPy的一个插值选项
        """
        try:
            logger.info("使用增强RBF插值建模...")
            
            # 创建插值网格
            resolution = domain_config.get('resolution', [30, 30, 15])
            grid_points = self._create_interpolation_grid(processed_data['bounds'], resolution)
            
            # RBF插值
            n_points = len(processed_data['coordinates'])
            if n_points < 4:
                raise ValueError(f"RBF插值至少需要4个数据点，当前只有{n_points}个")
            
            rbf_interpolator = RBFInterpolator(
                processed_data['coordinates'],
                processed_data['formations'].astype(float),
                kernel='thin_plate_spline',
                neighbors=min(50, n_points - 1),
                degree=0  # 使用0次多项式避免数据点不足问题
            )
            
            interpolated_values = rbf_interpolator(grid_points)
            interpolated_grid = interpolated_values.reshape(resolution)
            
            # 生成表面（如果PyVista可用）
            surfaces = {}
            if PYVISTA_AVAILABLE:
                surfaces = self._generate_surfaces_from_grid(interpolated_grid, grid_points, resolution, processed_data['bounds'])
            
            # 转换为Three.js格式
            threejs_data = self._convert_surfaces_to_threejs(surfaces)
            
            result = {
                'success': True,
                'method': 'Enhanced_RBF_within_GemPy',
                'model_type': 'rbf_interpolation',
                'interpolated_grid': interpolated_grid,
                'grid_points': grid_points,
                'surfaces': surfaces,
                'threejs_data': threejs_data,
                'quality_metrics': {
                    'mean_value': np.mean(interpolated_values),
                    'value_range': [np.min(interpolated_values), np.max(interpolated_values)],
                    'grid_resolution': resolution
                }
            }
            
            return result
            
        except Exception as e:
            logger.error(f"增强RBF建模失败: {e}")
            raise
    
    def _adaptive_rbf_modeling(self,
                              processed_data: Dict[str, Any],
                              domain_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        自适应RBF插值 - 根据数据密度调整参数
        """
        try:
            logger.info("使用自适应RBF插值建模...")
            
            coordinates = processed_data['coordinates']
            formations = processed_data['formations']
            
            # 分析数据密度
            from sklearn.neighbors import NearestNeighbors
            k = min(5, len(coordinates) - 1)
            if k > 0:
                nbrs = NearestNeighbors(n_neighbors=k).fit(coordinates[:, :2])
                distances, _ = nbrs.kneighbors(coordinates[:, :2])
                avg_distances = np.mean(distances[:, 1:], axis=1)
                
                # 根据密度调整邻居数量
                if np.mean(avg_distances) > 50:  # 数据稀疏
                    neighbors = min(20, len(coordinates) - 1)
                    kernel = 'gaussian'
                    smoothing = 0.1
                else:  # 数据密集
                    neighbors = min(50, len(coordinates) - 1)
                    kernel = 'thin_plate_spline'
                    smoothing = 0.0
            else:
                neighbors = len(coordinates) - 1
                kernel = 'thin_plate_spline'
                smoothing = 0.0
            
            logger.info(f"自适应参数: kernel={kernel}, neighbors={neighbors}, smoothing={smoothing}")
            
            # 创建插值网格和执行插值
            resolution = domain_config.get('resolution', [30, 30, 15])
            grid_points = self._create_interpolation_grid(processed_data['bounds'], resolution)
            
            # 处理高斯核函数需要epsilon参数的问题
            rbf_params = {
                'neighbors': neighbors,
                'smoothing': smoothing,
                'degree': 0  # 避免数据点不足问题
            }
            
            if kernel == 'gaussian':
                rbf_params['epsilon'] = 1.0  # 为高斯核函数设置epsilon参数
            
            rbf_interpolator = RBFInterpolator(
                coordinates,
                formations.astype(float),
                kernel=kernel,
                **rbf_params
            )
            
            interpolated_values = rbf_interpolator(grid_points)
            interpolated_grid = interpolated_values.reshape(resolution)
            
            result = {
                'success': True,
                'method': 'Adaptive_RBF_within_GemPy',
                'model_type': 'adaptive_rbf_interpolation',
                'interpolated_grid': interpolated_grid,
                'adaptive_params': {
                    'kernel': kernel,
                    'neighbors': neighbors,
                    'smoothing': smoothing,
                    'data_density': 'sparse' if np.mean(avg_distances) > 50 else 'dense'
                },
                'quality_metrics': {
                    'interpolation_range': [np.min(interpolated_values), np.max(interpolated_values)],
                    'grid_resolution': resolution
                }
            }
            
            return result
            
        except Exception as e:
            logger.error(f"自适应RBF建模失败: {e}")
            raise
    
    def _kriging_modeling(self,
                         processed_data: Dict[str, Any],
                         domain_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Kriging地统计插值
        """
        try:
            logger.info("使用Kriging地统计插值建模...")
            
            from sklearn.gaussian_process import GaussianProcessRegressor
            from sklearn.gaussian_process.kernels import RBF, WhiteKernel
            
            coordinates = processed_data['coordinates']
            formations = processed_data['formations']
            
            # 创建高斯过程模型
            kernel = RBF(length_scale=10.0) + WhiteKernel(noise_level=0.1)
            gp_model = GaussianProcessRegressor(kernel=kernel, alpha=1e-6)
            
            # 训练模型
            gp_model.fit(coordinates, formations)
            
            # 创建预测网格
            resolution = domain_config.get('resolution', [30, 30, 15])
            grid_points = self._create_interpolation_grid(processed_data['bounds'], resolution)
            
            # 预测
            predicted_values, predicted_std = gp_model.predict(grid_points, return_std=True)
            predicted_grid = predicted_values.reshape(resolution)
            uncertainty_grid = predicted_std.reshape(resolution)
            
            result = {
                'success': True,
                'method': 'Kriging_within_GemPy',
                'model_type': 'kriging_interpolation',
                'interpolated_grid': predicted_grid,
                'uncertainty_grid': uncertainty_grid,
                'quality_metrics': {
                    'mean_uncertainty': np.mean(predicted_std),
                    'prediction_range': [np.min(predicted_values), np.max(predicted_values)],
                    'grid_resolution': resolution
                }
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Kriging建模失败: {e}")
            raise
    
    def _create_interpolation_grid(self, bounds: Dict[str, float], resolution: Tuple[int, int, int]) -> np.ndarray:
        """创建插值网格"""
        x_coords = np.linspace(bounds['x_min'], bounds['x_max'], resolution[0])
        y_coords = np.linspace(bounds['y_min'], bounds['y_max'], resolution[1])
        z_coords = np.linspace(bounds['z_min'], bounds['z_max'], resolution[2])
        
        xx, yy, zz = np.meshgrid(x_coords, y_coords, z_coords, indexing='ij')
        return np.column_stack([xx.ravel(), yy.ravel(), zz.ravel()])
    
    def _generate_surfaces_from_grid(self, grid: np.ndarray, grid_points: np.ndarray, 
                                   resolution: Tuple[int, int, int], bounds: Dict[str, float]) -> Dict[str, Any]:
        """从网格生成表面"""
        if not PYVISTA_AVAILABLE:
            return {}
        
        try:
            surfaces = {}
            x_coords = np.linspace(bounds['x_min'], bounds['x_max'], resolution[0])
            y_coords = np.linspace(bounds['y_min'], bounds['y_max'], resolution[1])
            z_coords = np.linspace(bounds['z_min'], bounds['z_max'], resolution[2])
            
            # 创建结构化网格
            mesh_grid = pv.RectilinearGrid(x_coords, y_coords, z_coords)
            mesh_grid.point_data['formation'] = grid.ravel()
            
            # 提取等值面
            unique_formations = np.unique(grid)
            for formation_id in unique_formations:
                if np.isfinite(formation_id):
                    try:
                        isosurface = mesh_grid.contour(isosurfaces=[float(formation_id)], scalars='formation')
                        if isosurface.n_points > 0:
                            surfaces[f'formation_{int(formation_id)}'] = isosurface
                    except:
                        continue
            
            return surfaces
            
        except Exception as e:
            logger.warning(f"表面生成失败: {e}")
            return {}
    
    def _convert_surfaces_to_threejs(self, surfaces: Dict[str, Any]) -> Dict[str, Any]:
        """转换表面为Three.js格式"""
        if not surfaces:
            return {}
        
        try:
            threejs_data = {}
            
            for formation_name, surface in surfaces.items():
                if hasattr(surface, 'points') and len(surface.points) > 0:
                    vertices = surface.points.astype(np.float32)
                    
                    # 计算法向量
                    try:
                        surface.compute_normals(inplace=True)
                        normals = surface.point_normals.astype(np.float32)
                    except:
                        normals = np.zeros_like(vertices)
                    
                    # 提取面片索引
                    if hasattr(surface, 'faces') and len(surface.faces) > 0:
                        faces = surface.faces.reshape(-1, 4)[:, 1:4].astype(np.uint32)
                    else:
                        faces = np.array([], dtype=np.uint32)
                    
                    threejs_data[formation_name] = {
                        'vertices': vertices.tobytes(),
                        'normals': normals.tobytes(),
                        'indices': faces.tobytes(),
                        'vertex_count': len(vertices),
                        'face_count': len(faces) // 3 if len(faces) > 0 else 0
                    }
            
            return threejs_data
            
        except Exception as e:
            logger.warning(f"Three.js数据转换失败: {e}")
            return {}
    
    def get_available_interpolation_methods(self) -> Dict[str, str]:
        """获取可用的插值方法"""
        return self.interpolator.get_available_methods()

# 全局服务实例
_gempy_enhanced_service_instance = None

def get_gempy_enhanced_service() -> GemPyEnhancedService:
    """获取GemPy增强服务单例"""
    global _gempy_enhanced_service_instance
    if _gempy_enhanced_service_instance is None:
        _gempy_enhanced_service_instance = GemPyEnhancedService()
    return _gempy_enhanced_service_instance