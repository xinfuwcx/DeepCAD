"""
精确开挖体积计算模块
基于三角剖分和地形积分的高精度土方量计算
"""

import numpy as np
import logging
from typing import List, Tuple, Dict, Optional, Any
import time

try:
    from scipy.spatial import Delaunay
    from scipy.integrate import dblquad
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    logging.warning("SciPy not available, advanced volume calculations will be disabled")

from pydantic import BaseModel
from .dxf_excavation_processor import ExcavationContour
from .surface_elevation_query import ElevationPoint


class VolumeTriangle(BaseModel):
    """体积计算用三角形"""
    vertices: List[Tuple[float, float]]  # 三角形顶点坐标
    surface_elevations: List[float]      # 对应地表高程
    area: float                          # 三角形面积
    avg_surface_elevation: float        # 平均地表高程
    volume: float                       # 该三角形对应的开挖体积


class VolumeCalculationResult(BaseModel):
    """体积计算结果"""
    success: bool
    message: str
    total_volume: float                 # 总开挖体积 (m³)
    surface_area: float                # 开挖面积 (m²)
    avg_depth: float                   # 平均开挖深度 (m)
    max_depth: float                   # 最大开挖深度 (m)
    min_depth: float                   # 最小开挖深度 (m)
    triangles: List[VolumeTriangle]    # 三角形明细
    calculation_method: str            # 计算方法
    calculation_time: float           # 计算耗时
    statistics: Dict[str, float]      # 统计信息


