"""
几何操作模块
专门处理土体与工程结构的复杂几何求交运算
使用 OpenCASCADE (OCC) 进行精确的布尔运算
"""
import logging
import tempfile
import os
from typing import Dict, Any, List, Tuple
import numpy as np
from enum import Enum

from .geometry_engine import (
    GeometryEngineFactory, GeometryKernel, GeometryEngine, GmshKernel
)

logger = logging.getLogger(__name__)


class GeometryType(Enum):
    """几何体类型枚举"""
    SOIL_VOLUME = "soil_volume"
    EXCAVATION = "excavation"
    TUNNEL = "tunnel"
    DIAPHRAGM_WALL = "diaphragm_wall"
    PILE = "pile"
    ANCHOR = "anchor"


class BooleanOperation(Enum):
    """布尔运算类型"""
    UNION = "union"
    INTERSECTION = "intersection"
    DIFFERENCE = "difference"
    CUT = "cut"


class GeometryIntersectionEngine:
    """
    几何求交引擎
    
    专门处理：
    1. 土体与基坑的求交（开挖）
    2. 土体与隧道的求交（马蹄形、圆形等）
    3. 土体与支护结构的求交
    4. 复杂的多体几何运算
    """
    
    def __init__(self, use_occ: bool = True, precision: float = 1e-6):
        """
        初始化几何求交引擎
        
        Args:
            use_occ: 是否使用OpenCASCADE内核 (现在通过engine选择)
            precision: 几何精度
        """
        self.engine_type = (
            GeometryEngine.GMSH_OCC if use_occ else GeometryEngine.GMSH
        )
        self.kernel: GeometryKernel = (
            GeometryEngineFactory.create_kernel(self.engine_type)
        )
        
        self.precision = precision
        self.working_dir = tempfile.mkdtemp(prefix="geometry_ops_")
        self.geometry_registry = {}  # 几何体注册表
        
        logger.info(f"几何求交引擎初始化, 使用内核: {self.engine_type.value}")
        logger.info(f"工作目录: {self.working_dir}")
    
    def initialize_gmsh(self):
        """初始化Gmsh环境"""
        # 这个方法现在由 Kernel 的 __init__ 处理
        # 可以保留用于设置选项
        if isinstance(self.kernel, GmshKernel):
            # 设置OCC精度参数
            self.kernel.gmsh.option.setNumber(
                "Geometry.Tolerance", self.precision)
            self.kernel.gmsh.option.setNumber(
                "Geometry.ToleranceBoolean", self.precision)
            logger.info("Gmsh/OCC 内核已初始化并设置精度")

    def finalize_gmsh(self):
        """清理Gmsh环境"""
        if isinstance(self.kernel, GmshKernel):
            self.kernel.gmsh.finalize()

    def create_soil_volume(self, terrain_data: Dict[str, Any]) -> int:
        """
        创建土体几何
        
        Args:
            terrain_data: 地形数据
            
        Returns:
            土体几何的标签
        """
        logger.info("创建土体几何...")
        
        extent = terrain_data["terrain_extent"]
        
        # 创建基础土体长方体
        soil_box = self.kernel.create_box(
            center=(
                (extent['x_min'] + extent['x_max']) / 2,
                (extent['y_min'] + extent['y_max']) / 2,
                (extent['z_min'] + extent['z_max']) / 2
            ),
            dimensions=(
                extent['x_max'] - extent['x_min'],
                extent['y_max'] - extent['y_min'],
                extent['z_max'] - extent['z_min']
            )
        )
        
        # 处理起伏上表面
        top_surface = terrain_data.get("top_surface", {})
        if top_surface.get("is_undulating", False):
            soil_box = self._apply_undulating_top_surface(soil_box, top_surface)
        
        # 注册几何体
        self.geometry_registry["soil_volume"] = {
            "tag": soil_box,
            "type": GeometryType.SOIL_VOLUME,
            "extent": extent
        }
        
        logger.info(f"土体几何创建完成，标签: {soil_box}")
        return soil_box
    
    def create_excavation_geometry(self, excavation_params: Dict[str, Any]) -> int:
        """
        创建基坑开挖几何
        
        Args:
            excavation_params: 基坑参数
            
        Returns:
            基坑几何的标签
        """
        logger.info("创建基坑开挖几何...")
        
        if excavation_params["type"] == "polygon":
            return self._create_polygon_excavation(excavation_params)
        elif excavation_params["type"] == "dxf":
            return self._create_dxf_excavation(excavation_params)
        else:
            raise ValueError(f"不支持的基坑类型: {excavation_params['type']}")
    
    def _create_polygon_excavation(self, params: Dict[str, Any]) -> int:
        """创建多边形基坑"""
        points = params["points"]
        depth = params["depth"]
        
        # 这里需要适配 GeometryKernel 接口
        # 目前 Kernel 没有直接创建多边形拉伸体的接口
        # 暂时还使用 gmsh 直接操作
        if not isinstance(self.kernel, GmshKernel):
            raise NotImplementedError("多边形基坑创建仅支持Gmsh内核")

        gmsh = self.kernel.gmsh

        # 创建底面多边形
        point_tags = []
        for point in points:
            tag = gmsh.model.occ.addPoint(point[0], point[1], 0)
            point_tags.append(tag)
        
        # 创建多边形线框
        line_tags = []
        for i in range(len(point_tags)):
            next_i = (i + 1) % len(point_tags)
            line = gmsh.model.occ.addLine(point_tags[i], point_tags[next_i])
            line_tags.append(line)
        
        # 创建底面
        curve_loop = gmsh.model.occ.addCurveLoop(line_tags)
        bottom_surface = gmsh.model.occ.addPlaneSurface([curve_loop])
        
        # 拉伸成体积
        extrude_result = gmsh.model.occ.extrude(
            [(2, bottom_surface)], 0, 0, -depth)
        excavation_volume = extrude_result[1][1]
        
        # 注册几何体
        self.geometry_registry["excavation"] = {
            "tag": excavation_volume,
            "type": GeometryType.EXCAVATION,
            "depth": depth,
            "points": points
        }
        
        logger.info(f"多边形基坑创建完成，标签: {excavation_volume}")
        return excavation_volume
    
    def create_tunnel_geometry(self, tunnel_params: Dict[str, Any]) -> int:
        """
        创建隧道几何（支持马蹄形、圆形等）
        
        Args:
            tunnel_params: 隧道参数
            
        Returns:
            隧道几何的标签
        """
        logger.info(f"创建{tunnel_params['shape']}隧道几何...")
        
        if tunnel_params["shape"] == "horseshoe":
            return self._create_horseshoe_tunnel(tunnel_params)
        elif tunnel_params["shape"] == "circular":
            return self._create_circular_tunnel(tunnel_params)
        elif tunnel_params["shape"] == "rectangular":
            return self._create_rectangular_tunnel(tunnel_params)
        else:
            raise ValueError(f"不支持的隧道形状: {tunnel_params['shape']}")
    
    def _create_horseshoe_tunnel(self, params: Dict[str, Any]) -> int:
        """创建马蹄形隧道"""
        logger.info("创建马蹄形隧道截面...")

        if not isinstance(self.kernel, GmshKernel):
            raise NotImplementedError("马蹄形隧道创建仅支持Gmsh内核")
        
        gmsh = self.kernel.gmsh
        
        # 马蹄形参数
        width = params["width"]
        height = params["height"]
        arch_height = params.get("arch_height", height * 0.6)
        wall_height = height - arch_height
        
        center_x, center_y, center_z = params["center"]
        length = params["length"]
        direction = params.get("direction", [1, 0, 0])  # 隧道方向
        
        # 创建马蹄形截面轮廓点
        profile_points = self._generate_horseshoe_profile(
            width, arch_height, wall_height, center_x, center_y
        )
        
        # 创建截面
        point_tags = []
        for point in profile_points:
            tag = gmsh.model.occ.addPoint(point[0], point[1], center_z)
            point_tags.append(tag)
        
        # 创建截面轮廓
        line_tags = []
        for i in range(len(point_tags)):
            next_i = (i + 1) % len(point_tags)
            line = gmsh.model.occ.addLine(point_tags[i], point_tags[next_i])
            line_tags.append(line)
        
        # 创建截面面
        curve_loop = gmsh.model.occ.addCurveLoop(line_tags)
        profile_surface = gmsh.model.occ.addPlaneSurface([curve_loop])
        
        # 沿方向拉伸成隧道
        tunnel_volume = gmsh.model.occ.extrude(
            [(2, profile_surface)], 
            direction[0] * length, 
            direction[1] * length, 
            direction[2] * length
        )[1][1]
        
        # 注册几何体
        self.geometry_registry["tunnel"] = {
            "tag": tunnel_volume,
            "type": GeometryType.TUNNEL,
            "shape": "horseshoe",
            "width": width,
            "height": height,
            "length": length,
            "center": params["center"],
            "direction": direction
        }
        
        logger.info(f"马蹄形隧道创建完成，标签: {tunnel_volume}")
        return tunnel_volume
    
    def _generate_horseshoe_profile(self, width: float, arch_height: float, 
                                  wall_height: float, cx: float, cy: float) -> List[Tuple[float, float]]:
        """生成马蹄形截面轮廓点"""
        points = []
        
        # 底部左右角点
        half_width = width / 2
        points.append((cx - half_width, cy))  # 左下
        points.append((cx + half_width, cy))  # 右下
        
        # 侧壁点
        points.append((cx + half_width, cy + wall_height))  # 右上
        points.append((cx - half_width, cy + wall_height))  # 左上
        
        # 拱顶圆弧点（简化为多边形近似）
        arch_center_y = cy + wall_height
        arch_radius = half_width
        
        # 生成拱顶圆弧点
        n_arch_points = 10
        for i in range(n_arch_points + 1):
            angle = np.pi * i / n_arch_points  # 从0到π
            x = cx + arch_radius * np.cos(angle)
            y = arch_center_y + arch_radius * np.sin(angle)
            points.insert(-1, (x, y))  # 插入到左上角之前
        
        return points
    
    def _create_circular_tunnel(self, params: Dict[str, Any]) -> int:
        """创建圆形隧道"""
        radius = params["radius"]
        center = params["center"]
        length = params["length"]
        direction = params.get("direction", [1, 0, 0])

        if not isinstance(self.kernel, GmshKernel):
            raise NotImplementedError("圆形隧道创建仅支持Gmsh内核")

        gmsh = self.kernel.gmsh
        
        # 创建圆形截面
        circle = gmsh.model.occ.addCircle(
            center[0], center[1], center[2], radius)
        curve_loop = gmsh.model.occ.addCurveLoop([circle])
        circle_surface = gmsh.model.occ.addPlaneSurface([curve_loop])
        
        # 拉伸成隧道
        extrude_result = gmsh.model.occ.extrude(
            [(2, circle_surface)],
            direction[0] * length,
            direction[1] * length,
            direction[2] * length
        )
        tunnel_volume = extrude_result[1][1]
        
        self.geometry_registry["tunnel"] = {
            "tag": tunnel_volume,
            "type": GeometryType.TUNNEL,
            "shape": "circular",
            "radius": radius,
            "length": length,
            "center": center,
            "direction": direction
        }
        
        logger.info(f"圆形隧道创建完成，标签: {tunnel_volume}")
        return tunnel_volume
    
    def perform_boolean_operation(self, obj1_tag: int, obj2_tag: int, 
                                operation: BooleanOperation) -> int:
        """
        执行布尔运算
        
        Args:
            obj1_tag: 第一个几何体标签
            obj2_tag: 第二个几何体标签
            operation: 布尔运算类型
            
        Returns:
            结果几何体标签
        """
        logger.info(f"执行布尔运算: {operation.value}")
        
        if not isinstance(self.kernel, GmshKernel):
            raise RuntimeError("布尔运算需要Gmsh/OCC内核")
        
        gmsh = self.kernel.gmsh

        obj1 = [(3, obj1_tag)]
        obj2 = [(3, obj2_tag)]
        
        if operation == BooleanOperation.UNION:
            result = gmsh.model.occ.fuse(obj1, obj2)
        elif operation == BooleanOperation.INTERSECTION:
            result = gmsh.model.occ.intersect(obj1, obj2)
        elif operation == BooleanOperation.DIFFERENCE:
            result = gmsh.model.occ.cut(obj1, obj2)
        else:
            raise ValueError(f"不支持的布尔运算: {operation}")
        
        # 同步几何
        gmsh.model.occ.synchronize()
        
        result_tag = result[0][0][1] if result[0] else None
        logger.info(f"布尔运算完成，结果标签: {result_tag}")
        
        return result_tag
    
    def soil_excavation_intersection(self, soil_tag: int, excavation_tag: int) -> int:
        """
        土体与基坑求交（开挖操作）
        
        Args:
            soil_tag: 土体几何标签
            excavation_tag: 基坑几何标签
            
        Returns:
            开挖后的土体标签
        """
        logger.info("执行土体-基坑求交（开挖）...")
        
        # 土体减去基坑 = 开挖后的土体
        excavated_soil = self.perform_boolean_operation(
            soil_tag, excavation_tag, BooleanOperation.DIFFERENCE
        )
        
        logger.info(f"土体开挖完成，结果标签: {excavated_soil}")
        return excavated_soil
    
    def soil_tunnel_intersection(self, soil_tag: int, tunnel_tag: int) -> Tuple[int, int]:
        """
        土体与隧道求交
        
        Args:
            soil_tag: 土体几何标签
            tunnel_tag: 隧道几何标签
            
        Returns:
            (开挖后的土体标签, 隧道空间标签)
        """
        logger.info("执行土体-隧道求交...")
        
        # 1. 土体减去隧道 = 开挖后的土体
        excavated_soil = self.perform_boolean_operation(
            soil_tag, tunnel_tag, BooleanOperation.DIFFERENCE
        )
        
        # 2. 土体与隧道的交集 = 隧道空间（用于边界条件）
        tunnel_space = self.perform_boolean_operation(
            soil_tag, tunnel_tag, BooleanOperation.INTERSECTION
        )
        
        logger.info(
            f"土体-隧道求交完成，土体: {excavated_soil}, 隧道空间: {tunnel_space}")
        return excavated_soil, tunnel_space
    
    def _apply_undulating_top_surface(self, soil_box: int, top_surface: Dict[str, Any]) -> int:
        """应用起伏上表面到土体"""
        # 这里可以实现更复杂的上表面处理
        # 暂时返回原始土体
        logger.info("应用起伏上表面（简化实现）")
        return soil_box
    
    def _create_dxf_excavation(self, params: Dict[str, Any]) -> int:
        """从DXF创建基坑（待实现）"""
        logger.warning("DXF基坑创建功能待实现")
        raise NotImplementedError("DXF基坑创建功能待实现")
    
    def _create_rectangular_tunnel(self, params: Dict[str, Any]) -> int:
        """创建矩形隧道"""
        width = params["width"]
        height = params["height"]
        center = params["center"]
        length = params["length"]
        direction = params.get("direction", [1, 0, 0])

        if not isinstance(self.kernel, GmshKernel):
            raise NotImplementedError("矩形隧道创建仅支持Gmsh内核")

        gmsh = self.kernel.gmsh
        
        # 创建矩形截面
        half_w, half_h = width / 2, height / 2
        cx, cy, cz = center
        
        rect_points = [
            gmsh.model.occ.addPoint(cx - half_w, cy - half_h, cz),
            gmsh.model.occ.addPoint(cx + half_w, cy - half_h, cz),
            gmsh.model.occ.addPoint(cx + half_w, cy + half_h, cz),
            gmsh.model.occ.addPoint(cx - half_w, cy + half_h, cz)
        ]
        
        rect_lines = [
            gmsh.model.occ.addLine(rect_points[i], rect_points[(i + 1) % 4])
            for i in range(4)
        ]
        
        curve_loop = gmsh.model.occ.addCurveLoop(rect_lines)
        rect_surface = gmsh.model.occ.addPlaneSurface([curve_loop])
        
        # 拉伸成隧道
        extrude_result = gmsh.model.occ.extrude(
            [(2, rect_surface)],
            direction[0] * length,
            direction[1] * length,
            direction[2] * length
        )
        tunnel_volume = extrude_result[1][1]
        
        self.geometry_registry["tunnel"] = {
            "tag": tunnel_volume,
            "type": GeometryType.TUNNEL,
            "shape": "rectangular",
            "width": width,
            "height": height,
            "length": length,
            "center": center,
            "direction": direction
        }
        
        logger.info(f"矩形隧道创建完成，标签: {tunnel_volume}")
        return tunnel_volume
    
    def export_geometry(self, filename: str = None) -> str:
        """导出几何体"""
        if filename is None:
            filename = os.path.join(self.working_dir, "geometry_operations.step")

        if not isinstance(self.kernel, GmshKernel):
            raise NotImplementedError("导出功能仅支持Gmsh内核")
        
        gmsh = self.kernel.gmsh
        
        # 同步几何
        gmsh.model.occ.synchronize()
        
        # 导出STEP格式（OCC原生格式）
        gmsh.write(filename)
        
        logger.info(f"几何体已导出: {filename}")
        return filename
    
    def get_geometry_info(self) -> Dict[str, Any]:
        """获取几何体信息"""
        return {
            "registered_geometries": len(self.geometry_registry),
            "use_occ": isinstance(self.kernel, GmshKernel),
            "precision": self.precision,
            "working_dir": self.working_dir,
            "geometries": {k: {
                "type": v["type"].value,
                "tag": v["tag"]
            } for k, v in self.geometry_registry.items()}
        }


