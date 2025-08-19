#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
from pathlib import Path
import pandas as pd

# 添加路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from beautiful_geological_interface import BeautifulGeologyCAE
from PyQt6.QtWidgets import QApplication

try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

# 创建Qt应用
app = QApplication(sys.argv)
app.setApplicationName("地质界面 - 带数据")

# 创建界面
window = BeautifulGeologyCAE()

# 加载数据
try:
    df = pd.read_csv("example3/data/realistic_borehole_data.csv")
    print(f"加载数据: {len(df)} 条记录")
    
    # 更新界面
    window.data_manager.project_name_label.setText("真实地质数据")
    window.output_text.append("数据已加载")
    window.output_text.append(f"记录数: {len(df)}")
    
    # 显示统计
    fault_count = len(df[df['in_fault_zone'] == True])
    window.output_text.append(f"断层影响: {fault_count} 条记录")
    
    # 创建真实地质3D显示
    if window.viewport_3d.plotter:
        window.output_text.append("创建真实地质3D显示...")
        
        # 获取数据范围
        x_min, x_max = df['x'].min(), df['x'].max()
        y_min, y_max = df['y'].min(), df['y'].max()
        
        # 显示完整的12层地质数据
        formations = ['填土', '粘土', '粉质粘土', '细砂', '中砂', '粗砂', '砾砂', '卵石层', '强风化岩', '中风化岩', '微风化岩', '基岩']
        colors = ['#8B4513', '#FF0000', '#FF8C00', '#FFD700', '#32CD32', '#00CED1', '#1E90FF', '#9932CC', '#DC143C', '#708090', '#2F4F4F', '#000000']
        
        for formation, color in zip(formations, colors):
            formation_data = df[df['formation_name'] == formation]
            
            # 正常区域钻孔
            normal_data = formation_data[formation_data['in_fault_zone'] == False]
            if len(normal_data) > 0:
                for _, row in normal_data.iterrows():
                    cylinder = pv.Cylinder(
                        center=(row['x'], row['y'], (row['z_top'] + row['z_bottom'])/2),
                        direction=(0, 0, 1),
                        radius=5,
                        height=row['thickness'],
                        resolution=8
                    )
                    window.viewport_3d.plotter.add_mesh(cylinder, color=color, opacity=0.8)
            
            # 断层区域钻孔
            fault_data = formation_data[formation_data['in_fault_zone'] == True]
            if len(fault_data) > 0:
                for _, row in fault_data.iterrows():
                    cylinder = pv.Cylinder(
                        center=(row['x'], row['y'], (row['z_top'] + row['z_bottom'])/2),
                        direction=(0, 0, 1),
                        radius=3,  # 更小
                        height=row['thickness'] * 0.7,  # 更薄
                        resolution=8
                    )
                    window.viewport_3d.plotter.add_mesh(cylinder, color=color, opacity=0.5, show_edges=True, edge_color='red')
        
        # 创建地层三维地形面
        window.output_text.append("创建地层三维地形面...")
        
        for formation, color in zip(formations, colors):
            formation_data = df[df['formation_name'] == formation]
            if len(formation_data) < 4:
                continue
                
            # 提取地层顶面点
            top_points = []
            for _, row in formation_data.iterrows():
                top_points.append([row['x'], row['y'], row['z_top']])
            
            if len(top_points) >= 4:
                try:
                    import numpy as np
                    points_array = np.array(top_points)
                    
                    # 创建点云
                    cloud = pv.PolyData(points_array)
                    
                    # 使用Delaunay三角化创建地形面
                    surface = cloud.delaunay_2d()
                    
                    # 添加地形面
                    window.viewport_3d.plotter.add_mesh(
                        surface,
                        color=color,
                        opacity=0.6,
                        show_edges=True,
                        edge_color='black',
                        line_width=1
                    )
                    
                    window.output_text.append(f"{formation} 地形面已创建")
                    
                except Exception as e:
                    window.output_text.append(f"{formation} 地形面创建失败: {e}")
        
        # 1. 添加包围盒
        window.output_text.append("添加包围盒...")
        z_min, z_max = df['z_bottom'].min(), df['z_top'].max()
        
        # 创建包围盒边框
        bbox_lines = [
            # 底面4条边
            [[x_min, y_min, z_min], [x_max, y_min, z_min]],
            [[x_max, y_min, z_min], [x_max, y_max, z_min]],
            [[x_max, y_max, z_min], [x_min, y_max, z_min]],
            [[x_min, y_max, z_min], [x_min, y_min, z_min]],
            
            # 顶面4条边  
            [[x_min, y_min, z_max], [x_max, y_min, z_max]],
            [[x_max, y_min, z_max], [x_max, y_max, z_max]],
            [[x_max, y_max, z_max], [x_min, y_max, z_max]],
            [[x_min, y_max, z_max], [x_min, y_min, z_max]],
            
            # 4条竖直边
            [[x_min, y_min, z_min], [x_min, y_min, z_max]],
            [[x_max, y_min, z_min], [x_max, y_min, z_max]],
            [[x_max, y_max, z_min], [x_max, y_max, z_max]],
            [[x_min, y_max, z_min], [x_min, y_max, z_max]]
        ]
        
        for line_points in bbox_lines:
            line = pv.Line(line_points[0], line_points[1])
            window.viewport_3d.plotter.add_mesh(line, color='black', line_width=3)
        
        # 2. 添加X轴剖切断面
        window.output_text.append("添加X轴剖切断面...")
        x_cut = x_min + (x_max - x_min) * 0.5  # 中间位置剖切
        
        # 为每个地层创建剖切面
        for formation, color in zip(formations, colors):
            formation_data = df[df['formation_name'] == formation]
            if len(formation_data) == 0:
                continue
                
            # 计算该地层的平均厚度和位置
            avg_thickness = formation_data['thickness'].mean()
            avg_z_top = formation_data['z_top'].mean()
            avg_z_bottom = formation_data['z_bottom'].mean()
            
            # 创建剖切面矩形
            section_rect = pv.Plane(
                center=[x_cut, (y_min + y_max)/2, (avg_z_top + avg_z_bottom)/2],
                direction=[1, 0, 0],  # X轴方向剖切
                i_size=y_max - y_min,
                j_size=avg_thickness
            )
            
            window.viewport_3d.plotter.add_mesh(
                section_rect,
                color=color,
                opacity=0.8,
                show_edges=True,
                edge_color='white',
                line_width=2
            )
        
        # 添加断层线在剖切面上
        fault_line = pv.Line(
            [x_cut, y_min + (y_max - y_min) * 0.4, z_max],
            [x_cut, y_min + (y_max - y_min) * 0.6, z_min]
        )
        window.viewport_3d.plotter.add_mesh(fault_line, color='red', line_width=8)
        
        # 添加剖切面标识
        cut_plane_marker = pv.Plane(
            center=[x_cut, (y_min + y_max)/2, (z_min + z_max)/2],
            direction=[1, 0, 0],
            size=(y_max - y_min, z_max - z_min)
        )
        window.viewport_3d.plotter.add_mesh(cut_plane_marker, color='lightgray', opacity=0.2)
        
        # 3. 添加土体计算区域
        window.output_text.append("添加土体计算区域...")
        
        # 土体计算区域（比数据区域稍大，用于有限元计算）
        calc_margin = 200  # 向外扩展200m
        calc_x1 = x_min - calc_margin
        calc_x2 = x_max + calc_margin
        calc_y1 = y_min - calc_margin
        calc_y2 = y_max + calc_margin
        calc_z_top = z_max + 50   # 地面以上50m
        calc_z_bottom = z_min - 100  # 地面以下扩展100m
        
        # 创建土体计算区域边框
        calc_lines = [
            # 顶面边框
            [[calc_x1, calc_y1, calc_z_top], [calc_x2, calc_y1, calc_z_top]],
            [[calc_x2, calc_y1, calc_z_top], [calc_x2, calc_y2, calc_z_top]],
            [[calc_x2, calc_y2, calc_z_top], [calc_x1, calc_y2, calc_z_top]],
            [[calc_x1, calc_y2, calc_z_top], [calc_x1, calc_y1, calc_z_top]],
            
            # 底面边框
            [[calc_x1, calc_y1, calc_z_bottom], [calc_x2, calc_y1, calc_z_bottom]],
            [[calc_x2, calc_y1, calc_z_bottom], [calc_x2, calc_y2, calc_z_bottom]],
            [[calc_x2, calc_y2, calc_z_bottom], [calc_x1, calc_y2, calc_z_bottom]],
            [[calc_x1, calc_y2, calc_z_bottom], [calc_x1, calc_y1, calc_z_bottom]],
            
            # 竖直边
            [[calc_x1, calc_y1, calc_z_top], [calc_x1, calc_y1, calc_z_bottom]],
            [[calc_x2, calc_y1, calc_z_top], [calc_x2, calc_y1, calc_z_bottom]],
            [[calc_x2, calc_y2, calc_z_top], [calc_x2, calc_y2, calc_z_bottom]],
            [[calc_x1, calc_y2, calc_z_top], [calc_x1, calc_y2, calc_z_bottom]]
        ]
        
        for line_points in calc_lines:
            line = pv.Line(line_points[0], line_points[1])
            window.viewport_3d.plotter.add_mesh(line, color='purple', line_width=2, opacity=0.7)
        
        # 添加标注
        window.viewport_3d.plotter.add_text(
            f"土体计算区域\n{calc_x2-calc_x1:.0f}m×{calc_y2-calc_y1:.0f}m×{calc_z_top-calc_z_bottom:.0f}m",
            position=[(calc_x1+calc_x2)/2, calc_y2 + 100, calc_z_top],
            font_size=10,
            color='purple'
        )
        
        window.viewport_3d.plotter.reset_camera()
        window.output_text.append("真实地质数据3D显示完成")
        window.output_text.append("可以看到:")
        window.output_text.append("- 不同颜色的地层柱状图")
        window.output_text.append("- 各地层的三维地形面")
        window.output_text.append("- 黑色包围盒边框")
        window.output_text.append("- X轴剖切断面(各地层)")
        window.output_text.append("- 剖切面上的红色断层线")
        window.output_text.append("- 紫色土体计算区域(有限元计算范围)")
        window.output_text.append("- 正常区域(粗柱)")
        window.output_text.append("- 断层区域(细柱+红边)")
        window.output_text.append("- 地形面显示断层错位")
    else:
        window.output_text.append("3D视图不可用")
    
except Exception as e:
    window.output_text.append(f"错误: {e}")

# 显示界面
window.show()
print("界面已启动")

# 启动应用
sys.exit(app.exec())