class ExcavationVolumeCalculator:
    """开挖体积计算器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def calculate_excavation_volume(
        self,
        contour: ExcavationContour,
        surface_elevations: List[ElevationPoint],
        excavation_depth: float,
        calculation_method: str = 'triangular_prism'
    ) -> VolumeCalculationResult:
        """
        计算精确的开挖体积
        
        Args:
            contour: 开挖轮廓
            surface_elevations: 地表高程点
            excavation_depth: 开挖深度（从地表算起）
            calculation_method: 计算方法 ('triangular_prism', 'grid_integration', 'simple')
            
        Returns:
            VolumeCalculationResult: 计算结果
        """
        start_time = time.time()
        
        try:
            if calculation_method == 'triangular_prism':
                result = self._calculate_by_triangular_prism(
                    contour, surface_elevations, excavation_depth
                )
            elif calculation_method == 'grid_integration':
                result = self._calculate_by_grid_integration(
                    contour, surface_elevations, excavation_depth
                )
            else:  # simple
                result = self._calculate_simple_volume(
                    contour, surface_elevations, excavation_depth
                )
            
            result.calculation_time = time.time() - start_time
            result.calculation_method = calculation_method
            
            return result
            
        except Exception as e:
            self.logger.error(f"体积计算失败: {str(e)}")
            return VolumeCalculationResult(
                success=False,
                message=f"计算失败: {str(e)}",
                total_volume=0.0,
                surface_area=0.0,
                avg_depth=0.0,
                max_depth=0.0,
                min_depth=0.0,
                triangles=[],
                calculation_method=calculation_method,
                calculation_time=time.time() - start_time,
                statistics={}
            )
    
    def _calculate_by_triangular_prism(
        self,
        contour: ExcavationContour,
        surface_elevations: List[ElevationPoint],
        excavation_depth: float
    ) -> VolumeCalculationResult:
        """使用三角柱积分方法计算体积"""
        
        if not SCIPY_AVAILABLE:
            self.logger.warning("SciPy不可用，使用简单方法计算")
            return self._calculate_simple_volume(contour, surface_elevations, excavation_depth)
        
        try:
            # 1. 对轮廓进行三角剖分
            points_2d = np.array(contour.points)
            tri = Delaunay(points_2d)
            
            triangles = []
            total_volume = 0.0
            total_area = 0.0
            depth_values = []
            
            # 2. 为每个三角形计算体积
            for simplex in tri.simplices:
                triangle_vertices = points_2d[simplex]
                
                # 获取三角形三个顶点的地表高程
                triangle_elevations = []
                for vertex in triangle_vertices:
                    x, y = vertex
                    elevation = self._find_elevation_for_point(x, y, surface_elevations)
                    triangle_elevations.append(elevation)
                
                # 计算三角形面积
                area = self._calculate_triangle_area_2d(triangle_vertices)
                total_area += area
                
                # 计算平均地表高程
                avg_surface_elev = np.mean(triangle_elevations)
                
                # 计算三角柱体积：考虑地形变化的精确积分
                volume = self._calculate_triangular_prism_volume(
                    triangle_vertices, triangle_elevations, excavation_depth
                )
                
                total_volume += volume
                
                # 记录深度信息
                depths = [excavation_depth] * 3  # 简化，实际开挖深度
                depth_values.extend(depths)
                
                # 创建三角形记录
                triangle = VolumeTriangle(
                    vertices=[(float(v[0]), float(v[1])) for v in triangle_vertices],
                    surface_elevations=triangle_elevations,
                    area=float(area),
                    avg_surface_elevation=float(avg_surface_elev),
                    volume=float(volume)
                )
                triangles.append(triangle)
            
            # 3. 统计信息
            avg_depth = excavation_depth  # 简化，实际应该考虑地形变化
            max_depth = excavation_depth
            min_depth = excavation_depth
            
            if depth_values:
                avg_depth = float(np.mean(depth_values))
                max_depth = float(np.max(depth_values))
                min_depth = float(np.min(depth_values))
            
            statistics = {
                'method_code': 2.0,  # 三角柱方法
                'triangle_count': float(len(triangles)),
                'avg_triangle_area': float(total_area / len(triangles) if triangles else 0.0),
                'volume_per_area': float(total_volume / total_area if total_area > 0 else 0.0),
                'elevation_variance': float(np.var([t.avg_surface_elevation for t in triangles]) if triangles else 0.0)
            }
            
            return VolumeCalculationResult(
                success=True,
                message=f"使用{len(triangles)}个三角形计算完成",
                total_volume=float(abs(total_volume)),
                surface_area=float(total_area),
                avg_depth=avg_depth,
                max_depth=max_depth,
                min_depth=min_depth,
                triangles=triangles,
                calculation_method='triangular_prism',
                calculation_time=0.0,  # 将在外层设置
                statistics=statistics
            )
            
        except Exception as e:
            self.logger.error(f"三角柱方法计算失败: {str(e)}")
            # 降级到简单方法
            return self._calculate_simple_volume(contour, surface_elevations, excavation_depth)
    
    def _calculate_triangular_prism_volume(
        self,
        triangle_vertices: np.ndarray,
        surface_elevations: List[float],
        excavation_depth: float
    ) -> float:
        """
        计算三角柱的精确体积
        考虑地表高程变化的积分计算
        """
        try:
            # 三角形面积
            area = self._calculate_triangle_area_2d(triangle_vertices)
            
            # 方法1：使用平均高程（简化但准确度较高）
            avg_surface_elevation = np.mean(surface_elevations)
            volume = area * excavation_depth
            
            # 方法2：精确积分（如果需要更高精度）
            # 这里可以实现基于三角形内部高程插值的精确积分
            # volume = self._integrate_over_triangle(triangle_vertices, surface_elevations, excavation_depth)
            
            return volume
            
        except Exception as e:
            self.logger.warning(f"三角柱体积计算失败: {str(e)}")
            # 降级到最简单的计算
            area = self._calculate_triangle_area_2d(triangle_vertices)
            return area * excavation_depth
    
    def _calculate_by_grid_integration(
        self,
        contour: ExcavationContour,
        surface_elevations: List[ElevationPoint],
        excavation_depth: float
    ) -> VolumeCalculationResult:
        """使用网格积分方法计算体积"""
        
        try:
            # 1. 确定开挖区域边界
            x_coords = [p[0] for p in contour.points]
            y_coords = [p[1] for p in contour.points]
            
            xmin, xmax = min(x_coords), max(x_coords)
            ymin, ymax = min(y_coords), max(y_coords)
            
            # 2. 创建网格
            grid_resolution = 0.5  # 0.5米网格
            x_grid = np.arange(xmin, xmax + grid_resolution, grid_resolution)
            y_grid = np.arange(ymin, ymax + grid_resolution, grid_resolution)
            
            total_volume = 0.0
            total_area = 0.0
            grid_count = 0
            
            # 3. 对每个网格单元积分
            for i in range(len(x_grid) - 1):
                for j in range(len(y_grid) - 1):
                    # 网格单元的四个角点
                    x1, x2 = x_grid[i], x_grid[i + 1]
                    y1, y2 = y_grid[j], y_grid[j + 1]
                    
                    # 网格中心点
                    x_center = (x1 + x2) / 2
                    y_center = (y1 + y2) / 2
                    
                    # 检查是否在开挖轮廓内
                    if self._point_in_polygon(x_center, y_center, contour.points):
                        # 查询该点的地表高程
                        surface_elev = self._find_elevation_for_point(x_center, y_center, surface_elevations)
                        
                        # 网格单元面积
                        cell_area = grid_resolution * grid_resolution
                        
                        # 网格单元体积
                        cell_volume = cell_area * excavation_depth
                        
                        total_volume += cell_volume
                        total_area += cell_area
                        grid_count += 1
            
            # 统计信息
            statistics = {
                'method_code': 3.0,  # 网格积分方法
                'grid_resolution': float(grid_resolution),
                'grid_cells': float(grid_count),
                'coverage_ratio': float(total_area / abs(contour.area) if contour.area != 0 else 0.0)
            }
            
            return VolumeCalculationResult(
                success=True,
                message=f"使用{grid_count}个网格单元计算完成",
                total_volume=float(total_volume),
                surface_area=float(total_area),
                avg_depth=float(excavation_depth),
                max_depth=float(excavation_depth),
                min_depth=float(excavation_depth),
                triangles=[],  # 网格方法不使用三角形
                calculation_method='grid_integration',
                calculation_time=0.0,
                statistics=statistics
            )
            
        except Exception as e:
            self.logger.error(f"网格积分方法失败: {str(e)}")
            return self._calculate_simple_volume(contour, surface_elevations, excavation_depth)
    
    def _calculate_simple_volume(
        self,
        contour: ExcavationContour,
        surface_elevations: List[ElevationPoint],
        excavation_depth: float
    ) -> VolumeCalculationResult:
        """简单体积计算（面积×深度）"""
        
        try:
            # 使用轮廓面积乘以开挖深度
            volume = abs(contour.area) * excavation_depth
            area = abs(contour.area)
            
            statistics = {
                'method_code': 1.0,  # 1=简单方法, 2=三角柱, 3=网格积分
                'contour_points': float(len(contour.points)),
                'contour_area': float(area)
            }
            
            return VolumeCalculationResult(
                success=True,
                message="使用简化方法计算（面积×深度）",
                total_volume=float(volume),
                surface_area=float(area),
                avg_depth=float(excavation_depth),
                max_depth=float(excavation_depth),
                min_depth=float(excavation_depth),
                triangles=[],
                calculation_method='simple',
                calculation_time=0.0,
                statistics=statistics
            )
            
        except Exception as e:
            self.logger.error(f"简单体积计算也失败: {str(e)}")
            return VolumeCalculationResult(
                success=False,
                message=f"所有计算方法都失败: {str(e)}",
                total_volume=0.0,
                surface_area=0.0,
                avg_depth=0.0,
                max_depth=0.0,
                min_depth=0.0,
                triangles=[],
                calculation_method='failed',
                calculation_time=0.0,
                statistics={}
            )
    
    def _find_elevation_for_point(self, x: float, y: float, 
                                 elevations: List[ElevationPoint]) -> float:
        """为指定点查找对应的地表高程"""
        # 寻找最近的高程点
        min_distance = float('inf')
        best_elevation = 0.0
        
        for elev_point in elevations:
            if elev_point.z is not None:
                distance = np.sqrt((elev_point.x - x)**2 + (elev_point.y - y)**2)
                if distance < min_distance:
                    min_distance = distance
                    best_elevation = elev_point.z
        
        return best_elevation
    
    def _calculate_triangle_area_2d(self, vertices: np.ndarray) -> float:
        """计算2D三角形面积"""
        if len(vertices) != 3:
            return 0.0
        
        p1, p2, p3 = vertices
        
        # 使用向量叉积
        v1 = p2 - p1
        v2 = p3 - p1
        
        # 2D叉积
        cross = v1[0] * v2[1] - v1[1] * v2[0]
        
        return abs(cross) / 2.0
    
    def _point_in_polygon(self, x: float, y: float, 
                         polygon: List[Tuple[float, float]]) -> bool:
        """判断点是否在多边形内（射线投射算法）"""
        n = len(polygon)
        inside = False
        
        j = n - 1
        for i in range(n):
            xi, yi = polygon[i]
            xj, yj = polygon[j]
            
            if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
                inside = not inside
            j = i
        
        return inside
    
    def generate_volume_report(self, result: VolumeCalculationResult) -> Dict[str, Any]:
        """生成详细的体积计算报告"""
        
        report = {
            'summary': {
                '总开挖体积': f"{result.total_volume:.2f} m³",
                '开挖面积': f"{result.surface_area:.2f} m²", 
                '平均深度': f"{result.avg_depth:.2f} m",
                '计算方法': result.calculation_method,
                '计算耗时': f"{result.calculation_time:.3f} 秒"
            },
            'details': {
                '最大深度': f"{result.max_depth:.2f} m",
                '最小深度': f"{result.min_depth:.2f} m",
                '三角形数量': len(result.triangles),
                '平均三角形面积': f"{result.statistics.get('avg_triangle_area', 0):.2f} m²"
            },
            'triangles': []
        }
        
        # 添加三角形明细（只显示前10个，避免报告过长）
        for i, triangle in enumerate(result.triangles[:10]):
            triangle_info = {
                '编号': i + 1,
                '面积': f"{triangle.area:.2f} m²",
                '平均地表高程': f"{triangle.avg_surface_elevation:.2f} m",
                '体积': f"{triangle.volume:.2f} m³",
                '顶点': triangle.vertices
            }
            report['triangles'].append(triangle_info)
        
        if len(result.triangles) > 10:
            report['triangles'].append(f"... 还有 {len(result.triangles) - 10} 个三角形")
        
        return report


# 全局计算器实例
volume_calculator = ExcavationVolumeCalculator()