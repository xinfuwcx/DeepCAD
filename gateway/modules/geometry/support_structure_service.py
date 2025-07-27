"""
支护结构几何建模服务
生成地连墙、排桩、锚杆等深基坑支护结构的3D几何模型
"""

import numpy as np
import logging
from typing import List, Tuple, Dict, Optional, Any
import uuid
from datetime import datetime

try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    logging.warning("PyVista not available, 3D geometry generation will be disabled")

from pydantic import BaseModel

class SupportStructureGeometryRequest(BaseModel):
    """支护结构几何生成请求"""
    structure_type: str  # 'diaphragm_wall', 'pile_system', 'anchor_system'
    name: str
    parameters: Dict[str, Any]
    material_id: Optional[str] = None

class GeometryModel3D(BaseModel):
    """3D几何模型"""
    id: str
    name: str
    structure_type: str
    vertices: List[List[float]]  # 顶点坐标 [[x,y,z], ...]
    faces: List[List[int]]       # 面索引 [[v1,v2,v3], ...]
    volume: float                # 体积 (m³)
    surface_area: float         # 表面积 (m²)
    bounding_box: Dict[str, List[float]]  # 边界框 {min:[x,y,z], max:[x,y,z]}
    material_properties: Dict[str, Any]  # 材料属性
    created_at: str

