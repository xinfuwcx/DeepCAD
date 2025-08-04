#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD炫酷可视化模块
为岩土工程CAE提供酷炫的3D可视化效果
"""

import numpy as np
from typing import Dict, Any, Optional, List
import pyvista as pv

class CoolVisualizationEngine:
    """炫酷可视化引擎"""
    
    def __init__(self):
        self.effects = {
            'glass': self.apply_glass_effect,
            'crystal': self.apply_crystal_effect,
            'neon': self.apply_neon_effect,
            'hologram': self.apply_hologram_effect,
            'metal': self.apply_metal_effect,
            'glow': self.apply_glow_effect,
            'xray': self.apply_xray_effect,
            'thermal': self.apply_thermal_effect,
            'particle': self.apply_particle_effect,
            'wireframe_glow': self.apply_wireframe_glow_effect
        }
    
    def apply_effect(self, plotter, mesh, effect_name: str, **kwargs):
        """应用指定的视觉效果"""
        if effect_name in self.effects:
            return self.effects[effect_name](plotter, mesh, **kwargs)
        else:
            # 默认效果
            plotter.add_mesh(mesh, color='lightblue', show_edges=True)
            return mesh
    
    def apply_glass_effect(self, plotter, mesh, color='cyan', **kwargs):
        """玻璃效果 - 适合显示水体或透明材料"""
        plotter.add_mesh(mesh, 
                        color=color, 
                        opacity=0.3,
                        specular=1.0, 
                        specular_power=100,
                        ambient=0.1, 
                        diffuse=0.2,
                        show_edges=True,
                        edge_color='lightblue',
                        line_width=0.5)
        return mesh
    
    def apply_crystal_effect(self, plotter, mesh, color='purple', **kwargs):
        """水晶效果 - 适合显示混凝土或岩石"""
        plotter.add_mesh(mesh,
                        color=color,
                        opacity=0.8,
                        metallic=0.9,
                        roughness=0.1,
                        pbr=True,
                        show_edges=True,
                        edge_color='white',
                        line_width=1)
        return mesh
    
    def apply_neon_effect(self, plotter, mesh, primary_color='darkblue', neon_color='cyan', **kwargs):
        """霓虹效果 - 适合突出显示重要区域"""
        # 主体
        plotter.add_mesh(mesh, color=primary_color, opacity=0.8)
        
        # 发光边缘
        edges = mesh.extract_feature_edges()
        plotter.add_mesh(edges, color=neon_color, line_width=8, opacity=0.6)
        plotter.add_mesh(edges, color='white', line_width=4, opacity=0.8)
        plotter.add_mesh(edges, color=neon_color, line_width=2, opacity=1.0)
        
        return mesh
    
    def apply_hologram_effect(self, plotter, mesh, scan_color='lime', **kwargs):
        """全息投影效果 - 适合预览模式"""
        # 主网格
        plotter.add_mesh(mesh, color='cyan', opacity=0.4,
                        show_edges=True, edge_color='blue', line_width=1)
        
        # 扫描线效果
        bounds = mesh.bounds
        z_min, z_max = bounds[4], bounds[5]
        
        for i in range(5):  # 减少扫描线数量避免过于复杂
            z_pos = z_min + (z_max - z_min) * i / 4
            plane = pv.Plane(center=(0, 0, z_pos), direction=(0, 0, 1),
                           i_size=abs(bounds[1] - bounds[0]) * 1.2,
                           j_size=abs(bounds[3] - bounds[2]) * 1.2)
            
            try:
                intersection = mesh.clip_surface(plane)
                if intersection.n_points > 0:
                    plotter.add_mesh(intersection, color=scan_color, 
                                   line_width=2, opacity=0.8)
            except:
                pass  # 忽略切片错误
        
        return mesh
    
    def apply_metal_effect(self, plotter, mesh, metal_type='gold', **kwargs):
        """金属效果 - 适合显示钢结构"""
        colors = {
            'gold': 'gold',
            'silver': 'silver', 
            'copper': '#B87333',
            'steel': '#71797E'
        }
        
        color = colors.get(metal_type, 'gold')
        plotter.add_mesh(mesh,
                        color=color,
                        metallic=0.9,
                        roughness=0.2,
                        pbr=True,
                        show_edges=False)
        return mesh
    
    def apply_glow_effect(self, plotter, mesh, glow_color='yellow', **kwargs):
        """发光效果 - 适合显示热源或光源"""
        plotter.add_mesh(mesh,
                        color=glow_color,
                        ambient=0.8,
                        diffuse=0.3,
                        specular=1.0,
                        specular_power=50,
                        opacity=0.9)
        return mesh
    
    def apply_xray_effect(self, plotter, mesh, **kwargs):
        """X射线效果 - 适合内部结构显示"""
        plotter.add_mesh(mesh,
                        color='white',
                        opacity=0.1,
                        show_edges=True,
                        edge_color='lime',
                        line_width=1)
        
        # 添加内部结构
        if mesh.n_cells > 100:  # 只对复杂网格应用
            outline = mesh.outline()
            plotter.add_mesh(outline, color='lime', line_width=3)
        
        return mesh
    
    def apply_thermal_effect(self, plotter, mesh, scalar_name=None, **kwargs):
        """热成像效果 - 适合温度场显示"""
        if scalar_name and scalar_name in mesh.point_data:
            scalars = scalar_name
        else:
            # 生成伪热数据
            scalars = mesh.points[:, 2]  # 使用Z坐标作为温度
            mesh.point_data['temperature'] = scalars
            scalars = 'temperature'
        
        plotter.add_mesh(mesh,
                        scalars=scalars,
                        cmap='hot',
                        show_scalar_bar=True,
                        scalar_bar_args={'title': '温度 (°C)'},
                        opacity=0.9)
        return mesh
    
    def apply_particle_effect(self, plotter, mesh, n_particles=200, **kwargs):
        """粒子效果 - 适合动态显示"""
        # 主网格
        plotter.add_mesh(mesh, color='darkblue', opacity=0.6)
        
        # 粒子系统
        bounds = mesh.bounds
        particles_pos = np.random.uniform(
            [bounds[0], bounds[2], bounds[4]],
            [bounds[1], bounds[3], bounds[5]],
            size=(n_particles, 3)
        )
        
        particles = pv.PolyData(particles_pos)
        particles.point_data['size'] = np.random.random(n_particles) * 0.5
        
        spheres = particles.glyph(geom=pv.Sphere(radius=0.1), scale='size')
        plotter.add_mesh(spheres, color='yellow', opacity=0.8,
                        ambient=1.0, specular=0)
        
        return mesh
    
    def apply_wireframe_glow_effect(self, plotter, mesh, wire_color='cyan', **kwargs):
        """发光线框效果 - 适合概念设计显示"""
        # 隐藏的实体
        plotter.add_mesh(mesh, color='black', opacity=0.1)
        
        # 发光线框
        plotter.add_mesh(mesh, style='wireframe', 
                        color=wire_color, line_width=3, opacity=0.8)
        plotter.add_mesh(mesh, style='wireframe',
                        color='white', line_width=1, opacity=1.0)
        
        return mesh
    
    def create_environment_effects(self, plotter, effect_type='sci_fi'):
        """创建环境特效"""
        if effect_type == 'sci_fi':
            # 科幻环境
            plotter.set_background('black')
            
            # 添加网格地面
            grid = pv.StructuredGrid()
            x = np.arange(-50, 51, 5)
            y = np.arange(-50, 51, 5)
            z = np.array([-20])
            X, Y, Z = np.meshgrid(x, y, z)
            grid.points = np.column_stack([X.ravel(), Y.ravel(), Z.ravel()])
            grid.dimensions = [len(x), len(y), len(z)]
            
            plotter.add_mesh(grid, style='wireframe', color='darkgreen',
                           opacity=0.3, line_width=1)
            
        elif effect_type == 'sunset':
            # 夕阳环境
            plotter.set_background('gradient', top='orange', bottom='purple')
            
        elif effect_type == 'ocean':
            # 海洋环境
            plotter.set_background('gradient', top='lightblue', bottom='darkblue')
            
        elif effect_type == 'space':
            # 太空环境
            plotter.set_background('black')
            # 添加星星
            n_stars = 1000
            stars_pos = np.random.uniform(-100, 100, size=(n_stars, 3))
            stars = pv.PolyData(stars_pos)
            spheres = stars.glyph(geom=pv.Sphere(radius=0.1))
            plotter.add_mesh(spheres, color='white', opacity=0.8, ambient=1.0)

class GeotechnicalVisualizer:
    """岩土工程专用可视化器"""
    
    def __init__(self):
        self.viz_engine = CoolVisualizationEngine()
    
    def visualize_excavation(self, plotter, mesh, material_ids=None):
        """基坑开挖可视化"""
        if material_ids is not None and 'MaterialID' in mesh.cell_data:
            # 根据材料ID分类显示
            materials = np.unique(mesh.cell_data['MaterialID'])
            
            for mat_id in materials:
                # 提取特定材料的单元
                mat_mesh = mesh.threshold(mat_id, scalars='MaterialID')
                
                if mat_id == 6:  # 土体材料
                    self.viz_engine.apply_effect(plotter, mat_mesh, 'thermal', 
                                                scalar_name='MaterialID')
                elif mat_id == 12:  # 混凝土材料
                    self.viz_engine.apply_effect(plotter, mat_mesh, 'crystal',
                                                color='gray')
                else:
                    plotter.add_mesh(mat_mesh, color='brown', opacity=0.8)
        else:
            # 统一显示
            self.viz_engine.apply_effect(plotter, mesh, 'glass', color='brown')
    
    def visualize_stress_field(self, plotter, mesh, stress_data=None):
        """应力场可视化"""
        if stress_data is None:
            # 生成示例应力数据
            stress_data = np.random.random(mesh.n_points) * 1000
            mesh.point_data['Stress'] = stress_data
        
        self.viz_engine.apply_effect(plotter, mesh, 'thermal', scalar_name='Stress')
    
    def visualize_deformation(self, plotter, original_mesh, deformed_mesh):
        """变形可视化"""
        # 原始形状 - 半透明
        self.viz_engine.apply_effect(plotter, original_mesh, 'xray')
        
        # 变形形状 - 发光效果
        self.viz_engine.apply_effect(plotter, deformed_mesh, 'neon', 
                                    primary_color='red', neon_color='yellow')

def create_cool_visualization_demo():
    """创建炫酷可视化演示"""
    print("创建岩土工程炫酷可视化演示...")
    
    # 创建基坑几何
    excavation = pv.Cube(center=(0, 0, -5), x_length=20, y_length=20, z_length=10)
    soil_domain = pv.Cube(center=(0, 0, -15), x_length=60, y_length=60, z_length=30)
    
    try:
        soil = soil_domain.boolean_difference(excavation).triangulate()
    except:
        soil = soil_domain.triangulate()
    
    # 添加材料属性
    soil.cell_data['MaterialID'] = np.full(soil.n_cells, 6)
    
    # 创建支护结构
    wall1 = pv.Cube(center=(10, 0, -5), x_length=2, y_length=20, z_length=10)
    wall2 = pv.Cube(center=(-10, 0, -5), x_length=2, y_length=20, z_length=10)
    wall1.cell_data['MaterialID'] = np.full(wall1.n_cells, 12)
    wall2.cell_data['MaterialID'] = np.full(wall2.n_cells, 12)
    
    # 合并网格
    combined = soil.merge([wall1, wall2])
    
    # 创建可视化器
    geo_viz = GeotechnicalVisualizer()
    
    plotter = pv.Plotter(window_size=(1400, 1000))
    
    # 应用岩土工程可视化
    geo_viz.visualize_excavation(plotter, combined, material_ids=True)
    
    # 添加环境效果
    geo_viz.viz_engine.create_environment_effects(plotter, 'sci_fi')
    
    # 添加标题
    plotter.add_text("DeepCAD岩土工程炫酷可视化", font_size=16, color='cyan')
    
    # 显示坐标轴
    plotter.show_axes()
    
    plotter.show()

if __name__ == "__main__":
    create_cool_visualization_demo()