def create_complex_geometry_intersection(terrain_data: Dict[str, Any],
                                       excavation_params: Dict[str, Any] = None,
                                       tunnel_params: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    便捷函数：创建复杂几何求交
    
    Args:
        terrain_data: 地形数据
        excavation_params: 基坑参数
        tunnel_params: 隧道参数
        
    Returns:
        几何求交结果
    """
    engine = GeometryIntersectionEngine(use_occ=True)
    
    try:
        engine.initialize_gmsh()
        
        # 创建土体
        soil_tag = engine.create_soil_volume(terrain_data)
        
        result = {
            "status": "success",
            "soil_tag": soil_tag,
            "operations": []
        }
        
        # 处理基坑开挖
        if excavation_params:
            excavation_tag = engine.create_excavation_geometry(excavation_params)
            excavated_soil = engine.soil_excavation_intersection(soil_tag, excavation_tag)
            result["excavated_soil_tag"] = excavated_soil
            result["operations"].append("excavation")
        
        # 处理隧道开挖
        if tunnel_params:
            tunnel_tag = engine.create_tunnel_geometry(tunnel_params)
            current_soil = result.get("excavated_soil_tag", soil_tag)
            (
                excavated_soil,
                tunnel_space
            ) = engine.soil_tunnel_intersection(current_soil, tunnel_tag)
            result["final_soil_tag"] = excavated_soil
            result["tunnel_space_tag"] = tunnel_space
            result["operations"].append("tunnel")
        
        # 导出几何体
        geometry_file = engine.export_geometry()
        result["geometry_file"] = geometry_file
        result["geometry_info"] = engine.get_geometry_info()
        
        return result
        
    except Exception as e:
        logger.error(f"复杂几何求交失败: {e}")
        return {
            "status": "failed",
            "error": str(e)
        }
    finally:
        engine.finalize_gmsh() 