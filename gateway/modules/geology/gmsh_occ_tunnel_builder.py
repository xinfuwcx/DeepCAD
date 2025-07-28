"""
基于GMSH OCC的隧道建模核心算法
隧道截面 + 倾斜中心线 + 衬砌参数 → 隧道3D实体
2号几何专家 - 与地质建模统一技术栈
"""

import gmsh
import numpy as np
import logging
import math
from typing import List, Dict, Tuple, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)

class TunnelCrossSectionType(str, Enum):
    """隧道截面类型"""
    CIRCULAR = "circular"        # 圆形(盾构隧道)
    HORSESHOE = "horseshoe"      # 马蹄形(矿山法)
    RECTANGULAR = "rectangular"  # 矩形(明挖隧道/管廊)

class TunnelSlopeInputMethod(str, Enum):
    """隧道坡度输入方式"""
    GRADE = "grade"                    # 坡度输入
    ELEVATION_POINTS = "elevation_points"  # 标高点输入
    COORDINATES_3D = "coordinates_3d"      # 3D坐标输入

class GMSHOCCTunnelBuilder:
    """GMSH OCC隧道构建器"""
    
    def __init__(self):
        self.model_name = "TunnelModel"
        self.tunnel_volumes = {}      # 存储隧道体
        self.lining_volumes = {}      # 存储衬砌体
        self.physical_groups = {}
        
    def initialize_gmsh(self):
        """初始化GMSH环境"""
        try:
            gmsh.initialize()
            gmsh.clear()
            gmsh.model.add(self.model_name)
            logger.info("✓ GMSH OCC隧道建模环境初始化完成")
        except Exception as e:
            logger.error(f"GMSH初始化失败: {e}")
            raise
    
    def create_tunnel_centerline(self, 
                               start_point: Tuple[float, float, float],
                               end_point: Tuple[float, float, float],
                               slope_input_method: TunnelSlopeInputMethod,
                               slope_data: Dict[str, Any]) -> List[int]:
        """
        创建隧道中心线
        
        Args:
            start_point: 起点坐标 (x, y, z)
            end_point: 终点坐标 (x, y, z)  
            slope_input_method: 坡度输入方式
            slope_data: 坡度数据
            
        Returns:
            中心线上的点标签列表
        """
        try:
            centerline_points = []
            
            if slope_input_method == TunnelSlopeInputMethod.GRADE:
                # 坡度输入：起点标高 + 纵坡
                start_elevation = slope_data['start_elevation']
                grade = slope_data['grade']  # 纵坡(‰)
                
                # 计算水平距离
                horizontal_distance = math.sqrt(
                    (end_point[0] - start_point[0])**2 + 
                    (end_point[1] - start_point[1])**2
                )
                
                # 根据纵坡计算终点标高
                elevation_change = horizontal_distance * grade / 1000.0
                end_elevation = start_elevation + elevation_change
                
                # 生成中心线点
                num_segments = max(10, int(horizontal_distance / 10))  # 每10m一个点
                for i in range(num_segments + 1):
                    t = i / num_segments
                    x = start_point[0] + t * (end_point[0] - start_point[0])
                    y = start_point[1] + t * (end_point[1] - start_point[1])
                    z = start_elevation + t * elevation_change
                    
                    point_tag = gmsh.model.occ.addPoint(x, y, z)
                    centerline_points.append(point_tag)
                    
                logger.info(f"✓ 坡度法生成中心线: {len(centerline_points)}个点, 纵坡{grade}‰")
                
            elif slope_input_method == TunnelSlopeInputMethod.ELEVATION_POINTS:
                # 标高点输入
                elevation_points = slope_data['elevation_points']
                
                for point_data in elevation_points:
                    # 根据里程计算XY坐标
                    chainage = point_data['chainage']
                    elevation = point_data['elevation']
                    
                    total_length = math.sqrt(
                        (end_point[0] - start_point[0])**2 + 
                        (end_point[1] - start_point[1])**2
                    )
                    
                    t = chainage / total_length if total_length > 0 else 0
                    x = start_point[0] + t * (end_point[0] - start_point[0])
                    y = start_point[1] + t * (end_point[1] - start_point[1])
                    
                    point_tag = gmsh.model.occ.addPoint(x, y, elevation)
                    centerline_points.append(point_tag)
                    
                logger.info(f"✓ 标高点法生成中心线: {len(centerline_points)}个点")
                
            elif slope_input_method == TunnelSlopeInputMethod.COORDINATES_3D:
                # 3D坐标直接输入
                coordinates = slope_data['coordinates']
                
                for coord in coordinates:
                    point_tag = gmsh.model.occ.addPoint(coord['x'], coord['y'], coord['z'])
                    centerline_points.append(point_tag)
                    
                logger.info(f"✓ 3D坐标法生成中心线: {len(centerline_points)}个点")
                
            else:
                raise ValueError(f"不支持的坡度输入方式: {slope_input_method}")
            
            return centerline_points
            
        except Exception as e:
            logger.error(f"创建隧道中心线失败: {e}")
            raise
    
    def create_tunnel_cross_section(self,
                                  section_type: TunnelCrossSectionType,
                                  section_params: Dict[str, float]) -> Tuple[int, int]:
        """
        创建隧道截面
        
        Args:
            section_type: 截面类型
            section_params: 截面参数
            
        Returns:
            (外轮廓面标签, 内轮廓面标签) - 内外轮廓用于衬砌
        """
        try:
            if section_type == TunnelCrossSectionType.CIRCULAR:
                # 圆形截面
                diameter = section_params['diameter']
                radius = diameter / 2000.0  # mm转m
                
                # 外圆轮廓
                outer_circle = gmsh.model.occ.addCircle(0, 0, 0, radius)
                outer_curve_loop = gmsh.model.occ.addCurveLoop([outer_circle])
                outer_face = gmsh.model.occ.addPlaneSurface([outer_curve_loop])
                
                # 内圆轮廓(考虑衬砌厚度)
                lining_thickness = section_params.get('lining_thickness', 350) / 1000.0  # mm转m
                inner_radius = radius - lining_thickness
                
                if inner_radius > 0:
                    inner_circle = gmsh.model.occ.addCircle(0, 0, 0, inner_radius)
                    inner_curve_loop = gmsh.model.occ.addCurveLoop([inner_circle])
                    inner_face = gmsh.model.occ.addPlaneSurface([inner_curve_loop])
                else:
                    inner_face = None
                
                logger.info(f"✓ 创建圆形截面: 外径{diameter}mm, 衬砌厚度{lining_thickness*1000}mm")
                
            elif section_type == TunnelCrossSectionType.HORSESHOE:
                # 马蹄形截面
                width = section_params['width'] / 1000.0        # mm转m
                height = section_params['height'] / 1000.0      # mm转m
                arch_radius = section_params['arch_radius'] / 1000.0  # mm转m
                side_height = section_params['side_height'] / 1000.0  # mm转m
                
                # 创建马蹄形轮廓点
                points = self._create_horseshoe_points(width, height, arch_radius, side_height)
                
                # 创建外轮廓
                outer_face = self._create_face_from_points(points)
                
                # 创建内轮廓(缩小衬砌厚度)
                lining_thickness = section_params.get('lining_thickness', 350) / 1000.0
                inner_points = self._shrink_horseshoe_points(points, lining_thickness)
                inner_face = self._create_face_from_points(inner_points) if inner_points else None
                
                logger.info(f"✓ 创建马蹄形截面: {width}×{height}m, 衬砌厚度{lining_thickness*1000}mm")
                
            elif section_type == TunnelCrossSectionType.RECTANGULAR:
                # 矩形截面
                width = section_params['width'] / 1000.0   # mm转m
                height = section_params['height'] / 1000.0 # mm转m
                
                # 外矩形轮廓
                outer_rect = gmsh.model.occ.addRectangle(-width/2, -height/2, 0, width, height)
                outer_face = outer_rect
                
                # 内矩形轮廓
                lining_thickness = section_params.get('lining_thickness', 350) / 1000.0
                inner_width = width - 2 * lining_thickness
                inner_height = height - 2 * lining_thickness
                
                if inner_width > 0 and inner_height > 0:
                    inner_rect = gmsh.model.occ.addRectangle(
                        -inner_width/2, -inner_height/2, 0, inner_width, inner_height
                    )
                    inner_face = inner_rect
                else:
                    inner_face = None
                
                logger.info(f"✓ 创建矩形截面: {width}×{height}m, 衬砌厚度{lining_thickness*1000}mm")
                
            else:
                raise ValueError(f"不支持的截面类型: {section_type}")
            
            return outer_face, inner_face
            
        except Exception as e:
            logger.error(f"创建隧道截面失败: {e}")
            raise
    
    def create_tunnel_by_sweep(self,
                             centerline_points: List[int],
                             outer_face: int,
                             inner_face: Optional[int],
                             tunnel_name: str) -> Dict[str, int]:
        """
        沿中心线扫掠生成隧道体
        
        Args:
            centerline_points: 中心线点标签列表
            outer_face: 外轮廓面
            inner_face: 内轮廓面(可选)
            tunnel_name: 隧道名称
            
        Returns:
            隧道组件字典 {'tunnel_volume': tag, 'lining_volume': tag}
        """
        try:
            # 创建中心线样条曲线
            if len(centerline_points) >= 2:
                if len(centerline_points) == 2:
                    # 两点直线
                    centerline = gmsh.model.occ.addLine(centerline_points[0], centerline_points[1])
                else:
                    # 多点样条曲线
                    centerline = gmsh.model.occ.addSpline(centerline_points)
            else:
                raise ValueError("中心线点数不足")
            
            # 沿中心线扫掠外轮廓生成隧道外体
            tunnel_outer_result = gmsh.model.occ.extrude(
                [(2, outer_face)],   # 2表示面
                wire=[centerline]    # 沿线扫掠
            )
            
            tunnel_outer_volume = None
            for dim, tag in tunnel_outer_result:
                if dim == 3:  # 找到体
                    tunnel_outer_volume = tag
                    break
            
            if tunnel_outer_volume is None:
                raise ValueError("隧道外体扫掠失败")
            
            # 处理内轮廓(衬砌)
            if inner_face is not None:
                # 扫掠内轮廓生成隧道内空
                tunnel_inner_result = gmsh.model.occ.extrude(
                    [(2, inner_face)],
                    wire=[centerline]
                )
                
                tunnel_inner_volume = None
                for dim, tag in tunnel_inner_result:
                    if dim == 3:
                        tunnel_inner_volume = tag
                        break
                
                if tunnel_inner_volume is not None:
                    # 外体减去内体得到衬砌体
                    lining_result = gmsh.model.occ.cut(
                        [(3, tunnel_outer_volume)],
                        [(3, tunnel_inner_volume)],
                        removeObject=False,
                        removeTool=False
                    )
                    
                    lining_volume = lining_result[0][0][1] if lining_result[0] else None
                    
                    # 保存组件
                    components = {
                        'tunnel_volume': tunnel_inner_volume,    # 隧道空间
                        'lining_volume': lining_volume          # 衬砌结构
                    }
                else:
                    # 没有内空，整个就是实体
                    components = {
                        'tunnel_volume': tunnel_outer_volume,
                        'lining_volume': None
                    }
            else:
                # 没有内轮廓，整个外体就是隧道
                components = {
                    'tunnel_volume': tunnel_outer_volume,
                    'lining_volume': None
                }
            
            # 同步几何
            gmsh.model.occ.synchronize()
            
            # 保存到类属性
            self.tunnel_volumes[tunnel_name] = components['tunnel_volume']
            if components['lining_volume'] is not None:
                self.lining_volumes[tunnel_name] = components['lining_volume']
            
            logger.info(f"✓ 隧道扫掠完成: {tunnel_name}")
            logger.info(f"   隧道体标签: {components['tunnel_volume']}")
            if components['lining_volume']:
                logger.info(f"   衬砌体标签: {components['lining_volume']}")
            
            return components
            
        except Exception as e:
            logger.error(f"隧道扫掠失败: {e}")
            raise
    
    def _create_horseshoe_points(self, width: float, height: float, 
                               arch_radius: float, side_height: float) -> List[Tuple[float, float]]:
        """创建马蹄形轮廓点"""
        points = []
        
        # 底部中点
        points.append((0, -height/2))
        
        # 左侧直墙
        points.append((-width/2, -height/2))
        points.append((-width/2, -height/2 + side_height))
        
        # 左侧圆弧(简化为多个点)
        for i in range(5):
            angle = math.pi + i * math.pi / 10
            x = -width/2 + arch_radius * (1 - math.cos(angle - math.pi))
            y = -height/2 + side_height + arch_radius * math.sin(angle - math.pi)
            points.append((x, y))
        
        # 顶部圆弧
        for i in range(11):
            angle = math.pi + i * math.pi / 10
            x = arch_radius * math.cos(angle)
            y = -height/2 + side_height + arch_radius + arch_radius * math.sin(angle)
            points.append((x, y))
        
        # 右侧圆弧
        for i in range(5):
            angle = i * math.pi / 10
            x = width/2 - arch_radius * (1 - math.cos(angle))
            y = -height/2 + side_height + arch_radius * math.sin(angle)
            points.append((x, y))
        
        # 右侧直墙
        points.append((width/2, -height/2 + side_height))
        points.append((width/2, -height/2))
        
        return points
    
    def _create_face_from_points(self, points: List[Tuple[float, float]]) -> int:
        """从点列表创建面"""
        point_tags = []
        for x, y in points:
            point_tag = gmsh.model.occ.addPoint(x, y, 0)
            point_tags.append(point_tag)
        
        # 创建线段
        line_tags = []
        for i in range(len(point_tags)):
            next_i = (i + 1) % len(point_tags)
            line_tag = gmsh.model.occ.addLine(point_tags[i], point_tags[next_i])
            line_tags.append(line_tag)
        
        # 创建面
        curve_loop = gmsh.model.occ.addCurveLoop(line_tags)
        face = gmsh.model.occ.addPlaneSurface([curve_loop])
        
        return face
    
    def _shrink_horseshoe_points(self, points: List[Tuple[float, float]], 
                               thickness: float) -> Optional[List[Tuple[float, float]]]:
        """缩小马蹄形轮廓(简化实现)"""
        # 简化：等比例缩小
        if not points:
            return None
        
        # 计算轮廓中心
        cx = sum(p[0] for p in points) / len(points)
        cy = sum(p[1] for p in points) / len(points)
        
        # 计算缩放比例
        max_distance = max(math.sqrt((p[0] - cx)**2 + (p[1] - cy)**2) for p in points)
        if max_distance <= thickness:
            return None
        
        scale = (max_distance - thickness) / max_distance
        
        # 缩放所有点
        shrunk_points = []
        for x, y in points:
            new_x = cx + (x - cx) * scale
            new_y = cy + (y - cy) * scale
            shrunk_points.append((new_x, new_y))
        
        return shrunk_points
    
    def build_complete_tunnel_model(self,
                                  tunnel_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        完整的隧道建模流程
        
        Args:
            tunnel_config: 隧道配置参数
            
        Returns:
            建模结果字典
        """
        try:
            # 1. 初始化GMSH
            self.initialize_gmsh()
            
            # 2. 创建中心线
            centerline_points = self.create_tunnel_centerline(
                start_point=tunnel_config['start_point'],
                end_point=tunnel_config['end_point'],
                slope_input_method=TunnelSlopeInputMethod(tunnel_config['slope_input_method']),
                slope_data=tunnel_config['slope_data']
            )
            
            # 3. 创建截面
            outer_face, inner_face = self.create_tunnel_cross_section(
                section_type=TunnelCrossSectionType(tunnel_config['section_type']),
                section_params=tunnel_config['section_params']
            )
            
            # 4. 扫掠生成隧道
            tunnel_name = tunnel_config.get('name', 'DefaultTunnel')
            components = self.create_tunnel_by_sweep(
                centerline_points=centerline_points,
                outer_face=outer_face,
                inner_face=inner_face,
                tunnel_name=tunnel_name
            )
            
            # 5. 生成网格
            mesh_file = self.generate_tunnel_mesh()
            
            result = {
                'success': True,
                'tunnel_name': tunnel_name,
                'tunnel_volume': components['tunnel_volume'],
                'lining_volume': components['lining_volume'],
                'mesh_file': mesh_file,
                'section_type': tunnel_config['section_type'],
                'centerline_length': self._calculate_centerline_length(centerline_points)
            }
            
            logger.info("🎉 隧道建模完成!")
            return result
            
        except Exception as e:
            logger.error(f"隧道建模失败: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_tunnel_mesh(self, mesh_size: float = 1.0) -> str:
        """生成隧道网格"""
        try:
            # 设置网格参数
            gmsh.option.setNumber("Mesh.CharacteristicLengthMax", mesh_size)
            gmsh.option.setNumber("Mesh.CharacteristicLengthMin", mesh_size * 0.5)
            gmsh.option.setNumber("Mesh.Algorithm", 6)
            gmsh.option.setNumber("Mesh.Algorithm3D", 10)
            
            # 生成网格
            logger.info("🔄 开始生成隧道网格...")
            gmsh.model.mesh.generate(3)
            
            # 保存网格
            mesh_file = f"tunnel_mesh_{self.model_name}.msh"
            gmsh.write(mesh_file)
            
            # 统计信息
            node_count = len(gmsh.model.mesh.getNodes()[0])
            element_info = gmsh.model.mesh.getElements()
            element_count = sum(len(elements) for elements in element_info[2]) if element_info[2] else 0
            
            logger.info(f"✓ 隧道网格生成完成: {node_count}节点, {element_count}单元")
            return mesh_file
            
        except Exception as e:
            logger.error(f"隧道网格生成失败: {e}")
            raise
    
    def _calculate_centerline_length(self, centerline_points: List[int]) -> float:
        """计算中心线长度"""
        try:
            total_length = 0.0
            
            for i in range(len(centerline_points) - 1):
                # 获取点坐标
                coord1 = gmsh.model.getValue(0, centerline_points[i], [])
                coord2 = gmsh.model.getValue(0, centerline_points[i + 1], [])
                
                if len(coord1) >= 3 and len(coord2) >= 3:
                    # 计算距离
                    dx = coord2[0] - coord1[0]
                    dy = coord2[1] - coord1[1]
                    dz = coord2[2] - coord1[2]
                    segment_length = math.sqrt(dx*dx + dy*dy + dz*dz)
                    total_length += segment_length
            
            return total_length
            
        except Exception as e:
            logger.warning(f"中心线长度计算失败: {e}")
            return 0.0
    
    def finalize(self):
        """清理GMSH环境"""
        try:
            gmsh.finalize()
            logger.info("✓ GMSH隧道建模环境清理完成")
        except:
            pass

# 全局构建器实例
tunnel_builder = GMSHOCCTunnelBuilder()