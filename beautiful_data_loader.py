#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Beautiful Data Loader - 美观数据加载器
专门为美观界面加载和渲染地质数据，每个土层用不同颜色显示
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np

# 添加路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# 导入美观界面
from beautiful_geological_interface import BeautifulGeologyCAE, GeologicalColorScheme
from PyQt6.QtWidgets import QApplication

try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False


def load_colorful_geological_data():
    """加载彩色地质数据"""
    data_dir = Path("example3/data")
    
    try:
        # 读取真实钻孔数据
        borehole_data = pd.read_csv(data_dir / "realistic_borehole_data.csv")
        print(f"[OK] 加载真实钻孔数据: {len(borehole_data)} 条记录")
        
        # 为每个地层分配颜色
        formations = borehole_data['formation_name'].unique()
        print(f"[OK] 发现地层: {list(formations)}")
        
        # 为钻孔数据添加增强颜色
        borehole_data['enhanced_color'] = borehole_data['formation_name'].apply(
            lambda x: GeologicalColorScheme.get_formation_color(x, enhanced=True)
        )
        
        return {
            'borehole_data': borehole_data,
            'formations': formations
        }
        
    except Exception as e:
        print(f"[ERROR] 数据加载失败: {e}")
        return None


def create_layered_geological_visualization(viewport, data):
    """创建真正的地质剖切显示 - 像教科书剖面图一样"""
    if not viewport.plotter or not data:
        return
        
    borehole_data = data['borehole_data']
    formations = data['formations']
    
    print(f"[INFO] 开始创建 {len(formations)} 个地层的剖切可视化...")
    
    # 获取整体数据范围
    x_min, x_max = borehole_data['x'].min(), borehole_data['x'].max()
    y_min, y_max = borehole_data['y'].min(), borehole_data['y'].max()
    z_min, z_max = borehole_data['z_bottom'].min(), borehole_data['z_top'].max()
    
    # X轴剖切位置（中间）
    x_cut_pos = x_min + (x_max - x_min) * 0.5
    
    # 显示全部12层地质层
    selected_formations = formations
    
    print(f"[INFO] 显示全部地层: {selected_formations}")
    
    # 创建真正的剖切面 - 只在剖切面上显示地层
    print(f"[INFO] 创建剖切面地质图，剖切位置 X = {x_cut_pos:.1f}m")
    
    # 在剖切面上创建规整的地层带
    y_extent = y_max - y_min
    z_extent = z_max - z_min
    
    # 按地层顺序从上到下排列
    layer_order = ['填土', '粘土', '粉质粘土', '细砂', '中砂', '粗砂', '砾砂', '卵石层', '强风化岩', '中风化岩', '微风化岩', '基岩']
    
    layer_count = 0
    current_z = z_max  # 从最高开始
    
    for i, formation_name in enumerate(layer_order):
        if formation_name not in selected_formations:
            continue
            
        try:
            color = GeologicalColorScheme.get_formation_color(formation_name, enhanced=True)
            
            # 计算该地层的厚度
            formation_data = borehole_data[borehole_data['formation_name'] == formation_name]
            if len(formation_data) == 0:
                continue
                
            avg_thickness = formation_data['thickness'].mean()
            layer_bottom = current_z - avg_thickness
            
            # 创建该地层的剖面矩形
            section_rect = pv.Plane(
                center=[x_cut_pos, (y_min + y_max)/2, (current_z + layer_bottom)/2],
                direction=[1, 0, 0],
                i_size=y_extent,
                j_size=avg_thickness
            )
            
            # 显示地层剖面
            viewport.plotter.add_mesh(
                section_rect,
                color=color,
                opacity=0.9,
                show_edges=True,
                edge_color='black',
                line_width=2,
                label=f"section_{formation_name}"
            )
            
            # 添加地层名称标签
            viewport.plotter.add_text(
                formation_name,
                position=[x_cut_pos + 10, y_max - 50, (current_z + layer_bottom)/2],
                font_size=12,
                color='black'
            )
            
            print(f"[OK] 剖面地层: {formation_name} (厚度: {avg_thickness:.1f}m, 颜色: {color})")
            
            current_z = layer_bottom  # 下一层的顶部
            layer_count += 1
            
        except Exception as e:
            print(f"[ERROR] 创建剖面地层 {formation_name} 失败: {e}")
    
    # 在剖切面上添加明显的断层线
    try:
        # 断层1 - 贯穿所有地层
        fault_line1 = pv.Line(
            [x_cut_pos, y_min + y_extent*0.4, z_max],
            [x_cut_pos, y_min + y_extent*0.6, z_min]
        )
        viewport.plotter.add_mesh(
            fault_line1,
            color='red',
            line_width=8,
            label="section_fault1"
        )
        
        # 断层2
        fault_line2 = pv.Line(
            [x_cut_pos, y_min + y_extent*0.7, z_max],
            [x_cut_pos, y_min + y_extent*0.8, z_min]
        )
        viewport.plotter.add_mesh(
            fault_line2,
            color='darkred',
            line_width=6,
            label="section_fault2"
        )
        
        print("[OK] 添加剖切面断层线")
        
    except Exception as e:
        print(f"[WARNING] 断层线创建失败: {e}")
    
    print(f"[OK] 成功创建 {layer_count} 个地层剖切显示")


    # 简化钻孔显示 - 只在剖切面附近显示几个代表性钻孔
    try:
        selected_borehole_ids = ['ZK001', 'ZK010', 'ZK020', 'ZK030', 'ZK050']  # 选择几个代表性钻孔
        
        for borehole_id in selected_borehole_ids:
            bh_data = borehole_data[borehole_data['borehole_id'] == borehole_id]
            if len(bh_data) == 0:
                continue
                
            x = bh_data['x'].iloc[0]
            y = bh_data['y'].iloc[0]
            
            # 只显示靠近剖切面的钻孔
            if abs(x - x_cut_pos) < 50:
                for _, row in bh_data.iterrows():
                    z_top = row['z_top']
                    z_bottom = row['z_bottom']
                    thickness = z_top - z_bottom
                    
                    if thickness > 0:
                        cylinder = pv.Cylinder(
                            center=(x_cut_pos + 5, y, (z_top + z_bottom) / 2),
                            direction=(0, 0, 1),
                            radius=2,
                            height=thickness,
                            resolution=12
                        )
                        
                        color = row.get('enhanced_color', GeologicalColorScheme.get_formation_color(row['formation_name'], enhanced=True))
                        
                        viewport.plotter.add_mesh(
                            cylinder,
                            color=color,
                            opacity=0.8,
                            show_edges=True,
                            edge_color='black',
                            line_width=1,
                            label=f"borehole_{borehole_id}_{row['formation_name']}"
                        )
        
        print("[OK] 添加代表性钻孔")
        
    except Exception as e:
        print(f"[WARNING] 钻孔显示失败: {e}")


