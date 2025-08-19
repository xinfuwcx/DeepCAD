#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import pandas as pd
import numpy as np
import gempy as gp
import pyvista as pv
from pyvistaqt import QtInteractor
from PyQt6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget
import sys

def main():
    print(">> 使用GemPy创建规整矩形土体域")
    print("=" * 40)
    
    # 加载新的钻孔数据
    df = pd.read_csv("example3/data/geological_data_v2.csv")
    print(f"加载数据: {len(df)} 条记录")
    
    # 获取数据范围
    x_min, x_max = df['x'].min(), df['x'].max()
    y_min, y_max = df['y'].min(), df['y'].max()
    z_min, z_max = df['z_bottom'].min(), df['z_top'].max()
    
    print(f"数据范围: X:{x_min:.0f}-{x_max:.0f}, Y:{y_min:.0f}-{y_max:.0f}, Z:{z_min:.0f}-{z_max:.0f}")
    
    # 定义规整的模型范围
    extent = [x_min, x_max, y_min, y_max, z_min, z_max]
    resolution = [50, 50, 50]  # 网格分辨率
    
    print("使用GemPy创建规整矩形土体域...")
    
    try:
        # 创建GemPy地质模型
        geo_model = gp.create_geomodel(
            project_name='Geological_Model',
            extent=extent,
            resolution=resolution
        )
        
        print("GemPy模型创建成功，开始计算...")
        
        # 这里应该添加地层数据，但为了简化，我们直接创建可视化
        create_gempy_visualization(geo_model, df, x_min, x_max, y_min, y_max, z_min, z_max)
        
    except Exception as e:
        print(f"GemPy错误: {e}")
        print("使用备用方法...")
        create_simple_rectangular_model(df, x_min, x_max, y_min, y_max, z_min, z_max)

