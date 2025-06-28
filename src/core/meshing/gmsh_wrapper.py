"""
@file gmsh_wrapper.py
@description Gmsh网格划分库的Python包装器
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import tempfile
import logging
import numpy as np
from typing import Dict, Any, List, Optional, Tuple, Union
from enum import Enum

# 尝试导入gmsh库
try:
    import gmsh
except ImportError:
    logging.error("无法导入gmsh库，请确保已安装: pip install gmsh")
    raise

class MeshAlgorithm(Enum):
    """网格划分算法枚举"""
    DELAUNAY = "delaunay"
    FRONTAL = "frontal"
    FRONTAL_DELAUNAY = "frontal-delaunay"
    MESHADAPT = "meshadapt"
    
class FragmentType(Enum):
    """网格片段类型枚举"""
    BOX = "box"
    SPHERE = "sphere"
    CYLINDER = "cylinder"
    PLANE = "plane"
    CUSTOM = "custom"

class GmshWrapper:
    """
    Gmsh网格划分库的包装器
    提供便捷的接口生成、操作和优化有限元网格
    """
    
    def __init__(self, verbose: bool = False):
        """
        初始化Gmsh包装器
        
        Args:
            verbose: 是否打印详细信息
        """
        # 初始化Gmsh
        gmsh.initialize()
        
        # 设置日志级别
        if verbose:
            gmsh.option.setNumber("General.Terminal", 1)
        else:
            gmsh.option.setNumber("General.Terminal", 0)
            
        self.model = gmsh.model
        self.factory = gmsh.model.occ
        self.mesh = gmsh.model.mesh
        
        # 创建临时目录用于存储网格文件
        self.temp_dir = tempfile.mkdtemp(prefix="deep_excavation_mesh_")
        
        # 内部状态变量
        self.current_model_name = "default"
        self.entities = {
            "volumes": [],
            "surfaces": [],
            "curves": [],
            "points": []
        }
        self.physical_groups = {}
        self.fragment_entities = {}
        
        logging.info(f"Gmsh包装器初始化完成, Gmsh版本: {gmsh.version()}")
        
    def __del__(self):
        """析构函数，确保Gmsh资源被正确释放"""
        try:
            gmsh.finalize()
            logging.info("Gmsh资源已释放")
        except:
            pass
            
    def create_new_model(self, name: str = "default"):
        """
        创建一个新的Gmsh模型
        
        Args:
            name: 模型名称
        """
        self.model.add(name)
        self.current_model_name = name
        self.entities = {
            "volumes": [],
            "surfaces": [],
            "curves": [],
            "points": []
        }
        self.physical_groups = {}
        self.fragment_entities = {}
        
        logging.info(f"创建新模型: {name}")
        
    def add_point(self, x: float, y: float, z: float = 0.0, mesh_size: float = None) -> int:
        """
        添加点
        
        Args:
            x, y, z: 坐标
            mesh_size: 该点处的网格尺寸
            
        Returns:
            int: 点的标识符
        """
        point_tag = self.factory.addPoint(x, y, z, meshSize=mesh_size)
        self.entities["points"].append(point_tag)
        return point_tag
        
    def add_line(self, start_point: int, end_point: int) -> int:
        """
        添加线
        
        Args:
            start_point: 起点标识符
            end_point: 终点标识符
            
        Returns:
            int: 线的标识符
        """
        line_tag = self.factory.addLine(start_point, end_point)
        self.entities["curves"].append(line_tag)
        return line_tag
        
    def add_line_loop(self, lines: List[int]) -> int:
        """
        添加线环
        
        Args:
            lines: 组成环的线标识符列表
            
        Returns:
            int: 线环的标识符
        """
        return self.factory.addCurveLoop(lines)
        
    def add_plane_surface(self, wire: int) -> int:
        """
        添加平面曲面
        
        Args:
            wire: 边界线环的标识符
            
        Returns:
            int: 曲面的标识符
        """
        surface_tag = self.factory.addPlaneSurface([wire])
        self.entities["surfaces"].append(surface_tag)
        return surface_tag
        
    def extrude_surface(self, surface_tag: int, dx: float, dy: float, dz: float) -> Dict[int, List[int]]:
        """
        拉伸曲面形成体
        
        Args:
            surface_tag: 曲面标识符
            dx, dy, dz: 拉伸向量
            
        Returns:
            Dict[int, List[int]]: 拉伸产生的实体
        """
        extruded = self.factory.extrude([(2, surface_tag)], dx, dy, dz)
        
        # 提取体标识符
        for entity in extruded:
            if entity[0] == 3:  # 维度为3表示体
                self.entities["volumes"].append(entity[1])
                
        return extruded
        
    def add_box(self, x: float, y: float, z: float, dx: float, dy: float, dz: float) -> int:
        """
        添加长方体
        
        Args:
            x, y, z: 起点坐标
            dx, dy, dz: 各个方向上的尺寸
            
        Returns:
            int: 体的标识符
        """
        volume_tag = self.factory.addBox(x, y, z, dx, dy, dz)
        self.entities["volumes"].append(volume_tag)
        return volume_tag
        
    def add_cylinder(self, x: float, y: float, z: float, dx: float, dy: float, dz: float, r: float) -> int:
        """
        添加圆柱体
        
        Args:
            x, y, z: 起点坐标
            dx, dy, dz: 轴向向量
            r: 半径
            
        Returns:
            int: 体的标识符
        """
        volume_tag = self.factory.addCylinder(x, y, z, dx, dy, dz, r)
        self.entities["volumes"].append(volume_tag)
        return volume_tag
        
    def add_sphere(self, x: float, y: float, z: float, r: float) -> int:
        """
        添加球体
        
        Args:
            x, y, z: 中心坐标
            r: 半径
            
        Returns:
            int: 体的标识符
        """
        volume_tag = self.factory.addSphere(x, y, z, r)
        self.entities["volumes"].append(volume_tag)
        return volume_tag
        
    def boolean_union(self, object_tags: List[Tuple[int, int]], tool_tags: List[Tuple[int, int]] = None) -> List[Tuple[int, int]]:
        """
        布尔并运算
        
        Args:
            object_tags: 对象列表，形式为[(dim, tag), ...]
            tool_tags: 工具对象列表，形式为[(dim, tag), ...]
            
        Returns:
            List[Tuple[int, int]]: 结果实体列表
        """
        if tool_tags is None:
            tool_tags = []
        return self.factory.fuse(object_tags, tool_tags, removeObject=True, removeTool=True)
        
    def boolean_difference(self, object_tags: List[Tuple[int, int]], tool_tags: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
        """
        布尔差运算
        
        Args:
            object_tags: 对象列表，形式为[(dim, tag), ...]
            tool_tags: 工具对象列表，形式为[(dim, tag), ...]
            
        Returns:
            List[Tuple[int, int]]: 结果实体列表
        """
        return self.factory.cut(object_tags, tool_tags, removeObject=True, removeTool=True)
        
    def boolean_intersection(self, object_tags: List[Tuple[int, int]], tool_tags: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
        """
        布尔交运算
        
        Args:
            object_tags: 对象列表，形式为[(dim, tag), ...]
            tool_tags: 工具对象列表，形式为[(dim, tag), ...]
            
        Returns:
            List[Tuple[int, int]]: 结果实体列表
        """
        return self.factory.intersect(object_tags, tool_tags, removeObject=True, removeTool=True)
        
    def fragment_entities(self, object_tags: List[Tuple[int, int]], tool_tags: List[Tuple[int, int]]) -> Dict[str, List[int]]:
        """
        片段化实体，产生相互切割后的片段
        
        Args:
            object_tags: 对象列表，形式为[(dim, tag), ...]
            tool_tags: 工具对象列表，形式为[(dim, tag), ...]
            
        Returns:
            Dict[str, List[int]]: 结果片段字典，包含"objects"和"tools"两个键
        """
        # 执行fragment操作
        fragment_result = self.factory.fragment(object_tags, tool_tags)
        
        # 解析结果
        objects_out = []
        tools_out = []
        
        # 获取fragment操作后的映射关系
        object_map = {}
        tool_map = {}
        
        # 为object_tags中的原始对象建立映射
        for i, obj in enumerate(object_tags):
            object_map[obj[1]] = []
            
        # 为tool_tags中的原始对象建立映射
        for i, tool in enumerate(tool_tags):
            tool_map[tool[1]] = []
            
        # 处理fragment结果
        for item in fragment_result[0]:
            if item[0] == 3:  # 体
                objects_out.append(item[1])
                
        # 更新内部状态
        fragment_id = len(self.fragment_entities) + 1
        self.fragment_entities[fragment_id] = {
            "objects": objects_out,
            "tools": tools_out,
            "object_map": object_map,
            "tool_map": tool_map
        }
        
        # 提取所有生成的体
        for entity in fragment_result[0]:
            if entity[0] == 3:  # 维度为3表示体
                if entity[1] not in self.entities["volumes"]:
                    self.entities["volumes"].append(entity[1])
                    
        # 同步模型
        self.factory.synchronize()
                    
        return {
            "id": fragment_id,
            "objects": objects_out,
            "tools": tools_out
        }
        
    def add_physical_group(self, dim: int, tags: List[int], name: str) -> int:
        """
        添加物理组
        
        Args:
            dim: 维度(0-点,1-线,2-面,3-体)
            tags: 实体标识符列表
            name: 物理组名称
            
        Returns:
            int: 物理组标识符
        """
        # 同步模型，确保所有实体都已被添加到Gmsh模型中
        self.factory.synchronize()
        
        # 添加物理组
        group_tag = self.model.addPhysicalGroup(dim, tags)
        
        # 设置物理组名称
        self.model.setPhysicalName(dim, group_tag, name)
        
        # 保存到内部状态
        self.physical_groups[name] = {
            "dim": dim,
            "tag": group_tag,
            "entities": tags
        }
        
        return group_tag
        
    def set_mesh_size_at_points(self, point_tags: List[int], size: float):
        """
        设置点处的网格尺寸
        
        Args:
            point_tags: 点标识符列表
            size: 网格尺寸
        """
        for tag in point_tags:
            self.mesh.setSize([(0, tag)], size)
            
    def set_mesh_size_field(self, field_type: str, params: Dict[str, Any]) -> int:
        """
        设置网格尺寸场
        
        Args:
            field_type: 场类型(MathEval, Box, Ball, Distance, ...)
            params: 场参数
            
        Returns:
            int: 场标识符
        """
        # 创建新的尺寸场
        field_tag = self.mesh.field.add(field_type)
        
        # 设置场参数
        for key, value in params.items():
            if isinstance(value, str):
                self.mesh.field.setString(field_tag, key, value)
            elif isinstance(value, (int, float, bool)):
                self.mesh.field.setNumber(field_tag, key, value)
            elif isinstance(value, list):
                self.mesh.field.setNumbers(field_tag, key, value)
                
        return field_tag
        
    def set_background_mesh_field(self, field_tag: int):
        """
        设置背景网格场
        
        Args:
            field_tag: 场标识符
        """
        self.mesh.field.setAsBackgroundMesh(field_tag)
        
    def add_fragment_mesh_field(self, 
                               fragment_type: Union[FragmentType, str], 
                               location: List[float], 
                               size: float,
                               params: Dict[str, Any] = None) -> int:
        """
        添加用于局部细化的片段网格场
        
        Args:
            fragment_type: 片段类型
            location: 位置坐标
            size: 局部网格尺寸
            params: 附加参数
            
        Returns:
            int: 场标识符
        """
        if isinstance(fragment_type, str):
            try:
                fragment_type = FragmentType(fragment_type.lower())
            except ValueError:
                fragment_type = FragmentType.BOX
                
        if params is None:
            params = {}
        
        field_params = {}
        
        # 根据不同的片段类型设置场参数
        if fragment_type == FragmentType.BOX:
            # 创建长方体尺寸场
            field_tag = self.mesh.field.add("Box")
            
            x_min = location[0] - params.get("width", 1.0) / 2
            y_min = location[1] - params.get("length", 1.0) / 2
            z_min = location[2] - params.get("height", 1.0) / 2
            x_max = location[0] + params.get("width", 1.0) / 2
            y_max = location[1] + params.get("length", 1.0) / 2
            z_max = location[2] + params.get("height", 1.0) / 2
            
            field_params = {
                "VIn": size,
                "VOut": params.get("outer_size", size * 5),
                "XMin": x_min,
                "XMax": x_max,
                "YMin": y_min,
                "YMax": y_max,
                "ZMin": z_min,
                "ZMax": z_max,
                "Thickness": params.get("transition", 0.3)
            }
            
        elif fragment_type == FragmentType.SPHERE:
            # 创建球形尺寸场
            field_tag = self.mesh.field.add("Ball")
            
            field_params = {
                "VIn": size,
                "VOut": params.get("outer_size", size * 5),
                "XCenter": location[0],
                "YCenter": location[1],
                "ZCenter": location[2],
                "Radius": params.get("radius", 1.0),
                "Thickness": params.get("transition", 0.3)
            }
            
        elif fragment_type == FragmentType.CYLINDER:
            # 创建圆柱形尺寸场
            field_tag = self.mesh.field.add("Cylinder")
            
            field_params = {
                "VIn": size,
                "VOut": params.get("outer_size", size * 5),
                "XCenter": location[0],
                "YCenter": location[1],
                "ZCenter": location[2],
                "XAxis": params.get("axis_x", 0.0),
                "YAxis": params.get("axis_y", 0.0), 
                "ZAxis": params.get("axis_z", 1.0),
                "Radius": params.get("radius", 1.0),
                "Thickness": params.get("transition", 0.3)
            }
            
        elif fragment_type == FragmentType.PLANE:
            # 创建平面尺寸场
            field_tag = self.mesh.field.add("MathEval")
            
            # 平面方程: ax + by + cz + d = 0
            a = params.get("a", 0.0)
            b = params.get("b", 0.0)
            c = params.get("c", 1.0)
            d = -(a * location[0] + b * location[1] + c * location[2])
            
            # 创建基于平面距离的尺寸场表达式
            expr = f"{size} + ({params.get('outer_size', size * 5)} - {size}) * " + \
                   f"tanh(abs({a}*x + {b}*y + {c}*z + {d}) / {params.get('transition', 0.3)})"
            
            field_params = {
                "F": expr
            }
            
        elif fragment_type == FragmentType.CUSTOM:
            # 创建自定义数学表达式尺寸场
            field_tag = self.mesh.field.add("MathEval")
            
            if "expression" in params:
                field_params = {
                    "F": params["expression"]
                }
            else:
                # 默认自定义表达式
                field_params = {
                    "F": f"{size} + ({params.get('outer_size', size * 5)} - {size}) * " + \
                         f"tanh(sqrt((x-{location[0]})^2 + (y-{location[1]})^2 + (z-{location[2]})^2) / {params.get('transition', 0.3)})"
                }
                
        # 设置场参数
        for key, value in field_params.items():
            if isinstance(value, str):
                self.mesh.field.setString(field_tag, key, value)
            elif isinstance(value, (int, float, bool)):
                self.mesh.field.setNumber(field_tag, key, value)
            elif isinstance(value, list):
                self.mesh.field.setNumbers(field_tag, key, value)
                
        return field_tag
        
    def add_min_field(self, field_tags: List[int]) -> int:
        """
        添加最小值场，组合多个场
        
        Args:
            field_tags: 场标识符列表
            
        Returns:
            int: 最小值场标识符
        """
        min_field = self.mesh.field.add("Min")
        self.mesh.field.setNumbers(min_field, "FieldsList", field_tags)
        return min_field
        
    def generate_mesh(self, 
                     algorithm: Union[MeshAlgorithm, str] = MeshAlgorithm.DELAUNAY,
                     element_size: float = 1.0,
                     order: int = 2,
                     optimize_steps: int = 10,
                     output_file: str = None,
                     dimension: int = 3) -> Dict[str, Any]:
        """
        生成网格
        
        Args:
            algorithm: 网格划分算法
            element_size: 全局网格尺寸
            order: 单元阶数(1或2)
            optimize_steps: 优化步数
            output_file: 输出文件路径
            dimension: 网格维度(1, 2或3)
            
        Returns:
            Dict[str, Any]: 网格统计信息
        """
        # 将算法转换为枚举类型
        if isinstance(algorithm, str):
            try:
                algorithm = MeshAlgorithm(algorithm.lower())
            except ValueError:
                algorithm = MeshAlgorithm.DELAUNAY
        
        # 同步模型
        self.factory.synchronize()
        
        # 设置全局网格尺寸
        gmsh.option.setNumber("Mesh.CharacteristicLengthFactor", element_size)
        
        # 设置网格阶数
        gmsh.option.setNumber("Mesh.ElementOrder", order)
        
        # 设置网格算法
        algorithm_map = {
            MeshAlgorithm.DELAUNAY: 1,
            MeshAlgorithm.FRONTAL: 6,
            MeshAlgorithm.FRONTAL_DELAUNAY: 7,
            MeshAlgorithm.MESHADAPT: 1
        }
        gmsh.option.setNumber("Mesh.Algorithm", algorithm_map[algorithm])
        
        # 设置3D算法
        algorithm_3d_map = {
            MeshAlgorithm.DELAUNAY: 1,
            MeshAlgorithm.FRONTAL: 4,
            MeshAlgorithm.FRONTAL_DELAUNAY: 5,
            MeshAlgorithm.MESHADAPT: 1
        }
        gmsh.option.setNumber("Mesh.Algorithm3D", algorithm_3d_map[algorithm])
        
        # 设置优化步数
        gmsh.option.setNumber("Mesh.OptimizationSteps", optimize_steps)
        
        # 生成网格
        self.model.mesh.generate(dimension)
        
        # 优化网格
        if optimize_steps > 0:
            self.model.mesh.optimize("Netgen", force=False)
        
        # 输出网格文件
        if output_file is None:
            output_file = os.path.join(self.temp_dir, f"{self.current_model_name}.msh")
        
        gmsh.write(output_file)
        
        # 获取网格统计信息
        element_types, element_tags, element_node_tags = self.model.mesh.getElements()
        
        # 计算节点和单元数量
        nodes = self.model.mesh.getNodes()[0]
        node_count = len(nodes)
        
        element_count = 0
        element_count_by_type = {}
        
        for i, element_type in enumerate(element_types):
            type_name = gmsh.model.mesh.getElementProperties(element_type)[0]
            count = len(element_tags[i])
            element_count += count
            element_count_by_type[type_name] = count
        
        # 计算网格质量
        quality_min, quality_avg = 1.0, 1.0
        
        # 仅对三维问题计算质量
        if dimension == 3:
            try:
                qualities = self.model.mesh.getElementQualities()
                if len(qualities) > 0:
                    quality_min = min(qualities)
                    quality_avg = sum(qualities) / len(qualities)
            except:
                pass
            
        mesh_info = {
            "node_count": node_count,
            "element_count": element_count,
            "element_count_by_type": element_count_by_type,
            "quality_min": quality_min,
            "quality_avg": quality_avg,
            "mesh_file": output_file,
            "algorithm": algorithm.value,
            "element_size": element_size,
            "order": order
        }
        
        return mesh_info
        
    def export_mesh(self, filename: str, format: str = "msh"):
        """
        导出网格到文件
        
        Args:
            filename: 文件名
            format: 文件格式(msh, vtk, unv, med, ...)
        """
        # 确保文件后缀与格式匹配
        if not filename.endswith(f".{format}"):
            filename = f"{filename}.{format}"
            
        gmsh.write(filename)
        
    def create_boundary_layer(self, 
                              surface_tags: List[int], 
                              thickness: float, 
                              growth_rate: float = 1.1,
                              max_layers: int = 5,
                              hfar: float = None) -> int:
        """
        在指定曲面上创建边界层
        
        Args:
            surface_tags: 曲面标识符列表
            thickness: 首层厚度
            growth_rate: 增长率
            max_layers: 最大层数
            hfar: 远场网格尺寸
            
        Returns:
            int: 场标识符
        """
        # 创建距离场
        distance_field = self.mesh.field.add("Distance")
        self.mesh.field.setNumbers(distance_field, "FacesList", surface_tags)
        
        # 创建边界层场
        bl_field = self.mesh.field.add("BoundaryLayer")
        self.mesh.field.setNumber(bl_field, "hwall_n", thickness)
        self.mesh.field.setNumber(bl_field, "ratio", growth_rate)
        self.mesh.field.setNumber(bl_field, "Nlayers", max_layers)
        self.mesh.field.setNumbers(bl_field, "FacesList", surface_tags)
        
        if hfar is not None:
            self.mesh.field.setNumber(bl_field, "hfar", hfar)
            
        return bl_field
        
    def visualize_model(self):
        """启动Gmsh GUI可视化模型"""
        if "-nopopup" not in sys.argv:
            gmsh.fltk.run()


