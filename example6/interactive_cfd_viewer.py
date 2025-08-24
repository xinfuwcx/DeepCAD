#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
交互式CFD可视化界面
"""

import numpy as np
import pyvista as pv
import time
from pathlib import Path
import sys

# 添加路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def create_cfd_scene(time_factor=0.0):
    """创建CFD场景"""
    
    # 几何参数
    pier_diameter = 2.0
    pier_radius = pier_diameter / 2
    domain_length = 20.0
    domain_width = 12.0
    water_depth = 4.0
    flow_velocity = 1.5
    
    # 创建河床
    bed = pv.Plane(center=(0, 0, 0), 
                   i_size=domain_length, 
                   j_size=domain_width,
                   i_resolution=80, 
                   j_resolution=50)
    
    # 添加冲刷坑（时间演化）
    points = bed.points
    x, y = points[:, 0], points[:, 1]
    r = np.sqrt(x**2 + y**2)
    
    # 冲刷演化
    max_scour = 3.0
    scour_radius = 4.0
    scour_mask = r <= scour_radius
    
    scour_depth = np.zeros_like(r)
    if scour_mask.any():
        normalized_r = r[scour_mask] / scour_radius
        scour_intensity = np.exp(-2 * normalized_r**2)
        growth = 1 - np.exp(-time_factor * 1.5)
        scour_depth[scour_mask] = -max_scour * scour_intensity * growth
    
    points[:, 2] = scour_depth
    bed.points = points
    bed['scour_depth'] = scour_depth
    
    # 创建水面切片
    water_slice = pv.Plane(center=(0, 0, 2), 
                          i_size=domain_length, 
                          j_size=domain_width,
                          i_resolution=60, 
                          j_resolution=40)
    
    # 流场计算
    points = water_slice.points
    x, y = points[:, 0], points[:, 1]
    r = np.sqrt(x**2 + y**2)
    theta = np.arctan2(y, x)
    r = np.maximum(r, pier_radius * 1.01)
    
    # 势流解
    u = flow_velocity * (1 - pier_radius**2 * np.cos(2*theta) / r**2)
    v = -flow_velocity * pier_radius**2 * np.sin(2*theta) / r**2
    
    # 桥墩内部速度为零
    pier_mask = r <= pier_radius
    u[pier_mask] = 0
    v[pier_mask] = 0
    
    # 添加湍流扰动
    turbulence = 0.1 * np.sin(time_factor * 2 * np.pi)
    u += turbulence * flow_velocity * 0.1
    
    velocity_magnitude = np.sqrt(u**2 + v**2)
    pressure = 0.5 * 1000 * (flow_velocity**2 - velocity_magnitude**2)
    
    water_slice['velocity'] = np.column_stack([u, v, np.zeros_like(u)])
    water_slice['velocity_magnitude'] = velocity_magnitude
    water_slice['pressure'] = pressure
    
    # 创建桥墩
    pier = pv.Cylinder(center=(0, 0, water_depth/2),
                       radius=pier_radius,
                       height=water_depth,
                       resolution=32)
    
    # 创建流线种子点
    seed_points = []
    for y in np.linspace(-4, 4, 8):
        for z in np.linspace(0.5, 3.5, 4):
            seed_points.append([-8, y, z])
    seed_points = np.array(seed_points)
    
    return {
        'bed': bed,
        'water_slice': water_slice,
        'pier': pier,
        'seed_points': seed_points
    }

def main():
    """主函数"""
    print("=" * 60)
    print("交互式CFD后处理可视化")
    print("=" * 60)
    
    try:
        # 创建PyVista绘图器
        plotter = pv.Plotter(window_size=[1400, 900])
        plotter.set_background('#0f0f0f')
        
        # 时间参数
        current_time = 0.0
        max_time = 10.0
        
        def update_scene():
            nonlocal current_time
            
            # 清除场景
            plotter.clear()
            
            # 创建当前时间的CFD场景
            scene = create_cfd_scene(current_time / max_time)
            
            # 添加河床（冲刷坑）
            plotter.add_mesh(scene['bed'], 
                           scalars='scour_depth',
                           cmap='terrain_r',
                           opacity=0.9,
                           scalar_bar_args={'title': '冲刷深度 (m)', 'position_x': 0.85})
            
            # 添加水面流场
            plotter.add_mesh(scene['water_slice'],
                           scalars='velocity_magnitude',
                           cmap='plasma',
                           opacity=0.7,
                           scalar_bar_args={'title': '流速 (m/s)', 'position_x': 0.02})
            
            # 添加桥墩
            plotter.add_mesh(scene['pier'],
                           color='lightgray',
                           opacity=0.95)
            
            # 添加流线
            try:
                # 创建3D流场网格用于流线计算
                flow_grid = pv.ImageData(dimensions=[40, 30, 15])
                flow_grid.origin = (-10, -6, 0)
                flow_grid.spacing = [0.5, 0.4, 0.27]
                
                # 为流场网格添加速度数据
                points = flow_grid.points
                x, y, z = points[:, 0], points[:, 1], points[:, 2]
                r = np.sqrt(x**2 + y**2)
                theta = np.arctan2(y, x)
                r = np.maximum(r, 1.01)
                
                u = 1.5 * (1 - 1.0 * np.cos(2*theta) / r**2)
                v = -1.5 * 1.0 * np.sin(2*theta) / r**2
                w = np.zeros_like(u)
                
                pier_mask = r <= 1.0
                u[pier_mask] = 0
                v[pier_mask] = 0
                
                flow_grid['velocity'] = np.column_stack([u, v, w])
                
                # 生成流线
                streamlines = flow_grid.streamlines(
                    vectors='velocity',
                    start_position=scene['seed_points'],
                    max_time=15.0
                )
                
                plotter.add_mesh(streamlines,
                               color='cyan',
                               line_width=3,
                               opacity=0.8)
            except:
                pass  # 如果流线生成失败，跳过
            
            # 添加速度矢量
            try:
                arrows = scene['water_slice'].glyph(
                    orient='velocity',
                    scale='velocity_magnitude',
                    factor=1.0
                )
                
                # 只显示部分箭头
                every_nth = arrows.extract_points(np.arange(0, arrows.n_points, 50))
                plotter.add_mesh(every_nth,
                               color='yellow',
                               opacity=0.7)
            except:
                pass
            
            # 添加信息文本
            max_scour = abs(np.min(scene['bed']['scour_depth']))
            info_text = f"""CFD冲刷分析
