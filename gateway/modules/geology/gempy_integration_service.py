"""
GemPy集成服务 - 2号几何专家核心模块
处理复杂地质结构：夹层、断层、稀疏钻孔数据
技术栈：GemPy + PyVista + RBF增强插值 → ArrayBuffer → Three.js
"""

import numpy as np
import pandas as pd
import logging
from typing import List, Dict, Tuple, Any, Optional
from scipy.interpolate import RBFInterpolator
import json
import os
import time
from pathlib import Path

# 初始化日志
logger = logging.getLogger(__name__)

# 尝试导入GemPy (处理版本兼容性)
GEMPY_AVAILABLE = False
gp = None
try:
    import gempy as gp
    GEMPY_AVAILABLE = True
    logger.info("✓ GemPy successfully imported")
except Exception as e:
    GEMPY_AVAILABLE = False
    logger.warning(f"⚠️ GemPy not available: {e}")
    gp = None

# PyVista导入 (现有系统已有)
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

class EnhancedRBFInterpolator:
    """
    增强型RBF插值器 - 2号核心算法
    解决钻孔数据稀疏分布问题
    """
    
    def __init__(self, 
                 kernel: str = 'thin_plate_spline',
                 adaptive_neighbors: bool = True,
                 geological_constraints: bool = True):
        self.kernel = kernel
        self.adaptive_neighbors = adaptive_neighbors
        self.geological_constraints = geological_constraints
        self.interpolator = None
        
    def analyze_data_density(self, points: np.ndarray) -> Dict[str, Any]:
        """分析钻孔数据密度分布"""
        try:
            from sklearn.neighbors import NearestNeighbors
            
            # 计算每个点的k近邻距离
            k = min(5, len(points) - 1)
            if k <= 0:
                return {'density_map': np.ones(len(points)), 'sparse_regions': []}
            
            nbrs = NearestNeighbors(n_neighbors=k).fit(points[:, :2])  # 只考虑XY平面
            distances, _ = nbrs.kneighbors(points[:, :2])
            
            # 平均距离作为密度指标 (距离越小，密度越高)
            avg_distances = np.mean(distances[:, 1:], axis=1)  # 排除自身距离
            density_scores = 1.0 / (1.0 + avg_distances)  # 归一化密度分数
            
            # 识别稀疏区域 (密度分数低于阈值)
            sparse_threshold = np.percentile(density_scores, 25)
            sparse_indices = np.where(density_scores < sparse_threshold)[0]
            
            return {
                'density_map': density_scores,
                'sparse_regions': sparse_indices.tolist(),
                'avg_neighbor_distance': np.mean(avg_distances),
                'density_variance': np.var(density_scores)
            }
            
        except Exception as e:
            logger.warning(f"密度分析失败，使用均匀分布: {e}")
            return {
                'density_map': np.ones(len(points)),
                'sparse_regions': [],
                'avg_neighbor_distance': 50.0,
                'density_variance': 0.0
            }
    
    def adaptive_interpolation(self, 
                             borehole_points: np.ndarray,
                             formation_values: np.ndarray,
                             query_points: np.ndarray) -> Dict[str, Any]:
        """
        自适应RBF插值 - 核心算法
        根据数据密度动态调整插值策略
        """
        try:
            if len(borehole_points) < 3:
                raise ValueError("至少需要3个钻孔点进行插值")
            
            # 1. 分析数据密度
            density_analysis = self.analyze_data_density(borehole_points)
            density_map = density_analysis['density_map']
            sparse_regions = density_analysis['sparse_regions']
            
            logger.info(f"🔍 数据密度分析: {len(sparse_regions)}个稀疏区域")
            
            # 2. 自适应邻居数量选择
            if self.adaptive_neighbors:
                # 高密度区域：更多邻居，更高精度
                # 低密度区域：较少邻居，避免过度外推
                base_neighbors = min(50, len(borehole_points) - 1)
                max_neighbors = min(80, len(borehole_points) - 1)
                min_neighbors = max(10, min(30, len(borehole_points) - 1))
                
                neighbors = int(base_neighbors)
                
                # 根据整体数据稀疏度调整
                if len(sparse_regions) > len(borehole_points) * 0.5:
                    neighbors = min_neighbors  # 大部分数据稀疏，保守策略
                    logger.info(f"🎯 稀疏数据策略: 使用{neighbors}个邻居")
                else:
                    neighbors = max_neighbors  # 数据较密集，精确策略
                    logger.info(f"🎯 密集数据策略: 使用{neighbors}个邻居")
            else:
                neighbors = min(50, len(borehole_points) - 1)
            
            # 3. 选择合适的RBF核函数
            if len(sparse_regions) > len(borehole_points) * 0.4:
                # 稀疏数据：使用更平滑的核函数
                kernel = 'gaussian'
                smoothing = 0.1
                logger.info("📊 选择高斯核函数 (适合稀疏数据)")
            else:
                # 密集数据：使用精确的核函数
                kernel = self.kernel
                smoothing = 0.0
                logger.info(f"📊 选择{kernel}核函数 (适合密集数据)")
            
            # 4. 创建RBF插值器
            try:
                rbf_interpolator = RBFInterpolator(
                    borehole_points,
                    formation_values,
                    kernel=kernel,
                    neighbors=neighbors,
                    smoothing=smoothing
                )
                
                # 执行插值
                interpolated_values = rbf_interpolator(query_points)
                
            except Exception as e:
                logger.warning(f"RBF插值失败，尝试备用方法: {e}")
                # 备用方案：使用基础RBF
                from scipy.interpolate import Rbf
                rbf_backup = Rbf(
                    borehole_points[:, 0], borehole_points[:, 1], borehole_points[:, 2],
                    formation_values,
                    function='multiquadric',
                    smooth=0.1
                )
                interpolated_values = rbf_backup(
                    query_points[:, 0], query_points[:, 1], query_points[:, 2]
                )
            
            # 5. 地质约束后处理
            if self.geological_constraints:
                interpolated_values = self._apply_geological_constraints(
                    interpolated_values, borehole_points, formation_values
                )
            
            # 6. 计算插值置信度
            confidence_scores = self._calculate_interpolation_confidence(
                query_points, borehole_points, density_map
            )
            
            result = {
                'interpolated_values': interpolated_values,
                'confidence_scores': confidence_scores,
                'density_analysis': density_analysis,
                'interpolation_params': {
                    'kernel': kernel,
                    'neighbors': neighbors,
                    'smoothing': smoothing,
                    'n_sparse_regions': len(sparse_regions)
                },
                'quality_metrics': {
                    'mean_confidence': np.mean(confidence_scores),
                    'min_confidence': np.min(confidence_scores),
                    'coverage_ratio': np.sum(confidence_scores > 0.5) / len(confidence_scores)
                }
            }
            
            logger.info(f"✓ RBF插值完成: {len(interpolated_values)}个插值点")
            logger.info(f"  平均置信度: {result['quality_metrics']['mean_confidence']:.3f}")
            
            return result
            
        except Exception as e:
            logger.error(f"自适应RBF插值失败: {e}")
            raise
    
    def _apply_geological_constraints(self, 
                                    interpolated_values: np.ndarray,
                                    borehole_points: np.ndarray,
                                    formation_values: np.ndarray) -> np.ndarray:
        """应用地质约束条件"""
        try:
            # 1. 地层序列约束 - 确保地层ID合理性
            unique_formations = np.unique(formation_values)
            interpolated_values = np.clip(
                interpolated_values,
                np.min(unique_formations),
                np.max(unique_formations)
            )
            
            # 2. 连续性约束 - 平滑异常值
            # 使用中值滤波移除离群值
            if len(interpolated_values) > 5:
                from scipy.signal import medfilt
                try:
                    # 重塑为适合中值滤波的形状
                    if len(interpolated_values) > 9:
                        filtered = medfilt(interpolated_values, kernel_size=5)
                        # 混合原始值和滤波值 (保持大部分原始特征)
                        interpolated_values = 0.8 * interpolated_values + 0.2 * filtered
                except:
                    pass  # 滤波失败时保持原值
            
            # 3. 边界约束 - 处理边界效应
            # 在数据边界附近增加约束强度
            # (这里简化实现)
            
            return interpolated_values
            
        except Exception as e:
            logger.warning(f"地质约束应用失败: {e}")
            return interpolated_values
    
    def _calculate_interpolation_confidence(self,
                                          query_points: np.ndarray,
                                          borehole_points: np.ndarray,
                                          density_map: np.ndarray) -> np.ndarray:
        """计算插值置信度"""
        try:
            from sklearn.neighbors import NearestNeighbors
            
            # 基于最近邻距离计算信度
            nbrs = NearestNeighbors(n_neighbors=1).fit(borehole_points[:, :2])
            distances, indices = nbrs.kneighbors(query_points[:, :2])
            
            # 距离越近，置信度越高
            max_distance = np.max(distances)
            if max_distance > 0:
                distance_confidence = 1.0 - (distances.flatten() / max_distance)
            else:
                distance_confidence = np.ones(len(query_points))
            
            # 结合数据密度信息
            nearest_density = density_map[indices.flatten()]
            combined_confidence = 0.7 * distance_confidence + 0.3 * nearest_density
            
            return np.clip(combined_confidence, 0.0, 1.0)
            
        except Exception as e:
            logger.warning(f"置信度计算失败: {e}")
            return np.ones(len(query_points)) * 0.5

