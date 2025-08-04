#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
岩土工程半透明可视化演示
按照不同土层设置不同颜色和透明度
"""

import numpy as np
import pyvista as pv

def create_layered_soil_model():
    """创建分层土体模型"""
    # 土层参数设置
    layers = [
        {'name': 'Fill', 'z_range': (0, -3), 'color': 'brown', 'opacity': 0.4, 'material_id': 1},
        {'name': 'Silty Clay', 'z_range': (-3, -8), 'color': 'orange', 'opacity': 0.5, 'material_id': 2},
        {'name': 'Muddy Soil', 'z_range': (-8, -15), 'color': 'gray', 'opacity': 0.3, 'material_id': 3},
        {'name': 'Clay', 'z_range': (-15, -25), 'color': 'red', 'opacity': 0.6, 'material_id': 4},
        {'name': 'Sand', 'z_range': (-25, -35), 'color': 'yellow', 'opacity': 0.7, 'material_id': 5},
        {'name': 'Bedrock', 'z_range': (-35, -50), 'color': 'darkblue', 'opacity': 0.8, 'material_id': 6}
    ]
    
    soil_meshes = []
    
    for layer in layers:
        z_top, z_bottom = layer['z_range']
        z_center = (z_top + z_bottom) / 2
        z_height = z_top - z_bottom
        
        # 创建每层土体
        layer_mesh = pv.Cube(
            center=(0, 0, z_center),
            x_length=60, 
            y_length=60, 
            z_length=z_height
        )
        
        # 添加材料属性
        layer_mesh.cell_data['MaterialID'] = np.full(layer_mesh.n_cells, layer['material_id'])
        layer_mesh.cell_data['LayerName'] = [layer['name']] * layer_mesh.n_cells
        
        # 添加一些随机属性模拟工程特性
        layer_mesh.point_data['Strength'] = np.random.uniform(10, 100, layer_mesh.n_points)
        layer_mesh.point_data['Water_Content'] = np.random.uniform(0.15, 0.45, layer_mesh.n_points)
        
        soil_meshes.append((layer_mesh, layer))
    
    return soil_meshes

def create_excavation_and_support():
    """创建基坑开挖和支护结构"""
    # 基坑开挖区域
    excavation = pv.Cube(center=(0, 0, -5), x_length=20, y_length=20, z_length=10)
    
    # 支护桩
    piles = []
    pile_positions = [
        (10, 10, -10), (10, -10, -10), (-10, 10, -10), (-10, -10, -10),
        (10, 0, -10), (-10, 0, -10), (0, 10, -10), (0, -10, -10)
    ]
    
    for pos in pile_positions:
        pile = pv.Cylinder(center=pos, direction=(0, 0, 1), radius=0.5, height=20)
        pile.cell_data['MaterialID'] = np.full(pile.n_cells, 10)  # 混凝土桩
        piles.append(pile)
    
    # 支撑梁
    beam1 = pv.Cube(center=(0, 0, -2), x_length=18, y_length=1, z_length=0.8)
    beam2 = pv.Cube(center=(0, 0, -8), x_length=18, y_length=1, z_length=0.8)
    beam1.cell_data['MaterialID'] = np.full(beam1.n_cells, 11)  # 钢支撑
    beam2.cell_data['MaterialID'] = np.full(beam2.n_cells, 11)
    
    return excavation, piles, [beam1, beam2]

def demo_transparent_layers():
    """演示半透明分层土体可视化"""
    print("=== 岩土工程半透明分层可视化演示 ===")
    
    # 创建分层土体模型
    soil_layers = create_layered_soil_model()
    excavation, piles, beams = create_excavation_and_support()
    
    plotter = pv.Plotter(window_size=(1600, 1200))
    
    # 添加每个土层，使用不同的颜色和透明度
    for layer_mesh, layer_info in soil_layers:
        plotter.add_mesh(
            layer_mesh,
            color=layer_info['color'],
            opacity=layer_info['opacity'],
            show_edges=True,
            edge_color='white',
            line_width=0.5,
            label=layer_info['name']
        )
    
    # 添加基坑开挖区域 - 玻璃效果
    plotter.add_mesh(
        excavation,
        color='cyan',
        opacity=0.15,
        specular=1.0,
        specular_power=100,
        show_edges=True,
        edge_color='blue',
        line_width=2,
        label='Excavation'
    )
    
    # 添加支护桩 - 金属效果
    for pile in piles:
        plotter.add_mesh(
            pile,
            color='gray',
            metallic=0.8,
            roughness=0.2,
            pbr=True,
            opacity=0.9
        )
    
    # 添加支撑梁 - 钢材效果
    for beam in beams:
        plotter.add_mesh(
            beam,
            color='silver',
            metallic=0.9,
            roughness=0.1,
            pbr=True,
            opacity=0.95
        )
    
    # 设置相机角度和环境
    plotter.set_background('black')
    plotter.enable_anti_aliasing()
    
    # 添加标题和图例
    plotter.add_text("Geotechnical Transparent Layer Visualization", 
                    position='upper_left', font_size=18, color='white')
    
    # 显示坐标轴
    plotter.show_axes()
    
    # 添加网格地面
    grid = pv.StructuredGrid()
    x = np.arange(-40, 41, 5)
    y = np.arange(-40, 41, 5)
    z = np.array([-55])
    X, Y, Z = np.meshgrid(x, y, z)
    grid.points = np.column_stack([X.ravel(), Y.ravel(), Z.ravel()])
    grid.dimensions = [len(x), len(y), len(z)]
    
    plotter.add_mesh(grid, style='wireframe', color='darkgreen',
                   opacity=0.3, line_width=1)
    
    plotter.show()

def demo_material_properties():
    """演示材料属性可视化"""
    print("=== 材料属性半透明可视化演示 ===")
    
    soil_layers = create_layered_soil_model()
    
    plotter = pv.Plotter(shape=(1, 2), window_size=(1800, 900))
    
    # 左侧：按强度显示
    plotter.subplot(0, 0)
    for layer_mesh, layer_info in soil_layers:
        plotter.add_mesh(
            layer_mesh,
            scalars='Strength',
            cmap='viridis',
            opacity=0.6,
            show_scalar_bar=True,
            scalar_bar_args={'title': 'Strength (kPa)'}
        )
    plotter.add_text("Colored by Soil Strength", font_size=16, color='white')
    
    # 右侧：按含水率显示
    plotter.subplot(0, 1)
    for layer_mesh, layer_info in soil_layers:
        plotter.add_mesh(
            layer_mesh,
            scalars='Water_Content',
            cmap='Blues',
            opacity=0.7,
            show_scalar_bar=True,
            scalar_bar_args={'title': 'Water Content'}
        )
    plotter.add_text("Colored by Water Content", font_size=16, color='white')
    
    plotter.set_background('black')
    plotter.show()

def demo_construction_sequence():
    """演示施工过程半透明可视化"""
    print("=== 施工过程半透明可视化演示 ===")
    
    # 创建不同施工阶段的模型
    soil_layers = create_layered_soil_model()
    excavation, piles, beams = create_excavation_and_support()
    
    plotter = pv.Plotter(shape=(2, 2), window_size=(1600, 1200))
    
    # 阶段1：原始土层
    plotter.subplot(0, 0)
    for layer_mesh, layer_info in soil_layers:
        plotter.add_mesh(layer_mesh, color=layer_info['color'], 
                        opacity=layer_info['opacity'] * 0.8)
    plotter.add_text("Stage 1: Original Layers", font_size=14, color='white')
    
    # 阶段2：安装支护桩
    plotter.subplot(0, 1)
    for layer_mesh, layer_info in soil_layers:
        plotter.add_mesh(layer_mesh, color=layer_info['color'], 
                        opacity=layer_info['opacity'] * 0.6)
    for pile in piles:
        plotter.add_mesh(pile, color='gray', metallic=0.8, pbr=True, opacity=0.9)
    plotter.add_text("Stage 2: Install Support Piles", font_size=14, color='white')
    
    # 阶段3：第一层开挖
    plotter.subplot(1, 0)
    for i, (layer_mesh, layer_info) in enumerate(soil_layers):
        if i == 0:  # 第一层土被挖掉，更透明
            plotter.add_mesh(layer_mesh, color=layer_info['color'], opacity=0.1)
        else:
            plotter.add_mesh(layer_mesh, color=layer_info['color'], 
                            opacity=layer_info['opacity'] * 0.7)
    for pile in piles:
        plotter.add_mesh(pile, color='gray', metallic=0.8, pbr=True, opacity=0.9)
    plotter.add_mesh(beams[0], color='silver', metallic=0.9, pbr=True, opacity=0.95)
    plotter.add_text("Stage 3: First Layer Excavation", font_size=14, color='white')
    
    # 阶段4：完整开挖
    plotter.subplot(1, 1)
    for i, (layer_mesh, layer_info) in enumerate(soil_layers):
        if i <= 1:  # 前两层被挖掉
            plotter.add_mesh(layer_mesh, color=layer_info['color'], opacity=0.05)
        else:
            plotter.add_mesh(layer_mesh, color=layer_info['color'], 
                            opacity=layer_info['opacity'] * 0.8)
    
    plotter.add_mesh(excavation, color='cyan', opacity=0.1, 
                    show_edges=True, edge_color='blue', line_width=2)
    
    for pile in piles:
        plotter.add_mesh(pile, color='gray', metallic=0.8, pbr=True, opacity=0.9)
    for beam in beams:
        plotter.add_mesh(beam, color='silver', metallic=0.9, pbr=True, opacity=0.95)
    
    plotter.add_text("Stage 4: Complete Excavation", font_size=14, color='white')
    
    plotter.set_background('black')
    plotter.show()

if __name__ == "__main__":
    print("岩土工程半透明可视化演示")
    print("=" * 50)
    
    try:
        # 演示1: 基本半透明分层
        demo_transparent_layers()
        
        # 演示2: 材料属性可视化
        demo_material_properties()
        
        # 演示3: 施工过程可视化
        demo_construction_sequence()
        
        print("\nAll transparent effects demonstration completed!")
        
    except Exception as e:
        print(f"演示过程中出现错误: {e}")
        import traceback
        traceback.print_exc()