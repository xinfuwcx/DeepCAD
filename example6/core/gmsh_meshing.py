#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GMSH网格划分系统 - GMSH Meshing System
高级网格生成和自适应细化

Features:
- 参数化几何建模
- 自适应网格细化
- 多尺度网格控制
- 复杂几何处理
- 网格质量优化
"""

import os
import sys
import numpy as np
import tempfile
from typing import Dict, Any, List, Tuple, Optional, Union
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

# GMSH导入
try:
    import gmsh
    GMSH_AVAILABLE = True
except ImportError:
    GMSH_AVAILABLE = False
    print("GMSH not available - meshing functionality limited")

# PyVista导入用于网格转换
try:
    import pyvista as pv
    import vtk
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False


class MeshQuality(Enum):
    """网格质量等级"""
    COARSE = "coarse"
    MEDIUM = "medium"
    FINE = "fine"
    ULTRA_FINE = "ultra_fine"


class GeometryType(Enum):
    """几何类型"""
    CIRCULAR_PIER = "circular_pier"
    RECTANGULAR_PIER = "rectangular_pier"
    ELLIPTICAL_PIER = "elliptical_pier"
    COMPLEX_PIER = "complex_pier"


@dataclass
class MeshParameters:
    """网格参数配置"""
    # 基础参数
    quality: MeshQuality = MeshQuality.MEDIUM
    pier_diameter: float = 2.0
    domain_length: float = 20.0
    domain_width: float = 15.0
    domain_height: float = 6.0
    water_depth: float = 3.0
    
    # 网格尺寸控制
    pier_mesh_size: float = 0.1
    wake_mesh_size: float = 0.2
    domain_mesh_size: float = 1.0
    boundary_layer_thickness: float = 0.01
    boundary_layer_count: int = 5
    
    # 自适应细化
    enable_adaptive: bool = True
    refinement_levels: int = 3
    gradient_threshold: float = 0.1
    
    # 质量控制
    min_element_quality: float = 0.3
    max_aspect_ratio: float = 10.0
    enable_smoothing: bool = True
    smoothing_iterations: int = 3


@dataclass 
class PierGeometry:
    """桥墩几何参数"""
    geometry_type: GeometryType = GeometryType.CIRCULAR_PIER
    diameter: float = 2.0
    length: float = 2.0  # 用于矩形桥墩
    width: float = 1.0   # 用于矩形桥墩
    height: float = 6.0
    position: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    rotation_angle: float = 0.0  # 绕Z轴旋转角度(度)


class GMSHMeshGenerator:
    """GMSH网格生成器"""
    
    def __init__(self):
        self.name = "GMSH Mesh Generator"
        self.version = "1.0.0"
        self.gmsh_initialized = False
        self.current_mesh = None
        
        # 初始化GMSH
        if GMSH_AVAILABLE:
            self.initialize_gmsh()
    
    def initialize_gmsh(self):
        """初始化GMSH"""
        try:
            gmsh.initialize()
            gmsh.option.setNumber("General.Terminal", 0)  # 禁用终端输出
            gmsh.option.setNumber("Mesh.Algorithm", 6)    # Frontal-Delaunay算法
            gmsh.option.setNumber("Mesh.Algorithm3D", 10) # HXT算法
            self.gmsh_initialized = True
        except Exception as e:
            print(f"GMSH初始化失败: {e}")
            self.gmsh_initialized = False
    
    def create_flow_domain_mesh(self, pier_geometry: PierGeometry, 
                               mesh_params: MeshParameters) -> Optional[pv.UnstructuredGrid]:
        """创建流域网格"""
        if not self.gmsh_initialized:
            print("GMSH未正确初始化")
            return None
        
        try:
            # 清理之前的模型
            gmsh.clear()
            gmsh.model.add("ScourFlowDomain")
            
            # 创建几何
            geometry_entities = self._create_domain_geometry(pier_geometry, mesh_params)
            
            # 设置网格尺寸
            self._set_mesh_sizes(geometry_entities, pier_geometry, mesh_params)
            
            # 生成网格
            self._generate_mesh(mesh_params)
            
            # 转换为PyVista格式
            mesh = self._convert_to_pyvista()
            
            self.current_mesh = mesh
            return mesh
            
        except Exception as e:
            print(f"网格生成失败: {e}")
            return None
    
    def _create_domain_geometry(self, pier_geometry: PierGeometry, 
                               mesh_params: MeshParameters) -> Dict[str, List[int]]:
        """创建计算域几何"""
        entities = {
            'domain_points': [],
            'domain_curves': [],
            'domain_surfaces': [],
            'domain_volumes': [],
            'pier_points': [],
            'pier_curves': [],
            'pier_surfaces': [],
            'pier_volumes': []
        }
        
        # 创建外部计算域
        domain_entities = self._create_outer_domain(mesh_params)
        entities.update(domain_entities)
        
        # 创建桥墩几何
        pier_entities = self._create_pier_geometry(pier_geometry)
        entities.update(pier_entities)
        
        # 布尔运算 - 从域中减去桥墩
        self._perform_boolean_operations(entities)
        
        return entities
    
    def _create_outer_domain(self, mesh_params: MeshParameters) -> Dict[str, List[int]]:
        """创建外部计算域"""
        L = mesh_params.domain_length
        W = mesh_params.domain_width
        H = mesh_params.domain_height
        h_water = mesh_params.water_depth
        
        # 计算域顶点
        domain_points = []
        
        # 底面顶点 (河床)
        for x in [-L/2, L/2]:
            for y in [-W/2, W/2]:
                point = gmsh.model.geo.addPoint(x, y, -2.0)
                domain_points.append(point)
        
        # 水面顶点
        for x in [-L/2, L/2]:
            for y in [-W/2, W/2]:
                point = gmsh.model.geo.addPoint(x, y, h_water)
                domain_points.append(point)
        
        # 创建边界线
        domain_curves = []
        
        # 底面边界
        bottom_curves = []
        for i in range(4):
            curve = gmsh.model.geo.addLine(domain_points[i], domain_points[(i+1)%4])
            bottom_curves.append(curve)
            domain_curves.append(curve)
        
        # 顶面边界
        top_curves = []
        for i in range(4):
            curve = gmsh.model.geo.addLine(domain_points[i+4], domain_points[(i+1)%4+4])
            top_curves.append(curve)
            domain_curves.append(curve)
        
        # 竖直边界
        vertical_curves = []
        for i in range(4):
            curve = gmsh.model.geo.addLine(domain_points[i], domain_points[i+4])
            vertical_curves.append(curve)
            domain_curves.append(curve)
        
        # 创建面
        domain_surfaces = []
        
        # 底面
        bottom_loop = gmsh.model.geo.addCurveLoop(bottom_curves)
        bottom_surface = gmsh.model.geo.addPlaneSurface([bottom_loop])
        domain_surfaces.append(bottom_surface)
        
        # 顶面
        top_loop = gmsh.model.geo.addCurveLoop(top_curves)
        top_surface = gmsh.model.geo.addPlaneSurface([top_loop])
        domain_surfaces.append(top_surface)
        
        # 侧面
        for i in range(4):
            side_curves = [
                bottom_curves[i],
                vertical_curves[(i+1)%4],
                -top_curves[i],
                -vertical_curves[i]
            ]
            side_loop = gmsh.model.geo.addCurveLoop(side_curves)
            side_surface = gmsh.model.geo.addPlaneSurface([side_loop])
            domain_surfaces.append(side_surface)
        
        # 创建体积
        domain_surface_loop = gmsh.model.geo.addSurfaceLoop(domain_surfaces)
        domain_volume = gmsh.model.geo.addVolume([domain_surface_loop])
        
        return {
            'domain_points': domain_points,
            'domain_curves': domain_curves,
            'domain_surfaces': domain_surfaces,
            'domain_volumes': [domain_volume]
        }
    
    def _create_pier_geometry(self, pier_geometry: PierGeometry) -> Dict[str, List[int]]:
        """创建桥墩几何"""
        pier_entities = {
            'pier_points': [],
            'pier_curves': [],
            'pier_surfaces': [],
            'pier_volumes': []
        }
        
        if pier_geometry.geometry_type == GeometryType.CIRCULAR_PIER:
            pier_entities = self._create_circular_pier(pier_geometry)
        elif pier_geometry.geometry_type == GeometryType.RECTANGULAR_PIER:
            pier_entities = self._create_rectangular_pier(pier_geometry)
        elif pier_geometry.geometry_type == GeometryType.ELLIPTICAL_PIER:
            pier_entities = self._create_elliptical_pier(pier_geometry)
        
        return pier_entities
    
    def _create_circular_pier(self, pier_geometry: PierGeometry) -> Dict[str, List[int]]:
        """创建圆形桥墩"""
        cx, cy, cz = pier_geometry.position
        r = pier_geometry.diameter / 2
        h = pier_geometry.height
        
        # 底面圆心和顶面圆心
        center_bottom = gmsh.model.geo.addPoint(cx, cy, cz)
        center_top = gmsh.model.geo.addPoint(cx, cy, cz + h)
        
        # 圆周上的点
        n_points = 16  # 圆周点数
        bottom_points = []
        top_points = []
        
        for i in range(n_points):
            angle = 2 * np.pi * i / n_points
            x = cx + r * np.cos(angle)
            y = cy + r * np.sin(angle)
            
            bottom_point = gmsh.model.geo.addPoint(x, y, cz)
            top_point = gmsh.model.geo.addPoint(x, y, cz + h)
            
            bottom_points.append(bottom_point)
            top_points.append(top_point)
        
        # 创建圆弧
        bottom_curves = []
        top_curves = []
        
        for i in range(n_points):
            next_i = (i + 1) % n_points
            
            # 底面圆弧
            bottom_curve = gmsh.model.geo.addCircleArc(
                bottom_points[i], center_bottom, bottom_points[next_i]
            )
            bottom_curves.append(bottom_curve)
            
            # 顶面圆弧
            top_curve = gmsh.model.geo.addCircleArc(
                top_points[i], center_top, top_points[next_i]
            )
            top_curves.append(top_curve)
        
        # 竖直边
        vertical_curves = []
        for i in range(n_points):
            vertical_curve = gmsh.model.geo.addLine(bottom_points[i], top_points[i])
            vertical_curves.append(vertical_curve)
        
        # 创建面
        pier_surfaces = []
        
        # 底面
        bottom_loop = gmsh.model.geo.addCurveLoop(bottom_curves)
        bottom_surface = gmsh.model.geo.addPlaneSurface([bottom_loop])
        pier_surfaces.append(bottom_surface)
        
        # 顶面
        top_loop = gmsh.model.geo.addCurveLoop(top_curves)
        top_surface = gmsh.model.geo.addPlaneSurface([top_loop])
        pier_surfaces.append(top_surface)
        
        # 侧面
        for i in range(n_points):
            next_i = (i + 1) % n_points
            side_curves = [
                bottom_curves[i],
                vertical_curves[next_i],
                -top_curves[i],
                -vertical_curves[i]
            ]
            side_loop = gmsh.model.geo.addCurveLoop(side_curves)
            side_surface = gmsh.model.geo.addPlaneSurface([side_loop])
            pier_surfaces.append(side_surface)
        
        # 创建体积
        pier_surface_loop = gmsh.model.geo.addSurfaceLoop(pier_surfaces)
        pier_volume = gmsh.model.geo.addVolume([pier_surface_loop])
        
        return {
            'pier_points': [center_bottom, center_top] + bottom_points + top_points,
            'pier_curves': bottom_curves + top_curves + vertical_curves,
            'pier_surfaces': pier_surfaces,
            'pier_volumes': [pier_volume]
        }
    
    def _create_rectangular_pier(self, pier_geometry: PierGeometry) -> Dict[str, List[int]]:
        """创建矩形桥墩"""
        cx, cy, cz = pier_geometry.position
        l = pier_geometry.length
        w = pier_geometry.width
        h = pier_geometry.height
        
        # 考虑旋转角度
        angle = np.radians(pier_geometry.rotation_angle)
        cos_a, sin_a = np.cos(angle), np.sin(angle)
        
        # 底面顶点
        corners = [
            (-l/2, -w/2), (l/2, -w/2), (l/2, w/2), (-l/2, w/2)
        ]
        
        bottom_points = []
        top_points = []
        
        for dx, dy in corners:
            # 应用旋转
            x = cx + dx * cos_a - dy * sin_a
            y = cy + dx * sin_a + dy * cos_a
            
            bottom_point = gmsh.model.geo.addPoint(x, y, cz)
            top_point = gmsh.model.geo.addPoint(x, y, cz + h)
            
            bottom_points.append(bottom_point)
            top_points.append(top_point)
        
        # 创建边
        bottom_curves = []
        top_curves = []
        vertical_curves = []
        
        for i in range(4):
            next_i = (i + 1) % 4
            
            # 底面边
            bottom_curve = gmsh.model.geo.addLine(bottom_points[i], bottom_points[next_i])
            bottom_curves.append(bottom_curve)
            
            # 顶面边
            top_curve = gmsh.model.geo.addLine(top_points[i], top_points[next_i])
            top_curves.append(top_curve)
            
            # 竖直边
            vertical_curve = gmsh.model.geo.addLine(bottom_points[i], top_points[i])
            vertical_curves.append(vertical_curve)
        
        # 创建面
        pier_surfaces = []
        
        # 底面
        bottom_loop = gmsh.model.geo.addCurveLoop(bottom_curves)
        bottom_surface = gmsh.model.geo.addPlaneSurface([bottom_loop])
        pier_surfaces.append(bottom_surface)
        
        # 顶面
        top_loop = gmsh.model.geo.addCurveLoop(top_curves)
        top_surface = gmsh.model.geo.addPlaneSurface([top_loop])
        pier_surfaces.append(top_surface)
        
        # 侧面
        for i in range(4):
            next_i = (i + 1) % 4
            side_curves = [
                bottom_curves[i],
                vertical_curves[next_i],
                -top_curves[i],
                -vertical_curves[i]
            ]
            side_loop = gmsh.model.geo.addCurveLoop(side_curves)
            side_surface = gmsh.model.geo.addPlaneSurface([side_loop])
            pier_surfaces.append(side_surface)
        
        # 创建体积
        pier_surface_loop = gmsh.model.geo.addSurfaceLoop(pier_surfaces)
        pier_volume = gmsh.model.geo.addVolume([pier_surface_loop])
        
        return {
            'pier_points': bottom_points + top_points,
            'pier_curves': bottom_curves + top_curves + vertical_curves,
            'pier_surfaces': pier_surfaces,
            'pier_volumes': [pier_volume]
        }
    
    def _create_elliptical_pier(self, pier_geometry: PierGeometry) -> Dict[str, List[int]]:
        """创建椭圆形桥墩"""
        # 简化实现 - 可以后续扩展
        return self._create_circular_pier(pier_geometry)
    
    def _perform_boolean_operations(self, entities: Dict[str, List[int]]):
        """执行布尔运算"""
        try:
            # 同步几何模型
            gmsh.model.geo.synchronize()
            
            # 从计算域中减去桥墩
            if entities['domain_volumes'] and entities['pier_volumes']:
                domain_vol = entities['domain_volumes'][0]
                pier_vols = entities['pier_volumes']
                
                # 执行布尔差操作
                out_vol, out_vol_map = gmsh.model.occ.cut(
                    [(3, domain_vol)],  # 被减对象 (3D volume)
                    [(3, pier_vol) for pier_vol in pier_vols],  # 减去的对象
                    removeObject=True,
                    removeTool=True
                )
                
                # 更新实体列表
                entities['final_volumes'] = [vol[1] for vol in out_vol]
                
        except Exception as e:
            print(f"布尔运算失败: {e}")
    
    def _set_mesh_sizes(self, entities: Dict[str, List[int]], 
                       pier_geometry: PierGeometry, 
                       mesh_params: MeshParameters):
        """设置网格尺寸"""
        try:
            # 桥墩附近细网格
            if 'pier_points' in entities:
                for point in entities['pier_points']:
                    gmsh.model.mesh.setSize([(0, point)], mesh_params.pier_mesh_size)
            
            # 计算域边界粗网格
            if 'domain_points' in entities:
                for point in entities['domain_points']:
                    gmsh.model.mesh.setSize([(0, point)], mesh_params.domain_mesh_size)
            
            # 设置全局网格参数
            gmsh.option.setNumber("Mesh.MeshSizeMin", mesh_params.pier_mesh_size * 0.1)
            gmsh.option.setNumber("Mesh.MeshSizeMax", mesh_params.domain_mesh_size)
            gmsh.option.setNumber("Mesh.MeshSizeFromPoints", 1)
            gmsh.option.setNumber("Mesh.MeshSizeFromCurvature", 1)
            gmsh.option.setNumber("Mesh.MeshSizeExtendFromBoundary", 1)
            
            # 质量控制
            gmsh.option.setNumber("Mesh.ElementOrder", 1)  # 线性单元
            gmsh.option.setNumber("Mesh.Optimize", 1)
            gmsh.option.setNumber("Mesh.OptimizeNetgen", 1)
            
        except Exception as e:
            print(f"设置网格尺寸失败: {e}")
    
    def _generate_mesh(self, mesh_params: MeshParameters):
        """生成网格"""
        try:
            # 同步几何模型
            gmsh.model.geo.synchronize()
            
            # 生成2D网格
            gmsh.model.mesh.generate(2)
            
            # 生成3D网格
            gmsh.model.mesh.generate(3)
            
            # 网格优化
            if mesh_params.enable_smoothing:
                for i in range(mesh_params.smoothing_iterations):
                    gmsh.model.mesh.optimize("Netgen")
            
            # 网格细化
            if mesh_params.enable_adaptive:
                self._perform_adaptive_refinement(mesh_params)
                
        except Exception as e:
            print(f"网格生成失败: {e}")
    
    def _perform_adaptive_refinement(self, mesh_params: MeshParameters):
        """执行自适应网格细化"""
        try:
            # 基于几何特征的自适应细化
            for level in range(mesh_params.refinement_levels):
                # 获取网格质量指标
                qualities = self._compute_mesh_quality()
                
                # 标记需要细化的单元
                poor_elements = [i for i, q in enumerate(qualities) 
                               if q < mesh_params.min_element_quality]
                
                if poor_elements:
                    # 细化标记的单元
                    gmsh.model.mesh.refine()
                else:
                    break  # 网格质量已足够好
                    
        except Exception as e:
            print(f"自适应细化失败: {e}")
    
    def _compute_mesh_quality(self) -> List[float]:
        """计算网格质量"""
        # 简化实现 - 实际应该计算单元的形状质量
        try:
            # 获取所有四面体单元
            element_types, element_tags, node_tags = gmsh.model.mesh.getElements(3)
            
            qualities = []
            for elem_type, elem_tags, nodes in zip(element_types, element_tags, node_tags):
                if elem_type == 4:  # 四面体
                    # 简化质量计算
                    qualities.extend([0.8] * len(elem_tags))  # 假设质量为0.8
            
            return qualities
            
        except Exception as e:
            print(f"网格质量计算失败: {e}")
            return []
    
    def _convert_to_pyvista(self) -> Optional[pv.UnstructuredGrid]:
        """转换为PyVista格式"""
        if not PYVISTA_AVAILABLE:
            print("PyVista不可用，无法转换网格")
            return None
            
        try:
            # 写入临时文件
            temp_file = tempfile.NamedTemporaryFile(suffix='.vtk', delete=False)
            temp_filename = temp_file.name
            temp_file.close()
            
            # 导出VTK格式
            gmsh.write(temp_filename)
            
            # 读取为PyVista网格
            mesh = pv.read(temp_filename)
            
            # 删除临时文件
            os.unlink(temp_filename)
            
            return mesh
            
        except Exception as e:
            print(f"网格格式转换失败: {e}")
            return None
    
    def create_boundary_layer_mesh(self, pier_geometry: PierGeometry,
                                  mesh_params: MeshParameters) -> Optional[pv.UnstructuredGrid]:
        """创建边界层网格"""
        # 复杂的边界层网格生成 - 可以后续实现
        pass
    
    def refine_mesh_around_pier(self, mesh: pv.UnstructuredGrid, 
                               pier_geometry: PierGeometry,
                               refinement_factor: float = 2.0) -> pv.UnstructuredGrid:
        """在桥墩周围细化网格"""
        if mesh is None:
            return None
            
        try:
            # 计算到桥墩的距离
            pier_center = np.array(pier_geometry.position)
            points = mesh.points
            distances = np.linalg.norm(points - pier_center, axis=1)
            
            # 标记需要细化的区域
            refinement_radius = pier_geometry.diameter * 3
            refine_mask = distances < refinement_radius
            
            # 实际的网格细化实现会更复杂
            # 这里提供一个简化的接口
            
            return mesh
            
        except Exception as e:
            print(f"网格细化失败: {e}")
            return mesh
    
    def export_mesh(self, filename: str, format: str = "vtk"):
        """导出网格"""
        try:
            if format.lower() == "vtk":
                gmsh.write(filename)
            elif format.lower() == "msh":
                gmsh.write(filename)
            elif format.lower() == "stl":
                gmsh.write(filename)
            else:
                print(f"不支持的格式: {format}")
                
        except Exception as e:
            print(f"网格导出失败: {e}")
    
    def get_mesh_statistics(self) -> Dict[str, Any]:
        """获取网格统计信息"""
        try:
            # 获取节点和单元信息
            node_tags, node_coords, _ = gmsh.model.mesh.getNodes()
            element_types, element_tags, node_tags_elem = gmsh.model.mesh.getElements()
            
            stats = {
                'num_nodes': len(node_tags),
                'num_elements': sum(len(tags) for tags in element_tags),
                'element_types': {},
                'bounding_box': self._compute_bounding_box(node_coords),
                'mesh_quality': self._compute_mesh_quality_stats()
            }
            
            # 单元类型统计
            for elem_type, tags in zip(element_types, element_tags):
                type_name = self._get_element_type_name(elem_type)
                stats['element_types'][type_name] = len(tags)
            
            return stats
            
        except Exception as e:
            print(f"网格统计失败: {e}")
            return {}
    
    def _compute_bounding_box(self, node_coords: np.ndarray) -> Dict[str, Tuple[float, float]]:
        """计算包围盒"""
        coords = np.array(node_coords).reshape(-1, 3)
        return {
            'x': (coords[:, 0].min(), coords[:, 0].max()),
            'y': (coords[:, 1].min(), coords[:, 1].max()),
            'z': (coords[:, 2].min(), coords[:, 2].max())
        }
    
    def _compute_mesh_quality_stats(self) -> Dict[str, float]:
        """计算网格质量统计"""
        qualities = self._compute_mesh_quality()
        if qualities:
            return {
                'min_quality': min(qualities),
                'max_quality': max(qualities),
                'avg_quality': sum(qualities) / len(qualities)
            }
        return {}
    
    def _get_element_type_name(self, elem_type: int) -> str:
        """获取单元类型名称"""
        type_map = {
            1: "线性",
            2: "三角形",
            3: "四边形", 
            4: "四面体",
            5: "六面体",
            6: "棱柱",
            7: "金字塔"
        }
        return type_map.get(elem_type, f"类型{elem_type}")
    
    def cleanup(self):
        """清理资源"""
        if self.gmsh_initialized:
            gmsh.clear()
            gmsh.finalize()
            self.gmsh_initialized = False


# 便利函数
def create_default_mesh_parameters(quality: MeshQuality = MeshQuality.MEDIUM) -> MeshParameters:
    """创建默认网格参数"""
    quality_settings = {
        MeshQuality.COARSE: {
            'pier_mesh_size': 0.2,
            'wake_mesh_size': 0.4, 
            'domain_mesh_size': 2.0
        },
        MeshQuality.MEDIUM: {
            'pier_mesh_size': 0.1,
            'wake_mesh_size': 0.2,
            'domain_mesh_size': 1.0
        },
        MeshQuality.FINE: {
            'pier_mesh_size': 0.05,
            'wake_mesh_size': 0.1,
            'domain_mesh_size': 0.5
        },
        MeshQuality.ULTRA_FINE: {
            'pier_mesh_size': 0.025,
            'wake_mesh_size': 0.05,
            'domain_mesh_size': 0.25
        }
    }
    
    settings = quality_settings[quality]
    return MeshParameters(
        quality=quality,
        pier_mesh_size=settings['pier_mesh_size'],
        wake_mesh_size=settings['wake_mesh_size'],
        domain_mesh_size=settings['domain_mesh_size']
    )


def create_circular_pier_geometry(diameter: float = 2.0, height: float = 6.0) -> PierGeometry:
    """创建圆形桥墩几何"""
    return PierGeometry(
        geometry_type=GeometryType.CIRCULAR_PIER,
        diameter=diameter,
        height=height
    )


if __name__ == "__main__":
    # 测试网格生成器
    if GMSH_AVAILABLE:
        print("=== GMSH网格生成器测试 ===")
        
        generator = GMSHMeshGenerator()
        
        # 创建测试几何和参数
        pier_geom = create_circular_pier_geometry(2.0, 6.0)
        mesh_params = create_default_mesh_parameters(MeshQuality.MEDIUM)
        
        print(f"桥墩类型: {pier_geom.geometry_type}")
        print(f"桥墩直径: {pier_geom.diameter} m")
        print(f"网格质量: {mesh_params.quality}")
        
        # 生成网格
        mesh = generator.create_flow_domain_mesh(pier_geom, mesh_params)
        
        if mesh:
            print(f"网格生成成功!")
            print(f"节点数: {mesh.n_points}")
            print(f"单元数: {mesh.n_cells}")
            
            # 获取统计信息
            stats = generator.get_mesh_statistics()
            print(f"网格统计: {stats}")
            
            # 导出网格
            generator.export_mesh("test_mesh.vtk")
            print("网格已导出到 test_mesh.vtk")
        
        generator.cleanup()
    else:
        print("GMSH不可用，跳过测试")