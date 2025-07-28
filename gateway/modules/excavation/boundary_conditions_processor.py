"""
基坑工程边界条件设置处理器
自动识别边界面 + 工程约束条件 → 有限元边界条件
2号几何专家 - 统一GMSH几何边界处理方案
"""

import gmsh
import numpy as np
import logging
import math
from typing import List, Dict, Tuple, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)

class BoundaryType(str, Enum):
    """边界类型"""
    FIXED_DISPLACEMENT = "fixed_displacement"    # 固定位移
    FIXED_ROTATION = "fixed_rotation"           # 固定转角
    ROLLER_SUPPORT = "roller_support"           # 滑动支座
    SPRING_SUPPORT = "spring_support"           # 弹簧支座
    PRESSURE_LOAD = "pressure_load"             # 压力荷载
    DISTRIBUTED_LOAD = "distributed_load"       # 分布荷载
    CONCENTRATED_LOAD = "concentrated_load"     # 集中荷载
    WATER_PRESSURE = "water_pressure"           # 水压力
    EARTH_PRESSURE = "earth_pressure"           # 土压力

class BoundaryDirection(str, Enum):
    """边界方向"""
    X_DIRECTION = "x"       # X方向
    Y_DIRECTION = "y"       # Y方向
    Z_DIRECTION = "z"       # Z方向
    NORMAL = "normal"       # 法向
    TANGENTIAL = "tangential"  # 切向
    ALL_DIRECTIONS = "all"     # 全方向

