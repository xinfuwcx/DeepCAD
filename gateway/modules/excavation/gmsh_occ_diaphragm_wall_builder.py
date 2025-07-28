"""
基于GMSH OCC的地连墙-锚杆支护体系建模
挖洞+填充算法 → 地连墙壳单元 + 软填充材料 + 锚杆梁单元
2号几何专家 - 与地质建模统一技术栈
"""

import gmsh
import numpy as np
import logging
import math
from typing import List, Dict, Tuple, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)

class DiaphragmWallType(str, Enum):
    """地连墙类型"""
    CONTINUOUS = "continuous"    # 连续墙
    PANEL = "panel"             # 槽段式
    CAST_IN_PLACE = "cast_in_place"  # 现浇地连墙

class AnchorType(str, Enum):
    """锚杆类型"""
    PRESTRESSED = "prestressed"  # 预应力锚杆
    SOIL_NAIL = "soil_nail"      # 土钉
    GROUND_ANCHOR = "ground_anchor"  # 地锚

class GMSHOCCDiaphragmWallBuilder:
    """GMSH OCC地连墙-锚杆体系构建器"""
    
    def __init__(self):
        self.model_name = "DiaphragmWallModel"
        self.wall_volumes = {}       # 存储地连墙实体
        self.wall_shells = {}        # 存储地连墙壳单元
        self.soft_fill_volumes = {}  # 存储软填充体
        self.anchor_volumes = {}     # 存储锚杆体
        self.anchor_beams = {}       # 存储锚杆梁单元
        self.physical_groups = {}
        
    def initialize_gmsh(self):
        """初始化GMSH环境"""
        try:
            gmsh.initialize()
            gmsh.clear()
            gmsh.model.add(self.model_name)
            logger.info("✓ GMSH OCC地连墙建模环境初始化完成")
        except Exception as e:
            logger.error(f"GMSH初始化失败: {e}")
            raise
    
    def create_diaphragm_wall_geometry(self,
                                     wall_centerline: List[Tuple[float, float]],
                                     wall_depth: float,
                                     wall_thickness: float,
                                     top_elevation: float = 0.0,
                                     wall_type: DiaphragmWallType = DiaphragmWallType.CONTINUOUS) -> Tuple[int, List[int]]:
        """
        创建地连墙几何体
        
        Args:
            wall_centerline: 墙体中心线坐标 [(x, y), ...]
            wall_depth: 墙体深度(m)
            wall_thickness: 墙体厚度(m)
            top_elevation: 墙顶标高(m)
            wall_type: 地连墙类型
            
        Returns:
            (墙体体积标签, 墙面标签列表)
        """
        try:
            if len(wall_centerline) < 2:
                raise ValueError("墙体中心线至少需要2个点")
            
            wall_faces = []
            
            # 创建墙体各段
            for i in range(len(wall_centerline) - 1):
                start_point = wall_centerline[i]
                end_point = wall_centerline[i + 1]
                
                # 计算墙段方向向量
                dx = end_point[0] - start_point[0]
                dy = end_point[1] - start_point[1]
                segment_length = math.sqrt(dx*dx + dy*dy)
                
                if segment_length < 1e-6:
                    continue
                
                # 单位方向向量
                unit_dx = dx / segment_length
                unit_dy = dy / segment_length
                
                # 垂直向量（右手系）
                normal_x = -unit_dy * wall_thickness / 2
                normal_y = unit_dx * wall_thickness / 2
                
                # 创建墙段的四个角点
                wall_corners = [
                    # 底部两点
                    (start_point[0] - normal_x, start_point[1] - normal_y, top_elevation - wall_depth),
                    (start_point[0] + normal_x, start_point[1] + normal_y, top_elevation - wall_depth),
                    (end_point[0] + normal_x, end_point[1] + normal_y, top_elevation - wall_depth),
                    (end_point[0] - normal_x, end_point[1] - normal_y, top_elevation - wall_depth),
                    # 顶部四点
                    (start_point[0] - normal_x, start_point[1] - normal_y, top_elevation),
                    (start_point[0] + normal_x, start_point[1] + normal_y, top_elevation),
                    (end_point[0] + normal_x, end_point[1] + normal_y, top_elevation),
                    (end_point[0] - normal_x, end_point[1] - normal_y, top_elevation),
                ]
                
                # 创建点
                point_tags = []
                for x, y, z in wall_corners:
                    point_tag = gmsh.model.occ.addPoint(x, y, z)
                    point_tags.append(point_tag)
                
                # 创建墙段体（六面体）
                # 底面
                bottom_lines = []
                for j in range(4):
                    next_j = (j + 1) % 4
                    line = gmsh.model.occ.addLine(point_tags[j], point_tags[next_j])
                    bottom_lines.append(line)
                
                bottom_loop = gmsh.model.occ.addCurveLoop(bottom_lines)
                bottom_face = gmsh.model.occ.addPlaneSurface([bottom_loop])
                
                # 拉伸成体
                wall_segment_result = gmsh.model.occ.extrude(
                    [(2, bottom_face)],  # 2表示面
                    0, 0, wall_depth     # 向上拉伸
                )
                
                # 获取拉伸后的体
                segment_volume = None
                segment_faces = []
                for dim, tag in wall_segment_result:
                    if dim == 3:  # 体
                        segment_volume = tag
                    elif dim == 2:  # 面
                        segment_faces.append(tag)
                
                if segment_volume is not None:
                    self.wall_volumes[f'wall_segment_{i}'] = segment_volume
                    wall_faces.extend(segment_faces)
            
            # 如果有多个墙段，需要合并
            if len(self.wall_volumes) > 1:
                volume_list = [(3, vol) for vol in self.wall_volumes.values()]
                union_result = gmsh.model.occ.fuse(volume_list, [])
                
                if union_result[0]:
                    unified_volume = union_result[0][0][1]
                    self.wall_volumes['unified_wall'] = unified_volume
                    
                    logger.info(f"✓ 合并地连墙段: {len(volume_list)}段 → 统一墙体")
                else:
                    # 合并失败，保持原状
                    unified_volume = list(self.wall_volumes.values())[0]
                    logger.warning("墙段合并失败，使用第一段作为主体")
            else:
                unified_volume = list(self.wall_volumes.values())[0]
            
            # 同步几何
            gmsh.model.occ.synchronize()
            
            logger.info(f"✓ 创建地连墙几何体: 深度{wall_depth}m, 厚度{wall_thickness}m")
            
            return unified_volume, wall_faces
            
        except Exception as e:
            logger.error(f"创建地连墙几何体失败: {e}")
            raise
    
    def create_anchor_system(self,
                           anchor_points: List[Tuple[float, float, float]],
                           anchor_directions: List[Tuple[float, float, float]],
                           anchor_lengths: List[float],
                           anchor_diameter: float = 150.0,  # mm
                           anchor_type: AnchorType = AnchorType.PRESTRESSED) -> Dict[str, List[int]]:
        """
        创建锚杆系统
        
        Args:
            anchor_points: 锚杆起点坐标 [(x, y, z), ...]
            anchor_directions: 锚杆方向向量 [(dx, dy, dz), ...] (单位向量)
            anchor_lengths: 锚杆长度列表 [L1, L2, ...]
            anchor_diameter: 锚杆直径(mm)
            anchor_type: 锚杆类型
            
        Returns:
            锚杆组件字典 {'volumes': [volume_tags], 'centerlines': [line_tags]}
        """
        try:
            if not (len(anchor_points) == len(anchor_directions) == len(anchor_lengths)):
                raise ValueError("锚杆点、方向、长度数据长度不一致")
            
            anchor_volumes = []
            anchor_centerlines = []
            anchor_radius = anchor_diameter / 2000.0  # mm转m
            
            for i, (start_point, direction, length) in enumerate(zip(anchor_points, anchor_directions, anchor_lengths)):
                # 规范化方向向量
                dir_magnitude = math.sqrt(sum(d*d for d in direction))
                if dir_magnitude < 1e-6:
                    logger.warning(f"锚杆{i}方向向量长度为零，跳过")
                    continue
                
                unit_direction = [d / dir_magnitude for d in direction]
                
                # 计算锚杆终点
                end_point = [
                    start_point[0] + unit_direction[0] * length,
                    start_point[1] + unit_direction[1] * length,
                    start_point[2] + unit_direction[2] * length
                ]
                
                # 创建锚杆中心线
                start_point_tag = gmsh.model.occ.addPoint(*start_point)
                end_point_tag = gmsh.model.occ.addPoint(*end_point)
                centerline = gmsh.model.occ.addLine(start_point_tag, end_point_tag)
                anchor_centerlines.append(centerline)
                
                # 创建锚杆圆形截面
                # 在起点处创建垂直于锚杆的圆
                # 简化：假设锚杆不是完全竖直的，计算一个垂直向量
                if abs(unit_direction[2]) < 0.99:  # 非竖直
                    perp_vec = [-unit_direction[1], unit_direction[0], 0]
                else:  # 近似竖直
                    perp_vec = [1, 0, 0]
                
                # 规范化垂直向量
                perp_magnitude = math.sqrt(sum(p*p for p in perp_vec))
                if perp_magnitude > 1e-6:
                    perp_vec = [p / perp_magnitude for p in perp_vec]
                
                # 在起点创建圆形截面
                # 由于GMSH OCC的复杂性，这里简化为圆柱体
                anchor_volume = gmsh.model.occ.addCylinder(
                    start_point[0], start_point[1], start_point[2],  # 起点
                    unit_direction[0] * length,                      # 方向向量 * 长度
                    unit_direction[1] * length,
                    unit_direction[2] * length,
                    anchor_radius                                    # 半径
                )
                
                anchor_volumes.append(anchor_volume)
                
                logger.info(f"✓ 创建锚杆{i+1}: 长度{length}m, 直径{anchor_diameter}mm")
            
            # 保存锚杆信息
            self.anchor_volumes['anchor_bodies'] = anchor_volumes
            self.anchor_beams['anchor_centerlines'] = anchor_centerlines
            
            logger.info(f"✓ 锚杆系统创建完成: {len(anchor_volumes)}根锚杆")
            
            return {
                'volumes': anchor_volumes,
                'centerlines': anchor_centerlines
            }
            
        except Exception as e:
            logger.error(f"创建锚杆系统失败: {e}")
            raise
    
    def apply_hole_filler_algorithm(self,
                                  soil_volumes: Dict[int, int],
                                  wall_volume: int,
                                  anchor_volumes: List[int],
                                  soft_fill_material_id: int = 9999) -> Dict[str, Any]:
        """
        实施挖洞+填充算法
        
        原理：
        1. 从土体中挖除地连墙和锚杆的体积（创建"洞"）
        2. 在洞中填入软材料（E≈0.1×土体模量）来保持几何连续性
        3. 地连墙按壳单元计算，锚杆按梁单元计算
        
        Args:
            soil_volumes: 土层体字典 {layer_id: volume_tag}
            wall_volume: 地连墙体标签
            anchor_volumes: 锚杆体标签列表
            soft_fill_material_id: 软填充材料ID
            
        Returns:
            挖洞填充结果字典
        """
        try:
            excavated_soil_volumes = {}
            soft_fill_volumes = []
            
            # 合并所有需要挖除的体（地连墙 + 锚杆）
            structures_to_remove = [(3, wall_volume)] + [(3, vol) for vol in anchor_volumes]
            
            logger.info(f"🔄 开始挖洞+填充算法: {len(structures_to_remove)}个结构体")
            
            # 对每个土层执行挖洞操作
            for layer_id, soil_volume in soil_volumes.items():
                try:
                    # 执行布尔差集运算（土体 - 结构体）
                    cut_result = gmsh.model.occ.cut(
                        [(3, soil_volume)],      # 被切割对象
                        structures_to_remove,    # 切割工具
                        removeObject=True,       # 移除原对象
                        removeTool=False         # 保留切割工具
                    )
                    
                    if cut_result[0]:
                        # 切割成功，获取新的土体
                        new_soil_volume = cut_result[0][0][1]
                        excavated_soil_volumes[layer_id] = new_soil_volume
                        
                        logger.info(f"✓ 土层{layer_id}挖洞完成: {soil_volume} → {new_soil_volume}")
                    else:
                        # 无交集，保持原状
                        excavated_soil_volumes[layer_id] = soil_volume
                        logger.info(f"• 土层{layer_id}与结构体无交集")
                        
                except Exception as e:
                    logger.error(f"土层{layer_id}挖洞失败: {e}")
                    excavated_soil_volumes[layer_id] = soil_volume
            
            # 创建软填充材料
            # 这里需要重新创建结构体作为软填充材料
            
            # 复制地连墙体作为软填充
            wall_soft_fill = gmsh.model.occ.copy([(3, wall_volume)])[0][1]
            soft_fill_volumes.append(wall_soft_fill)
            self.soft_fill_volumes['wall_soft_fill'] = wall_soft_fill
            
            # 复制锚杆体作为软填充
            for i, anchor_vol in enumerate(anchor_volumes):
                anchor_soft_fill = gmsh.model.occ.copy([(3, anchor_vol)])[0][1]
                soft_fill_volumes.append(anchor_soft_fill)
                self.soft_fill_volumes[f'anchor_soft_fill_{i}'] = anchor_soft_fill
            
            # 同步几何
            gmsh.model.occ.synchronize()
            
            result = {
                'excavated_soil_volumes': excavated_soil_volumes,
                'soft_fill_volumes': soft_fill_volumes,
                'wall_volume_for_shell': wall_volume,      # 用于生成壳单元
                'anchor_volumes_for_beam': anchor_volumes,  # 用于生成梁单元
                'soft_fill_material_id': soft_fill_material_id
            }
            
            logger.info("🎉 挖洞+填充算法完成!")
            logger.info(f"   挖空土层: {len(excavated_soil_volumes)}层")
            logger.info(f"   软填充体: {len(soft_fill_volumes)}个")
            
            return result
            
        except Exception as e:
            logger.error(f"挖洞+填充算法失败: {e}")
            raise
    
    def define_support_system_physical_groups(self,
                                            excavated_soil_volumes: Dict[int, int],
                                            soft_fill_volumes: List[int],
                                            wall_volume: int,
                                            anchor_volumes: List[int],
                                            soil_materials: Dict[int, Dict[str, Any]],
                                            soft_fill_material_id: int) -> Dict[str, int]:
        """
        定义支护体系物理组
        
        Args:
            excavated_soil_volumes: 挖洞后的土层体
            soft_fill_volumes: 软填充体列表
            wall_volume: 地连墙体（用于壳单元）
            anchor_volumes: 锚杆体列表（用于梁单元）
            soil_materials: 土层材料信息
            soft_fill_material_id: 软填充材料ID
            
        Returns:
            物理组映射字典
        """
        try:
            physical_groups = {}
            
            # 1. 挖洞后的土层物理组
            for layer_id, volume_tag in excavated_soil_volumes.items():
                material_info = soil_materials.get(layer_id, {'name': f'ExcavatedSoil_{layer_id}'})
                physical_group_id = layer_id + 3000  # 支护体系土层组
                
                gmsh.model.addPhysicalGroup(3, [volume_tag], physical_group_id)
                gmsh.model.setPhysicalName(3, physical_group_id, material_info['name'])
                physical_groups[f'excavated_soil_{layer_id}'] = physical_group_id
            
            # 2. 软填充材料物理组
            if soft_fill_volumes:
                soft_fill_group_id = soft_fill_material_id
                gmsh.model.addPhysicalGroup(3, soft_fill_volumes, soft_fill_group_id)
                gmsh.model.setPhysicalName(3, soft_fill_group_id, "SoftFillMaterial")
                physical_groups['soft_fill'] = soft_fill_group_id
            
            # 3. 地连墙壳单元组（边界面）
            # 获取地连墙的表面
            wall_surfaces = []
            try:
                # 获取地连墙体的所有表面
                wall_boundary = gmsh.model.getBoundary([(3, wall_volume)], combined=False, oriented=False)
                for dim, tag in wall_boundary:
                    if dim == 2:  # 面
                        wall_surfaces.append(tag)
                
                if wall_surfaces:
                    wall_shell_group_id = 5000
                    gmsh.model.addPhysicalGroup(2, wall_surfaces, wall_shell_group_id)
                    gmsh.model.setPhysicalName(2, wall_shell_group_id, "DiaphragmWallShell")
                    physical_groups['diaphragm_wall_shell'] = wall_shell_group_id
                    
                    logger.info(f"✓ 地连墙壳单元组: {len(wall_surfaces)}个面")
                    
            except Exception as e:
                logger.warning(f"地连墙面提取失败: {e}")
            
            # 4. 锚杆梁单元组（中心线）
            if hasattr(self, 'anchor_beams') and 'anchor_centerlines' in self.anchor_beams:
                anchor_lines = self.anchor_beams['anchor_centerlines']
                if anchor_lines:
                    anchor_beam_group_id = 5001
                    gmsh.model.addPhysicalGroup(1, anchor_lines, anchor_beam_group_id)
                    gmsh.model.setPhysicalName(1, anchor_beam_group_id, "AnchorBeams")
                    physical_groups['anchor_beams'] = anchor_beam_group_id
                    
                    logger.info(f"✓ 锚杆梁单元组: {len(anchor_lines)}根")
            
            self.physical_groups = physical_groups
            
            logger.info(f"✓ 支护体系物理组定义完成: {len(physical_groups)}个组")
            
            return physical_groups
            
        except Exception as e:
            logger.error(f"定义支护体系物理组失败: {e}")
            raise
    
    def generate_support_system_mesh(self, 
                                   mesh_params: Dict[str, float] = None) -> str:
        """
        生成支护体系网格
        
        Args:
            mesh_params: 网格参数
            
        Returns:
            网格文件路径
        """
        try:
            if mesh_params is None:
                mesh_params = {
                    'volume_size': 2.0,      # 体网格尺寸
                    'surface_size': 0.5,     # 面网格尺寸（地连墙）
                    'line_size': 0.2         # 线网格尺寸（锚杆）
                }
            
            # 设置网格参数
            gmsh.option.setNumber("Mesh.CharacteristicLengthMax", mesh_params.get('volume_size', 2.0))
            gmsh.option.setNumber("Mesh.CharacteristicLengthMin", mesh_params.get('line_size', 0.2))
            
            # 地连墙面网格细化
            if 'diaphragm_wall_shell' in self.physical_groups:
                try:
                    wall_surfaces = []
                    # 这里需要根据物理组获取面，简化处理
                    wall_size = mesh_params.get('surface_size', 0.5)
                    # gmsh.model.mesh.setSize(wall_surfaces, wall_size)  # 需要具体实现
                except Exception as e:
                    logger.warning(f"地连墙网格细化失败: {e}")
            
            # 设置网格算法
            gmsh.option.setNumber("Mesh.Algorithm", 6)    # Frontal-Delaunay 2D
            gmsh.option.setNumber("Mesh.Algorithm3D", 10)  # HXT 3D
            
            # 生成网格
            logger.info("🔄 开始生成支护体系网格...")
            gmsh.model.mesh.generate(3)
            
            # 保存网格
            mesh_file = f"support_system_mesh_{self.model_name}.msh"
            gmsh.write(mesh_file)
            
            # 获取网格统计
            node_count = len(gmsh.model.mesh.getNodes()[0])
            element_info = gmsh.model.mesh.getElements()
            element_count = sum(len(elements) for elements in element_info[2]) if element_info[2] else 0
            
            logger.info(f"✓ 支护体系网格生成完成: {node_count}节点, {element_count}单元")
            logger.info(f"✓ 网格文件: {mesh_file}")
            
            return mesh_file
            
        except Exception as e:
            logger.error(f"支护体系网格生成失败: {e}")
            raise
    
    def build_complete_support_system(self,
                                    support_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        完整的地连墙-锚杆支护体系建模流程
        
        Args:
            support_config: 支护体系配置参数
            
        Returns:
            建模结果字典
        """
        try:
            # 1. 初始化GMSH
            self.initialize_gmsh()
            
            # 2. 创建地连墙几何体
            wall_volume, wall_faces = self.create_diaphragm_wall_geometry(
                wall_centerline=support_config['wall']['centerline'],
                wall_depth=support_config['wall']['depth'],
                wall_thickness=support_config['wall']['thickness'],
                top_elevation=support_config['wall'].get('top_elevation', 0.0),
                wall_type=DiaphragmWallType(support_config['wall'].get('type', 'continuous'))
            )
            
            # 3. 创建锚杆系统
            anchor_system = self.create_anchor_system(
                anchor_points=support_config['anchors']['points'],
                anchor_directions=support_config['anchors']['directions'],
                anchor_lengths=support_config['anchors']['lengths'],
                anchor_diameter=support_config['anchors'].get('diameter', 150.0),
                anchor_type=AnchorType(support_config['anchors'].get('type', 'prestressed'))
            )
            
            # 4. 执行挖洞+填充算法
            hole_filler_result = self.apply_hole_filler_algorithm(
                soil_volumes=support_config['soil_volumes'],
                wall_volume=wall_volume,
                anchor_volumes=anchor_system['volumes'],
                soft_fill_material_id=support_config.get('soft_fill_material_id', 9999)
            )
            
            # 5. 定义物理组
            physical_groups = self.define_support_system_physical_groups(
                excavated_soil_volumes=hole_filler_result['excavated_soil_volumes'],
                soft_fill_volumes=hole_filler_result['soft_fill_volumes'],
                wall_volume=wall_volume,
                anchor_volumes=anchor_system['volumes'],
                soil_materials=support_config.get('soil_materials', {}),
                soft_fill_material_id=hole_filler_result['soft_fill_material_id']
            )
            
            # 6. 生成网格
            mesh_file = self.generate_support_system_mesh(
                mesh_params=support_config.get('mesh_params', {})
            )
            
            result = {
                'success': True,
                'support_system_name': support_config.get('name', 'DefaultSupportSystem'),
                'wall_volume': wall_volume,
                'anchor_count': len(anchor_system['volumes']),
                'excavated_soil_volumes': hole_filler_result['excavated_soil_volumes'],
                'soft_fill_volumes': hole_filler_result['soft_fill_volumes'],
                'physical_groups': physical_groups,
                'mesh_file': mesh_file,
                'hole_filler_algorithm': {
                    'wall_shell_elements': True,
                    'anchor_beam_elements': True,
                    'soft_fill_material_id': hole_filler_result['soft_fill_material_id']
                }
            }
            
            logger.info("🎉 地连墙-锚杆支护体系建模完成!")
            logger.info(f"   地连墙体积: {wall_volume}")
            logger.info(f"   锚杆数量: {len(anchor_system['volumes'])}根")
            logger.info(f"   挖洞土层: {len(hole_filler_result['excavated_soil_volumes'])}层")
            logger.info(f"   软填充体: {len(hole_filler_result['soft_fill_volumes'])}个")
            
            return result
            
        except Exception as e:
            logger.error(f"地连墙-锚杆支护体系建模失败: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def finalize(self):
        """清理GMSH环境"""
        try:
            gmsh.finalize()
            logger.info("✓ GMSH支护体系建模环境清理完成")
        except:
            pass

# 全局构建器实例
diaphragm_wall_builder = GMSHOCCDiaphragmWallBuilder()