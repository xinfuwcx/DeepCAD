#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PyVista炫酷显示效果演示
展示各种酷炫的3D可视化效果
"""

import numpy as np
import pyvista as pv
from pathlib import Path

def create_sample_mesh():
    """创建示例网格数据"""
    # 创建复杂的几何体
    sphere = pv.Sphere(radius=5, center=(0, 0, 0))
    cube = pv.Cube(center=(0, 0, -3), x_length=15, y_length=15, z_length=6)
    
    # 布尔运算创建复杂形状
    mesh = sphere.boolean_union(cube).triangulate()
    
    # 添加一些标量数据用于颜色映射
    n_points = mesh.n_points
    mesh.point_data['elevation'] = mesh.points[:, 2]
    mesh.point_data['distance'] = np.linalg.norm(mesh.points, axis=1)
    mesh.point_data['random'] = np.random.random(n_points)
    
    # 添加一些向量数据
    mesh.point_data['vectors'] = np.random.random((n_points, 3)) - 0.5
    
    return mesh

def demo_basic_rendering_modes():
    """演示基本渲染模式"""
    print("=== 基本渲染模式演示 ===")
    
    mesh = create_sample_mesh()
    
    # 创建多子图
    plotter = pv.Plotter(shape=(2, 3), window_size=(1800, 1200))
    
    # 1. 表面渲染 (默认)
    plotter.subplot(0, 0)
    plotter.add_mesh(mesh, color='lightblue', show_edges=True)
    plotter.add_text("表面渲染", font_size=16)
    
    # 2. 线框模式
    plotter.subplot(0, 1)
    plotter.add_mesh(mesh, style='wireframe', color='red', line_width=2)
    plotter.add_text("线框模式", font_size=16)
    
    # 3. 点云模式
    plotter.subplot(0, 2)
    plotter.add_mesh(mesh, style='points', point_size=8, color='orange')
    plotter.add_text("点云模式", font_size=16)
    
    # 4. 半透明效果
    plotter.subplot(1, 0)
    plotter.add_mesh(mesh, color='cyan', opacity=0.6, show_edges=True, 
                    edge_color='blue', line_width=1)
    plotter.add_text("半透明效果", font_size=16)
    
    # 5. 金属质感
    plotter.subplot(1, 1)
    plotter.add_mesh(mesh, color='gold', metallic=0.8, roughness=0.2, 
                    pbr=True, show_edges=False)
    plotter.add_text("金属质感(PBR)", font_size=16)
    
    # 6. 发光效果
    plotter.subplot(1, 2)
    plotter.add_mesh(mesh, color='lime', ambient=0.8, diffuse=0.2, 
                    specular=1.0, specular_power=100)
    plotter.add_text("发光效果", font_size=16)
    
    # 设置背景
    plotter.set_background('black')
    plotter.show()

def demo_color_mapping():
    """演示颜色映射效果"""
    print("=== 颜色映射效果演示 ===")
    
    mesh = create_sample_mesh()
    
    plotter = pv.Plotter(shape=(2, 2), window_size=(1600, 1200))
    
    # 1. 高度颜色映射
    plotter.subplot(0, 0)
    plotter.add_mesh(mesh, scalars='elevation', cmap='viridis', 
                    show_scalar_bar=True, scalar_bar_args={'title': '高度'})
    plotter.add_text("高度颜色映射", font_size=16)
    
    # 2. 距离颜色映射
    plotter.subplot(0, 1)
    plotter.add_mesh(mesh, scalars='distance', cmap='plasma', 
                    show_scalar_bar=True, scalar_bar_args={'title': '距离'})
    plotter.add_text("距离颜色映射", font_size=16)
    
    # 3. 随机颜色映射
    plotter.subplot(1, 0)
    plotter.add_mesh(mesh, scalars='random', cmap='coolwarm', 
                    show_scalar_bar=True, scalar_bar_args={'title': '随机值'})
    plotter.add_text("随机颜色映射", font_size=16)
    
    # 4. 自定义颜色映射
    plotter.subplot(1, 1)
    plotter.add_mesh(mesh, scalars='elevation', cmap='rainbow', 
                    clim=[-8, 8], show_scalar_bar=True,
                    scalar_bar_args={'title': '自定义范围'})
    plotter.add_text("自定义颜色范围", font_size=16)
    
    plotter.set_background('white')
    plotter.show()

def demo_lighting_effects():
    """演示光照效果"""
    print("=== 光照效果演示 ===")
    
    mesh = create_sample_mesh()
    
    plotter = pv.Plotter(shape=(2, 2), window_size=(1600, 1200))
    
    # 1. 默认光照
    plotter.subplot(0, 0)
    plotter.add_mesh(mesh, color='lightblue')
    plotter.add_text("默认光照", font_size=16)
    
    # 2. 强环境光
    plotter.subplot(0, 1)
    plotter.add_mesh(mesh, color='orange', ambient=0.8, diffuse=0.3)
    plotter.add_text("强环境光", font_size=16)
    
    # 3. 强镜面反射
    plotter.subplot(1, 0)
    plotter.add_mesh(mesh, color='red', specular=1.0, specular_power=50)
    plotter.add_text("强镜面反射", font_size=16)
    
    # 4. 自定义光源
    plotter.subplot(1, 1)
    plotter.add_mesh(mesh, color='purple')
    # 添加多个光源
    light1 = pv.Light(position=(10, 10, 10), color='white', intensity=0.8)
    light2 = pv.Light(position=(-10, -10, 10), color='blue', intensity=0.5)
    light3 = pv.Light(position=(0, 10, -10), color='red', intensity=0.3)
    plotter.add_light(light1)
    plotter.add_light(light2) 
    plotter.add_light(light3)
    plotter.add_text("多色光源", font_size=16)
    
    plotter.set_background('black')
    plotter.show()

def demo_advanced_effects():
    """演示高级特效"""
    print("=== 高级特效演示 ===")
    
    mesh = create_sample_mesh()
    
    plotter = pv.Plotter(shape=(2, 2), window_size=(1600, 1200))
    
    # 1. 体积渲染效果
    plotter.subplot(0, 0)
    # 创建体数据
    vol = pv.ImageData(dimensions=(50, 50, 50))
    vol.origin = mesh.bounds[::2]
    vol.spacing = [(mesh.bounds[1] - mesh.bounds[0]) / 49,
                   (mesh.bounds[3] - mesh.bounds[2]) / 49,
                   (mesh.bounds[5] - mesh.bounds[4]) / 49]
    
    # 生成体数据
    x, y, z = np.meshgrid(np.linspace(*mesh.bounds[0:2], 50),
                          np.linspace(*mesh.bounds[2:4], 50),
                          np.linspace(*mesh.bounds[4:6], 50))
    vol_data = np.sin(x/5) * np.cos(y/5) * np.sin(z/5)
    vol.point_data['values'] = vol_data.flatten()
    
    plotter.add_volume(vol, cmap='viridis', opacity='sigmoid')
    plotter.add_text("体积渲染", font_size=16)
    
    # 2. 轮廓线效果
    plotter.subplot(0, 1)
    contours = mesh.contour(scalars='elevation', isosurfaces=10)
    plotter.add_mesh(contours, line_width=3, color='red')
    plotter.add_mesh(mesh, opacity=0.3, color='lightgray')
    plotter.add_text("等值线轮廓", font_size=16)
    
    # 3. 向量箭头
    plotter.subplot(1, 0)
    # 采样部分点避免太密集
    sample = mesh.extract_points(np.arange(0, mesh.n_points, 20))
    arrows = sample.glyph(orient='vectors', scale='vectors', factor=2)
    plotter.add_mesh(mesh, opacity=0.4, color='lightblue')
    plotter.add_mesh(arrows, color='red')
    plotter.add_text("向量场可视化", font_size=16)
    
    # 4. 切片显示
    plotter.subplot(1, 1)
    slices = mesh.slice_orthogonal(x=0, y=0, z=0)
    plotter.add_mesh(slices, scalars='elevation', cmap='coolwarm')
    plotter.add_text("正交切片", font_size=16)
    
    plotter.set_background('black')
    plotter.show()

def demo_glass_and_crystal_effects():
    """演示玻璃和水晶效果"""
    print("=== 玻璃水晶效果演示 ===")
    
    mesh = create_sample_mesh()
    
    plotter = pv.Plotter(shape=(1, 3), window_size=(1800, 600))
    
    # 1. 玻璃效果
    plotter.subplot(0, 0)
    plotter.add_mesh(mesh, color='cyan', opacity=0.3, 
                    specular=1.0, specular_power=100,
                    ambient=0.1, diffuse=0.1)
    plotter.add_text("玻璃效果", font_size=16)
    
    # 2. 水晶效果
    plotter.subplot(0, 1)
    plotter.add_mesh(mesh, color='purple', opacity=0.8,
                    metallic=0.9, roughness=0.1, pbr=True)
    plotter.add_text("水晶效果(PBR)", font_size=16)
    
    # 3. 彩虹玻璃
    plotter.subplot(0, 2)
    plotter.add_mesh(mesh, scalars='elevation', opacity=0.7,
                    cmap='rainbow', specular=0.8, specular_power=50)
    plotter.add_text("彩虹玻璃", font_size=16)
    
    # 设置环境
    plotter.set_background('black')
    plotter.enable_anti_aliasing()
    plotter.show()

def demo_neon_and_glow_effects():
    """演示霓虹和发光效果"""
    print("=== 霓虹发光效果演示 ===")
    
    mesh = create_sample_mesh()
    
    plotter = pv.Plotter(window_size=(1200, 800))
    
    # 创建多个网格用于叠加发光效果
    # 主体网格
    plotter.add_mesh(mesh, color='darkblue', opacity=0.8)
    
    # 发光轮廓
    edges = mesh.extract_feature_edges()
    plotter.add_mesh(edges, color='cyan', line_width=8, opacity=0.8)
    plotter.add_mesh(edges, color='white', line_width=4, opacity=1.0)
    plotter.add_mesh(edges, color='cyan', line_width=2, opacity=1.0)
    
    # 添加粒子效果
    n_particles = 500
    particles = pv.PolyData(np.random.random((n_particles, 3)) * 20 - 10)
    particles.point_data['size'] = np.random.random(n_particles) * 0.5
    
    spheres = particles.glyph(geom=pv.Sphere(radius=0.1), scale='size')
    plotter.add_mesh(spheres, color='yellow', opacity=0.6, 
                    ambient=1.0, specular=0)
    
    plotter.set_background('black')
    plotter.add_text("霓虹发光效果", font_size=20, color='cyan')
    plotter.show()

def demo_hologram_effect():
    """演示全息投影效果"""
    print("=== 全息投影效果演示 ===")
    
    mesh = create_sample_mesh()
    
    plotter = pv.Plotter(window_size=(1200, 800))
    
    # 主网格 - 半透明蓝色
    plotter.add_mesh(mesh, color='cyan', opacity=0.4,
                    show_edges=True, edge_color='blue', line_width=1)
    
    # 添加扫描线效果
    for i in range(-10, 11, 2):
        plane = pv.Plane(center=(0, 0, i), direction=(0, 0, 1), 
                        i_size=30, j_size=30)
        intersection = mesh.clip_surface(plane)
        if intersection.n_points > 0:
            plotter.add_mesh(intersection, color='lime', line_width=3, 
                           opacity=0.8, ambient=0.8)
    
    # 添加网格线背景
    grid = pv.StructuredGrid()
    x = np.arange(-15, 16, 2)
    y = np.arange(-15, 16, 2)
    z = np.array([-10])
    X, Y, Z = np.meshgrid(x, y, z)
    grid.points = np.column_stack([X.ravel(), Y.ravel(), Z.ravel()])
    grid.dimensions = [len(x), len(y), len(z)]
    
    plotter.add_mesh(grid, style='wireframe', color='darkgreen', 
                    opacity=0.3, line_width=1)
    
    plotter.set_background('black')
    plotter.add_text("全息投影效果", font_size=20, color='cyan')
    plotter.show()

def main():
    """主函数 - 运行所有演示"""
    print("PyVista炫酷视觉效果演示")
    print("=" * 50)
    
    demos = [
        ("基本渲染模式", demo_basic_rendering_modes),
        ("颜色映射效果", demo_color_mapping),
        ("光照效果", demo_lighting_effects),
        ("高级特效", demo_advanced_effects),
        ("玻璃水晶效果", demo_glass_and_crystal_effects),
        ("霓虹发光效果", demo_neon_and_glow_effects),
        ("全息投影效果", demo_hologram_effect)
    ]
    
    print("请选择要演示的效果:")
    for i, (name, _) in enumerate(demos, 1):
        print(f"{i}. {name}")
    print("0. 全部演示")
    
    try:
        choice = input("\n请输入选择 (0-7): ").strip()
        
        if choice == '0':
            for name, demo_func in demos:
                print(f"\n正在演示: {name}")
                demo_func()
        elif choice.isdigit() and 1 <= int(choice) <= len(demos):
            name, demo_func = demos[int(choice) - 1]
            print(f"\n正在演示: {name}")
            demo_func()
        else:
            print("无效选择，运行基本渲染模式演示")
            demo_basic_rendering_modes()
            
    except KeyboardInterrupt:
        print("\n演示已取消")
    except Exception as e:
        print(f"演示过程中出现错误: {e}")
        # 运行基本演示作为备选
        demo_basic_rendering_modes()

if __name__ == "__main__":
    main()