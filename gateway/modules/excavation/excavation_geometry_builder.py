"""
开挖几何构建模块
基于地质模型和DXF轮廓构建3D开挖几何体
"""

import numpy as np
import logging
from typing import List, Tuple, Dict, Optional, Any
import uuid
import time

try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    logging.warning("PyVista not available, excavation geometry construction will be disabled")

from pydantic import BaseModel
from .dxf_excavation_processor import ExcavationContour
from .surface_elevation_query import SurfaceElevationQueryEngine, ElevationPoint


class ExcavationStage(BaseModel):
    """开挖阶段定义"""
    stage_no: int
    name: str
    depth_from: float  # 从地表算起的深度
    depth_to: float    # 开挖到的深度
    volume: Optional[float] = None
    mesh_file: Optional[str] = None


class ExcavationGeometry(BaseModel):
    """开挖几何体定义"""
    id: str
    name: str
    contour_id: str
    total_depth: float
    stages: List[ExcavationStage]
    total_volume: float
    surface_area: float
    bounds: Dict[str, float]  # {'xmin', 'xmax', 'ymin', 'ymax', 'zmin', 'zmax'}
    created_at: str


class ExcavationBuildResult(BaseModel):
    """开挖构建结果"""
    success: bool
    message: str
    excavation: Optional[ExcavationGeometry] = None
    mesh: Optional[Any] = None  # PyVista mesh object
    warnings: List[str] = []
    build_time: float