时间: {current_time:.1f} / {max_time:.1f} 小时
最大冲刷深度: {max_scour:.2f} m
流速: 1.5 m/s
桥墩直径: 2.0 m"""
            
            plotter.add_text(info_text, 
                           position='upper_left',
                           font_size=12,
                           color='white')
            
            # 设置相机
            plotter.camera_position = [(20, 20, 15), (0, 0, 0), (0, 0, 1)]
            plotter.camera.zoom(1.2)
            
            print(f"渲染时间步: {current_time:.1f}h, 最大冲刷: {max_scour:.2f}m")
            
            # 更新时间
            current_time += 0.5
            if current_time > max_time:
                current_time = 0.0
        
        # 初始场景
        update_scene()
        
        # 添加键盘控制
        def on_key_press(key):
            if key == 'space':
                update_scene()
            elif key == 'r':
                nonlocal current_time
                current_time = 0.0
                update_scene()
        
        plotter.add_key_event('space', on_key_press)
        plotter.add_key_event('r', on_key_press)
        
        # 添加控制说明
        control_text = """控制:
空格键: 下一时间步
R键: 重置
Q键: 退出"""
        
        plotter.add_text(control_text,
                        position='lower_right',
                        font_size=10,
                        color='lightgray')
        
        print("\n=== 控制说明 ===")
        print("空格键: 推进时间步")
        print("R键: 重置动画")
        print("Q键: 退出")
        print("鼠标: 旋转/缩放视图")
        
        # 显示交互界面
        plotter.show()
        
    except ImportError:
        print("错误: 需要安装PyVista")
        print("安装命令: pip install pyvista")
    
    except Exception as e:
        print(f"可视化失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()