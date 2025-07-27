"""
地表高程查询模块
基于现有地质模型进行空间高程查询
"""

import numpy as np
import logging
from typing import Tuple, List, Optional, Dict, Any
from pathlib import Path

try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    logging.warning("PyVista not available, surface elevation queries will be disabled")

try:
    from scipy.spatial import KDTree, distance
    from scipy.interpolate import griddata
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    logging.warning("SciPy not available, advanced interpolation will be disabled")

from pydantic import BaseModel


class ElevationPoint(BaseModel):
    """高程查询点"""
    x: float
    y: float
    z: Optional[float] = None
    interpolated: bool = False  # 是否为插值结果
    distance_to_nearest: Optional[float] = None  # 到最近数据点的距离


class SurfaceElevationQuery(BaseModel):
    """地表高程查询结果"""
    success: bool
    message: str
    points: List[ElevationPoint]
    interpolation_method: str
    query_time: float
    statistics: Optional[Dict[str, float]] = None


class SurfaceElevationQueryEngine:
    """地表高程查询引擎"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.geology_mesh: Optional[pv.PolyData] = None
        self.surface_points: Optional[np.ndarray] = None
        self.kdtree: Optional[KDTree] = None
        
    def load_geology_mesh(self, mesh: pv.PolyData) -> bool:
        """
        加载地质网格模型
        
        Args:
            mesh: PyVista地质网格
            
        Returns:
            bool: 是否加载成功
        """
        try:
            self.geology_mesh = mesh
            
            # 提取地表点（假设Z坐标最大的点为地表）
            points = mesh.points
            
            # 按XY坐标分组，取每组Z值最大的点作为地表点
            surface_points_dict = {}
            
            # 简化处理：按网格分辨率分组
            resolution = 1.0  # 1米分辨率
            
            for point in points:
                x, y, z = point
                # 将坐标量化到网格
                grid_x = round(x / resolution) * resolution
                grid_y = round(y / resolution) * resolution
                grid_key = (grid_x, grid_y)
                
                if grid_key not in surface_points_dict or z > surface_points_dict[grid_key][2]:
                    surface_points_dict[grid_key] = [x, y, z]
            
            # 转换为numpy数组
            self.surface_points = np.array(list(surface_points_dict.values()))
            
            # 构建KD树用于快速最近邻查询
            if SCIPY_AVAILABLE and len(self.surface_points) > 0:
                self.kdtree = KDTree(self.surface_points[:, :2])  # 只使用XY坐标
            
            self.logger.info(f"成功加载地质网格，提取{len(self.surface_points)}个地表点")
            return True
            
        except Exception as e:
            self.logger.error(f"加载地质网格失败: {str(e)}")
            return False
    
    def query_elevation_single(self, x: float, y: float, 
                              interpolation_method: str = 'linear') -> ElevationPoint:
        """
        查询单点地表高程
        
        Args:
            x: X坐标
            y: Y坐标  
            interpolation_method: 插值方法 ('linear', 'nearest', 'cubic')
            
        Returns:
            ElevationPoint: 高程查询结果
        """
        if self.surface_points is None or len(self.surface_points) == 0:
            return ElevationPoint(x=x, y=y, z=None, interpolated=False)
        
        try:
            query_point = np.array([x, y])
            
            if not SCIPY_AVAILABLE:
                # 如果没有scipy，使用最近邻方法
                distances = np.sqrt((self.surface_points[:, 0] - x)**2 + 
                                  (self.surface_points[:, 1] - y)**2)
                nearest_idx = np.argmin(distances)
                z = self.surface_points[nearest_idx, 2]
                distance_to_nearest = distances[nearest_idx]
                interpolated = distance_to_nearest > 1e-6
            else:
                # 使用KD树查找最近点
                distance_to_nearest, nearest_idx = self.kdtree.query(query_point)
                
                if distance_to_nearest < 1e-6:
                    # 查询点与数据点重合
                    z = self.surface_points[nearest_idx, 2]
                    interpolated = False
                else:
                    # 需要插值
                    z = self._interpolate_elevation(x, y, interpolation_method)
                    interpolated = True
            
            return ElevationPoint(
                x=x, 
                y=y, 
                z=float(z), 
                interpolated=interpolated,
                distance_to_nearest=float(distance_to_nearest)
            )
            
        except Exception as e:
            self.logger.warning(f"查询点({x}, {y})高程失败: {str(e)}")
            return ElevationPoint(x=x, y=y, z=None, interpolated=False)
    
    def query_elevation_batch(self, points: List[Tuple[float, float]], 
                             interpolation_method: str = 'linear') -> SurfaceElevationQuery:
        """
        批量查询地表高程
        
        Args:
            points: 查询点列表 [(x1, y1), (x2, y2), ...]
            interpolation_method: 插值方法
            
        Returns:
            SurfaceElevationQuery: 查询结果
        """
        import time
        start_time = time.time()
        
        if self.surface_points is None:
            return SurfaceElevationQuery(
                success=False,
                message="未加载地质网格数据",
                points=[],
                interpolation_method=interpolation_method,
                query_time=0
            )
        
        try:
            elevation_points = []
            
            for x, y in points:
                elevation_point = self.query_elevation_single(x, y, interpolation_method)
                elevation_points.append(elevation_point)
            
            # 统计信息
            valid_points = [p for p in elevation_points if p.z is not None]
            statistics = {}
            
            if valid_points:
                elevations = [p.z for p in valid_points]
                statistics = {
                    'min_elevation': float(np.min(elevations)),
                    'max_elevation': float(np.max(elevations)),
                    'mean_elevation': float(np.mean(elevations)),
                    'std_elevation': float(np.std(elevations)),
                    'valid_points': len(valid_points),
                    'interpolated_points': len([p for p in valid_points if p.interpolated])
                }
            
            query_time = time.time() - start_time
            
            return SurfaceElevationQuery(
                success=True,
                message=f"成功查询{len(valid_points)}/{len(points)}个点的高程",
                points=elevation_points,
                interpolation_method=interpolation_method,
                query_time=query_time,
                statistics=statistics
            )
            
        except Exception as e:
            self.logger.error(f"批量高程查询失败: {str(e)}")
            return SurfaceElevationQuery(
                success=False,
                message=f"查询失败: {str(e)}",
                points=[],
                interpolation_method=interpolation_method,
                query_time=time.time() - start_time
            )
    
    def _interpolate_elevation(self, x: float, y: float, method: str = 'linear') -> float:
        """
        插值计算指定点的地表高程
        
        Args:
            x: X坐标
            y: Y坐标
            method: 插值方法
            
        Returns:
            float: 插值得到的高程
        """
        if not SCIPY_AVAILABLE:
            # 没有scipy，使用简单的反距离加权
            return self._inverse_distance_weighting(x, y)
        
        # 找到查询点周围的数据点
        query_point = np.array([x, y])
        
        # 查找最近的N个点进行插值
        n_neighbors = min(10, len(self.surface_points))
        distances, indices = self.kdtree.query(query_point, k=n_neighbors)
        
        # 获取最近邻点的坐标和高程
        neighbor_points = self.surface_points[indices]
        xi = neighbor_points[:, :2]  # XY坐标
        zi = neighbor_points[:, 2]   # Z坐标（高程）
        
        try:
            # 使用scipy的griddata进行插值
            z_interpolated = griddata(xi, zi, query_point.reshape(1, -1), method=method)
            
            if np.isnan(z_interpolated[0]):
                # 如果插值失败，使用最近邻
                return float(zi[0])
            else:
                return float(z_interpolated[0])
                
        except Exception as e:
            self.logger.warning(f"scipy插值失败，使用反距离加权: {str(e)}")
            return self._inverse_distance_weighting(x, y, indices, distances)
    
    def _inverse_distance_weighting(self, x: float, y: float, 
                                   indices: Optional[np.ndarray] = None,
                                   distances: Optional[np.ndarray] = None) -> float:
        """
        反距离加权插值
        
        Args:
            x: X坐标
            y: Y坐标
            indices: 最近邻点索引（可选）
            distances: 距离数组（可选）
            
        Returns:
            float: 插值高程
        """
        if indices is None or distances is None:
            # 计算所有点的距离
            distances = np.sqrt((self.surface_points[:, 0] - x)**2 + 
                              (self.surface_points[:, 1] - y)**2)
            # 取最近的5个点
            n_neighbors = min(5, len(self.surface_points))
            indices = np.argsort(distances)[:n_neighbors]
            distances = distances[indices]
        
        # 防止除零
        distances = np.maximum(distances, 1e-12)
        
        # 反距离加权
        weights = 1.0 / (distances ** 2)
        weights /= np.sum(weights)
        
        # 加权平均
        elevations = self.surface_points[indices, 2]
        weighted_elevation = np.sum(weights * elevations)
        
        return float(weighted_elevation)
    
    def create_elevation_grid(self, bounds: Tuple[float, float, float, float],
                             resolution: float = 1.0) -> Dict[str, Any]:
        """
        创建指定区域的高程网格
        
        Args:
            bounds: 边界 (xmin, ymin, xmax, ymax)
            resolution: 网格分辨率（米）
            
        Returns:
            dict: 包含网格数据的字典
        """
        if self.surface_points is None:
            return {"success": False, "message": "未加载地质数据"}
        
        try:
            xmin, ymin, xmax, ymax = bounds
            
            # 生成网格坐标
            x_coords = np.arange(xmin, xmax + resolution, resolution)
            y_coords = np.arange(ymin, ymax + resolution, resolution)
            X, Y = np.meshgrid(x_coords, y_coords)
            
            # 展平坐标用于查询
            query_points = list(zip(X.ravel(), Y.ravel()))
            
            # 批量查询高程
            result = self.query_elevation_batch(query_points)
            
            if result.success:
                # 重新整形为网格
                elevations = [p.z if p.z is not None else np.nan for p in result.points]
                Z = np.array(elevations).reshape(X.shape)
                
                return {
                    "success": True,
                    "X": X,
                    "Y": Y, 
                    "Z": Z,
                    "resolution": resolution,
                    "bounds": bounds,
                    "statistics": result.statistics
                }
            else:
                return {"success": False, "message": result.message}
                
        except Exception as e:
            self.logger.error(f"创建高程网格失败: {str(e)}")
            return {"success": False, "message": f"创建失败: {str(e)}"}


# 全局查询引擎实例
elevation_query_engine = SurfaceElevationQueryEngine()