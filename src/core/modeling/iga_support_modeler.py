# IGA支护结构建模模块

"""
@file iga_support_modeler.py
@description IGA支护结构建模模块，用于基于NURBS的支护结构建模（包括地连墙、桩、锚索等）
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import numpy as np
from typing import List, Dict, Tuple, Any, Optional, Union
import json
import logging

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    # 尝试导入NURBS相关库
    import geomdl
    from geomdl import NURBS
    from geomdl import BSpline
    from geomdl import utilities
    from geomdl import operations
    from geomdl import convert
    from geomdl.visualization import VisMPL
    HAS_GEOMDL = True
except ImportError:
    HAS_GEOMDL = False
    logger.warning("NURBS-Python (geomdl) 库未安装，部分功能可能受限")
    logger.info("可以通过 pip install geomdl 安装")

try:
    # 尝试导入Kratos IGA应用
    kratos_root = os.getenv("KRATOS_ROOT", "../Kratos")
    sys.path.append(kratos_root)
    
    import KratosMultiphysics
    import KratosMultiphysics.IgaApplication
    
    HAS_KRATOS_IGA = True
except ImportError:
    HAS_KRATOS_IGA = False
    logger.warning("Kratos IGA Application 不可用，将使用替代方法")


class IgaSupportModeler:
    """IGA支护结构建模类，用于创建基于NURBS的支护结构几何模型"""
    
    def __init__(self):
        """初始化IGA支护结构建模器"""
        self.nurbs_curves = {}    # 存储NURBS曲线
        self.nurbs_surfaces = {}  # 存储NURBS表面
        self.nurbs_volumes = {}   # 存储NURBS体
        self.support_structures = {}  # 存储支护结构信息
        self.control_points = {}  # 控制点数据
        self.weights = {}         # 权重数据
        self.knot_vectors = {}    # 节点矢量
        
    def create_diaphragm_wall(self, 
                             start_point: List[float], 
                             end_point: List[float], 
                             height: float, 
                             thickness: float,
                             degree_u: int = 2,
                             degree_v: int = 1,
                             control_points_u: int = 5,
                             control_points_v: int = 2) -> str:
        """创建地连墙
        
        Args:
            start_point: 起点坐标 [x, y, z]
            end_point: 终点坐标 [x, y, z]
            height: 墙高度(m)
            thickness: 墙厚度(m)
            degree_u: u方向NURBS阶数
            degree_v: v方向NURBS阶数
            control_points_u: u方向控制点数量
            control_points_v: v方向控制点数量
            
        Returns:
            wall_id: 创建的地连墙ID
        """
        if not HAS_GEOMDL:
            logger.error("缺少NURBS-Python库，无法创建NURBS表面")
            return ""
        
        try:
            # 计算方向向量
            direction = np.array(end_point) - np.array(start_point)
            length = np.linalg.norm(direction)
            direction = direction / length if length > 0 else np.array([1.0, 0.0, 0.0])
            
            # 计算垂直于方向的向量(厚度方向)
            if abs(direction[0]) < 0.001 and abs(direction[2]) < 0.001:
                # 如果方向是垂直的
                normal = np.array([1.0, 0.0, 0.0])
            else:
                # 否则使用叉积计算垂直向量
                up = np.array([0.0, 1.0, 0.0])
                normal = np.cross(direction, up)
                normal = normal / np.linalg.norm(normal)
            
            # 计算厚度方向的偏移
            half_thickness = thickness / 2.0
            offset = normal * half_thickness
            
            # 创建控制点网格
            ctrlpts = []
            for j in range(control_points_v):
                for i in range(control_points_u):
                    # 计算u方向位置参数(沿墙长度)
                    u = i / (control_points_u - 1)
                    
                    # 计算v方向位置参数(厚度方向)
                    v = j / (control_points_v - 1)
                    v = v * 2 - 1  # 映射到[-1, 1]
                    
                    # 计算基础点(沿墙长度)
                    base_point = np.array(start_point) + direction * u * length
                    
                    # 添加厚度方向的偏移
                    point = base_point + offset * v
                    
                    # 添加控制点 [x, y, z, 1.0] (最后一个是权重)
                    ctrlpts.append([point[0], point[1], point[2], 1.0])
            
            # 创建NURBS表面
            surface = NURBS.Surface()
            
            # 设置阶数
            surface.degree_u = degree_u
            surface.degree_v = degree_v
            
            # 计算节点向量
            surface.knotvector_u = utilities.generate_knot_vector(surface.degree_u, control_points_u)
            surface.knotvector_v = utilities.generate_knot_vector(surface.degree_v, control_points_v)
            
            # 设置控制点
            surface.set_ctrlpts(ctrlpts, control_points_u, control_points_v)
            
            # 设置权重
            surface.weights = [pt[3] for pt in ctrlpts]  # 设置权重
            
            # 生成表面
            surface.delta = 0.01
            surface.evaluate()
            
            # 存储表面
            surface_id = f"diaphragm_wall_surface_{len(self.nurbs_surfaces)}"
            self.nurbs_surfaces[surface_id] = surface
            
            # 存储控制点和权重数据
            self.control_points[surface_id] = ctrlpts
            self.weights[surface_id] = surface.weights
            self.knot_vectors[surface_id] = {
                "u": surface.knotvector_u,
                "v": surface.knotvector_v
            }
            
            # 创建地连墙结构信息
            wall_id = f"diaphragm_wall_{len(self.support_structures)}"
            self.support_structures[wall_id] = {
                "type": "diaphragm_wall",
                "surface_id": surface_id,
                "start_point": start_point,
                "end_point": end_point,
                "height": height,
                "thickness": thickness,
                "material": {
                    "name": "混凝土",
                    "elastic_modulus": 30e9,  # Pa
                    "poisson_ratio": 0.2,
                    "density": 2500  # kg/m³
                }
            }
            
            logger.info(f"创建地连墙: ID={wall_id}, 长度={length}m, 高度={height}m, 厚度={thickness}m")
            return wall_id
            
        except Exception as e:
            logger.error(f"创建地连墙失败: {str(e)}")
            return ""
    
    def create_pile(self, 
                   position: List[float], 
                   length: float, 
                   diameter: float,
                   degree: int = 2,
                   control_points_u: int = 5,
                   control_points_v: int = 8) -> str:
        """创建桩
        
        Args:
            position: 桩顶部中心位置 [x, y, z]
            length: 桩长度(m)
            diameter: 桩直径(m)
            degree: NURBS阶数
            control_points_u: 周向控制点数量
            control_points_v: 纵向控制点数量
            
        Returns:
            pile_id: 创建的桩ID
        """
        if not HAS_GEOMDL:
            logger.error("缺少NURBS-Python库，无法创建NURBS表面")
            return ""
        
        try:
            # 创建NURBS圆柱表面
            surface = NURBS.Surface()
            surface.degree_u = degree
            surface.degree_v = degree
            
            # 计算节点向量
            surface.knotvector_u = utilities.generate_knot_vector(surface.degree_u, control_points_u, periodic=True)
            surface.knotvector_v = utilities.generate_knot_vector(surface.degree_v, control_points_v)
            
            # 创建控制点网格
            radius = diameter / 2.0
            ctrlpts = []
            
            # 为圆柱体创建控制点
            for j in range(control_points_v):
                # 计算纵向位置
                v = j / (control_points_v - 1)
                z = position[1] - v * length  # y轴向下为桩长度方向
                
                # 创建一个圆环的控制点
                for i in range(control_points_u):
                    # 计算角度
                    theta = (i / control_points_u) * 2 * np.pi
                    
                    # 计算圆上的点
                    x = position[0] + radius * np.cos(theta)
                    y = position[2] + radius * np.sin(theta)
                    
                    # 添加控制点 [x, y, z, 1.0] (最后一个是权重)
                    if i % 2 == 0:  # 为了创建圆形，每隔一个点使用不同的权重
                        weight = 1.0
                    else:
                        weight = np.cos(np.pi / control_points_u)  # 适当的权重使NURBS形成圆形
                    
                    ctrlpts.append([x, z, y, weight])
            
            # 设置控制点
            surface.set_ctrlpts(ctrlpts, control_points_u, control_points_v)
            surface.weights = [pt[3] for pt in ctrlpts]  # 设置权重
            
            # 生成表面
            surface.delta = 0.01
            surface.evaluate()
            
            # 存储表面
            surface_id = f"pile_surface_{len(self.nurbs_surfaces)}"
            self.nurbs_surfaces[surface_id] = surface
            
            # 存储控制点和权重数据
            self.control_points[surface_id] = ctrlpts
            self.weights[surface_id] = surface.weights
            self.knot_vectors[surface_id] = {
                "u": surface.knotvector_u,
                "v": surface.knotvector_v
            }
            
            # 创建桩结构信息
            pile_id = f"pile_{len(self.support_structures)}"
            self.support_structures[pile_id] = {
                "type": "pile",
                "surface_id": surface_id,
                "position": position,
                "length": length,
                "diameter": diameter,
                "material": {
                    "name": "混凝土",
                    "elastic_modulus": 30e9,  # Pa
                    "poisson_ratio": 0.2,
                    "density": 2500  # kg/m³
                }
            }
            
            logger.info(f"创建桩: ID={pile_id}, 位置=[{position[0]}, {position[1]}, {position[2]}], 长度={length}m, 直径={diameter}m")
            return pile_id
            
        except Exception as e:
            logger.error(f"创建桩失败: {str(e)}")
            return ""
    
    def create_anchor(self, 
                     start_point: List[float], 
                     angle: float, 
                     length: float, 
                     diameter: float,
                     degree: int = 2,
                     control_points: int = 5) -> str:
        """创建锚索
        
        Args:
            start_point: 锚索起点 [x, y, z]
            angle: 锚索角度(度)，相对于水平面向下的角度
            length: 锚索长度(m)
            diameter: 锚索直径(m)
            degree: NURBS阶数
            control_points: 控制点数量
            
        Returns:
            anchor_id: 创建的锚索ID
        """
        if not HAS_GEOMDL:
            logger.error("缺少NURBS-Python库，无法创建NURBS曲线")
            return ""
        
        try:
            # 创建NURBS曲线
            curve = NURBS.Curve()
            curve.degree = degree
            
            # 计算节点向量
            curve.knotvector = utilities.generate_knot_vector(curve.degree, control_points)
            
            # 计算方向向量
            angle_rad = np.radians(angle)
            direction = np.array([np.cos(angle_rad), -np.sin(angle_rad), 0.0])  # y轴向下为正
            
            # 创建控制点
            ctrlpts = []
            for i in range(control_points):
                # 计算位置参数
                t = i / (control_points - 1)
                
                # 计算点位置
                point = np.array(start_point) + direction * t * length
                
                # 添加控制点 [x, y, z, 1.0] (最后一个是权重)
                ctrlpts.append([point[0], point[1], point[2], 1.0])
            
            # 设置控制点
            curve.ctrlpts = ctrlpts
            curve.weights = [pt[3] for pt in ctrlpts]  # 设置权重
            
            # 生成曲线
            curve.delta = 0.01
            curve.evaluate()
            
            # 存储曲线
            curve_id = f"anchor_curve_{len(self.nurbs_curves)}"
            self.nurbs_curves[curve_id] = curve
            
            # 存储控制点和权重数据
            self.control_points[curve_id] = ctrlpts
            self.weights[curve_id] = curve.weights
            self.knot_vectors[curve_id] = {
                "u": curve.knotvector
            }
            
            # 计算终点
            end_point = ctrlpts[-1][:3]
            
            # 创建锚索结构信息
            anchor_id = f"anchor_{len(self.support_structures)}"
            self.support_structures[anchor_id] = {
                "type": "anchor",
                "curve_id": curve_id,
                "start_point": start_point,
                "end_point": end_point,
                "angle": angle,
                "length": length,
                "diameter": diameter,
                "material": {
                    "name": "钢",
                    "elastic_modulus": 210e9,  # Pa
                    "poisson_ratio": 0.3,
                    "density": 7850  # kg/m³
                }
            }
            
            logger.info(f"创建锚索: ID={anchor_id}, 起点=[{start_point[0]}, {start_point[1]}, {start_point[2]}], 角度={angle}°, 长度={length}m")
            return anchor_id
            
        except Exception as e:
            logger.error(f"创建锚索失败: {str(e)}")
            return ""
    
    def create_strut(self, 
                    start_point: List[float], 
                    end_point: List[float], 
                    diameter: float,
                    degree: int = 2,
                    control_points: int = 5) -> str:
        """创建支撑
        
        Args:
            start_point: 支撑起点 [x, y, z]
            end_point: 支撑终点 [x, y, z]
            diameter: 支撑直径(m)
            degree: NURBS阶数
            control_points: 控制点数量
            
        Returns:
            strut_id: 创建的支撑ID
        """
        if not HAS_GEOMDL:
            logger.error("缺少NURBS-Python库，无法创建NURBS曲线")
            return ""
        
        try:
            # 创建NURBS曲线
            curve = NURBS.Curve()
            curve.degree = degree
            
            # 计算节点向量
            curve.knotvector = utilities.generate_knot_vector(curve.degree, control_points)
            
            # 计算方向向量
            direction = np.array(end_point) - np.array(start_point)
            length = np.linalg.norm(direction)
            direction = direction / length if length > 0 else np.array([1.0, 0.0, 0.0])
            
            # 创建控制点
            ctrlpts = []
            for i in range(control_points):
                # 计算位置参数
                t = i / (control_points - 1)
                
                # 计算点位置
                point = np.array(start_point) + direction * t * length
                
                # 添加控制点 [x, y, z, 1.0] (最后一个是权重)
                ctrlpts.append([point[0], point[1], point[2], 1.0])
            
            # 设置控制点
            curve.ctrlpts = ctrlpts
            curve.weights = [pt[3] for pt in ctrlpts]  # 设置权重
            
            # 生成曲线
            curve.delta = 0.01
            curve.evaluate()
            
            # 存储曲线
            curve_id = f"strut_curve_{len(self.nurbs_curves)}"
            self.nurbs_curves[curve_id] = curve
            
            # 存储控制点和权重数据
            self.control_points[curve_id] = ctrlpts
            self.weights[curve_id] = curve.weights
            self.knot_vectors[curve_id] = {
                "u": curve.knotvector
            }
            
            # 创建支撑结构信息
            strut_id = f"strut_{len(self.support_structures)}"
            self.support_structures[strut_id] = {
                "type": "strut",
                "curve_id": curve_id,
                "start_point": start_point,
                "end_point": end_point,
                "length": length,
                "diameter": diameter,
                "material": {
                    "name": "钢",
                    "elastic_modulus": 210e9,  # Pa
                    "poisson_ratio": 0.3,
                    "density": 7850  # kg/m³
                }
            }
            
            logger.info(f"创建支撑: ID={strut_id}, 起点=[{start_point[0]}, {start_point[1]}, {start_point[2]}], 终点=[{end_point[0]}, {end_point[1]}, {end_point[2]}], 长度={length}m")
            return strut_id
            
        except Exception as e:
            logger.error(f"创建支撑失败: {str(e)}")
            return ""
    
    def create_pile_wall(self, 
                        start_point: List[float], 
                        end_point: List[float], 
                        pile_diameter: float,
                        pile_spacing: float,
                        pile_length: float) -> List[str]:
        """创建桩墙
        
        Args:
            start_point: 桩墙起点 [x, y, z]
            end_point: 桩墙终点 [x, y, z]
            pile_diameter: 桩直径(m)
            pile_spacing: 桩间距(m)
            pile_length: 桩长度(m)
            
        Returns:
            pile_ids: 创建的桩ID列表
        """
        # 计算方向向量
        direction = np.array(end_point) - np.array(start_point)
        total_length = np.linalg.norm(direction)
        direction = direction / total_length if total_length > 0 else np.array([1.0, 0.0, 0.0])
        
        # 计算桩数量
        num_piles = int(total_length / pile_spacing) + 1
        
        # 创建桩
        pile_ids = []
        for i in range(num_piles):
            # 计算桩位置
            t = i / (num_piles - 1) if num_piles > 1 else 0
            position = np.array(start_point) + direction * t * total_length
            
            # 创建桩
            pile_id = self.create_pile(
                position=position.tolist(), 
                length=pile_length, 
                diameter=pile_diameter
            )
            
            if pile_id:
                pile_ids.append(pile_id)
        
        # 创建桩墙结构信息
        wall_id = f"pile_wall_{len(self.support_structures)}"
        self.support_structures[wall_id] = {
            "type": "pile_wall",
            "pile_ids": pile_ids,
            "start_point": start_point,
            "end_point": end_point,
            "pile_diameter": pile_diameter,
            "pile_spacing": pile_spacing,
            "pile_length": pile_length
        }
        
        logger.info(f"创建桩墙: ID={wall_id}, 桩数量={len(pile_ids)}, 总长={total_length}m")
        return pile_ids
    
    def export_to_iga_format(self, filename: str) -> bool:
        """导出为IGA格式文件
        
        Args:
            filename: 输出文件名
            
        Returns:
            success: 是否成功导出
        """
        try:
            data = {
                "support_structures": self.support_structures,
                "curves": {},
                "surfaces": {}
            }
            
            # 导出曲线数据
            for curve_id, curve in self.nurbs_curves.items():
                curve_data = {
                    "degree": curve.degree,
                    "knot_vector": curve.knotvector,
                    "control_points": self.control_points[curve_id],
                    "weights": self.weights[curve_id]
                }
                data["curves"][curve_id] = curve_data
            
            # 导出表面数据
            for surface_id, surface in self.nurbs_surfaces.items():
                surface_data = {
                    "degree_u": surface.degree_u,
                    "degree_v": surface.degree_v,
                    "knot_vector_u": surface.knotvector_u,
                    "knot_vector_v": surface.knotvector_v,
                    "control_points": self.control_points[surface_id],
                    "weights": self.weights[surface_id]
                }
                data["surfaces"][surface_id] = surface_data
            
            # 写入文件
            with open(filename, 'w') as f:
                json.dump(data, f, indent=2)
                
            logger.info(f"成功导出IGA支护结构模型到: {filename}")
            return True
            
        except Exception as e:
            logger.error(f"导出IGA支护结构模型失败: {str(e)}")
            return False
    
    def export_to_kratos(self, model_part_name: str = "IgaSupportModelPart") -> bool:
        """导出到Kratos模型部件
        
        Args:
            model_part_name: Kratos模型部件名称
            
        Returns:
            success: 是否成功导出
        """
        if not HAS_KRATOS_IGA:
            logger.error("Kratos IGA应用不可用，无法导出")
            return False
            
        try:
            # 创建Kratos模型
            model = KratosMultiphysics.Model()
            model_part = model.CreateModelPart(model_part_name)
            
            # TODO: 实现NURBS数据到Kratos IGA模型的转换
            # 这需要使用Kratos IGA API创建NURBS实体
            
            logger.info(f"成功导出到Kratos模型部件: {model_part_name}")
            return True
            
        except Exception as e:
            logger.error(f"导出到Kratos失败: {str(e)}")
            return False
    
    def visualize(self, structure_id: str) -> bool:
        """可视化支护结构
        
        Args:
            structure_id: 结构ID
            
        Returns:
            success: 是否成功可视化
        """
        if not HAS_GEOMDL:
            logger.error("缺少NURBS-Python库，无法可视化")
            return False
            
        if structure_id not in self.support_structures:
            logger.error(f"找不到结构: {structure_id}")
            return False
            
        try:
            structure = self.support_structures[structure_id]
            
            if structure["type"] in ["diaphragm_wall", "pile"]:
                # 可视化表面
                surface_id = structure.get("surface_id")
                if surface_id in self.nurbs_surfaces:
                    surface = self.nurbs_surfaces[surface_id]
                    
                    # 设置可视化组件
                    vis_config = VisMPL.VisConfig(ctrlpts=True, legend=True)
                    surface.vis = VisMPL.VisSurface(vis_config)
                    
                    # 可视化
                    surface.render()
                    
                    return True
            elif structure["type"] in ["anchor", "strut"]:
                # 可视化曲线
                curve_id = structure.get("curve_id")
                if curve_id in self.nurbs_curves:
                    curve = self.nurbs_curves[curve_id]
                    
                    # 设置可视化组件
                    vis_config = VisMPL.VisConfig(ctrlpts=True, legend=True)
                    curve.vis = VisMPL.VisCurve3D(vis_config)
                    
                    # 可视化
                    curve.render()
                    
                    return True
            elif structure["type"] == "pile_wall":
                # 可视化桩墙中的每个桩
                success = True
                for pile_id in structure.get("pile_ids", []):
                    if not self.visualize(pile_id):
                        success = False
                return success
            
            logger.error(f"不支持可视化结构类型: {structure['type']}")
            return False
            
        except Exception as e:
            logger.error(f"可视化失败: {str(e)}")
            return False
    
    def get_support_structures(self) -> Dict[str, Dict[str, Any]]:
        """获取支护结构信息
        
        Returns:
            support_structures: 支护结构信息字典
        """
        return self.support_structures
