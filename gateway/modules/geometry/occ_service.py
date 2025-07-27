"""
gmsh OpenCASCADE (OCC) 几何建模服务
提供CAD级别的几何建模能力
"""

import gmsh
import tempfile
import os
import json
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
import numpy as np
from pathlib import Path

@dataclass
class GeometryInfo:
    """几何体信息"""
    tag: int
    volume: float
    surface_area: float
    center_of_mass: Tuple[float, float, float]
    bounding_box: Dict[str, Tuple[float, float, float]]

@dataclass
class GeometryCreateParams:
    """几何创建参数"""
    geometry_type: str
    parameters: Dict[str, Any]
    name: Optional[str] = None

@dataclass
class BooleanOperationParams:
    """布尔运算参数"""
    operation: str  # 'fuse', 'cut', 'intersect', 'fragment'
    object_tags: List[int]
    tool_tags: List[int]
    remove_object_and_tool: bool = True

@dataclass
class TransformParams:
    """几何变换参数"""
    operation: str  # 'translate', 'rotate', 'copy', 'mirror', 'scale'
    tags: List[int]
    parameters: Dict[str, Any]

class GmshOccService:
    """gmsh OCC 几何建模服务"""
    
    def __init__(self):
        self.geometry_registry: Dict[int, Dict[str, Any]] = {}
        self.next_tag = 1
        self._initialize_gmsh()
    
    def _initialize_gmsh(self):
        """初始化gmsh"""
        try:
            if gmsh.isInitialized():
                gmsh.finalize()
            gmsh.initialize()
            gmsh.model.add("DeepCAD_OCC")
            gmsh.option.setNumber("General.Terminal", 0)  # 禁用终端输出
            print("✓ gmsh OCC 服务初始化成功")
        except Exception as e:
            print(f"✗ gmsh OCC 初始化失败: {e}")
            raise
    
    def clear_all(self) -> bool:
        """清空所有几何体"""
        try:
            gmsh.model.remove()
            gmsh.model.add("DeepCAD_OCC")
            self.geometry_registry.clear()
            self.next_tag = 1
            return True
        except Exception as e:
            print(f"清空几何体失败: {e}")
            return False
    
    def create_geometry(self, params: GeometryCreateParams) -> GeometryInfo:
        """创建基础几何体"""
        try:
            occ = gmsh.model.occ
            geometry_type = params.geometry_type
            p = params.parameters
            
            # 根据几何类型创建相应的几何体
            if geometry_type == 'box':
                tag = occ.addBox(
                    p.get('x', 0), p.get('y', 0), p.get('z', 0),
                    p.get('dx', 1), p.get('dy', 1), p.get('dz', 1)
                )
            elif geometry_type == 'cylinder':
                tag = occ.addCylinder(
                    p.get('x', 0), p.get('y', 0), p.get('z', 0),
                    p.get('dx', 0), p.get('dy', 0), p.get('dz', p.get('height', 1)),
                    p.get('radius', 1)
                )
            elif geometry_type == 'sphere':
                tag = occ.addSphere(
                    p.get('x', 0), p.get('y', 0), p.get('z', 0),
                    p.get('r', 1)
                )
            elif geometry_type == 'cone':
                tag = occ.addCone(
                    p.get('x', 0), p.get('y', 0), p.get('z', 0),
                    p.get('dx', 0), p.get('dy', 0), p.get('dz', p.get('height', 1)),
                    p.get('r1', 1), p.get('r2', 0.5)
                )
            elif geometry_type == 'torus':
                tag = occ.addTorus(
                    p.get('x', 0), p.get('y', 0), p.get('z', 0),
                    p.get('r1', 2), p.get('r2', 0.5)
                )
            else:
                raise ValueError(f"不支持的几何类型: {geometry_type}")
            
            # 同步模型
            occ.synchronize()
            
            # 注册几何体
            self.geometry_registry[tag] = {
                'type': geometry_type,
                'parameters': p,
                'name': params.name or f"{geometry_type}_{tag}"
            }
            
            # 获取几何信息
            info = self._get_geometry_info(tag)
            
            print(f"✓ 创建几何体成功: {geometry_type} (tag={tag})")
            return info
            
        except Exception as e:
            print(f"✗ 创建几何体失败: {e}")
            raise
    
    def boolean_operation(self, params: BooleanOperationParams) -> List[GeometryInfo]:
        """执行布尔运算"""
        try:
            occ = gmsh.model.occ
            operation = params.operation
            
            # 准备输入参数
            object_dimtags = [(3, tag) for tag in params.object_tags]
            tool_dimtags = [(3, tag) for tag in params.tool_tags]
            
            # 执行布尔运算
            if operation == 'fuse':
                result_dimtags, _ = occ.fuse(
                    object_dimtags, tool_dimtags, 
                    removeObject=params.remove_object_and_tool,
                    removeTool=params.remove_object_and_tool
                )
            elif operation == 'cut':
                result_dimtags, _ = occ.cut(
                    object_dimtags, tool_dimtags,
                    removeObject=params.remove_object_and_tool,
                    removeTool=params.remove_object_and_tool
                )
            elif operation == 'intersect':
                result_dimtags, _ = occ.intersect(
                    object_dimtags, tool_dimtags,
                    removeObject=params.remove_object_and_tool,
                    removeTool=params.remove_object_and_tool
                )
            elif operation == 'fragment':
                result_dimtags, _ = occ.fragment(
                    object_dimtags, tool_dimtags
                )
            else:
                raise ValueError(f"不支持的布尔运算: {operation}")
            
            # 同步模型
            occ.synchronize()
            
            # 更新注册表
            if params.remove_object_and_tool:
                for tag in params.object_tags + params.tool_tags:
                    self.geometry_registry.pop(tag, None)
            
            # 注册新的几何体
            result_infos = []
            for dim, tag in result_dimtags:
                if dim == 3:  # 只处理3D实体
                    self.geometry_registry[tag] = {
                        'type': f'{operation}_result',
                        'parameters': {},
                        'name': f"{operation}_{tag}"
                    }
                    info = self._get_geometry_info(tag)
                    result_infos.append(info)
            
            print(f"✓ 布尔运算完成: {operation} -> {len(result_infos)} 个结果")
            return result_infos
            
        except Exception as e:
            print(f"✗ 布尔运算失败: {e}")
            raise
    
    def transform_geometry(self, params: TransformParams) -> List[GeometryInfo]:
        """几何变换"""
        try:
            occ = gmsh.model.occ
            operation = params.operation
            dimtags = [(3, tag) for tag in params.tags]
            p = params.parameters
            
            if operation == 'translate':
                occ.translate(
                    dimtags,
                    p.get('dx', 0), p.get('dy', 0), p.get('dz', 0)
                )
                result_tags = params.tags
                
            elif operation == 'rotate':
                occ.rotate(
                    dimtags,
                    p.get('x', 0), p.get('y', 0), p.get('z', 0),
                    p.get('ax', 0), p.get('ay', 0), p.get('az', 1),
                    p.get('angle', 0)
                )
                result_tags = params.tags
                
            elif operation == 'copy':
                copied_dimtags = occ.copy(dimtags)
                result_tags = [tag for dim, tag in copied_dimtags if dim == 3]
                
                # 注册复制的几何体
                for original_tag, new_tag in zip(params.tags, result_tags):
                    if original_tag in self.geometry_registry:
                        original_info = self.geometry_registry[original_tag]
                        self.geometry_registry[new_tag] = {
                            'type': original_info['type'] + '_copy',
                            'parameters': original_info['parameters'].copy(),
                            'name': original_info['name'] + f'_copy_{new_tag}'
                        }
                
            elif operation == 'mirror':
                occ.mirror(
                    dimtags,
                    p.get('a', 1), p.get('b', 0), p.get('c', 0), p.get('d', 0)
                )
                result_tags = params.tags
                
            elif operation == 'scale':
                scale_factor = p.get('scale', 1.0)
                occ.dilate(
                    dimtags,
                    p.get('x', 0), p.get('y', 0), p.get('z', 0),
                    scale_factor, scale_factor, scale_factor
                )
                result_tags = params.tags
                
            else:
                raise ValueError(f"不支持的变换操作: {operation}")
            
            # 同步模型
            occ.synchronize()
            
            # 获取结果信息
            result_infos = []
            for tag in result_tags:
                info = self._get_geometry_info(tag)
                result_infos.append(info)
            
            print(f"✓ 几何变换完成: {operation} -> {len(result_infos)} 个结果")
            return result_infos
            
        except Exception as e:
            print(f"✗ 几何变换失败: {e}")
            raise
    
    def delete_geometry(self, tags: List[int]) -> bool:
        """删除几何体"""
        try:
            occ = gmsh.model.occ
            dimtags = [(3, tag) for tag in tags]
            
            occ.remove(dimtags)
            occ.synchronize()
            
            # 从注册表中移除
            for tag in tags:
                self.geometry_registry.pop(tag, None)
            
            print(f"✓ 删除几何体成功: {len(tags)} 个")
            return True
            
        except Exception as e:
            print(f"✗ 删除几何体失败: {e}")
            return False
    
    def _get_geometry_info(self, tag: int) -> GeometryInfo:
        """获取几何体信息"""
        try:
            # 获取质量属性
            mass_props = gmsh.model.occ.getMass(3, tag)
            volume = mass_props[0] if mass_props else 0.0
            
            # 获取重心
            center_mass = gmsh.model.occ.getCenterOfMass(3, tag)
            
            # 获取边界框
            bbox = gmsh.model.occ.getBoundingBox(3, tag)
            bounding_box = {
                'min': (bbox[0], bbox[1], bbox[2]),
                'max': (bbox[3], bbox[4], bbox[5])
            }
            
            # 简单估算表面积（真实计算较复杂）
            dx, dy, dz = bbox[3] - bbox[0], bbox[4] - bbox[1], bbox[5] - bbox[2]
            surface_area = 2 * (dx*dy + dy*dz + dx*dz)  # 简化估算
            
            return GeometryInfo(
                tag=tag,
                volume=volume,
                surface_area=surface_area,
                center_of_mass=tuple(center_mass) if center_mass else (0, 0, 0),
                bounding_box=bounding_box
            )
            
        except Exception as e:
            print(f"获取几何信息失败: {e}")
            # 返回默认值
            return GeometryInfo(
                tag=tag,
                volume=0.0,
                surface_area=0.0,
                center_of_mass=(0, 0, 0),
                bounding_box={'min': (0, 0, 0), 'max': (1, 1, 1)}
            )
    
    def get_all_geometry_info(self) -> List[GeometryInfo]:
        """获取所有几何体信息"""
        infos = []
        for tag in self.geometry_registry.keys():
            try:
                info = self._get_geometry_info(tag)
                infos.append(info)
            except Exception as e:
                print(f"获取几何体 {tag} 信息失败: {e}")
        return infos
    
    def export_geometry(self, tags: List[int], format: str, filepath: str) -> bool:
        """导出几何模型"""
        try:
            # 如果指定了特定几何体，先隔离它们
            if tags:
                # 创建临时模型
                gmsh.model.add("temp_export")
                
                # 复制指定的几何体到临时模型
                occ = gmsh.model.occ
                dimtags = [(3, tag) for tag in tags]
                copied_dimtags = occ.copy(dimtags)
                occ.synchronize()
            
            # 根据格式导出
            if format.lower() in ['step', 'stp']:
                gmsh.write(filepath)
            elif format.lower() in ['iges', 'igs']:
                gmsh.write(filepath)
            elif format.lower() == 'stl':
                gmsh.write(filepath)
            elif format.lower() == 'brep':
                gmsh.write(filepath)
            elif format.lower() == 'geo':
                gmsh.write(filepath)
            else:
                raise ValueError(f"不支持的导出格式: {format}")
            
            # 恢复原模型
            if tags:
                gmsh.model.setCurrent("DeepCAD_OCC")
                gmsh.model.remove("temp_export")
            
            print(f"✓ 导出几何模型成功: {filepath}")
            return True
            
        except Exception as e:
            print(f"✗ 导出几何模型失败: {e}")
            return False
    
    def import_geometry(self, filepath: str) -> List[GeometryInfo]:
        """导入几何模型"""
        try:
            # 导入前记录现有几何体
            existing_entities = gmsh.model.getEntities(3)
            existing_tags = [tag for dim, tag in existing_entities]
            
            # 导入文件
            gmsh.merge(filepath)
            gmsh.model.occ.synchronize()
            
            # 获取新导入的几何体
            all_entities = gmsh.model.getEntities(3)
            new_tags = [tag for dim, tag in all_entities if tag not in existing_tags]
            
            # 注册新几何体
            infos = []
            for tag in new_tags:
                self.geometry_registry[tag] = {
                    'type': 'imported',
                    'parameters': {'source_file': filepath},
                    'name': f"imported_{tag}"
                }
                info = self._get_geometry_info(tag)
                infos.append(info)
            
            print(f"✓ 导入几何模型成功: {len(new_tags)} 个几何体")
            return infos
            
        except Exception as e:
            print(f"✗ 导入几何模型失败: {e}")
            raise
    
    def create_support_structure(self, structure_type: str, parameters: Dict[str, Any], position: Tuple[float, float, float]) -> List[GeometryInfo]:
        """创建支护结构"""
        try:
            occ = gmsh.model.occ
            x, y, z = position
            
            if structure_type == 'diaphragm_wall':
                # 地连墙
                thickness = parameters.get('thickness', 1.2)
                depth = parameters.get('depth', 25)
                coordinates = parameters.get('coordinates', [])
                
                if len(coordinates) < 2:
                    raise ValueError("地连墙需要至少2个坐标点")
                
                result_tags = []
                for i in range(len(coordinates) - 1):
                    start = coordinates[i]
                    end = coordinates[i + 1]
                    
                    # 计算墙段长度和方向
                    length = ((end['x'] - start['x'])**2 + (end['y'] - start['y'])**2)**0.5
                    angle = np.arctan2(end['y'] - start['y'], end['x'] - start['x'])
                    
                    # 创建墙段
                    wall_tag = occ.addBox(
                        x + start['x'], y + start['y'], z - depth,
                        length, thickness, depth
                    )
                    
                    # 旋转到正确角度
                    if angle != 0:
                        occ.rotate(
                            [(3, wall_tag)],
                            x + start['x'], y + start['y'], z,
                            0, 0, 1, angle
                        )
                    
                    result_tags.append(wall_tag)
                
                occ.synchronize()
                
                # 注册几何体
                for tag in result_tags:
                    self.geometry_registry[tag] = {
                        'type': 'diaphragm_wall',
                        'parameters': parameters,
                        'name': f"diaphragm_wall_{tag}"
                    }
                
            elif structure_type == 'steel_strut':
                # 钢支撑
                diameter = parameters.get('diameter', 0.6)
                span = parameters.get('span', 20)
                level = parameters.get('level', -5)
                
                strut_tag = occ.addCylinder(
                    x, y + level, z,
                    span, 0, 0,
                    diameter / 2
                )
                result_tags = [strut_tag]
                
                occ.synchronize()
                
                self.geometry_registry[strut_tag] = {
                    'type': 'steel_strut',
                    'parameters': parameters,
                    'name': f"steel_strut_{strut_tag}"
                }
                
            elif structure_type == 'anchor_rod':
                # 锚杆
                length = parameters.get('anchor_length', 15)
                angle = parameters.get('anchor_angle', 15) * np.pi / 180
                diameter = parameters.get('anchor_diameter', 0.1)
                
                # 锚杆方向向量
                dx = length * np.cos(angle)
                dy = 0
                dz = -length * np.sin(angle)
                
                anchor_tag = occ.addCylinder(
                    x, y, z,
                    dx, dy, dz,
                    diameter / 2
                )
                result_tags = [anchor_tag]
                
                occ.synchronize()
                
                self.geometry_registry[anchor_tag] = {
                    'type': 'anchor_rod',
                    'parameters': parameters,
                    'name': f"anchor_rod_{anchor_tag}"
                }
                
            else:
                raise ValueError(f"不支持的支护结构类型: {structure_type}")
            
            # 获取结果信息
            infos = []
            for tag in result_tags:
                info = self._get_geometry_info(tag)
                infos.append(info)
            
            print(f"✓ 创建支护结构成功: {structure_type} -> {len(result_tags)} 个组件")
            return infos
            
        except Exception as e:
            print(f"✗ 创建支护结构失败: {e}")
            raise
    
    def create_excavation_geometry(self, excavation_type: str, parameters: Dict[str, Any], position: Tuple[float, float, float]) -> GeometryInfo:
        """创建开挖几何"""
        try:
            occ = gmsh.model.occ
            x, y, z = position
            
            if excavation_type == 'rectangular':
                # 矩形基坑
                width = parameters.get('width', 40)
                length = parameters.get('length', 30)
                depth = parameters.get('depth', 15)
                
                excavation_tag = occ.addBox(
                    x - width/2, y - length/2, z - depth,
                    width, length, depth
                )
                
            elif excavation_type == 'circular':
                # 圆形基坑
                radius = parameters.get('radius', 20)
                depth = parameters.get('depth', 15)
                
                excavation_tag = occ.addCylinder(
                    x, y, z - depth,
                    0, 0, depth,
                    radius
                )
                
            elif excavation_type == 'irregular':
                # 不规则基坑
                boundary_points = parameters.get('boundary_points', [])
                depth = parameters.get('depth', 15)
                
                if len(boundary_points) < 3:
                    raise ValueError("不规则基坑需要至少3个边界点")
                
                # 创建边界轮廓
                point_tags = []
                for point in boundary_points:
                    pt_tag = occ.addPoint(x + point['x'], y + point['y'], z, 0.1)
                    point_tags.append(pt_tag)
                
                # 创建边界线
                line_tags = []
                for i in range(len(point_tags)):
                    next_i = (i + 1) % len(point_tags)
                    line_tag = occ.addLine(point_tags[i], point_tags[next_i])
                    line_tags.append(line_tag)
                
                # 创建边界环
                loop_tag = occ.addCurveLoop(line_tags)
                
                # 创建面
                surface_tag = occ.addPlaneSurface([loop_tag])
                
                # 挤出成体
                extruded = occ.extrude([(2, surface_tag)], 0, 0, -depth)
                excavation_tag = extruded[1][1]  # 获取挤出的体
                
            else:
                raise ValueError(f"不支持的开挖类型: {excavation_type}")
            
            occ.synchronize()
            
            # 注册几何体
            self.geometry_registry[excavation_tag] = {
                'type': f'{excavation_type}_excavation',
                'parameters': parameters,
                'name': f"{excavation_type}_excavation_{excavation_tag}"
            }
            
            info = self._get_geometry_info(excavation_tag)
            print(f"✓ 创建开挖几何成功: {excavation_type}")
            return info
            
        except Exception as e:
            print(f"✗ 创建开挖几何失败: {e}")
            raise

# 全局服务实例
_occ_service = None

def get_occ_service() -> GmshOccService:
    """获取OCC服务单例"""
    global _occ_service
    if _occ_service is None:
        _occ_service = GmshOccService()
    return _occ_service