def create_colorful_borehole_logs_simple(viewport, data):
                    bottom_surface = bottom_cloud.delaunay_2d()
                    
                    # 创建被断层切断的土体
                    try:
                        # 定义断层位置
                        fault_y1 = y_min + (y_max-y_min)*0.5  # 主断层
                        fault_y2 = y_min + (y_max-y_min)*0.7  # 次断层
                        
                        # 将土体分为3段：断层前、断层间、断层后
                        segments = [
                            {'name': 'seg1', 'y_range': (y_min, fault_y1-10), 'offset': 0},
                            {'name': 'seg2', 'y_range': (fault_y1+10, fault_y2-8), 'offset': -5},  # 错位
                            {'name': 'seg3', 'y_range': (fault_y2+8, y_max), 'offset': -10}     # 更大错位
                        ]
                        
                        for seg in segments:
                            # 筛选该段的点
                            seg_top_points = []
                            seg_bottom_points = []
                            
                            for pt in top_points:
                                if seg['y_range'][0] <= pt[1] <= seg['y_range'][1]:
                                    # 应用断层错位
                                    new_pt = [pt[0], pt[1], pt[2] + seg['offset']]
                                    seg_top_points.append(new_pt)
                            
                            for pt in bottom_points:
                                if seg['y_range'][0] <= pt[1] <= seg['y_range'][1]:
                                    # 应用断层错位
                                    new_pt = [pt[0], pt[1], pt[2] + seg['offset']]
                                    seg_bottom_points.append(new_pt)
                            
                            if len(seg_top_points) >= 3:
                                # 创建该段的体积
                                all_seg_points = seg_top_points + seg_bottom_points
                                
                                # 添加剖切面边界点
                                y_seg_min, y_seg_max = seg['y_range']
                                z_seg_range = [pt[2] for pt in all_seg_points]
                                z_seg_min, z_seg_max = min(z_seg_range), max(z_seg_range)
                                
                                boundary_corners = [
                                    [x_cut_pos, y_seg_min, z_seg_min],
                                    [x_cut_pos, y_seg_max, z_seg_min],
                                    [x_cut_pos, y_seg_min, z_seg_max],
                                    [x_cut_pos, y_seg_max, z_seg_max]
                                ]
                                all_seg_points.extend(boundary_corners)
                                
                                # 创建分段体积
                                volume_cloud = pv.PolyData(np.array(all_seg_points))
                                volume_hull = volume_cloud.convex_hull()
                                
                                # 显示分段体积
                                viewport.plotter.add_mesh(
                                    volume_hull,
                                    color=color,
                                    opacity=0.8,  # 增加不透明度
                                    show_edges=True,
                                    edge_color='black',
                                    line_width=2,
                                    smooth_shading=True,
                                    label=f"{formation_name}_{seg['name']}"
                                )
                        
                    except Exception as close_e:
                        print(f"[INFO] 闭合体积失败，使用分离面: {close_e}")
                        
                        # 降级方案：显示顶面和底面
                        viewport.plotter.add_mesh(
                            top_surface,
                            color=color,
                            opacity=0.8,
                            show_edges=True,
                            edge_color='black',
                            line_width=1,
                            smooth_shading=True,
                            label=f"{formation_name}_top"
                        )
                        
                        viewport.plotter.add_mesh(
                            bottom_surface,
                            color=color,
                            opacity=0.7,
                            show_edges=True,
                            edge_color='black',
                            line_width=1,
                            smooth_shading=True,
                            label=f"{formation_name}_bottom"
                        )
                    
                    # 方法2: 尝试创建体积
                    try:
                        all_points = np.array(top_points + bottom_points)
                        if len(all_points) >= 4:
                            volume_cloud = pv.PolyData(all_points)
                            volume_hull = volume_cloud.convex_hull()
                            
                            # 添加半透明的土体体积
                            viewport.plotter.add_mesh(
                                volume_hull,
                                color=color,
                                opacity=0.4,
                                show_edges=True,
                                edge_color='white',
                                line_width=0.5,
                                smooth_shading=True,
                                label=f"{formation_name}_volume"
                            )
                    except Exception as vol_e:
                        print(f"[INFO] 体积创建失败，使用面显示: {vol_e}")
                    
                    layer_count += 1
                    print(f"[OK] 创建剖切地层: {formation_name} (点数: {len(top_points)}, 颜色: {color})")
                
                except Exception as e:
                    print(f"[WARNING] 地层面创建失败 {formation_name}: {e}")
                    
                    # 降级方案：显示点云
                    try:
                        all_points = np.array(top_points + bottom_points)
                        point_cloud = pv.PolyData(all_points)
                        
                        viewport.plotter.add_mesh(
                            point_cloud,
                            color=color,
                            point_size=8,
                            render_points_as_spheres=True,
                            opacity=0.8,
                            label=f"{formation_name}_points"
                        )
                        print(f"[FALLBACK] 显示点云: {formation_name}")
                    except Exception as pt_e:
                        print(f"[ERROR] 点云也失败: {pt_e}")
            else:
                print(f"[WARNING] {formation_name} 点数不足: {len(top_points)}")
                    
        except Exception as e:
            print(f"[ERROR] 处理地层 {formation_name} 失败: {e}")
    
    # 添加剖切面和断层线
    try:
        cut_plane = pv.Plane(
            center=[x_cut_pos, (y_min + y_max)/2, (z_min + z_max)/2],
            direction=[1, 0, 0],
            size=(y_max - y_min, z_max - z_min)
        )
        
        viewport.plotter.add_mesh(
            cut_plane,
            color='lightgray',
            opacity=0.3,
            show_edges=True,
            edge_color='gray',
            line_width=1,
            label="cut_plane"
        )
        
        # 在剖切面上添加明显的断层带（与土体错位对应）
        fault_zones = [
            {
                'name': '主断层F1破碎带',
                'center_y': y_min + (y_max-y_min)*0.5,
                'center_z': z_min + (z_max-z_min)*0.5,
                'width': 30,  # 更宽的破碎带
                'height': (z_max-z_min)*0.9,  # 贯穿全部地层
                'color': 'crimson'  # 更鲜艳的红色
            },
            {
                'name': '次断层F2破碎带',
                'center_y': y_min + (y_max-y_min)*0.7,
                'center_z': z_min + (z_max-z_min)*0.5,
                'width': 25,
                'height': (z_max-z_min)*0.8,
                'color': 'darkorange'  # 更明显的橙色
            }
        ]
        
        for fault in fault_zones:
            # 创建断层破碎带（矩形区域）
            fault_rect = pv.Plane(
                center=[x_cut_pos, fault['center_y'], fault['center_z']],
                direction=[1, 0, 0],
                size=(fault['width'], fault['height'])
            )
            
            # 添加破碎带 - 更突出
            viewport.plotter.add_mesh(
                fault_rect,
                color=fault['color'],
                opacity=0.9,  # 更不透明
                show_edges=True,
                edge_color='black',
                line_width=4,  # 更粗的边线
                label=f"fault_zone_{fault['name']}"
            )
            
            # 添加断层中心线
            fault_line = pv.Line(
                [x_cut_pos, fault['center_y'], fault['center_z'] - fault['height']/2],
                [x_cut_pos, fault['center_y'], fault['center_z'] + fault['height']/2]
            )
            viewport.plotter.add_mesh(
                fault_line,
                color='black',
                line_width=8,  # 更粗的断层线
                label=f"fault_line_{fault['name']}"
            )
            
            # 添加断层位移指示器
            displacement_arrow = pv.Arrow(
                start=[x_cut_pos, fault['center_y']-20, fault['center_z']],
                direction=[0, 0, -5],  # 向下位移
                tip_length=0.3,
                tip_radius=0.1,
                shaft_radius=0.05
            )
            viewport.plotter.add_mesh(
                displacement_arrow,
                color='yellow',
                label=f"fault_displacement_{fault['name']}"
            )
            
            print(f"[OK] 添加断层破碎带: {fault['name']}")
        
        print("[OK] 添加剖切面和断层线")
        
    except Exception as e:
        print(f"[WARNING] 剖切面创建失败: {e}")
    
    # 添加简化断层
    try:
        create_simple_fault_visualization(viewport, x_min, x_max, y_min, y_max, z_min, z_max, x_cut_pos)
    except Exception as e:
        print(f"[WARNING] 断层创建失败: {e}")
    
    # 添加明显的包围盒框架
    try:
        # 创建包围盒的12条边
        bbox_lines = [
            # 底面4条边
            [[x_min, y_min, z_min], [x_cut_pos, y_min, z_min]],
            [[x_cut_pos, y_min, z_min], [x_cut_pos, y_max, z_min]],
            [[x_cut_pos, y_max, z_min], [x_min, y_max, z_min]],
            [[x_min, y_max, z_min], [x_min, y_min, z_min]],
            
            # 顶面4条边  
            [[x_min, y_min, z_max], [x_cut_pos, y_min, z_max]],
            [[x_cut_pos, y_min, z_max], [x_cut_pos, y_max, z_max]],
            [[x_cut_pos, y_max, z_max], [x_min, y_max, z_max]],
            [[x_min, y_max, z_max], [x_min, y_min, z_max]],
            
            # 4条竖直边
            [[x_min, y_min, z_min], [x_min, y_min, z_max]],
            [[x_cut_pos, y_min, z_min], [x_cut_pos, y_min, z_max]],
            [[x_cut_pos, y_max, z_min], [x_cut_pos, y_max, z_max]],
            [[x_min, y_max, z_min], [x_min, y_max, z_max]]
        ]
        
        for i, line_points in enumerate(bbox_lines):
            line = pv.Line(line_points[0], line_points[1])
            viewport.plotter.add_mesh(
                line,
                color='black',
                line_width=3,
                label=f"bbox_edge_{i}"
            )
        
        print("[OK] 添加包围盒框架")
        
    except Exception as e:
        print(f"[WARNING] 包围盒创建失败: {e}")
    
    print(f"[OK] 成功创建 {layer_count} 个地层剖切可视化")


