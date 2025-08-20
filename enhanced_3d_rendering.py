#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced 3D Rendering Engine for GEM Professional
增强3D渲染引擎 - 达到Abaqus CAE级别的视觉效果

特性：
- 基于物理的渲染 (PBR)
- 专业级材质系统
- 高级光照模型
- 抗锯齿和后处理效果
- Abaqus风格的视觉呈现
"""

import numpy as np
from typing import Dict, List, Optional, Tuple, Union
import colorsys

try:
    import pyvista as pv
    import vtk
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

try:
    import matplotlib.pyplot as plt
    import matplotlib.colors as mcolors
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False


class GeologicalMaterials:
    """地质材质库 - 专业级地质材质定义"""
    
    @staticmethod
    def get_soil_material(soil_type: str) -> Dict:
        """获取土层材质参数"""
        materials = {
            "填土": {
                "color": "#8B4513",
                "ambient": 0.3,
                "diffuse": 0.7,
                "specular": 0.1,
                "roughness": 0.8,
                "metallic": 0.0,
                "opacity": 0.85
            },
            "粘土": {
                "color": "#D2691E", 
                "ambient": 0.4,
                "diffuse": 0.8,
                "specular": 0.2,
                "roughness": 0.7,
                "metallic": 0.0,
                "opacity": 0.9
            },
            "粉质粘土": {
                "color": "#CD853F",
                "ambient": 0.35,
                "diffuse": 0.75,
                "specular": 0.15,
                "roughness": 0.75,
                "metallic": 0.0,
                "opacity": 0.88
            },
            "细砂": {
                "color": "#F4A460",
                "ambient": 0.3,
                "diffuse": 0.6,
                "specular": 0.3,
                "roughness": 0.6,
                "metallic": 0.1,
                "opacity": 0.85
            },
            "中砂": {
                "color": "#DEB887",
                "ambient": 0.3,
                "diffuse": 0.6,
                "specular": 0.35,
                "roughness": 0.55,
                "metallic": 0.15,
                "opacity": 0.87
            },
            "粗砂": {
                "color": "#D2B48C",
                "ambient": 0.25,
                "diffuse": 0.6,
                "specular": 0.4,
                "roughness": 0.5,
                "metallic": 0.2,
                "opacity": 0.9
            },
            "砾砂": {
                "color": "#BC8F8F",
                "ambient": 0.2,
                "diffuse": 0.5,
                "specular": 0.5,
                "roughness": 0.4,
                "metallic": 0.3,
                "opacity": 0.9
            },
            "卵石层": {
                "color": "#A0522D",
                "ambient": 0.2,
                "diffuse": 0.4,
                "specular": 0.6,
                "roughness": 0.3,
                "metallic": 0.4,
                "opacity": 0.95
            },
            "强风化岩": {
                "color": "#8B7355",
                "ambient": 0.25,
                "diffuse": 0.5,
                "specular": 0.4,
                "roughness": 0.6,
                "metallic": 0.2,
                "opacity": 0.9
            },
            "中风化岩": {
                "color": "#696969",
                "ambient": 0.2,
                "diffuse": 0.4,
                "specular": 0.6,
                "roughness": 0.4,
                "metallic": 0.5,
                "opacity": 0.95
            },
            "微风化岩": {
                "color": "#2F4F4F",
                "ambient": 0.15,
                "diffuse": 0.3,
                "specular": 0.8,
                "roughness": 0.2,
                "metallic": 0.7,
                "opacity": 1.0
            },
            "基岩": {
                "color": "#1C1C1C",
                "ambient": 0.1,
                "diffuse": 0.2,
                "specular": 0.9,
                "roughness": 0.1,
                "metallic": 0.8,
                "opacity": 1.0
            }
        }
        
        return materials.get(soil_type, materials["填土"])
    
    @staticmethod
    def get_fault_material() -> Dict:
        """断层材质"""
        return {
            "color": "#FF4444",
            "ambient": 0.4,
            "diffuse": 0.6,
            "specular": 0.3,
            "roughness": 0.8,
            "metallic": 0.0,
            "opacity": 0.7
        }
    
    @staticmethod
    def get_borehole_material() -> Dict:
        """钻孔材质"""
        return {
            "color": "#00AAFF",
            "ambient": 0.3,
            "diffuse": 0.7,
            "specular": 0.5,
            "roughness": 0.3,
            "metallic": 0.6,
            "opacity": 0.8
        }


class AbaqusLightingSystem:
    """Abaqus风格光照系统"""
    
    def __init__(self, plotter):
        self.plotter = plotter
        self.lights = []
        
    def setup_professional_lighting(self):
        """设置专业级三点光照"""
        if not self.plotter:
            return
            
        # 清除现有光源
        self.plotter.remove_all_lights()
        
        # 主光源 (Key Light) - 模拟太阳光
        key_light = pv.Light(
            position=(20, 20, 30),
            focal_point=(0, 0, 0),
            color='white',
            intensity=1.0,
            light_type='scene light'
        )
        key_light.positional = True
        key_light.cone_angle = 60
        key_light.attenuation_values = (1, 0.05, 0.01)
        self.plotter.add_light(key_light)
        self.lights.append(("key", key_light))
        
        # 补光 (Fill Light) - 软化阴影
        fill_light = pv.Light(
            position=(-15, 10, 20),
            focal_point=(0, 0, 0),
            color='#F0F8FF',  # 微蓝色
            intensity=0.4,
            light_type='scene light'
        )
        fill_light.positional = True
        fill_light.cone_angle = 90
        self.plotter.add_light(fill_light)
        self.lights.append(("fill", fill_light))
        
        # 背景光 (Rim Light) - 增强轮廓
        rim_light = pv.Light(
            position=(5, -20, 15),
            focal_point=(0, 0, 0),
            color='#FFF8DC',  # 微黄色
            intensity=0.3,
            light_type='scene light'
        )
        rim_light.positional = True
        self.plotter.add_light(rim_light)
        self.lights.append(("rim", rim_light))
        
        # 环境光 (Ambient Light)
        ambient_light = pv.Light(
            color='white',
            intensity=0.2,
            light_type='headlight'
        )
        self.plotter.add_light(ambient_light)
        self.lights.append(("ambient", ambient_light))
    
    def update_lighting_for_view(self, view_direction: str):
        """根据视图方向调整光照"""
        if not self.lights:
            return
            
        # 获取当前摄像机位置
        camera_pos = self.plotter.camera_position[0]
        
        # 调整主光源位置跟随摄像机
        for light_type, light in self.lights:
            if light_type == "key":
                # 主光源在摄像机右上方
                offset = np.array([5, 5, 10])
                new_pos = np.array(camera_pos) + offset
                light.position = new_pos


class EnhancedGeologicalRenderer:
    """增强地质渲染器"""
    
    def __init__(self, plotter):
        self.plotter = plotter
        self.lighting_system = AbaqusLightingSystem(plotter)
        self.materials = GeologicalMaterials()
        
        self.setup_renderer_settings()
        self.lighting_system.setup_professional_lighting()
    
    def setup_renderer_settings(self):
        """设置渲染器参数"""
        if not self.plotter:
            return
            
        # 启用高级渲染特性
        self.plotter.enable_anti_aliasing('msaa')  # 多重采样抗锯齿
        self.plotter.enable_shadows()              # 阴影
        
        # 设置背景渐变 - Abaqus风格
        self.setup_abaqus_background()
        
        # 启用深度测试和混合
        if hasattr(self.plotter.renderer, 'SetUseDepthPeeling'):
            self.plotter.renderer.SetUseDepthPeeling(True)
            self.plotter.renderer.SetMaximumNumberOfPeels(8)
            self.plotter.renderer.SetOcclusionRatio(0.1)
    
    def setup_abaqus_background(self):
        """设置Abaqus风格背景"""
        # 创建从深灰到浅灰的渐变背景
        self.plotter.set_background('#1a1a1a', top='#2d2d2d')
        
        # 可选：添加网格背景纹理
        # self.add_grid_background()
    
    def add_grid_background(self):
        """添加网格背景"""
        # 创建细网格作为背景参考
        grid = pv.StructuredGrid()
        
        # 定义网格范围
        x = np.linspace(-500, 500, 21)
        y = np.linspace(-500, 500, 21)
        z = np.array([-200])
        
        grid.dimensions = (len(x), len(y), len(z))
        
        # 创建网格点
        xx, yy, zz = np.meshgrid(x, y, z, indexing='ij')
        grid.points = np.column_stack([xx.ravel(), yy.ravel(), zz.ravel()])
        
        # 添加到场景
        self.plotter.add_mesh(
            grid,
            style='wireframe',
            color='gray',
            opacity=0.1,
            line_width=0.5
        )
    
    def render_geological_surface(self, surface, formation_name: str, **kwargs):
        """渲染地质面"""
        if not self.plotter or surface is None:
            return None
            
        # 获取材质参数
        material = self.materials.get_soil_material(formation_name)
        
        # 合并用户参数和材质参数
        render_params = {
            'color': material['color'],
            'opacity': material['opacity'],
            'ambient': material['ambient'],
            'diffuse': material['diffuse'],
            'specular': material['specular'],
            'specular_power': int((1 - material['roughness']) * 100),
            'metallic': material['metallic'],
            'roughness': material['roughness'],
            'show_edges': kwargs.get('show_edges', False),
            'edge_color': 'black',
            'line_width': 1,
            'smooth_shading': True,
            'pbr': True,  # 基于物理的渲染
            'interpolate_before_map': True
        }
        
        # 应用用户覆盖参数
        render_params.update(kwargs)
        
        # 添加网格到场景
        mesh_actor = self.plotter.add_mesh(surface, **render_params)
        
        return mesh_actor
    
    def render_borehole_cylinder(self, center: Tuple[float, float, float], 
                               radius: float, height: float, 
                               formation_name: str = None):
        """渲染钻孔圆柱体"""
        if not self.plotter:
            return None
            
        # 创建圆柱体
        cylinder = pv.Cylinder(
            center=center,
            direction=(0, 0, 1),
            radius=radius,
            height=height,
            resolution=20
        )
        
        # 获取材质
        if formation_name:
            material = self.materials.get_soil_material(formation_name)
        else:
            material = self.materials.get_borehole_material()
        
        # 渲染参数
        render_params = {
            'color': material['color'],
            'opacity': material['opacity'],
            'ambient': material['ambient'],
            'diffuse': material['diffuse'],
            'specular': material['specular'],
            'show_edges': True,
            'edge_color': 'black',
            'line_width': 1,
            'smooth_shading': True,
            'pbr': True
        }
        
        return self.plotter.add_mesh(cylinder, **render_params)
    
    def render_fault_plane(self, fault_points: np.ndarray, fault_name: str):
        """渲染断层面"""
        if not self.plotter or len(fault_points) < 3:
            return None
            
        # 创建断层面网格
        try:
            # 使用Delaunay三角化创建面
            cloud = pv.PolyData(fault_points)
            fault_surface = cloud.delaunay_2d()
            
            # 获取断层材质
            material = self.materials.get_fault_material()
            
            # 渲染参数
            render_params = {
                'color': material['color'],
                'opacity': material['opacity'],
                'ambient': material['ambient'],
                'diffuse': material['diffuse'],
                'specular': material['specular'],
                'show_edges': True,
                'edge_color': 'darkred',
                'line_width': 2,
                'smooth_shading': True,
                'pbr': True
            }
            
            return self.plotter.add_mesh(fault_surface, **render_params)
            
        except Exception as e:
            print(f"渲染断层面失败: {e}")
            return None
    
    def add_professional_axes(self):
        """添加专业坐标轴"""
        if not self.plotter:
            return
            
        # 移除默认坐标轴
        self.plotter.remove_bounds_axes()
        
        # 添加自定义坐标轴
        axes = pv.Axes(
            show_actor=True,
            actor_scale=2.0,
            line_width=4
        )
        
        self.plotter.add_actor(axes)
        
        # 添加坐标轴标签
        self.plotter.add_text(
            "X (East)", 
            position=(0.85, 0.05), 
            font_size=12, 
            color='red'
        )
        self.plotter.add_text(
            "Y (North)", 
            position=(0.05, 0.85), 
            font_size=12, 
            color='green'
        )
        self.plotter.add_text(
            "Z (Up)", 
            position=(0.05, 0.05), 
            font_size=12, 
            color='blue'
        )
    
    def create_section_plane(self, origin: Tuple[float, float, float],
                           normal: Tuple[float, float, float],
                           size: Tuple[float, float] = (500, 300)):
        """创建剖面切割平面"""
        if not self.plotter:
            return None
            
        # 创建切面
        plane = pv.Plane(
            center=origin,
            direction=normal,
            size=size
        )
        
        # 剖面材质
        render_params = {
            'color': '#FFD700',  # 金色
            'opacity': 0.3,
            'ambient': 0.4,
            'diffuse': 0.6,
            'specular': 0.8,
            'show_edges': True,
            'edge_color': '#FF8C00',  # 深橙色
            'line_width': 3,
            'smooth_shading': True
        }
        
        # 添加到场景
        plane_actor = self.plotter.add_mesh(plane, **render_params)
        
        return plane, plane_actor
    
    def apply_post_processing_effects(self):
        """应用后处理效果"""
        if not self.plotter:
            return
            
        # 启用屏幕空间环境遮蔽 (SSAO)
        if hasattr(self.plotter.renderer, 'SetUseSSAO'):
            self.plotter.renderer.SetUseSSAO(True)
        
        # 启用FXAA抗锯齿
        if hasattr(self.plotter.renderer, 'SetUseFXAA'):
            self.plotter.renderer.SetUseFXAA(True)
    
    def create_material_legend(self, formations: List[str]):
        """创建材质图例"""
        if not self.plotter or not MATPLOTLIB_AVAILABLE:
            return
            
        # 创建图例
        legend_data = []
        for formation in formations:
            material = self.materials.get_soil_material(formation)
            legend_data.append((formation, material['color']))
        
        # 创建图例文本
        legend_text = "地层图例:\n"
        for i, (name, color) in enumerate(legend_data):
            legend_text += f"■ {name}\n"
        
        # 添加图例到视口
        self.plotter.add_text(
            legend_text,
            position=(0.02, 0.98),
            font_size=10,
            color='white',
            shadow=True,
            viewport=True
        )


def create_demo_geological_scene(plotter):
    """创建演示地质场景"""
    if not PYVISTA_AVAILABLE:
        return
        
    # 创建渲染器
    renderer = EnhancedGeologicalRenderer(plotter)
    
    # 创建示例地质体
    # 1. 基岩层
    bedrock = pv.Box(bounds=[-200, 200, -200, 200, -200, -150])
    renderer.render_geological_surface(bedrock, "基岩", show_edges=True)
    
    # 2. 风化岩层
    weathered_rock = pv.Box(bounds=[-150, 150, -150, 150, -150, -100])
    renderer.render_geological_surface(weathered_rock, "中风化岩", show_edges=True)
    
    # 3. 砂层
    sand_layer = pv.Box(bounds=[-100, 100, -100, 100, -100, -50])
    renderer.render_geological_surface(sand_layer, "中砂", show_edges=True)
    
    # 4. 粘土层
    clay_layer = pv.Box(bounds=[-80, 80, -80, 80, -50, -20])
    renderer.render_geological_surface(clay_layer, "粘土", show_edges=True)
    
    # 5. 填土层
    fill_layer = pv.Box(bounds=[-60, 60, -60, 60, -20, 0])
    renderer.render_geological_surface(fill_layer, "填土", show_edges=True)
    
    # 添加钻孔
    borehole_positions = [
        (0, 0, -100), (50, 50, -100), (-50, 50, -100),
        (50, -50, -100), (-50, -50, -100)
    ]
    
    for pos in borehole_positions:
        renderer.render_borehole_cylinder(pos, 3, 200)
    
    # 添加断层面
    fault_points = np.array([
        [100, -100, -200],
        [100, 100, -200],
        [-100, 100, 0],
        [-100, -100, 0]
    ])
    renderer.render_fault_plane(fault_points, "F1_主断层")
    
    # 添加专业坐标轴
    renderer.add_professional_axes()
    
    # 创建剖面
    renderer.create_section_plane((0, 0, -100), (1, 0, 0))
    
    # 应用后处理效果
    renderer.apply_post_processing_effects()
    
    # 创建材质图例
    formations = ["填土", "粘土", "中砂", "中风化岩", "基岩"]
    renderer.create_material_legend(formations)
    
    return renderer


if __name__ == "__main__":
    """测试渲染效果"""
    if PYVISTA_AVAILABLE:
        plotter = pv.Plotter()
        renderer = create_demo_geological_scene(plotter)
        plotter.show()
    else:
        print("PyVista not available. Cannot run 3D demo.")