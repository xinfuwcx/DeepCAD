"""
基于GMSH OCC的基坑开挖建模核心算法
DXF轮廓导入 → OCC几何体 → 土体布尔差集 → 开挖体生成
2号几何专家 - 与地质建模统一使用GMSH OCC
"""

import gmsh
import numpy as np
import logging
import ezdxf
from typing import List, Dict, Tuple, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class GMSHOCCExcavationBuilder:
    """GMSH OCC基坑开挖构建器"""
    
    def __init__(self):
        self.model_name = "ExcavationModel"
        self.excavation_volumes = {}  # 存储开挖体
        self.excavated_soil_volumes = {}  # 存储开挖后的土体
        
    def initialize_gmsh(self):
        """初始化GMSH环境"""
        try:
            gmsh.initialize()
            gmsh.clear()
            gmsh.model.add(self.model_name)
            logger.info("✓ GMSH OCC开挖建模环境初始化完成")
        except Exception as e:
            logger.error(f"GMSH初始化失败: {e}")
            raise
    
    def load_dxf_contour(self, dxf_path: str) -> List[Tuple[float, float]]:
        """
        从DXF文件提取开挖轮廓
        
        Args:
            dxf_path: DXF文件路径
            
        Returns:
            轮廓点坐标列表 [(x, y), ...]
        """
        try:
            doc = ezdxf.readfile(dxf_path)
            msp = doc.modelspace()
            
            # 查找LWPOLYLINE或POLYLINE实体
            contour_points = []
            
            # 优先查找LWPOLYLINE
            lwpolylines = msp.query('LWPOLYLINE')
            if lwpolylines:
                lwpolyline = lwpolylines.first
                points = [(p[0], p[1]) for p in lwpolyline.get_points(format='xy')]
                
                # 确保轮廓闭合
                if not lwpolyline.is_closed and len(points) > 0:
                    points.append(points[0])
                    
                contour_points = points
                logger.info(f"✓ 从LWPOLYLINE提取到{len(points)}个轮廓点")
                
            # 备选：查找POLYLINE
            elif msp.query('POLYLINE'):
                polyline = msp.query('POLYLINE').first
                points = [(vertex.dxf.location[0], vertex.dxf.location[1]) 
                         for vertex in polyline.vertices]
                
                # 确保轮廓闭合
                if len(points) > 0 and points[0] != points[-1]:
                    points.append(points[0])
                    
                contour_points = points
                logger.info(f"✓ 从POLYLINE提取到{len(points)}个轮廓点")
                
            else:
                raise ValueError("DXF文件中未找到LWPOLYLINE或POLYLINE实体")
            
            if len(contour_points) < 3:
                raise ValueError(f"轮廓点数量不足: {len(contour_points)}个，至少需要3个点")
                
            return contour_points
            
        except ezdxf.DXFError as e:
            logger.error(f"DXF文件读取错误: {e}")
            raise ValueError(f"无效的DXF文件: {e}")
        except Exception as e:
            logger.error(f"轮廓提取失败: {e}")
            raise
    
    def create_excavation_geometry(self, 
                                 contour_points: List[Tuple[float, float]],
                                 excavation_depth: float,
                                 placement_mode: str = 'auto_center',  # 'centroid' | 'auto_center'
                                 soil_domain_bounds: Dict[str, float] = None,
                                 surface_elevation: float = 0.0) -> int:
        """
        基于轮廓点创建开挖几何体
        
        Args:
            contour_points: 轮廓点坐标
            excavation_depth: 开挖深度(m)
            placement_mode: 定位方式 ('centroid'原始形心 | 'auto_center'自动居中)
            soil_domain_bounds: 土体域边界 {'x_min', 'x_max', 'y_min', 'y_max', 'z_min', 'z_max'}
            surface_elevation: 地表标高(m)
            
        Returns:
            开挖体体积标签
        """
        try:
            # 1. 根据定位方式处理轮廓点坐标
            if placement_mode == 'centroid':
                # 方式1：使用DXF轮廓的原始形心坐标
                final_points = contour_points[:-1]  # 去除重复的闭合点
                logger.info("✓ 使用DXF原始形心坐标定位")
                
            elif placement_mode == 'auto_center':
                # 方式2：移动到土体域中心
                if soil_domain_bounds is None:
                    raise ValueError("自动居中模式需要提供土体域边界信息")
                
                # 计算DXF轮廓形心
                contour_centroid = self.calculate_contour_centroid(contour_points)
                
                # 计算土体域中心
                soil_center = (
                    (soil_domain_bounds['x_min'] + soil_domain_bounds['x_max']) / 2,
                    (soil_domain_bounds['y_min'] + soil_domain_bounds['y_max']) / 2
                )
                
                # 计算平移向量
                translation_vector = (
                    soil_center[0] - contour_centroid[0],
                    soil_center[1] - contour_centroid[1]
                )
                
                # 平移所有轮廓点
                final_points = [
                    (x + translation_vector[0], y + translation_vector[1]) 
                    for x, y in contour_points[:-1]
                ]
                
                logger.info(f"✓ 自动居中: 轮廓形心{contour_centroid} → 土体中心{soil_center}")
                
            else:
                raise ValueError(f"不支持的定位方式: {placement_mode}")
            
            # 2. 创建轮廓点
            point_tags = []
            for i, (x, y) in enumerate(final_points):
                point_tag = gmsh.model.occ.addPoint(x, y, surface_elevation)
                point_tags.append(point_tag)
            
            logger.info(f"✓ 创建轮廓点: {len(point_tags)}个")
            
            # 2. 创建轮廓线
            line_tags = []
            for i in range(len(point_tags)):
                next_i = (i + 1) % len(point_tags)
                line_tag = gmsh.model.occ.addLine(point_tags[i], point_tags[next_i])
                line_tags.append(line_tag)
            
            # 3. 创建轮廓环和面
            curve_loop = gmsh.model.occ.addCurveLoop(line_tags)
            face = gmsh.model.occ.addPlaneSurface([curve_loop])
            
            logger.info(f"✓ 创建开挖底面: 面标签 {face}")
            
            # 4. 向下拉伸创建开挖体
            excavation_result = gmsh.model.occ.extrude(
                [(2, face)],  # 2表示面
                0, 0, -excavation_depth  # 向下拉伸
            )
            
            # 获取拉伸后的体标签
            excavation_volume_tag = None
            for dim, tag in excavation_result:
                if dim == 3:  # 3表示体
                    excavation_volume_tag = tag
                    break
            
            if excavation_volume_tag is None:
                raise ValueError("开挖体拉伸失败")
            
            # 5. 同步几何
            gmsh.model.occ.synchronize()
            
            self.excavation_volumes['main_excavation'] = excavation_volume_tag
            
            logger.info(f"✓ 创建开挖体: 体标签 {excavation_volume_tag}, 深度 {excavation_depth}m")
            
            return excavation_volume_tag
            
        except Exception as e:
            logger.error(f"创建开挖几何体失败: {e}")
            raise
    
    def perform_boolean_cut(self, 
                          soil_volumes: Dict[int, int],
                          excavation_volume_tag: int) -> Dict[int, int]:
        """
        对土体进行布尔差集运算
        
        Args:
            soil_volumes: 土层体字典 {layer_id: volume_tag}
            excavation_volume_tag: 开挖体标签
            
        Returns:
            开挖后的土层体字典 {layer_id: new_volume_tag}
        """
        try:
            excavated_volumes = {}
            
            for layer_id, soil_volume_tag in soil_volumes.items():
                try:
                    # 执行布尔差集运算
                    cut_result = gmsh.model.occ.cut(
                        [(3, soil_volume_tag)],      # 被切割的土体
                        [(3, excavation_volume_tag)], # 切割工具（开挖体）
                        removeObject=True,            # 移除原对象
                        removeTool=False              # 保留切割工具
                    )
                    
                    # 获取切割后的体
                    if cut_result[0]:  # 检查是否有结果
                        new_volume_tag = cut_result[0][0][1]  # 获取新体标签
                        excavated_volumes[layer_id] = new_volume_tag
                        
                        logger.info(f"✓ 土层{layer_id}布尔差集完成: {soil_volume_tag} → {new_volume_tag}")
                    else:
                        logger.warning(f"土层{layer_id}与开挖体无交集，保持原状")
                        excavated_volumes[layer_id] = soil_volume_tag
                        
                except Exception as e:
                    logger.error(f"土层{layer_id}布尔运算失败: {e}")
                    # 失败时保持原土体
                    excavated_volumes[layer_id] = soil_volume_tag
            
            # 同步几何
            gmsh.model.occ.synchronize()
            
            self.excavated_soil_volumes = excavated_volumes
            
            logger.info(f"✓ 布尔差集运算完成: {len(excavated_volumes)}个土层体")
            
            return excavated_volumes
            
        except Exception as e:
            logger.error(f"布尔差集运算失败: {e}")
            raise
    
    def update_physical_groups(self, 
                             excavated_volumes: Dict[int, int],
                             soil_materials: Dict[int, Dict[str, Any]]) -> Dict[int, int]:
        """
        更新物理组定义
        
        Args:
            excavated_volumes: 开挖后的土层体
            soil_materials: 土层材料信息
            
        Returns:
            物理组映射 {layer_id: physical_group_id}
        """
        try:
            physical_groups = {}
            
            for layer_id, volume_tag in excavated_volumes.items():
                material_info = soil_materials.get(layer_id, {'name': f'ExcavatedLayer_{layer_id}'})
                
                # 创建体物理组
                physical_group_id = layer_id + 2000  # 避免与原地质模型冲突
                gmsh.model.addPhysicalGroup(3, [volume_tag], physical_group_id)
                gmsh.model.setPhysicalName(3, physical_group_id, material_info['name'])
                
                physical_groups[layer_id] = physical_group_id
                
                logger.info(f"✓ 更新物理组: {material_info['name']} (ID: {physical_group_id})")
            
            return physical_groups
            
        except Exception as e:
            logger.error(f"更新物理组失败: {e}")
            raise
    
    def generate_mesh(self, mesh_params: Dict[str, float] = None) -> str:
        """
        生成开挖后的网格
        
        Args:
            mesh_params: 网格参数
            
        Returns:
            网格文件路径
        """
        try:
            if mesh_params is None:
                mesh_params = {'element_size': 2.0}
            
            # 设置网格尺寸
            mesh_size = mesh_params.get('element_size', 2.0)
            gmsh.option.setNumber("Mesh.CharacteristicLengthMax", mesh_size)
            gmsh.option.setNumber("Mesh.CharacteristicLengthMin", mesh_size * 0.5)
            
            # 设置网格算法
            gmsh.option.setNumber("Mesh.Algorithm", 6)   # Frontal-Delaunay
            gmsh.option.setNumber("Mesh.Algorithm3D", 10) # HXT
            
            # 生成网格
            logger.info("🔄 开始生成开挖网格...")
            gmsh.model.mesh.generate(3)
            
            # 保存网格
            mesh_file = f"excavation_mesh_{self.model_name}.msh"
            gmsh.write(mesh_file)
            
            # 获取网格统计信息
            node_count = len(gmsh.model.mesh.getNodes()[0])
            element_info = gmsh.model.mesh.getElements()
            element_count = sum(len(elements) for elements in element_info[2]) if element_info[2] else 0
            
            logger.info(f"✓ 开挖网格生成完成: {node_count}节点, {element_count}单元")
            logger.info(f"✓ 网格文件: {mesh_file}")
            
            return mesh_file
            
        except Exception as e:
            logger.error(f"网格生成失败: {e}")
            raise
    
    def build_complete_excavation_model(self,
                                      dxf_path: str,
                                      excavation_depth: float,
                                      soil_volumes: Dict[int, int],
                                      soil_materials: Dict[int, Dict[str, Any]],
                                      placement_mode: str = 'auto_center',
                                      soil_domain_bounds: Dict[str, float] = None,
                                      surface_elevation: float = 0.0) -> Dict[str, Any]:
        """
        完整的基坑开挖建模流程
        
        Args:
            dxf_path: DXF文件路径
            excavation_depth: 开挖深度
            soil_volumes: 土层体字典
            soil_materials: 土层材料信息
            placement_mode: 定位方式 ('centroid' | 'auto_center')
            soil_domain_bounds: 土体域边界信息
            surface_elevation: 地表标高
            
        Returns:
            建模结果字典
        """
        try:
            # 1. 初始化GMSH
            self.initialize_gmsh()
            
            # 2. 提取DXF轮廓
            contour_points = self.load_dxf_contour(dxf_path)
            
            # 3. 创建开挖几何体
            excavation_volume_tag = self.create_excavation_geometry(
                contour_points, excavation_depth, placement_mode, soil_domain_bounds, surface_elevation
            )
            
            # 4. 执行布尔差集
            excavated_volumes = self.perform_boolean_cut(soil_volumes, excavation_volume_tag)
            
            # 5. 更新物理组
            physical_groups = self.update_physical_groups(excavated_volumes, soil_materials)
            
            # 6. 生成网格
            mesh_file = self.generate_mesh({'element_size': 1.5})
            
            # 7. 计算开挖体积
            excavation_volume = self.calculate_excavation_volume(contour_points, excavation_depth)
            
            result = {
                'success': True,
                'excavation_volume_tag': excavation_volume_tag,
                'excavated_soil_volumes': excavated_volumes,
                'physical_groups': physical_groups,
                'mesh_file': mesh_file,
                'excavation_volume': excavation_volume,
                'contour_area': self.calculate_contour_area(contour_points),
                'excavation_depth': excavation_depth
            }
            
            logger.info("🎉 基坑开挖建模完成!")
            return result
            
        except Exception as e:
            logger.error(f"基坑开挖建模失败: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def calculate_contour_area(self, contour_points: List[Tuple[float, float]]) -> float:
        """计算轮廓面积"""
        try:
            # 使用鞋带公式计算多边形面积
            n = len(contour_points) - 1  # 去除重复的闭合点
            area = 0.0
            
            for i in range(n):
                j = (i + 1) % n
                area += contour_points[i][0] * contour_points[j][1]
                area -= contour_points[j][0] * contour_points[i][1]
            
            return abs(area) / 2.0
            
        except Exception as e:
            logger.warning(f"轮廓面积计算失败: {e}")
            return 0.0
    
    def calculate_contour_centroid(self, contour_points: List[Tuple[float, float]]) -> Tuple[float, float]:
        """计算轮廓形心"""
        try:
            # 去除重复的闭合点
            points = contour_points[:-1] if len(contour_points) > 1 and contour_points[0] == contour_points[-1] else contour_points
            
            if len(points) < 3:
                # 点数不足时，使用简单平均
                x_avg = sum(p[0] for p in points) / len(points)
                y_avg = sum(p[1] for p in points) / len(points)
                return (x_avg, y_avg)
            
            # 使用多边形形心公式
            area = 0.0
            cx = 0.0
            cy = 0.0
            
            for i in range(len(points)):
                j = (i + 1) % len(points)
                cross = points[i][0] * points[j][1] - points[j][0] * points[i][1]
                area += cross
                cx += (points[i][0] + points[j][0]) * cross
                cy += (points[i][1] + points[j][1]) * cross
            
            area *= 0.5
            if abs(area) < 1e-10:
                # 面积太小时，使用简单平均
                x_avg = sum(p[0] for p in points) / len(points)
                y_avg = sum(p[1] for p in points) / len(points)
                return (x_avg, y_avg)
            
            cx /= (6.0 * area)
            cy /= (6.0 * area)
            
            return (cx, cy)
            
        except Exception as e:
            logger.warning(f"形心计算失败，使用简单平均: {e}")
            points = contour_points[:-1] if len(contour_points) > 1 and contour_points[0] == contour_points[-1] else contour_points
            x_avg = sum(p[0] for p in points) / len(points)
            y_avg = sum(p[1] for p in points) / len(points)
            return (x_avg, y_avg)
    
    def calculate_excavation_volume(self, 
                                  contour_points: List[Tuple[float, float]], 
                                  depth: float) -> float:
        """计算开挖体积"""
        area = self.calculate_contour_area(contour_points)
        return area * depth
    
    def finalize(self):
        """清理GMSH环境"""
        try:
            gmsh.finalize()
            logger.info("✓ GMSH环境清理完成")
        except:
            pass

# 全局构建器实例
excavation_builder = GMSHOCCExcavationBuilder()