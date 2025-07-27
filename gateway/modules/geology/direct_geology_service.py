"""
直接地质建模服务
数据流：钻孔数据 → 插值 → 直接输出Three.js格式
跳过VTK，直接生成前端可用的数据
"""

import numpy as np
from scipy.interpolate import Rbf, griddata
import json
import logging
from typing import List, Dict, Tuple, Optional
import os
import uuid

logger = logging.getLogger(__name__)

class DirectGeologyService:
    """
    直接地质建模服务
    核心思路：
    1. 钻孔数据插值 → 网格点坐标
    2. 直接输出Three.js BufferGeometry格式
    3. 无需经过VTK/PyVista，避免中文字符问题
    """
    
    def __init__(self):
        self.boreholes = []
        self.mesh_data = None
        
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
        
    def interpolate_and_generate_mesh(self, grid_resolution: float = 5.0, 
                                    expansion: float = 50.0) -> Dict:
        """
        插值并生成Three.js可用的网格数据
        返回格式：vertices, indices, colors, attributes
        """
        if len(self.boreholes) < 3:
            raise ValueError("至少需要3个钻孔点")
            
        # 提取数据
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
        
        # 生成Three.js格式的顶点数据
        vertices = []
        colors = []
        layer_attributes = []
        
        rows, cols = grid_x.shape
        
        # 土层颜色映射
        layer_colors = {
            1: [1.0, 0.4, 0.4],  # 红色
            2: [0.3, 0.8, 0.8],  # 青色  
            3: [0.3, 0.7, 0.9],  # 蓝色
            4: [0.6, 0.8, 0.7],  # 绿色
            5: [1.0, 0.8, 0.3],  # 黄色
            6: [1.0, 0.6, 1.0],  # 粉色
            7: [0.5, 0.7, 1.0],  # 浅蓝
            8: [0.8, 0.5, 1.0],  # 紫色
        }
        
        for i in range(rows):
            for j in range(cols):
                x = float(grid_x[i, j])
                y = float(grid_y[i, j])
                z = float(grid_z[i, j])
                layer_id = int(round(grid_layer_ids[i, j]))
                
                vertices.extend([x, y, z])
                
                # 根据土层ID设置颜色
                color = layer_colors.get(layer_id, [0.5, 0.5, 0.5])
                colors.extend(color)
                layer_attributes.append(layer_id)
        
        # 生成索引（三角形）
        indices = []
        for i in range(rows - 1):
            for j in range(cols - 1):
                # 当前格子的四个顶点索引
                bottom_left = i * cols + j
                bottom_right = i * cols + (j + 1)
                top_left = (i + 1) * cols + j
                top_right = (i + 1) * cols + (j + 1)
                
                # 两个三角形
                indices.extend([bottom_left, bottom_right, top_left])
                indices.extend([bottom_right, top_right, top_left])
        
        # 钻孔点数据
        borehole_points = []
        borehole_colors = []
        
        for bh in self.boreholes:
            borehole_points.extend([bh['x'], bh['y'], bh['z']])
            # 钻孔点用红色高亮
            borehole_colors.extend([1.0, 0.0, 0.0])
        
        self.mesh_data = {
            "vertices": vertices,
            "indices": indices, 
            "colors": colors,
            "layer_attributes": layer_attributes,
            "borehole_points": borehole_points,
            "borehole_colors": borehole_colors,
            "metadata": {
                "grid_resolution": grid_resolution,
                "expansion": expansion,
                "n_vertices": len(vertices) // 3,
                "n_triangles": len(indices) // 3,
                "n_boreholes": len(self.boreholes),
                "bounds": {
                    "x": [float(min_x), float(max_x)],
                    "y": [float(min_y), float(max_y)],
                    "z": [float(grid_z.min()), float(grid_z.max())]
                }
            }
        }
        
        logger.info(f"✓ 网格生成完成: {len(vertices)//3}个顶点, {len(indices)//3}个三角形")
        
        return self.mesh_data
        
    def export_to_json(self, output_dir: str = "output/geology") -> str:
        """导出为JSON格式供Three.js使用"""
        os.makedirs(output_dir, exist_ok=True)
        
        if self.mesh_data is None:
            self.interpolate_and_generate_mesh()
            
        filename = f"geology_mesh_{uuid.uuid4().hex[:8]}.json"
        output_path = os.path.join(output_dir, filename)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.mesh_data, f, indent=2)
            
        logger.info(f"✓ 网格数据已导出: {output_path}")
        return output_path
        
    def get_statistics(self) -> Dict:
        """获取统计信息"""
        if not self.boreholes:
            return {"error": "没有数据"}
            
        coords = np.array([[bh['x'], bh['y'], bh['z']] for bh in self.boreholes])
        
        stats = {
            "n_boreholes": len(self.boreholes),
            "unique_layers": len(set(bh['layer_id'] for bh in self.boreholes)),
            "elevation_range": [float(coords[:, 2].min()), float(coords[:, 2].max())],
            "spatial_extent": {
                "x_range": [float(coords[:, 0].min()), float(coords[:, 0].max())],
                "y_range": [float(coords[:, 1].min()), float(coords[:, 1].max())],
            }
        }
        
        if self.mesh_data:
            stats["mesh_info"] = self.mesh_data["metadata"]
            
        return stats

# 全局服务实例
direct_geology_service = DirectGeologyService()

def get_direct_geology_service() -> DirectGeologyService:
    """获取直接地质服务实例"""
    return direct_geology_service