def create_simple_fault_visualization(viewport, x_min, x_max, y_min, y_max, z_min, z_max, x_cut_pos):
    """创建简化断层可视化"""
    try:
        # 只在剖切面一侧创建断层
        fault_x = x_min + (x_cut_pos - x_min) * 0.7
        fault_y = y_min + (y_max - y_min) * 0.5
        
        fault_plane = pv.Plane(
            center=[fault_x, fault_y, (z_min + z_max)/2],
            direction=[1, 1, 0],
            size=(200, 100)
        )
        
        viewport.plotter.add_mesh(
            fault_plane,
            color='red',
            opacity=0.5,
            show_edges=True,
            edge_color='darkred',
            line_width=2,
            label="main_fault"
        )
        
        print("[OK] 创建主断层")
        
    except Exception as e:
        print(f"[WARNING] 断层创建失败: {e}")


def create_fault_visualization(viewport, x_min, x_max, y_min, y_max, z_min, z_max):
    """创建断层可视化"""
    import pyvista as pv
    
    # 创建几个模拟断层
    faults = [
        {
            'name': '主断层F1',
            'strike': 45,  # 走向
            'dip': 75,     # 倾角
            'center': [(x_min + x_max)/2, (y_min + y_max)/2, (z_min + z_max)/2],
            'length': 400,
            'width': 150
        },
        {
            'name': '次断层F2', 
            'strike': 120,
            'dip': 60,
            'center': [x_min + (x_max - x_min)*0.7, y_min + (y_max - y_min)*0.3, (z_min + z_max)/2],
            'length': 250,
            'width': 100
        }
    ]
    
    for fault in faults:
        try:
            # 创建断层面
            center = fault['center']
            length = fault['length']
            width = fault['width']
            
            # 简化的断层面（矩形）
            fault_plane = pv.Plane(
                center=center,
                direction=[1, 1, 0],  # 简化的法向量
                size=(length, width)
            )
            
            # 添加断层面
            viewport.plotter.add_mesh(
                fault_plane,
                color='red',
                opacity=0.4,
                show_edges=True,
                edge_color='darkred',
                line_width=3,
                label=f"fault_{fault['name']}"
            )
            
            print(f"[OK] 创建断层: {fault['name']}")
            
        except Exception as e:
            print(f"[WARNING] 断层 {fault['name']} 创建失败: {e}")