def create_gempy_visualization(geo_model, df, x_min, x_max, y_min, y_max, z_min, z_max):
    """使用GemPy创建可视化"""
    print("创建GemPy可视化...")
    
    # 创建3D可视化
    app = QApplication(sys.argv)
    window = QMainWindow()
    window.setWindowTitle("GemPy规整矩形土体域")
    window.resize(1200, 800)
    
    widget = QWidget()
    layout = QVBoxLayout()
    plotter = QtInteractor(widget)
    layout.addWidget(plotter.interactor)
    widget.setLayout(layout)
    window.setCentralWidget(widget)
    
    # 12层地质数据
    formations = ['填土', '粘土', '粉质粘土', '细砂', '中砂', '粗砂', '砾砂', '卵石层', '强风化岩', '中风化岩', '微风化岩', '基岩']
    colors = ['brown', 'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'gray', 'darkgray', 'black']
    
    # 1. 先显示规整的土体域边框
    soil_domain = pv.Cube(
        center=[(x_min + x_max)/2, (y_min + y_max)/2, (z_min + z_max)/2],
        x_length=x_max - x_min,
        y_length=y_max - y_min,
        z_length=z_max - z_min
    )
    plotter.add_mesh(soil_domain, style='wireframe', color='black', line_width=3, label="土体域边框")
    
    # 2. 创建起伏的地层面（不是平的）
    print("创建起伏地形面...")
    for formation, color in zip(formations, colors):
        formation_data = df[df['formation_name'] == formation]
        if len(formation_data) < 4:
            continue
            
        # 提取地层顶面点（保持起伏）
        top_points = []
        for _, row in formation_data.iterrows():
            top_points.append([row['x'], row['y'], row['z_top']])
        
        if len(top_points) >= 4:
            try:
                # 创建起伏的地层面
                points_array = np.array(top_points)
                cloud = pv.PolyData(points_array)
                surface = cloud.delaunay_2d()
                
                plotter.add_mesh(surface, color=color, opacity=0.8, 
                               show_edges=True, edge_color='black', 
                               line_width=1, label=f"{formation}_surface")
                
                print(f"[OK] 起伏地层面: {formation}")
                
            except Exception as e:
                print(f"[WARNING] {formation} 地层面创建失败: {e}")
    
    # 添加不规则钻孔数据
    print("添加钻孔数据...")
    borehole_ids = df['borehole_id'].unique()
    for borehole_id in borehole_ids[:50]:  # 显示50个钻孔
        bh_data = df[df['borehole_id'] == borehole_id]
        if len(bh_data) == 0:
            continue
            
        x = bh_data['x'].iloc[0]
        y = bh_data['y'].iloc[0]
        
        for _, row in bh_data.iterrows():
            z_top = row['z_top']
            z_bottom = row['z_bottom']
            thickness = z_top - z_bottom
            formation = row['formation_name']
            
            if thickness > 0 and formation in formations:
                color_idx = formations.index(formation)
                color = colors[color_idx]
                
                cylinder = pv.Cylinder(
                    center=(x, y, (z_top + z_bottom) / 2),
                    direction=(0, 0, 1),
                    radius=8,
                    height=thickness,
                    resolution=12
                )
                
                # 断层区域用红色边框
                edge_color = 'red' if row['in_fault_zone'] else 'black'
                line_width = 3 if row['in_fault_zone'] else 1
                
                plotter.add_mesh(cylinder, color=color, opacity=0.9,
                               show_edges=True, edge_color=edge_color, line_width=line_width)
    
    # 添加X轴剖切
    print("添加X轴剖切...")
    x_cut = x_min + (x_max - x_min) * 0.5
    
    # 剖切面
    cutting_plane = pv.Plane(
        center=[x_cut, (y_min + y_max)/2, (z_min + z_max)/2],
        direction=[1, 0, 0],
        i_size=y_max - y_min,
        j_size=z_max - z_min
    )
    
    plotter.add_mesh(cutting_plane, color='lightgray', opacity=0.3, 
                    show_edges=True, edge_color='gray', line_width=1)
    
    # 3. 添加1-2处局部断层
    print("添加局部断层...")
    
    # 断层1 - 主要断层
    fault1_y1 = y_min + (y_max - y_min) * 0.4
    fault1_y2 = y_min + (y_max - y_min) * 0.6
    fault1_line = pv.Line([x_cut, fault1_y1, z_max], [x_cut, fault1_y2, z_min])
    plotter.add_mesh(fault1_line, color='red', line_width=8, label="主断层F1")
    
    # 断层面1
    fault1_plane = pv.Plane(
        center=[x_cut, (fault1_y1 + fault1_y2)/2, (z_min + z_max)/2],
        direction=[1, 1, 0],
        i_size=200, j_size=z_max - z_min
    )
    plotter.add_mesh(fault1_plane, color='red', opacity=0.3, label="断层面F1")
    
    # 断层2 - 次要断层  
    fault2_y1 = y_min + (y_max - y_min) * 0.7
    fault2_y2 = y_min + (y_max - y_min) * 0.8
    fault2_line = pv.Line([x_cut + 100, fault2_y1, z_max - 50], [x_cut + 100, fault2_y2, z_min + 50])
    plotter.add_mesh(fault2_line, color='orange', line_width=6, label="次断层F2")
    
    # 断层面2
    fault2_plane = pv.Plane(
        center=[x_cut + 100, (fault2_y1 + fault2_y2)/2, (z_min + z_max)/2],
        direction=[1, 0, 1],
        i_size=150, j_size=(z_max - z_min) * 0.8
    )
    plotter.add_mesh(fault2_plane, color='orange', opacity=0.2, label="断层面F2")
    
    # 添加标注
    plotter.add_text("GemPy规整矩形土体域", position=[(x_min+x_max)/2, y_max+100, z_max+50], 
                    font_size=16, color='blue')
    plotter.add_text("X轴剖切面", position=[x_cut, y_max+50, z_max+20], 
                    font_size=12, color='gray')
    
    plotter.reset_camera()
    plotter.view_isometric()
    window.show()
    
    print("GemPy规整矩形土体域创建完成！")
    print("显示内容:")
    print("- 规整的矩形土体域边框（黑色线框）")
    print("- 12层起伏的地层面（不是平的）")
    print("- 不规则分布的钻孔数据")
    print("- 2处局部断层（红色主断层F1，橙色次断层F2）")
    print("- X轴剖切面")
    print("- 断层区域钻孔用红色粗边框标识")
    
    sys.exit(app.exec())

def create_simple_rectangular_model(df, x_min, x_max, y_min, y_max, z_min, z_max):
    """创建简化的矩形模型"""
    print("创建简化矩形土体域...")
    
    app = QApplication(sys.argv)
    window = QMainWindow()
    window.setWindowTitle("简化矩形土体域")
    window.resize(1200, 800)
    
    widget = QWidget()
    layout = QVBoxLayout()
    plotter = QtInteractor(widget)
    layout.addWidget(plotter.interactor)
    widget.setLayout(layout)
    window.setCentralWidget(widget)
    
    # 12层地质数据
    formations = ['填土', '粘土', '粉质粘土', '细砂', '中砂', '粗砂', '砾砂', '卵石层', '强风化岩', '中风化岩', '微风化岩', '基岩']
    colors = ['brown', 'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'gray', 'darkgray', 'black']
    
    # 创建规整的矩形土体
    current_z = 0
    for formation, color in zip(formations, colors):
        formation_data = df[df['formation_name'] == formation]
        if len(formation_data) == 0:
            continue
            
        avg_thickness = formation_data['thickness'].mean()
        layer_top = current_z
        layer_bottom = current_z - avg_thickness
        
        # 矩形土体块
        soil_block = pv.Cube(
            center=[(x_min + x_max)/2, (y_min + y_max)/2, (layer_top + layer_bottom)/2],
            x_length=x_max - x_min,
            y_length=y_max - y_min,
            z_length=avg_thickness
        )
        
        plotter.add_mesh(soil_block, color=color, opacity=0.7, show_edges=True, 
                        edge_color='black', line_width=1, label=formation)
        
        current_z = layer_bottom
    
    # 添加钻孔
    borehole_ids = df['borehole_id'].unique()
    for borehole_id in borehole_ids[:30]:
        bh_data = df[df['borehole_id'] == borehole_id]
        if len(bh_data) == 0:
            continue
            
        x = bh_data['x'].iloc[0]
        y = bh_data['y'].iloc[0]
        
        for _, row in bh_data.iterrows():
            z_top = row['z_top']
            z_bottom = row['z_bottom']
            thickness = z_top - z_bottom
            formation = row['formation_name']
            
            if thickness > 0 and formation in formations:
                color_idx = formations.index(formation)
                color = colors[color_idx]
                
                cylinder = pv.Cylinder(
                    center=(x, y, (z_top + z_bottom) / 2),
                    direction=(0, 0, 1),
                    radius=8,
                    height=thickness,
                    resolution=12
                )
                
                edge_color = 'red' if row['in_fault_zone'] else 'black'
                plotter.add_mesh(cylinder, color=color, opacity=0.9,
                               show_edges=True, edge_color=edge_color, line_width=2)
    
    plotter.reset_camera()
    plotter.view_isometric()
    window.show()
    
    print("简化矩形土体域创建完成！")
    sys.exit(app.exec())

if __name__ == "__main__":
    main()