#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PyVista炫酷显示效果简化演示
直接展示各种酷炫的3D可视化效果
"""

import numpy as np
import pyvista as pv

def create_sample_mesh():
    """创建示例网格数据"""
    # 创建复杂的几何体 - 使用更简单的方法
    sphere = pv.Sphere(radius=5, center=(0, 0, 0))
    
    # 添加一些标量数据用于颜色映射
    n_points = sphere.n_points
    sphere.point_data['elevation'] = sphere.points[:, 2]
    sphere.point_data['distance'] = np.linalg.norm(sphere.points, axis=1)
    sphere.point_data['random'] = np.random.random(n_points)
    
    return sphere

def demo_all_cool_effects():
    """演示所有炫酷效果"""
    print("=== PyVista炫酷显示效果演示 ===")
    
    mesh = create_sample_mesh()
    
    # 创建多子图展示不同效果
    plotter = pv.Plotter(shape=(3, 3), window_size=(1800, 1400))
    
    # 1. 玻璃效果
    plotter.subplot(0, 0)
    plotter.add_mesh(mesh, color='cyan', opacity=0.3, 
                    specular=1.0, specular_power=100,
                    ambient=0.1, diffuse=0.1)
    plotter.add_text("玻璃效果", font_size=14, color='white')
    
    # 2. 水晶效果 (PBR)
    plotter.subplot(0, 1)
    plotter.add_mesh(mesh, color='purple', opacity=0.8,
                    metallic=0.9, roughness=0.1, pbr=True)
    plotter.add_text("水晶效果", font_size=14, color='white')
    
    # 3. 金属效果
    plotter.subplot(0, 2)
    plotter.add_mesh(mesh, color='gold', metallic=0.9, roughness=0.2, pbr=True)
    plotter.add_text("金属效果", font_size=14, color='white')
    
    # 4. 发光效果
    plotter.subplot(1, 0)
    plotter.add_mesh(mesh, color='lime', ambient=0.8, diffuse=0.2, 
                    specular=1.0, specular_power=100)
    plotter.add_text("发光效果", font_size=14, color='white')
    
    # 5. X射线效果
    plotter.subplot(1, 1)
    plotter.add_mesh(mesh, color='white', opacity=0.1,
                    show_edges=True, edge_color='lime', line_width=2)
    plotter.add_text("X射线效果", font_size=14, color='white')
    
    # 6. 热成像效果
    plotter.subplot(1, 2)
    plotter.add_mesh(mesh, scalars='elevation', cmap='hot',
                    show_scalar_bar=True, opacity=0.9)
    plotter.add_text("热成像效果", font_size=14, color='white')
    
    # 7. 霓虹效果
    plotter.subplot(2, 0)
    # 主体
    plotter.add_mesh(mesh, color='darkblue', opacity=0.8)
    # 发光边缘 - 使用线框模式避免edge提取问题
    plotter.add_mesh(mesh, style='wireframe', color='cyan', line_width=6, opacity=0.8)
    plotter.add_mesh(mesh, style='wireframe', color='white', line_width=2, opacity=1.0)
    plotter.add_text("霓虹效果", font_size=14, color='white')
    
    # 8. 彩虹玻璃
    plotter.subplot(2, 1)
    plotter.add_mesh(mesh, scalars='distance', opacity=0.7,
                    cmap='rainbow', specular=0.8, specular_power=50)
    plotter.add_text("彩虹玻璃", font_size=14, color='white')
    
    # 9. 线框发光
    plotter.subplot(2, 2)
    plotter.add_mesh(mesh, color='black', opacity=0.1)
    plotter.add_mesh(mesh, style='wireframe', color='cyan', line_width=3, opacity=0.8)
    plotter.add_mesh(mesh, style='wireframe', color='white', line_width=1, opacity=1.0)
    plotter.add_text("线框发光", font_size=14, color='white')
    
    # 设置全局背景和显示
    plotter.set_background('black')
    plotter.enable_anti_aliasing()
    
    # 添加总标题
    plotter.add_text("DeepCAD PyVista炫酷显示效果大全", 
                    position='upper_left', font_size=20, color='cyan')
    
    plotter.show()

def demo_geotechnical_visualization():
    """演示岩土工程专用可视化"""
    print("=== 岩土工程炫酷可视化演示 ===")
    
    # 创建基坑几何
    excavation = pv.Cube(center=(0, 0, -5), x_length=20, y_length=20, z_length=10)
    soil_domain = pv.Cube(center=(0, 0, -15), x_length=60, y_length=60, z_length=30)
    
    # 创建土体（简化版本，避免布尔运算错误）
    soil = soil_domain.copy()
    soil.cell_data['MaterialID'] = np.full(soil.n_cells, 6)  # 土体材料
    
    # 创建支护结构
    wall1 = pv.Cube(center=(25, 0, -5), x_length=2, y_length=20, z_length=10)
    wall2 = pv.Cube(center=(-25, 0, -5), x_length=2, y_length=20, z_length=10)
    wall1.cell_data['MaterialID'] = np.full(wall1.n_cells, 12)  # 混凝土材料
    wall2.cell_data['MaterialID'] = np.full(wall2.n_cells, 12)
    
    plotter = pv.Plotter(window_size=(1400, 1000))
    
    # 土体 - 热成像效果显示应力分布
    stress_data = np.random.random(soil.n_points) * 1000
    soil.point_data['Stress'] = stress_data
    plotter.add_mesh(soil, scalars='Stress', cmap='hot', opacity=0.8,
                    show_scalar_bar=True, scalar_bar_args={'title': '应力 (kPa)'})
    
    # 支护结构 - 水晶效果
    plotter.add_mesh(wall1, color='gray', metallic=0.9, roughness=0.1, pbr=True, opacity=0.9)
    plotter.add_mesh(wall2, color='gray', metallic=0.9, roughness=0.1, pbr=True, opacity=0.9)
    
    # 基坑开挖区域 - 玻璃效果显示
    plotter.add_mesh(excavation, color='cyan', opacity=0.2, 
                    specular=1.0, specular_power=100,
                    show_edges=True, edge_color='blue', line_width=2)
    
    # 添加科幻环境效果
    plotter.set_background('black')
    
    # 添加网格地面
    grid = pv.StructuredGrid()
    x = np.arange(-50, 51, 5)
    y = np.arange(-50, 51, 5)
    z = np.array([-30])
    X, Y, Z = np.meshgrid(x, y, z)
    grid.points = np.column_stack([X.ravel(), Y.ravel(), Z.ravel()])
    grid.dimensions = [len(x), len(y), len(z)]
    
    plotter.add_mesh(grid, style='wireframe', color='darkgreen',
                   opacity=0.3, line_width=1)
    
    # 添加粒子效果
    n_particles = 200
    particles_pos = np.random.uniform([-30, -30, -25], [30, 30, 5], size=(n_particles, 3))
    particles = pv.PolyData(particles_pos)
    particles.point_data['size'] = np.random.random(n_particles) * 0.3
    spheres = particles.glyph(geom=pv.Sphere(radius=0.1), scale='size')
    plotter.add_mesh(spheres, color='yellow', opacity=0.6, ambient=1.0)
    
    # 添加标题和坐标轴
    plotter.add_text("DeepCAD岩土工程炫酷可视化", font_size=18, color='cyan')
    plotter.show_axes()
    
    plotter.show()

def demo_volume_rendering():
    """演示体积渲染效果"""
    print("=== 体积渲染效果演示 ===")
    
    # 创建体数据
    vol = pv.ImageData(dimensions=(50, 50, 50))
    vol.origin = (-25, -25, -25)
    vol.spacing = (1, 1, 1)
    
    # 生成体数据 - 3D波形
    x, y, z = np.meshgrid(np.linspace(-5, 5, 50),
                          np.linspace(-5, 5, 50),
                          np.linspace(-5, 5, 50))
    vol_data = np.sin(x) * np.cos(y) * np.sin(z) + np.random.random((50, 50, 50)) * 0.3
    vol.point_data['values'] = vol_data.flatten()
    
    plotter = pv.Plotter(window_size=(1200, 800))
    
    # 体积渲染
    plotter.add_volume(vol, cmap='viridis', opacity='sigmoid')
    
    plotter.set_background('black')
    plotter.add_text("体积渲染效果", font_size=18, color='cyan')
    
    plotter.show()

if __name__ == "__main__":
    print("PyVista炫酷显示效果演示")
    print("=" * 50)
    
    try:
        # 演示1: 所有基本炫酷效果
        demo_all_cool_effects()
        
        # 演示2: 岩土工程专用可视化
        demo_geotechnical_visualization()
        
        # 演示3: 体积渲染
        demo_volume_rendering()
        
        print("\n🎉 所有炫酷效果演示完成！")
        
    except Exception as e:
        print(f"演示过程中出现错误: {e}")
        import traceback
        traceback.print_exc()