def create_colorful_borehole_logs(viewport, data):
    """创建彩色钻孔柱状图 - 修复只显示一边的问题"""
    if not viewport.plotter or not data:
        return
        
    borehole_data = data['borehole_data']
    
    # 获取数据范围以确保均匀分布钻孔
    x_min, x_max = borehole_data['x'].min(), borehole_data['x'].max()
    y_min, y_max = borehole_data['y'].min(), borehole_data['y'].max()
    
    # 从整个区域选择钻孔，确保覆盖所有区域
    unique_boreholes = borehole_data['borehole_id'].unique()
    
    # 按位置分布选择钻孔 - 网格采样确保均匀分布
    selected_boreholes = []
    
    # 将区域分成网格，从每个网格中选择钻孔 - 优化网格分辨率
    x_bins = 20  # X方向20个网格（平衡细腻度和性能）
    y_bins = 20  # Y方向20个网格
    
    x_step = (x_max - x_min) / x_bins
    y_step = (y_max - y_min) / y_bins
    
    for i in range(x_bins):
        for j in range(y_bins):
            # 定义当前网格范围
            x_start = x_min + i * x_step
            x_end = x_min + (i + 1) * x_step
            y_start = y_min + j * y_step  
            y_end = y_min + (j + 1) * y_step
            
            # 在当前网格中寻找钻孔
            grid_boreholes = []
            for borehole_id in unique_boreholes:
                bh_info = borehole_data[borehole_data['borehole_id'] == borehole_id].iloc[0]
                x, y = bh_info['x'], bh_info['y']
                
                if x_start <= x < x_end and y_start <= y < y_end:
                    grid_boreholes.append((borehole_id, x, y))
            
            # 从当前网格选择1-2个钻孔
            if grid_boreholes:
                # 按距离网格中心排序，选择最接近中心的
                center_x = (x_start + x_end) / 2
                center_y = (y_start + y_end) / 2
                grid_boreholes.sort(key=lambda bh: (bh[1] - center_x)**2 + (bh[2] - center_y)**2)
                selected_boreholes.extend(grid_boreholes[:1])  # 每个网格选1个
    
    print(f"[INFO] 网格选择策略: {x_bins}x{y_bins}网格，选中 {len(selected_boreholes)} 个钻孔")
    
    print(f"[INFO] 创建 {len(selected_boreholes)} 个钻孔柱状图（剖切显示）...")
    
    # 剖切位置
    x_cut_pos = x_min + (x_max - x_min) * 0.5
    
    borehole_count = 0
    for borehole_id, bh_x, bh_y in selected_boreholes:
        # 只显示剖切面一侧的钻孔
        if bh_x > x_cut_pos:
            continue
            
        bh_data = borehole_data[borehole_data['borehole_id'] == borehole_id]
        
        if len(bh_data) == 0:
            continue
            
        x = bh_data['x'].iloc[0]
        y = bh_data['y'].iloc[0]
        
        # 为每个地层段创建彩色圆柱体
        for _, row in bh_data.iterrows():
            z_top = row['z_top']
            z_bottom = row['z_bottom']
            thickness = z_top - z_bottom
            
            if thickness <= 0:
                continue
            
            # 创建圆柱体 - 更细腻的显示
            cylinder = pv.Cylinder(
                center=(x, y, (z_top + z_bottom) / 2),
                direction=(0, 0, 1),
                radius=3.0,  # 稍微增大半径
                height=thickness,
                resolution=24  # 更高分辨率，更圆滑
            )
            
            # 使用增强颜色
            color = row['enhanced_color']
            formation_name = row['formation_name']
            
            viewport.plotter.add_mesh(
                cylinder,
                color=color,
                opacity=0.8,  # 半透明度增强体积感
                show_edges=True,  # 显示边线
                edge_color='black',  # 黑色边框
                line_width=1,
                smooth_shading=True,
                ambient=0.3,
                diffuse=0.8,
                specular=0.3,
                label=f"borehole_{borehole_id}_{formation_name}"
            )
        
        borehole_count += 1
    
    print(f"[OK] 创建了 {borehole_count} 个彩色钻孔柱状图（覆盖 X:{x_min:.0f}-{x_max:.0f}, Y:{y_min:.0f}-{y_max:.0f}）")