class SupportStructureGeometryService:
    """支护结构几何建模服务"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def generate_diaphragm_wall_geometry(
        self, 
        name: str,
        thickness: float,
        depth: float, 
        length: float,
        crown_beam_width: Optional[float] = None,
        crown_beam_height: Optional[float] = None,
        **kwargs
    ) -> GeometryModel3D:
        """生成地连墙3D几何模型"""
        
        try:
            if not PYVISTA_AVAILABLE:
                return self._create_simplified_geometry(
                    name, 'diaphragm_wall', thickness * depth * length
                )
            
            # 创建地连墙主体 (矩形体)
            wall_box = pv.Box([
                [0, length, 0, thickness, -depth, 0]  # [xmin, xmax, ymin, ymax, zmin, zmax]
            ])
            
            geometries = [wall_box]
            
            # 添加冠梁
            if crown_beam_width and crown_beam_height:
                crown_beam = pv.Box([
                    [0, length, -crown_beam_width/2, crown_beam_width/2, 0, crown_beam_height]
                ])
                geometries.append(crown_beam)
            
            # 合并几何体
            if len(geometries) > 1:
                combined = geometries[0]
                for geom in geometries[1:]:
                    combined = combined.boolean_union(geom)
            else:
                combined = geometries[0]
            
            # 提取几何信息
            vertices = combined.points.tolist()
            faces = self._extract_faces_from_mesh(combined)
            volume = float(combined.volume) if hasattr(combined, 'volume') else thickness * depth * length
            surface_area = float(combined.area) if hasattr(combined, 'area') else 2 * (thickness * length + thickness * depth + depth * length)
            
            bounds = combined.bounds
            bounding_box = {
                'min': [bounds[0], bounds[2], bounds[4]],
                'max': [bounds[1], bounds[3], bounds[5]]
            }
            
            return GeometryModel3D(
                id=str(uuid.uuid4()),
                name=name,
                structure_type='diaphragm_wall',
                vertices=vertices,
                faces=faces,
                volume=volume,
                surface_area=surface_area,
                bounding_box=bounding_box,
                material_properties=kwargs,
                created_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            self.logger.error(f"地连墙几何生成失败: {str(e)}")
            # 降级到简化几何
            return self._create_simplified_geometry(
                name, 'diaphragm_wall', thickness * depth * length
            )
    
    def generate_pile_system_geometry(
        self,
        name: str,
        diameter: float,
        depth: float,
        spacing: float,
        pile_count: int = 10,
        crown_beam_width: Optional[float] = None,
        crown_beam_height: Optional[float] = None,
        **kwargs
    ) -> GeometryModel3D:
        """生成排桩系统3D几何模型"""
        
        try:
            if not PYVISTA_AVAILABLE:
                pile_volume = np.pi * (diameter/2)**2 * depth
                total_volume = pile_volume * pile_count
                return self._create_simplified_geometry(
                    name, 'pile_system', total_volume
                )
            
            geometries = []
            
            # 生成排桩
            for i in range(pile_count):
                x = i * spacing
                
                # 创建圆柱形桩
                pile = pv.Cylinder(
                    center=[x, 0, -depth/2],
                    direction=[0, 0, 1],
                    radius=diameter/2,
                    height=depth
                )
                geometries.append(pile)
            
            # 添加冠梁
            if crown_beam_width and crown_beam_height:
                beam_length = (pile_count - 1) * spacing + diameter
                crown_beam = pv.Box([
                    [-diameter/2, beam_length - diameter/2, 
                     -crown_beam_width/2, crown_beam_width/2, 
                     0, crown_beam_height]
                ])
                geometries.append(crown_beam)
            
            # 合并几何体
            combined = geometries[0]
            for geom in geometries[1:]:
                combined = combined.boolean_union(geom)
            
            # 提取几何信息
            vertices = combined.points.tolist()
            faces = self._extract_faces_from_mesh(combined)
            volume = float(combined.volume) if hasattr(combined, 'volume') else np.pi * (diameter/2)**2 * depth * pile_count
            surface_area = float(combined.area) if hasattr(combined, 'area') else np.pi * diameter * depth * pile_count
            
            bounds = combined.bounds
            bounding_box = {
                'min': [bounds[0], bounds[2], bounds[4]],
                'max': [bounds[1], bounds[3], bounds[5]]
            }
            
            return GeometryModel3D(
                id=str(uuid.uuid4()),
                name=name,
                structure_type='pile_system',
                vertices=vertices,
                faces=faces,
                volume=volume,
                surface_area=surface_area,
                bounding_box=bounding_box,
                material_properties=kwargs,
                created_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            self.logger.error(f"排桩几何生成失败: {str(e)}")
            pile_volume = np.pi * (diameter/2)**2 * depth
            total_volume = pile_volume * pile_count
            return self._create_simplified_geometry(
                name, 'pile_system', total_volume
            )
    
    def generate_anchor_system_geometry(
        self,
        name: str,
        angle: float,
        length: float,
        diameter: float,
        row_count: int,
        vertical_spacing: float,
        horizontal_spacing: float,
        anchor_count_per_row: int = 5,
        wale_beam_width: Optional[float] = None,
        wale_beam_height: Optional[float] = None,
        **kwargs
    ) -> GeometryModel3D:
        """生成锚杆系统3D几何模型"""
        
        try:
            if not PYVISTA_AVAILABLE:
                anchor_volume = np.pi * (diameter/1000/2)**2 * length
                total_volume = anchor_volume * row_count * anchor_count_per_row
                return self._create_simplified_geometry(
                    name, 'anchor_system', total_volume
                )
            
            geometries = []
            
            # 角度转换为弧度
            angle_rad = np.radians(angle)
            
            # 生成多排锚杆
            for row in range(row_count):
                z_level = -row * vertical_spacing
                
                for i in range(anchor_count_per_row):
                    x = i * horizontal_spacing
                    
                    # 锚杆起点和终点
                    start_point = [x, 0, z_level]
                    end_point = [
                        x + length * np.cos(angle_rad),
                        length * np.sin(angle_rad),
                        z_level
                    ]
                    
                    # 创建圆柱形锚杆
                    anchor = pv.Cylinder(
                        center=[(start_point[0] + end_point[0])/2,
                               (start_point[1] + end_point[1])/2,
                               (start_point[2] + end_point[2])/2],
                        direction=[end_point[0] - start_point[0],
                                 end_point[1] - start_point[1],
                                 end_point[2] - start_point[2]],
                        radius=diameter/1000/2,  # 直径转米
                        height=length
                    )
                    geometries.append(anchor)
            
            # 添加腰梁
            if wale_beam_width and wale_beam_height and row_count > 0:
                for row in range(row_count):
                    z_level = -row * vertical_spacing
                    beam_length = (anchor_count_per_row - 1) * horizontal_spacing + diameter/1000
                    
                    wale_beam = pv.Box([
                        [-diameter/1000/2, beam_length - diameter/1000/2,
                         -wale_beam_width/2, wale_beam_width/2,
                         z_level - wale_beam_height/2, z_level + wale_beam_height/2]
                    ])
                    geometries.append(wale_beam)
            
            # 合并几何体
            if geometries:
                combined = geometries[0]
                for geom in geometries[1:]:
                    try:
                        combined = combined.boolean_union(geom)
                    except:
                        # 如果布尔运算失败，跳过合并
                        pass
                
                # 提取几何信息
                vertices = combined.points.tolist()
                faces = self._extract_faces_from_mesh(combined)
                volume = float(combined.volume) if hasattr(combined, 'volume') else np.pi * (diameter/1000/2)**2 * length * row_count * anchor_count_per_row
                surface_area = float(combined.area) if hasattr(combined, 'area') else np.pi * diameter/1000 * length * row_count * anchor_count_per_row
                
                bounds = combined.bounds
                bounding_box = {
                    'min': [bounds[0], bounds[2], bounds[4]],
                    'max': [bounds[1], bounds[3], bounds[5]]
                }
            else:
                # 空几何体
                vertices = []
                faces = []
                volume = 0.0
                surface_area = 0.0
                bounding_box = {'min': [0, 0, 0], 'max': [0, 0, 0]}
            
            return GeometryModel3D(
                id=str(uuid.uuid4()),
                name=name,
                structure_type='anchor_system',
                vertices=vertices,
                faces=faces,
                volume=volume,
                surface_area=surface_area,
                bounding_box=bounding_box,
                material_properties=kwargs,
                created_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            self.logger.error(f"锚杆几何生成失败: {str(e)}")
            anchor_volume = np.pi * (diameter/1000/2)**2 * length
            total_volume = anchor_volume * row_count * anchor_count_per_row
            return self._create_simplified_geometry(
                name, 'anchor_system', total_volume
            )
    
    def _extract_faces_from_mesh(self, mesh) -> List[List[int]]:
        """从PyVista网格提取面信息"""
        try:
            faces = []
            if hasattr(mesh, 'faces') and mesh.faces is not None:
                face_array = mesh.faces
                i = 0
                while i < len(face_array):
                    n_points = face_array[i]
                    if n_points == 3:  # 三角形面
                        faces.append([
                            int(face_array[i+1]), 
                            int(face_array[i+2]), 
                            int(face_array[i+3])
                        ])
                    i += n_points + 1
            return faces
        except Exception as e:
            self.logger.warning(f"面提取失败: {str(e)}")
            return []
    
    def _create_simplified_geometry(
        self, 
        name: str, 
        structure_type: str, 
        estimated_volume: float
    ) -> GeometryModel3D:
        """创建简化几何模型（当PyVista不可用时）"""
        
        return GeometryModel3D(
            id=str(uuid.uuid4()),
            name=name,
            structure_type=structure_type,
            vertices=[[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]],  # 简单四面体
            faces=[[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]],
            volume=estimated_volume,
            surface_area=estimated_volume * 2,  # 粗略估算
            bounding_box={'min': [0, 0, 0], 'max': [1, 1, 1]},
            material_properties={},
            created_at=datetime.now().isoformat()
        )
    
    def generate_support_structure_geometry(
        self, 
        request: SupportStructureGeometryRequest
    ) -> GeometryModel3D:
        """根据请求生成支护结构几何模型"""
        
        try:
            if request.structure_type == 'diaphragm_wall':
                return self.generate_diaphragm_wall_geometry(
                    name=request.name,
                    **request.parameters
                )
            elif request.structure_type == 'pile_system':
                return self.generate_pile_system_geometry(
                    name=request.name,
                    **request.parameters
                )
            elif request.structure_type == 'anchor_system':
                return self.generate_anchor_system_geometry(
                    name=request.name,
                    **request.parameters
                )
            else:
                raise ValueError(f"不支持的支护结构类型: {request.structure_type}")
                
        except Exception as e:
            self.logger.error(f"支护结构几何生成失败: {str(e)}")
            raise


# 全局服务实例
support_geometry_service = SupportStructureGeometryService()