class ExcavationGeometryBuilder:
    """开挖几何构建器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.elevation_engine = SurfaceElevationQueryEngine()
    
    def build_excavation_from_contour(
        self,
        contour: ExcavationContour,
        geology_mesh: pv.PolyData,
        total_depth: float,
        stages: Optional[List[Dict[str, float]]] = None
    ) -> ExcavationBuildResult:
        """
        基于轮廓和地质模型构建开挖几何体
        
        Args:
            contour: DXF提取的开挖轮廓
            geology_mesh: 地质网格模型
            total_depth: 总开挖深度（米）
            stages: 开挖阶段定义 [{'depth': 3.0, 'name': '第一层'}, ...]
            
        Returns:
            ExcavationBuildResult: 构建结果
        """
        start_time = time.time()
        
        if not PYVISTA_AVAILABLE:
            return ExcavationBuildResult(
                success=False,
                message="PyVista不可用，无法构建开挖几何体",
                build_time=0
            )
        
        try:
            # 1. 加载地质模型到高程查询引擎
            if not self.elevation_engine.load_geology_mesh(geology_mesh):
                return ExcavationBuildResult(
                    success=False,
                    message="无法加载地质模型",
                    build_time=time.time() - start_time
                )
            
            # 2. 查询轮廓点的地表高程
            surface_elevations = self._query_contour_surface_elevations(contour)
            if not surface_elevations.success:
                return ExcavationBuildResult(
                    success=False,
                    message=f"查询地表高程失败: {surface_elevations.message}",
                    build_time=time.time() - start_time
                )
            
            # 3. 构建开挖阶段
            excavation_stages = self._create_excavation_stages(
                contour, surface_elevations.points, total_depth, stages
            )
            
            # 4. 构建3D开挖实体
            excavation_mesh = self._build_excavation_mesh(
                contour, surface_elevations.points, total_depth
            )
            
            if excavation_mesh is None:
                return ExcavationBuildResult(
                    success=False,
                    message="构建开挖网格失败",
                    build_time=time.time() - start_time
                )
            
            # 5. 执行布尔差集运算
            try:
                result_mesh = geology_mesh.boolean_difference(excavation_mesh)
                self.logger.info("布尔差集运算成功")
            except Exception as e:
                self.logger.warning(f"布尔运算失败，返回原始开挖体: {str(e)}")
                result_mesh = excavation_mesh
            
            # 6. 计算几何属性
            total_volume = self._calculate_excavation_volume(
                contour, surface_elevations.points, total_depth
            )
            surface_area = self._calculate_surface_area(excavation_mesh)
            bounds = self._calculate_bounds(excavation_mesh)
            
            # 7. 创建开挖几何对象
            excavation_geometry = ExcavationGeometry(
                id=f"exc_{uuid.uuid4().hex[:8]}",
                name=f"开挖_{contour.name}",
                contour_id=contour.id,
                total_depth=total_depth,
                stages=excavation_stages,
                total_volume=total_volume,
                surface_area=surface_area,
                bounds=bounds,
                created_at=time.strftime("%Y-%m-%d %H:%M:%S")
            )
            
            build_time = time.time() - start_time
            
            return ExcavationBuildResult(
                success=True,
                message=f"成功构建开挖几何体，体积: {total_volume:.2f}m³",
                excavation=excavation_geometry,
                mesh=result_mesh,
                build_time=build_time
            )
            
        except Exception as e:
            self.logger.error(f"构建开挖几何体失败: {str(e)}")
            return ExcavationBuildResult(
                success=False,
                message=f"构建失败: {str(e)}",
                build_time=time.time() - start_time
            )
    
    def _query_contour_surface_elevations(self, contour: ExcavationContour):
        """查询轮廓点的地表高程"""
        return self.elevation_engine.query_elevation_batch(
            contour.points, 
            interpolation_method='linear'
        )
    
    def _create_excavation_stages(
        self,
        contour: ExcavationContour,
        surface_points: List[ElevationPoint],
        total_depth: float,
        stage_config: Optional[List[Dict[str, float]]] = None
    ) -> List[ExcavationStage]:
        """创建开挖阶段"""
        stages = []
        
        if stage_config is None or len(stage_config) == 0:
            # 默认单阶段开挖
            stage_volume = self._calculate_stage_volume(
                contour, surface_points, 0, total_depth
            )
            
            stages.append(ExcavationStage(
                stage_no=1,
                name="单阶段开挖",
                depth_from=0,
                depth_to=total_depth,
                volume=stage_volume
            ))
        else:
            # 多阶段开挖
            current_depth = 0
            for i, stage_def in enumerate(stage_config):
                stage_depth = stage_def.get('depth', total_depth)
                stage_name = stage_def.get('name', f"第{i+1}阶段")
                
                stage_volume = self._calculate_stage_volume(
                    contour, surface_points, current_depth, stage_depth
                )
                
                stages.append(ExcavationStage(
                    stage_no=i + 1,
                    name=stage_name,
                    depth_from=current_depth,
                    depth_to=stage_depth,
                    volume=stage_volume
                ))
                
                current_depth = stage_depth
                if stage_depth >= total_depth:
                    break
        
        return stages
    
    def _build_excavation_mesh(
        self,
        contour: ExcavationContour,
        surface_points: List[ElevationPoint],
        total_depth: float
    ) -> Optional[pv.PolyData]:
        """构建3D开挖网格"""
        try:
            # 1. 创建顶面（地表轮廓）
            top_points = []
            for i, (x, y) in enumerate(contour.points):
                if i < len(surface_points) and surface_points[i].z is not None:
                    z = surface_points[i].z
                else:
                    # 如果没有高程数据，使用轮廓的高程提示或默认值0
                    z = contour.elevation_hint if contour.elevation_hint is not None else 0.0
                top_points.append([x, y, z])
            
            # 2. 创建底面（地表减去开挖深度）
            bottom_points = []
            for point in top_points:
                x, y, z = point
                bottom_points.append([x, y, z - total_depth])
            
            # 3. 构建开挖体多面体
            # 创建顶面和底面的面片索引
            n_points = len(top_points)
            
            # 所有顶点（先顶面，后底面）
            all_points = np.array(top_points + bottom_points)
            
            # 面片定义
            faces = []
            
            # 顶面（逆时针方向，向上的法向量）
            top_face = [n_points] + list(range(n_points))
            faces.extend(top_face)
            
            # 底面（顺时针方向，向下的法向量）
            bottom_face = [n_points] + list(range(2*n_points-1, n_points-1, -1))
            faces.extend(bottom_face)
            
            # 侧面
            for i in range(n_points):
                next_i = (i + 1) % n_points
                
                # 创建矩形侧面（两个三角形）
                # 第一个三角形
                face1 = [3, i, next_i, n_points + i]
                faces.extend(face1)
                
                # 第二个三角形
                face2 = [3, next_i, n_points + next_i, n_points + i]
                faces.extend(face2)
            
            # 创建PyVista多面体
            excavation_mesh = pv.PolyData(all_points, faces)
            
            # 检查网格是否有效
            if excavation_mesh.n_points == 0 or excavation_mesh.n_faces == 0:
                self.logger.error("构建的开挖网格为空")
                return None
            
            self.logger.info(f"成功构建开挖网格: {excavation_mesh.n_points}点, {excavation_mesh.n_faces}面")
            return excavation_mesh
            
        except Exception as e:
            self.logger.error(f"构建开挖网格失败: {str(e)}")
            return None
    
    def _calculate_excavation_volume(
        self,
        contour: ExcavationContour,
        surface_points: List[ElevationPoint],
        total_depth: float
    ) -> float:
        """计算开挖总体积（使用三角剖分）"""
        try:
            from scipy.spatial import Delaunay
            
            # 使用2D轮廓点进行三角剖分
            points_2d = np.array(contour.points)
            tri = Delaunay(points_2d)
            
            total_volume = 0.0
            
            # 对每个三角形计算三角柱体积
            for triangle_indices in tri.simplices:
                triangle_points = points_2d[triangle_indices]
                
                # 获取三角形三个顶点的地表高程
                z_values = []
                for i, (x, y) in enumerate(triangle_points):
                    # 在surface_points中找到对应的高程
                    z = 0.0  # 默认值
                    for sp in surface_points:
                        if abs(sp.x - x) < 1e-6 and abs(sp.y - y) < 1e-6:
                            z = sp.z if sp.z is not None else 0.0
                            break
                    z_values.append(z)
                
                # 计算三角形面积
                area = self._calculate_triangle_area(triangle_points)
                
                # 计算平均高程
                avg_surface_elevation = np.mean(z_values)
                
                # 三角柱体积 = 底面积 × 高度
                volume = area * total_depth
                total_volume += volume
            
            return abs(total_volume)
            
        except Exception as e:
            self.logger.warning(f"精确体积计算失败，使用近似方法: {str(e)}")
            # 使用简单的面积×平均深度方法
            return abs(contour.area) * total_depth
    
    def _calculate_stage_volume(
        self,
        contour: ExcavationContour,
        surface_points: List[ElevationPoint],
        depth_from: float,
        depth_to: float
    ) -> float:
        """计算单阶段开挖体积"""
        stage_depth = depth_to - depth_from
        # 简化计算，使用轮廓面积乘以阶段深度
        return abs(contour.area) * stage_depth
    
    def _calculate_triangle_area(self, triangle_points: np.ndarray) -> float:
        """计算三角形面积"""
        if len(triangle_points) != 3:
            return 0.0
        
        p1, p2, p3 = triangle_points
        
        # 使用向量叉积计算面积
        v1 = p2 - p1
        v2 = p3 - p1
        cross_product = v1[0] * v2[1] - v1[1] * v2[0]
        
        return abs(cross_product) / 2.0
    
    def _calculate_surface_area(self, mesh: pv.PolyData) -> float:
        """计算网格表面积"""
        try:
            return float(mesh.area) if mesh.area is not None else 0.0
        except:
            return 0.0
    
    def _calculate_bounds(self, mesh: pv.PolyData) -> Dict[str, float]:
        """计算网格边界"""
        try:
            bounds = mesh.bounds
            return {
                'xmin': float(bounds[0]),
                'xmax': float(bounds[1]),
                'ymin': float(bounds[2]),
                'ymax': float(bounds[3]),
                'zmin': float(bounds[4]),
                'zmax': float(bounds[5])
            }
        except:
            return {
                'xmin': 0.0, 'xmax': 0.0, 'ymin': 0.0,
                'ymax': 0.0, 'zmin': 0.0, 'zmax': 0.0
            }
    
    def export_excavation_mesh(
        self,
        mesh: pv.PolyData,
        output_path: str,
        format: str = 'gltf'
    ) -> bool:
        """
        导出开挖网格到文件
        
        Args:
            mesh: 要导出的网格
            output_path: 输出文件路径
            format: 导出格式 ('gltf', 'obj', 'stl', 'vtk')
            
        Returns:
            bool: 是否导出成功
        """
        try:
            if format.lower() == 'gltf':
                # PyVista导出glTF需要通过trimesh
                try:
                    import trimesh
                    # 转换为trimesh对象
                    faces_as_array = mesh.faces.reshape((-1, 4))[:, 1:]
                    trimesh_mesh = trimesh.Trimesh(vertices=mesh.points, faces=faces_as_array)
                    trimesh_mesh.export(output_path)
                except ImportError:
                    self.logger.warning("trimesh未安装，使用PyVista原生格式导出")
                    mesh.save(output_path.replace('.gltf', '.vtk'))
            else:
                mesh.save(output_path)
            
            self.logger.info(f"成功导出开挖网格到: {output_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"导出开挖网格失败: {str(e)}")
            return False


# 全局构建器实例
excavation_builder = ExcavationGeometryBuilder()