def add_professional_annotations(viewport, data):
    """添加专业标注（简化版）"""
    if not viewport.plotter or not data:
        return
    
    # 暂时不添加比例尺和指北针，保持视图清洁
    # 用户反馈这些元素影响视觉效果
    print("[OK] 保持清洁的3D视图（已移除比例尺和指北针）")


def main():
    """主函数"""
    print(">> 启动美观地质建模界面")
    print("=" * 50)
    
    # 创建Qt应用
    app = QApplication(sys.argv)
    app.setApplicationName("GEM Professional - 美观版本")
    
    # 创建美观主界面
    window = BeautifulGeologyCAE()
    window.show()
    
    # 加载彩色地质数据
    print("\n>> 加载彩色地质数据...")
    data = load_colorful_geological_data()
    
    if data:
        # 更新数据管理器
        window.data_manager.project_name_label.setText("复杂地质测试用例")
        window.data_manager.extent_label.setText("1000×1000×200m")
        window.data_manager.boreholes_count.setText("100")
        window.data_manager.formations_count.setText(str(len(data['formations'])))
        window.data_manager.faults_count.setText("3")
        
        # 更新地层图例
        window.data_manager.update_formation_legend()
        
        # 输出加载信息
        window.output_text.append("[OK] 已加载美观地质测试数据")
        window.output_text.append(f"  >> 地层数量: {len(data['formations'])} 层")
        window.output_text.append(f"  >> 钻孔数据: {len(data['borehole_data'])} 条记录")
        
        # 在3D视口中创建彩色可视化
        if PYVISTA_AVAILABLE and window.viewport_3d.plotter:
            print("\n>> 创建彩色3D可视化...")
            
            # 创建分层地质可视化
            create_layered_geological_visualization(window.viewport_3d, data)
            
            # 创建彩色钻孔柱状图
            create_colorful_borehole_logs(window.viewport_3d, data)
            
            # 添加专业标注
            add_professional_annotations(window.viewport_3d, data)
            
            # 重置视图到最佳角度
            window.viewport_3d.plotter.reset_camera()
            window.viewport_3d.plotter.view_isometric()
            
            # 输出成功信息
            window.output_text.append("[OK] 彩色地质可视化创建完成")
            window.output_text.append("  >> 每个地层都有独特颜色")
            window.output_text.append("  >> 已优化3D渲染质量")
            
            print("[OK] 彩色3D可视化完成")
        
        # 更新状态
        window.status_label.setText("[OK] 美观地质数据加载完成")
        
        print("\n>> 美观界面准备完成!")
        print("特色功能:")
        print("  >> 每个土层都有不同颜色区分")
        print("  >> 明亮清新的界面设计")
        print("  >> 专业的地质可视化效果")
        print("  >> 完整的地层颜色图例")
    
    else:
        window.status_label.setText("[ERROR] 数据加载失败")
        window.output_text.append("[ERROR] 测试数据加载失败")
    
    # 启动应用
    sys.exit(app.exec())


if __name__ == "__main__":
    main()