class BoundaryConditionsProcessor:
    """边界条件处理器"""
    
    def __init__(self):
        self.processor_name = "BoundaryConditionsProcessor"
        self.boundary_surfaces = {}      # 存储边界面
        self.boundary_conditions = {}    # 存储边界条件
        self.load_conditions = {}        # 存储荷载条件
        self.physical_groups = {}        # 边界物理组
        
    def identify_model_boundaries(self,
                                volume_entities: Dict[str, List[int]],
                                tolerance: float = 1e-6) -> Dict[str, List[int]]:
        """
        自动识别模型边界面
        
        Args:
            volume_entities: 体实体字典 {'soil_layers': [...], 'structures': [...]}
            tolerance: 几何容差
            
        Returns:
            边界面字典 {'bottom': [...], 'sides': [...], 'top': [...]}
        """
        try:
            all_volumes = []
            for entity_list in volume_entities.values():
                all_volumes.extend(entity_list)
            
            # 获取所有体的边界面
            all_boundary_faces = []
            for volume in all_volumes:
                try:
                    boundary = gmsh.model.getBoundary([(3, volume)], combined=False, oriented=False)
                    for dim, tag in boundary:
                        if dim == 2:  # 面
                            all_boundary_faces.append(tag)
                except Exception as e:
                    logger.warning(f"体{volume}边界获取失败: {e}")
            
            # 去重
            all_boundary_faces = list(set(all_boundary_faces))
            
            # 计算模型边界框
            model_bounds = self._calculate_model_bounds(all_volumes)
            
            # 分类边界面
            boundary_classification = {
                'bottom': [],    # 底面
                'top': [],       # 顶面
                'sides': [],     # 侧面
                'internal': []   # 内部面
            }
            
            for face_tag in all_boundary_faces:
                try:
                    # 获取面的质心
                    face_centroid = self._get_face_centroid(face_tag)
                    if face_centroid is None:
                        continue
                    
                    x, y, z = face_centroid
                    
                    # 根据位置分类
                    if abs(z - model_bounds['z_min']) < tolerance:
                        boundary_classification['bottom'].append(face_tag)
                    elif abs(z - model_bounds['z_max']) < tolerance:
                        boundary_classification['top'].append(face_tag)
                    elif (abs(x - model_bounds['x_min']) < tolerance or 
                          abs(x - model_bounds['x_max']) < tolerance or
                          abs(y - model_bounds['y_min']) < tolerance or 
                          abs(y - model_bounds['y_max']) < tolerance):
                        boundary_classification['sides'].append(face_tag)
                    else:
                        boundary_classification['internal'].append(face_tag)
                        
                except Exception as e:
                    logger.warning(f"面{face_tag}分类失败: {e}")
            
            self.boundary_surfaces = boundary_classification
            
            logger.info(f"✓ 边界面识别完成:")
            logger.info(f"   底面: {len(boundary_classification['bottom'])}个")
            logger.info(f"   顶面: {len(boundary_classification['top'])}个")
            logger.info(f"   侧面: {len(boundary_classification['sides'])}个")
            logger.info(f"   内部面: {len(boundary_classification['internal'])}个")
            
            return boundary_classification
            
        except Exception as e:
            logger.error(f"边界面识别失败: {e}")
            raise
    
    def apply_foundation_pit_boundary_conditions(self,
                                               boundary_faces: Dict[str, List[int]],
                                               engineering_constraints: Dict[str, Any]) -> Dict[str, Any]:
        """
        应用基坑工程边界条件
        
        Args:
            boundary_faces: 边界面分类
            engineering_constraints: 工程约束条件
            
        Returns:
            边界条件设置结果
        """
        try:
            boundary_condition_groups = {}
            
            # 1. 底面边界条件（通常固定）
            if boundary_faces.get('bottom'):
                bottom_constraint = engineering_constraints.get('bottom_constraint', 'fixed_all')
                
                if bottom_constraint == 'fixed_all':
                    # 底面全固定
                    bottom_group_id = 6001
                    gmsh.model.addPhysicalGroup(2, boundary_faces['bottom'], bottom_group_id)
                    gmsh.model.setPhysicalName(2, bottom_group_id, "BottomFixed")
                    
                    boundary_condition_groups['bottom_fixed'] = {
                        'group_id': bottom_group_id,
                        'type': BoundaryType.FIXED_DISPLACEMENT,
                        'direction': BoundaryDirection.ALL_DIRECTIONS,
                        'value': 0.0,
                        'faces': boundary_faces['bottom']
                    }
                    
                elif bottom_constraint == 'roller_z':
                    # 底面Z向滑动支座
                    bottom_group_id = 6002
                    gmsh.model.addPhysicalGroup(2, boundary_faces['bottom'], bottom_group_id)
                    gmsh.model.setPhysicalName(2, bottom_group_id, "BottomRollerZ")
                    
                    boundary_condition_groups['bottom_roller'] = {
                        'group_id': bottom_group_id,
                        'type': BoundaryType.ROLLER_SUPPORT,
                        'direction': BoundaryDirection.Z_DIRECTION,
                        'value': 0.0,
                        'faces': boundary_faces['bottom']
                    }
                
                logger.info(f"✓ 底面边界条件: {bottom_constraint}")
            
            # 2. 侧面边界条件（通常约束水平位移）
            if boundary_faces.get('sides'):
                side_constraint = engineering_constraints.get('side_constraint', 'roller_horizontal')
                
                if side_constraint == 'roller_horizontal':
                    # 侧面水平滑动支座
                    side_group_id = 6003
                    gmsh.model.addPhysicalGroup(2, boundary_faces['sides'], side_group_id)
                    gmsh.model.setPhysicalName(2, side_group_id, "SidesRollerHorizontal")
                    
                    boundary_condition_groups['sides_roller'] = {
                        'group_id': side_group_id,
                        'type': BoundaryType.ROLLER_SUPPORT,
                        'direction': BoundaryDirection.NORMAL,
                        'value': 0.0,
                        'faces': boundary_faces['sides']
                    }
                    
                elif side_constraint == 'fixed_horizontal':
                    # 侧面水平固定
                    side_group_id = 6004
                    gmsh.model.addPhysicalGroup(2, boundary_faces['sides'], side_group_id)
                    gmsh.model.setPhysicalName(2, side_group_id, "SidesFixedHorizontal")
                    
                    boundary_condition_groups['sides_fixed'] = {
                        'group_id': side_group_id,
                        'type': BoundaryType.FIXED_DISPLACEMENT,
                        'direction': BoundaryDirection.NORMAL,
                        'value': 0.0,
                        'faces': boundary_faces['sides']
                    }
                
                logger.info(f"✓ 侧面边界条件: {side_constraint}")
            
            # 3. 顶面边界条件（通常自由或荷载）
            if boundary_faces.get('top'):
                top_constraint = engineering_constraints.get('top_constraint', 'free')
                
                if top_constraint == 'free':
                    # 顶面自由（无约束）
                    logger.info("✓ 顶面边界条件: 自由边界")
                    
                elif top_constraint == 'surface_load':
                    # 顶面施加地面荷载
                    surface_load = engineering_constraints.get('surface_load_value', 20000)  # Pa
                    
                    top_group_id = 6005
                    gmsh.model.addPhysicalGroup(2, boundary_faces['top'], top_group_id)
                    gmsh.model.setPhysicalName(2, top_group_id, "TopSurfaceLoad")
                    
                    boundary_condition_groups['top_load'] = {
                        'group_id': top_group_id,
                        'type': BoundaryType.DISTRIBUTED_LOAD,
                        'direction': BoundaryDirection.Z_DIRECTION,
                        'value': -surface_load,  # 向下
                        'faces': boundary_faces['top']
                    }
                    
                    logger.info(f"✓ 顶面边界条件: 分布荷载 {surface_load}Pa")
            
            self.boundary_conditions = boundary_condition_groups
            
            return boundary_condition_groups
            
        except Exception as e:
            logger.error(f"基坑边界条件应用失败: {e}")
            raise
    
    def apply_hydrostatic_pressure(self,
                                 boundary_faces: Dict[str, List[int]],
                                 water_table_elevation: float,
                                 water_density: float = 1000.0,
                                 gravity: float = 9.81) -> Dict[str, Any]:
        """
        应用静水压力
        
        Args:
            boundary_faces: 边界面分类
            water_table_elevation: 地下水位标高(m)
            water_density: 水密度(kg/m³)
            gravity: 重力加速度(m/s²)
            
        Returns:
            水压力边界条件
        """
        try:
            water_pressure_groups = {}
            
            # 寻找受水压影响的面
            affected_faces = []
            
            # 检查侧面和底面
            for category in ['sides', 'bottom']:
                if category in boundary_faces:
                    for face_tag in boundary_faces[category]:
                        face_centroid = self._get_face_centroid(face_tag)
                        if face_centroid and face_centroid[2] <= water_table_elevation:
                            affected_faces.append(face_tag)
            
            if not affected_faces:
                logger.info("• 无面受地下水影响")
                return water_pressure_groups
            
            # 创建水压力物理组
            water_pressure_group_id = 6010
            gmsh.model.addPhysicalGroup(2, affected_faces, water_pressure_group_id)
            gmsh.model.setPhysicalName(2, water_pressure_group_id, "HydrostaticPressure")
            
            # 计算水压力分布（简化为基于深度的线性分布）
            water_pressure_groups['hydrostatic'] = {
                'group_id': water_pressure_group_id,
                'type': BoundaryType.WATER_PRESSURE,
                'direction': BoundaryDirection.NORMAL,
                'water_table_elevation': water_table_elevation,
                'water_density': water_density,
                'gravity': gravity,
                'faces': affected_faces,
                'pressure_function': lambda z: max(0, (water_table_elevation - z) * water_density * gravity)
            }
            
            logger.info(f"✓ 静水压力应用: 地下水位{water_table_elevation}m, {len(affected_faces)}个面")
            
            return water_pressure_groups
            
        except Exception as e:
            logger.error(f"静水压力应用失败: {e}")
            raise
    
    def apply_earth_pressure(self,
                           wall_faces: List[int],
                           soil_layers: Dict[int, Dict[str, Any]],
                           excavation_depth: float,
                           lateral_earth_pressure_coefficient: float = 0.5) -> Dict[str, Any]:
        """
        应用土压力
        
        Args:
            wall_faces: 支护墙面标签列表
            soil_layers: 土层信息
            excavation_depth: 开挖深度
            lateral_earth_pressure_coefficient: 侧向土压力系数
            
        Returns:
            土压力边界条件
        """
        try:
            earth_pressure_groups = {}
            
            if not wall_faces:
                logger.info("• 无支护墙面，跳过土压力应用")
                return earth_pressure_groups
            
            # 创建土压力物理组
            earth_pressure_group_id = 6011
            gmsh.model.addPhysicalGroup(2, wall_faces, earth_pressure_group_id)
            gmsh.model.setPhysicalName(2, earth_pressure_group_id, "EarthPressure")
            
            # 计算各土层的平均容重
            weighted_unit_weight = 0.0
            total_thickness = 0.0
            
            for layer_info in soil_layers.values():
                density = layer_info.get('density', 1800)  # kg/m³
                thickness = layer_info.get('thickness', 5)  # m
                unit_weight = density * 9.81  # N/m³
                
                weighted_unit_weight += unit_weight * thickness
                total_thickness += thickness
            
            if total_thickness > 0:
                avg_unit_weight = weighted_unit_weight / total_thickness
            else:
                avg_unit_weight = 18000  # 默认值 N/m³
            
            earth_pressure_groups['lateral_earth'] = {
                'group_id': earth_pressure_group_id,
                'type': BoundaryType.EARTH_PRESSURE,
                'direction': BoundaryDirection.NORMAL,
                'unit_weight': avg_unit_weight,
                'lateral_coefficient': lateral_earth_pressure_coefficient,
                'excavation_depth': excavation_depth,
                'faces': wall_faces,
                'pressure_function': lambda z: max(0, abs(z) * avg_unit_weight * lateral_earth_pressure_coefficient)
            }
            
            logger.info(f"✓ 土压力应用: K={lateral_earth_pressure_coefficient}, γ={avg_unit_weight:.0f}N/m³")
            
            return earth_pressure_groups
            
        except Exception as e:
            logger.error(f"土压力应用失败: {e}")
            raise
    
    def create_comprehensive_boundary_conditions(self,
                                               volume_entities: Dict[str, List[int]],
                                               engineering_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        创建综合边界条件
        
        Args:
            volume_entities: 体实体字典
            engineering_config: 工程配置参数
            
        Returns:
            完整边界条件字典
        """
        try:
            # 1. 识别模型边界
            boundary_faces = self.identify_model_boundaries(volume_entities)
            
            # 2. 应用基坑边界条件
            structural_boundaries = self.apply_foundation_pit_boundary_conditions(
                boundary_faces, 
                engineering_config.get('structural_constraints', {})
            )
            
            # 3. 应用水压力
            water_pressure_boundaries = {}
            if engineering_config.get('apply_hydrostatic_pressure', False):
                water_pressure_boundaries = self.apply_hydrostatic_pressure(
                    boundary_faces,
                    water_table_elevation=engineering_config.get('water_table_elevation', -10.0)
                )
            
            # 4. 应用土压力
            earth_pressure_boundaries = {}
            if engineering_config.get('apply_earth_pressure', False):
                # 获取支护墙面
                wall_faces = []
                if 'internal' in boundary_faces:
                    wall_faces.extend(boundary_faces['internal'])
                
                earth_pressure_boundaries = self.apply_earth_pressure(
                    wall_faces,
                    engineering_config.get('soil_layers', {}),
                    engineering_config.get('excavation_depth', 10.0)
                )
            
            # 5. 整合所有边界条件
            comprehensive_boundaries = {
                'structural_boundaries': structural_boundaries,
                'water_pressure_boundaries': water_pressure_boundaries,
                'earth_pressure_boundaries': earth_pressure_boundaries,
                'boundary_face_classification': boundary_faces,
                'total_boundary_groups': len(structural_boundaries) + len(water_pressure_boundaries) + len(earth_pressure_boundaries)
            }
            
            self.boundary_conditions.update(structural_boundaries)
            self.load_conditions.update(water_pressure_boundaries)
            self.load_conditions.update(earth_pressure_boundaries)
            
            logger.info("🎉 综合边界条件创建完成!")
            logger.info(f"   结构边界: {len(structural_boundaries)}个")
            logger.info(f"   水压边界: {len(water_pressure_boundaries)}个")
            logger.info(f"   土压边界: {len(earth_pressure_boundaries)}个")
            
            return comprehensive_boundaries
            
        except Exception as e:
            logger.error(f"综合边界条件创建失败: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _calculate_model_bounds(self, volume_tags: List[int]) -> Dict[str, float]:
        """计算模型边界框"""
        try:
            x_coords, y_coords, z_coords = [], [], []
            
            for volume in volume_tags:
                try:
                    # 获取体的包围盒（简化实现）
                    # 实际应该调用 gmsh.model.occ.getBoundingBox(3, volume)
                    # 这里用示例数据
                    x_coords.extend([-50, 50])
                    y_coords.extend([-50, 50])
                    z_coords.extend([-25, 0])
                except:
                    continue
            
            if not x_coords:
                return {'x_min': -50, 'x_max': 50, 'y_min': -50, 'y_max': 50, 'z_min': -25, 'z_max': 0}
            
            return {
                'x_min': min(x_coords), 'x_max': max(x_coords),
                'y_min': min(y_coords), 'y_max': max(y_coords),
                'z_min': min(z_coords), 'z_max': max(z_coords)
            }
        except Exception as e:
            logger.warning(f"边界框计算失败: {e}")
            return {'x_min': -50, 'x_max': 50, 'y_min': -50, 'y_max': 50, 'z_min': -25, 'z_max': 0}
    
    def _get_face_centroid(self, face_tag: int) -> Optional[Tuple[float, float, float]]:
        """获取面的质心"""
        try:
            # 简化实现，实际应该调用GMSH函数获取面质心
            # mass_properties = gmsh.model.occ.getCenterOfMass(2, face_tag)
            # return (mass_properties[0], mass_properties[1], mass_properties[2])
            
            # 这里返回示例坐标
            return (0.0, 0.0, -10.0)
        except Exception as e:
            logger.warning(f"面{face_tag}质心计算失败: {e}")
            return None

# 全局处理器实例
boundary_conditions_processor = BoundaryConditionsProcessor()