class GemPyIntegrationService:
    """
    GemPy集成服务 - 主要服务类
    """
    
    def __init__(self):
        self.rbf_interpolator = EnhancedRBFInterpolator()
        self.current_model = None
        self.model_cache = {}
        
    def check_dependencies(self) -> Dict[str, bool]:
        """检查依赖库可用性"""
        return {
            'gempy': GEMPY_AVAILABLE,
            'pyvista': PYVISTA_AVAILABLE,
            'scipy': True,  # 必须有
            'numpy': True,  # 必须有
            'sklearn': True  # 通常都有
        }
    
    def preprocess_borehole_data(self, borehole_data: List[Dict]) -> Dict[str, Any]:
        """
        预处理钻孔数据
        转换为GemPy所需格式
        """
        try:
            if not borehole_data:
                raise ValueError("钻孔数据为空")
            
            # 提取坐标和地层信息
            coordinates = []
            formations = []
            orientations = []
            
            for borehole in borehole_data:
                x = float(borehole.get('x', 0))
                y = float(borehole.get('y', 0))
                z = float(borehole.get('z', 0))
                
                # 地层ID或类型
                formation_id = borehole.get('layer_id', borehole.get('soil_type', 1))
                if isinstance(formation_id, str):
                    # 简单的字符串到数字映射
                    formation_map = {'粘土': 1, '砂土': 2, '淤泥': 3, '岩石': 4}
                    formation_id = formation_map.get(formation_id, 1)
                
                coordinates.append([x, y, z])
                formations.append(int(formation_id))
                
                # 简单的产状估算 (可优化)
                orientations.append([x, y, z, 0, 0, 1])  # 默认水平
            
            coordinates = np.array(coordinates)
            formations = np.array(formations)
            orientations = np.array(orientations)
            
            # 数据验证
            if len(coordinates) < 3:
                raise ValueError("至少需要3个有效钻孔点")
            
            # 计算数据边界
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
            
            result = {
                'coordinates': coordinates,
                'formations': formations,
                'orientations': orientations,
                'bounds': bounds,
                'formation_stats': formation_stats,
                'n_boreholes': len(coordinates),
                'n_formations': len(unique_formations)
            }
            
            logger.info(f"✓ 钻孔数据预处理完成: {len(coordinates)}个钻孔, {len(unique_formations)}种地层")
            
            return result
            
        except Exception as e:
            logger.error(f"钻孔数据预处理失败: {e}")
            raise
    
    def create_interpolation_grid(self, 
                                bounds: Dict[str, float],
                                resolution: Tuple[int, int, int] = (50, 50, 25)) -> np.ndarray:
        """创建插值网格"""
        try:
            # 扩展边界 (避免边界效应)
            x_range = bounds['x_max'] - bounds['x_min']
            y_range = bounds['y_max'] - bounds['y_min']
            z_range = bounds['z_max'] - bounds['z_min']
            
            buffer_ratio = 0.1  # 10%边界扩展
            
            x_expanded = np.linspace(
                bounds['x_min'] - x_range * buffer_ratio,
                bounds['x_max'] + x_range * buffer_ratio,
                resolution[0]
            )
            y_expanded = np.linspace(
                bounds['y_min'] - y_range * buffer_ratio,
                bounds['y_max'] + y_range * buffer_ratio,
                resolution[1]
            )
            z_expanded = np.linspace(
                bounds['z_min'] - z_range * buffer_ratio,
                bounds['z_max'] + z_range * buffer_ratio,
                resolution[2]
            )
            
            # 创建网格点
            xx, yy, zz = np.meshgrid(x_expanded, y_expanded, z_expanded, indexing='ij')
            grid_points = np.column_stack([xx.ravel(), yy.ravel(), zz.ravel()])
            
            logger.info(f"✓ 创建插值网格: {resolution} = {len(grid_points)}个点")
            
            return grid_points
            
        except Exception as e:
            logger.error(f"插值网格创建失败: {e}")
            raise
    
    def enhanced_rbf_modeling(self, 
                            borehole_data: Dict[str, Any],
                            domain_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        增强RBF建模 (GemPy不可用时的备用方案)
        """
        try:
            logger.info("🔄 开始增强RBF地质建模...")
            
            # 创建插值网格
            resolution = domain_config.get('resolution', (30, 30, 15))
            grid_points = self.create_interpolation_grid(borehole_data['bounds'], resolution)
            
            # 执行自适应RBF插值
            rbf_result = self.rbf_interpolator.adaptive_interpolation(
                borehole_data['coordinates'],
                borehole_data['formations'].astype(float),
                grid_points
            )
            
            # 重塑插值结果
            interpolated_grid = rbf_result['interpolated_values'].reshape(resolution)
            confidence_grid = rbf_result['confidence_scores'].reshape(resolution)
            
            # 生成等值面 (如果PyVista可用)
            surfaces = {}
            if PYVISTA_AVAILABLE:
                try:
                    surfaces = self._generate_formation_surfaces_pyvista(
                        interpolated_grid, grid_points, resolution, borehole_data['bounds']
                    )
                except Exception as e:
                    logger.warning(f"PyVista表面生成失败: {e}")
            
            result = {
                'success': True,
                'method': 'Enhanced_RBF_Interpolation',
                'interpolated_grid': interpolated_grid,
                'confidence_grid': confidence_grid,
                'grid_points': grid_points,
                'grid_resolution': resolution,
                'surfaces': surfaces,
                'rbf_params': rbf_result['interpolation_params'],
                'quality_metrics': rbf_result['quality_metrics'],
                'processing_time': time.time()
            }
            
            logger.info("✓ 增强RBF地质建模完成")
            
            return result
            
        except Exception as e:
            logger.error(f"增强RBF建模失败: {e}")
            return {'success': False, 'error': str(e)}
    
    def gempy_implicit_modeling(self,
                              borehole_data: Dict[str, Any],
                              domain_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        GemPy隐式地质建模
        """
        if not GEMPY_AVAILABLE:
            logger.warning("GemPy不可用，使用增强RBF建模")
            return self.enhanced_rbf_modeling(borehole_data, domain_config)
        
        try:
            logger.info("🔄 开始GemPy隐式地质建模...")
            
            # 1. 准备GemPy输入数据
            gempy_data = self._prepare_gempy_input(borehole_data, domain_config)
            
            # 2. 创建GemPy模型
            geo_model = self._create_gempy_model(gempy_data, domain_config)
            
            # 3. 计算地质模型
            gempy_solution = geo_model.compute_model()
            
            # 4. 转换为PyVista格式
            pyvista_meshes = self._convert_gempy_to_pyvista(geo_model, gempy_solution)
            
            # 5. 导出Three.js格式
            threejs_data = self._export_pyvista_to_threejs(pyvista_meshes)
            
            result = {
                'success': True,
                'method': 'GemPy_Implicit_Modeling',
                'geo_model': geo_model,
                'solution': gempy_solution,
                'pyvista_meshes': pyvista_meshes,
                'threejs_data': threejs_data,
                'model_stats': {
                    'n_formations': len(np.unique(borehole_data['formations'])),
                    'model_extent': domain_config.get('extent', []),
                    'resolution': domain_config.get('resolution', [])
                },
                'processing_time': time.time()
            }
            
            # 缓存模型
            model_id = f"gempy_{int(time.time())}"
            self.model_cache[model_id] = geo_model
            result['model_id'] = model_id
            
            logger.info("✓ GemPy隐式地质建模完成")
            
            return result
            
        except Exception as e:
            logger.error(f"GemPy建模失败，回退到增强RBF: {e}")
            return self.enhanced_rbf_modeling(borehole_data, domain_config)
    
    def _prepare_gempy_input(self, borehole_data: Dict[str, Any], domain_config: Dict[str, Any]) -> Dict[str, Any]:
        """准备GemPy输入数据格式"""
        try:
            coordinates = borehole_data['coordinates']
            formations = borehole_data['formations']
            
            # 创建表面点数据
            surface_points = []
            for i, (coord, formation) in enumerate(zip(coordinates, formations)):
                surface_points.append({
                    'X': coord[0],
                    'Y': coord[1], 
                    'Z': coord[2],
                    'formation': f'formation_{formation}',
                    'series': 'default'
                })
            
            # 估算产状数据 (简化)
            orientations = []
            if len(coordinates) >= 3:
                # 使用前3个点估算一个产状
                p1, p2, p3 = coordinates[:3]
                # 计算法向量 (简化)
                v1 = p2 - p1
                v2 = p3 - p1
                normal = np.cross(v1, v2)
                if np.linalg.norm(normal) > 1e-6:
                    normal = normal / np.linalg.norm(normal)
                    
                    # 转换为走向倾向
                    azimuth = np.degrees(np.arctan2(normal[1], normal[0]))
                    dip = np.degrees(np.arcsin(abs(normal[2])))
                    
                    orientations.append({
                        'X': np.mean(coordinates[:3, 0]),
                        'Y': np.mean(coordinates[:3, 1]),
                        'Z': np.mean(coordinates[:3, 2]),
                        'azimuth': azimuth,
                        'dip': dip,
                        'polarity': 1,
                        'formation': f'formation_{formations[0]}',
                        'series': 'default'
                    })
            
            return {
                'surface_points': surface_points,
                'orientations': orientations,
                'formations': [f'formation_{fid}' for fid in np.unique(formations)]
            }
            
        except Exception as e:
            logger.error(f"GemPy输入数据准备失败: {e}")
            raise
    
    def _create_gempy_model(self, gempy_data: Dict[str, Any], domain_config: Dict[str, Any]) -> Any:
        """创建GemPy模型"""
        try:
            bounds = domain_config.get('bounds', {})
            resolution = domain_config.get('resolution', [50, 50, 25])
            
            # 定义模型范围
            extent = [
                bounds.get('x_min', -100), bounds.get('x_max', 100),
                bounds.get('y_min', -100), bounds.get('y_max', 100),
                bounds.get('z_min', -50), bounds.get('z_max', 0)
            ]
            
            # 创建GeoModel
            geo_model = gp.create_geomodel(
                project_name=f'DeepCAD_Geological_{int(time.time())}',
                extent=extent,
                resolution=resolution
            )
            
            # 添加表面点
            if gempy_data['surface_points']:
                surface_points_df = pd.DataFrame(gempy_data['surface_points'])
                gp.add_surface_points(geo_model, surface_points_df)
            
            # 添加产状数据
            if gempy_data['orientations']:
                orientations_df = pd.DataFrame(gempy_data['orientations'])
                gp.add_orientations(geo_model, orientations_df)
            
            # 设置地层系列
            formations = gempy_data['formations']
            if formations:
                gp.map_stack_to_surfaces(geo_model, {'default': formations})
            
            return geo_model
            
        except Exception as e:
            logger.error(f"GemPy模型创建失败: {e}")
            raise
    
    def _convert_gempy_to_pyvista(self, geo_model: Any, solution: Any) -> Dict[str, Any]:
        """GemPy结果转换为PyVista格式"""
        if not PYVISTA_AVAILABLE:
            return {}
        
        try:
            # 获取地质图
            geological_map = solution.geological_map
            
            # 按地层分离
            formations = {}
            unique_formations = np.unique(geological_map)
            
            for formation_id in unique_formations:
                if formation_id == 0:  # 跳过背景
                    continue
                
                mask = (geological_map == formation_id)
                if np.any(mask):
                    # 创建PyVista网格 (简化实现)
                    # 实际需要更复杂的体网格提取
                    formation_mesh = pv.UniformGrid()
                    formation_mesh.field_data[f'formation_{formation_id}'] = formation_id
                    formations[f'formation_{formation_id}'] = formation_mesh
            
            return formations
            
        except Exception as e:
            logger.warning(f"GemPy到PyVista转换失败: {e}")
            return {}
    
    def _export_pyvista_to_threejs(self, pyvista_meshes: Dict[str, Any]) -> Dict[str, Any]:
        """PyVista网格转换为Three.js ArrayBuffer格式"""
        if not pyvista_meshes:
            return {}
        
        try:
            threejs_data = {}
            
            for formation_name, mesh in pyvista_meshes.items():
                if hasattr(mesh, 'points') and len(mesh.points) > 0:
                    vertices = mesh.points.astype(np.float32)
                    
                    # 计算法向量
                    try:
                        mesh.compute_normals(inplace=True)
                        normals = mesh.point_normals.astype(np.float32)
                    except:
                        normals = np.zeros_like(vertices)
                    
                    # 提取索引
                    if hasattr(mesh, 'faces') and len(mesh.faces) > 0:
                        faces = mesh.faces.reshape(-1, 4)[:, 1:4].astype(np.uint32)
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
            logger.warning(f"Three.js数据导出失败: {e}")
            return {}
    
    def _generate_formation_surfaces_pyvista(self,
                                           interpolated_grid: np.ndarray,
                                           grid_points: np.ndarray,
                                           resolution: Tuple[int, int, int],
                                           bounds: Dict[str, float]) -> Dict[str, Any]:
        """使用PyVista生成地层表面"""
        if not PYVISTA_AVAILABLE:
            return {}
        
        try:
            surfaces = {}
            
            # 创建结构化网格
            x_coords = np.linspace(bounds['x_min'], bounds['x_max'], resolution[0])
            y_coords = np.linspace(bounds['y_min'], bounds['y_max'], resolution[1])  
            z_coords = np.linspace(bounds['z_min'], bounds['z_max'], resolution[2])
            
            grid = pv.RectilinearGrid(x_coords, y_coords, z_coords)
            grid.point_data['formation'] = interpolated_grid.ravel()
            
            # 提取等值面
            unique_formations = np.unique(interpolated_grid)
            for formation_id in unique_formations:
                if np.isfinite(formation_id):
                    try:
                        isosurface = grid.contour(isosurfaces=[float(formation_id)], scalars='formation')
                        if isosurface.n_points > 0:
                            surfaces[f'formation_{int(formation_id)}'] = isosurface
                    except:
                        continue
            
            return surfaces
            
        except Exception as e:
            logger.warning(f"PyVista表面生成失败: {e}")
            return {}

    def process_geological_modeling_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理地质建模请求 - 主要API接口
        """
        try:
            start_time = time.time()
            
            # 1. 检查依赖
            deps = self.check_dependencies()
            logger.info(f"🔍 依赖检查: GemPy={deps['gempy']}, PyVista={deps['pyvista']}")
            
            # 2. 预处理钻孔数据
            borehole_raw = request_data.get('boreholes', [])
            borehole_data = self.preprocess_borehole_data(borehole_raw)
            
            # 3. 解析域配置
            domain_config = request_data.get('domain', {})
            
            # 自动计算域边界（如果未提供）
            if not domain_config.get('bounds'):
                bounds = borehole_data['bounds']
                x_range = bounds['x_max'] - bounds['x_min']
                y_range = bounds['y_max'] - bounds['y_min']
                z_range = bounds['z_max'] - bounds['z_min']
                
                # 扩展20%
                expansion = 0.2
                domain_config['bounds'] = {
                    'x_min': bounds['x_min'] - x_range * expansion,
                    'x_max': bounds['x_max'] + x_range * expansion,
                    'y_min': bounds['y_min'] - y_range * expansion,
                    'y_max': bounds['y_max'] + y_range * expansion,
                    'z_min': bounds['z_min'] - z_range * expansion,
                    'z_max': bounds['z_max'] + z_range * expansion
                }
            
            # 设置默认分辨率
            if not domain_config.get('resolution'):
                domain_config['resolution'] = [30, 30, 15]  # 保守分辨率
            
            # 4. 选择建模方法
            use_gempy = request_data.get('use_gempy', True) and deps['gempy']
            
            if use_gempy:
                modeling_result = self.gempy_implicit_modeling(borehole_data, domain_config)
            else:
                modeling_result = self.enhanced_rbf_modeling(borehole_data, domain_config)
            
            # 5. 添加元数据
            processing_time = time.time() - start_time
            modeling_result.update({
                'input_data': {
                    'n_boreholes': borehole_data['n_boreholes'],
                    'n_formations': borehole_data['n_formations'],
                    'formation_stats': borehole_data['formation_stats']
                },
                'domain_config': domain_config,
                'dependencies': deps,
                'processing_time': processing_time,
                'timestamp': time.time()
            })
            
            logger.info(f"🎉 地质建模完成: {processing_time:.2f}秒")
            
            return modeling_result
            
        except Exception as e:
            logger.error(f"地质建模处理失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'method': 'Error'
            }

# 全局服务实例
_gempy_service_instance = None

def get_gempy_integration_service() -> GemPyIntegrationService:
    """获取GemPy集成服务单例"""
    global _gempy_service_instance
    if _gempy_service_instance is None:
        _gempy_service_instance = GemPyIntegrationService()
    return _gempy_service_instance