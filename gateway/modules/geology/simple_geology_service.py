"""
简化的地质建模服务
只保留核心功能：钻孔数据处理 + 基础插值 + PyVista可视化
"""

import numpy as np
import pyvista as pv
from scipy.spatial.distance import cdist
from scipy.interpolate import Rbf
import logging
from typing import List, Dict, Tuple, Optional
import os
import uuid

logger = logging.getLogger(__name__)

class SimpleGeologyService:
    """
    简化的地质建模服务
    核心功能：
    1. 钻孔数据加载和处理
    2. 基础插值算法（RBF + IDW）
    3. 3D网格生成
    4. PyVista可视化和导出
    """
    
    def __init__(self):
        self.boreholes = []
        self.mesh = None
        
    def load_borehole_data(self, boreholes_data: List[Dict]) -> None:
        """加载钻孔数据"""
        self.boreholes = []
        for bh in boreholes_data:
            self.boreholes.append({
                'id': str(bh.get('id', uuid.uuid4())),
                'x': float(bh['x']),
                'y': float(bh['y']),
                'z': float(bh['z']),
                'soil_type': str(bh.get('soil_type', 'Unknown')),
                'layer_id': int(bh.get('layer_id', 1))
            })
        
        logger.info(f"✓ 加载了 {len(self.boreholes)} 个钻孔数据")
        
    def interpolate_surface(self, grid_resolution: float = 5.0, 
                          expansion: float = 50.0) -> pv.StructuredGrid:
        """
        使用RBF插值生成地质表面
        """
        if len(self.boreholes) < 3:
            raise ValueError("至少需要3个钻孔点")
            
        # 提取坐标和高程
        coords = np.array([[bh['x'], bh['y']] for bh in self.boreholes])
        elevations = np.array([bh['z'] for bh in self.boreholes])
        layer_ids = np.array([bh['layer_id'] for bh in self.boreholes])
        
        # 计算插值网格边界
        min_x, min_y = coords.min(axis=0) - expansion
        max_x, max_y = coords.max(axis=0) + expansion
        
        # 创建网格
        x_coords = np.arange(min_x, max_x, grid_resolution)
        y_coords = np.arange(min_y, max_y, grid_resolution)
        grid_x, grid_y = np.meshgrid(x_coords, y_coords)
        
        # RBF插值高程
        rbf_elevation = Rbf(coords[:, 0], coords[:, 1], elevations, 
                           function='multiquadric', smooth=0.1)
        grid_z = rbf_elevation(grid_x, grid_y)
        
        # RBF插值土层ID
        rbf_layer = Rbf(coords[:, 0], coords[:, 1], layer_ids, 
                        function='linear', smooth=0.5)
        grid_layer_ids = rbf_layer(grid_x, grid_y)
        
        # 创建PyVista结构化网格
        mesh = pv.StructuredGrid(grid_x, grid_y, grid_z)
        mesh['elevation'] = grid_z.ravel(order='F')
        mesh['layer_id'] = np.round(grid_layer_ids.ravel(order='F')).astype(int)
        
        # 添加元数据
        mesh.field_data['method'] = 'RBF_interpolation'
        mesh.field_data['grid_resolution'] = grid_resolution
        mesh.field_data['n_boreholes'] = len(self.boreholes)
        
        self.mesh = mesh
        
        logger.info(f"✓ 插值完成: {mesh.n_points}个点, {mesh.n_cells}个网格")
        
        return mesh
        
    def create_borehole_points(self) -> pv.PolyData:
        """创建钻孔点云"""
        if not self.boreholes:
            return pv.PolyData()
            
        points = np.array([[bh['x'], bh['y'], bh['z']] for bh in self.boreholes])
        point_cloud = pv.PolyData(points)
        
        # 添加属性
        layer_ids = [bh['layer_id'] for bh in self.boreholes]
        soil_types = [bh['soil_type'] for bh in self.boreholes]
        
        point_cloud['layer_id'] = layer_ids
        point_cloud['soil_type'] = soil_types
        
        return point_cloud
        
    def export_to_gltf(self, output_dir: str = "output/geology", 
                       colormap: str = "tab10") -> str:
        """导出为glTF格式"""
        os.makedirs(output_dir, exist_ok=True)
        
        if self.mesh is None:
            self.interpolate_surface()
            
        filename = f"simple_geology_{uuid.uuid4().hex[:8]}.gltf"
        output_path = os.path.join(output_dir, filename)
        
        # 使用PyVista离屏渲染
        plotter = pv.Plotter(off_screen=True)
        
        # 添加插值表面
        plotter.add_mesh(
            self.mesh,
            scalars='layer_id',
            cmap=colormap,
            opacity=0.7,
            show_edges=False
        )
        
        # 添加钻孔点
        borehole_points = self.create_borehole_points()
        plotter.add_mesh(
            borehole_points,
            color='red',
            point_size=10,
            render_points_as_spheres=True
        )
        
        # 导出
        plotter.export_gltf(output_path)
        plotter.close()
        
        logger.info(f"✓ 模型已导出: {output_path}")
        return output_path
        
    def get_statistics(self) -> Dict:
        """获取统计信息"""
        if not self.boreholes:
            return {"error": "没有数据"}
            
        coords = np.array([[bh['x'], bh['y'], bh['z']] for bh in self.boreholes])
        
        return {
            "n_boreholes": len(self.boreholes),
            "unique_layers": len(set(bh['layer_id'] for bh in self.boreholes)),
            "elevation_range": [float(coords[:, 2].min()), float(coords[:, 2].max())],
            "spatial_extent": {
                "x_range": [float(coords[:, 0].min()), float(coords[:, 0].max())],
                "y_range": [float(coords[:, 1].min()), float(coords[:, 1].max())],
            },
            "mesh_info": {
                "n_points": self.mesh.n_points if self.mesh else 0,
                "n_cells": self.mesh.n_cells if self.mesh else 0
            } if self.mesh else {}
        }

# 全局服务实例
simple_geology_service = SimpleGeologyService()

def get_simple_geology_service() -> SimpleGeologyService:
    """获取简化地质服务实例"""
    return simple_geology_service