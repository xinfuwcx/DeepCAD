#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import pandas as pd
import numpy as np
import pyvista as pv
from pyvistaqt import QtInteractor
from PyQt6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget
import sys

def main():
    # 加载数据
    df = pd.read_csv("example3/data/realistic_borehole_data.csv")
    print(f"加载数据: {len(df)} 条记录")
    
    # 12层地质数据 - 重新搭配颜色
    formations = ['填土', '粘土', '粉质粘土', '细砂', '中砂', '粗砂', '砾砂', '卵石层', '强风化岩', '中风化岩', '微风化岩', '基岩']
    colors = ['brown', 'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'gray', 'darkgray', 'black']
    
    print("创建三维土体...")
    
    # 创建Qt应用
    app = QApplication(sys.argv)
    
    # 创建主窗口
    window = QMainWindow()
    window.setWindowTitle("三维地质土体")
    window.resize(1200, 800)
    
    # 创建3D视图
    widget = QWidget()
    layout = QVBoxLayout()
    
    plotter = QtInteractor(widget)
    layout.addWidget(plotter.interactor)
    widget.setLayout(layout)
    window.setCentralWidget(widget)
    
    # 获取数据范围
    x_min, x_max = df['x'].min(), df['x'].max()
    y_min, y_max = df['y'].min(), df['y'].max()
    z_min, z_max = df['z_bottom'].min(), df['z_top'].max()
    
    print(f"数据范围: X:{x_min:.0f}-{x_max:.0f}, Y:{y_min:.0f}-{y_max:.0f}, Z:{z_min:.0f}-{z_max:.0f}")
    
    # 创建规整的矩形土体域
    print("创建规整的矩形土体域...")
    
    # 定义规整的土体范围
    soil_x_min, soil_x_max = x_min, x_max
    soil_y_min, soil_y_max = y_min, y_max
    
    # 为每个地层创建规整的矩形土体
    current_z = 0  # 从地面开始
    
    for i, (formation, color) in enumerate(zip(formations, colors)):
        formation_data = df[df['formation_name'] == formation]
        if len(formation_data) == 0:
            continue
            
        print(f"创建规整土体: {formation}")
        
        # 计算该地层的平均厚度
        avg_thickness = formation_data['thickness'].mean()
        
        # 地层顶部和底部高程
        layer_top = current_z
        layer_bottom = current_z - avg_thickness
        
        # 创建规整的矩形土体（立方体）
        soil_block = pv.Cube(
            center=[(soil_x_min + soil_x_max)/2, (soil_y_min + soil_y_max)/2, (layer_top + layer_bottom)/2],
            x_length=soil_x_max - soil_x_min,
            y_length=soil_y_max - soil_y_min,
            z_length=avg_thickness
        )
        
        # 添加土体块
        plotter.add_mesh(
            soil_block,
            color=color,
            opacity=0.8,
            show_edges=True,
            edge_color='black',
            line_width=1,
            label=f"{formation}_block"
        )
        
        print(f"[OK] {formation} 矩形土体 (厚度: {avg_thickness:.1f}m)")
        
        # 更新下一层的起始位置
        current_z = layer_bottom
    
    # 显示钻孔
    print("添加钻孔...")
    borehole_ids = df['borehole_id'].unique()
    
    for i, borehole_id in enumerate(borehole_ids[:50]):  # 显示前50个钻孔
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
            
            if thickness > 0:
                # 获取地层颜色
                if formation in formations:
                    color_idx = formations.index(formation)
                    color = colors[color_idx]
                else:
                    color = 'gray'
                
                # 创建钻孔段
                cylinder = pv.Cylinder(
                    center=(x, y, (z_top + z_bottom) / 2),
                    direction=(0, 0, 1),
                    radius=8,
                    height=thickness,
                    resolution=12
                )
                
                # 断层区域用红边框
                edge_color = 'red' if row['in_fault_zone'] else 'black'
                
                plotter.add_mesh(
                    cylinder,
                    color=color,
                    opacity=0.9,
                    show_edges=True,
                    edge_color=edge_color,
                    line_width=2 if row['in_fault_zone'] else 1
                )
    
    # 添加X轴剖切面，显示断层效应
    print("添加X轴剖切...")
    x_cut = x_min + (x_max - x_min) * 0.5  # 中间位置剖切
    
    # 在剖切面上显示地层断面
    for i, (formation, color) in enumerate(zip(formations, colors)):
        formation_data = df[df['formation_name'] == formation]
        if len(formation_data) == 0:
            continue
            
        # 正常区域和断层区域分别处理
        normal_data = formation_data[formation_data['in_fault_zone'] == False]
        fault_data = formation_data[formation_data['in_fault_zone'] == True]
        
        # 正常区域 - 左侧
        if len(normal_data) > 0:
            avg_thickness = normal_data['thickness'].mean()
            avg_z = normal_data['z_top'].mean() - avg_thickness/2
            
            normal_rect = pv.Plane(
                center=[x_cut - 200, (y_min + y_max)/2, avg_z],
                direction=[1, 0, 0],
                i_size=(y_max - y_min) * 0.4,
                j_size=avg_thickness
            )
            
            plotter.add_mesh(normal_rect, color=color, opacity=0.9, label=f"{formation}_normal_section")
        
        # 断层区域 - 右侧，可能缺失或变薄
        if len(fault_data) > 0:
            fault_thickness = fault_data['thickness'].mean() * 0.6  # 变薄
            fault_z = fault_data['z_top'].mean() - fault_thickness/2 - 10  # 错位
            
            fault_rect = pv.Plane(
                center=[x_cut + 200, (y_min + y_max)/2, fault_z],
                direction=[1, 0, 0],
                i_size=(y_max - y_min) * 0.3,
                j_size=fault_thickness
            )
            
            plotter.add_mesh(fault_rect, color=color, opacity=0.7, show_edges=True, 
                           edge_color='red', line_width=3, label=f"{formation}_fault_section")
    
    # 添加断层线
    fault_line = pv.Line(
        [x_cut, y_min + (y_max - y_min) * 0.4, z_max],
        [x_cut, y_min + (y_max - y_min) * 0.6, z_min]
    )
    plotter.add_mesh(fault_line, color='red', line_width=8, label="fault_line")
    
    # 添加说明文字
    plotter.add_text("正常区域", position=[x_cut - 300, y_max, z_max], font_size=14, color='blue')
    plotter.add_text("断层区域", position=[x_cut + 200, y_max, z_max], font_size=14, color='red')
    plotter.add_text("断层线", position=[x_cut, y_max, z_max + 50], font_size=14, color='red')
    
    # 设置视图
    plotter.reset_camera()
    plotter.view_xz()  # 侧视图更好看剖切效果
    
    # 显示窗口
    window.show()
    
    print("三维地质土体显示完成！")
    print("应该能看到:")
    print("- 12层不同颜色的地层面")
    print("- 钻孔柱状图")
    print("- 断层区域钻孔有红色边框")
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()