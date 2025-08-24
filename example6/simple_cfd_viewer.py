#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化的CFD后处理可视化
"""

import numpy as np
import pyvista as pv
import time

def create_scour_scene():
    """创建冲刷场景"""
    
    # 参数
    pier_radius = 1.0
    domain_size = 20.0
    flow_velocity = 1.5
    
    print("创建河床网格...")
    # 河床
    bed = pv.Plane(center=(0, 0, 0), 
                   i_size=domain_size, 
                   j_size=domain_size*0.6,
                   i_resolution=100, 
                   j_resolution=60)
    
    # 添加冲刷坑
    points = bed.points
    x, y = points[:, 0], points[:, 1]
    r = np.sqrt(x**2 + y**2)
    
    # 创建冲刷坑形状
    scour_depth = np.zeros_like(r)
    scour_radius = 4.0
    max_scour = 2.5
    
    mask = r <= scour_radius
    if mask.any():
        normalized_r = r[mask] / scour_radius
        scour_intensity = np.exp(-1.5 * normalized_r**2)
        scour_depth[mask] = -max_scour * scour_intensity
    
    # 更新河床高程
    points[:, 2] = scour_depth
    bed.points = points
    bed['scour_depth'] = scour_depth
    bed['erosion_rate'] = np.abs(scour_depth)
    
    print("创建流场...")
    # 水面流场
    water = pv.Plane(center=(0, 0, 2), 
                     i_size=domain_size, 
                     j_size=domain_size*0.6,
                     i_resolution=80, 
                     j_resolution=50)
    
    # 计算流场
    points = water.points
    x, y = points[:, 0], points[:, 1]
    r = np.sqrt(x**2 + y**2)
    theta = np.arctan2(y, x)
    r = np.maximum(r, pier_radius * 1.01)
    
    # 势流解
    u = flow_velocity * (1 - pier_radius**2 * np.cos(2*theta) / r**2)
    v = -flow_velocity * pier_radius**2 * np.sin(2*theta) / r**2
    
    # 桥墩内部无速度
    pier_mask = r <= pier_radius
    u[pier_mask] = 0
    v[pier_mask] = 0
    
    velocity_magnitude = np.sqrt(u**2 + v**2)
    pressure = 0.5 * 1000 * (flow_velocity**2 - velocity_magnitude**2)
    
    water['velocity'] = np.column_stack([u, v, np.zeros_like(u)])
    water['velocity_magnitude'] = velocity_magnitude
    water['pressure'] = pressure
    
    print("创建桥墩...")
    # 桥墩
    pier = pv.Cylinder(center=(0, 0, 2),
                       radius=pier_radius,
                       height=4,
                       resolution=32)
    
    return bed, water, pier

def main():
    """主函数"""
    print("=" * 60)
    print("CFD后处理可视化系统")
    print("=" * 60)
    
    try:
        # 创建场景数据
        bed, water, pier = create_scour_scene()
        
        print("启动PyVista可视化...")
        
        # 创建绘图器
        plotter = pv.Plotter(window_size=[1400, 1000], title="CFD桥墩冲刷分析")
        plotter.set_background('#1a1a1a')
        
        # 添加光源
        plotter.add_light(pv.Light(position=(10, 10, 10), color='white', intensity=0.8))
        
        print("添加河床网格...")
        # 河床（冲刷坑）
        plotter.add_mesh(bed, 
                       scalars='scour_depth',
                       cmap='terrain_r',
                       opacity=0.9,
                       scalar_bar_args={
                           'title': '冲刷深度 (m)',
                           'position_x': 0.85,
                           'color': 'white'
                       })
        
        print("添加流场...")
        # 水面流场
        plotter.add_mesh(water,
                       scalars='velocity_magnitude',
                       cmap='plasma',
                       opacity=0.6,
                       scalar_bar_args={
                           'title': '流速 (m/s)',
                           'position_x': 0.02,
                           'color': 'white'
                       })
        
        print("添加桥墩...")
        # 桥墩
        plotter.add_mesh(pier,
                       color='lightgray',
                       opacity=0.95)
        
        print("添加速度矢量...")
        # 速度矢量（每隔几个点显示）
        try:
            sample_points = water.sample(factor=0.1)  # 采样10%的点
            arrows = sample_points.glyph(
                orient='velocity',
                scale='velocity_magnitude',
                factor=2.0
            )
            plotter.add_mesh(arrows,
                           color='yellow',
                           opacity=0.7)
        except Exception as e:
            print(f"速度矢量添加失败: {e}")
        
        print("添加流线...")
        # 流线
        try:
            # 流线种子点
            seed_points = []
            for y in np.linspace(-4, 4, 6):
                for z in [1.5, 2.5]:
                    seed_points.append([-8, y, z])
            
            seed_points = np.array(seed_points)
            
            # 创建3D流场
            flow_3d = pv.ImageData(dimensions=[50, 30, 10])
            flow_3d.origin = (-10, -6, 0)
            flow_3d.spacing = [0.4, 0.4, 0.4]
            
            # 计算3D流场
            points = flow_3d.points
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
            
            flow_3d['velocity'] = np.column_stack([u, v, w])
            
            streamlines = flow_3d.streamlines(
                vectors='velocity',
                start_position=seed_points,
                max_time=20.0
            )
            
            plotter.add_mesh(streamlines,
                           color='cyan',
                           line_width=3,
                           opacity=0.8)
            
        except Exception as e:
            print(f"流线生成失败: {e}")
        
        # 添加信息文本
        max_scour = abs(np.min(bed['scour_depth']))
        max_velocity = np.max(water['velocity_magnitude'])
        
        info_text = f"""CFD桥墩冲刷分析结果

几何参数:
• 桥墩直径: 2.0 m
• 计算域: 20×12 m
• 网格: 100×60 点

流场参数:
• 入流速度: 1.5 m/s  
• 最大流速: {max_velocity:.2f} m/s
• Reynolds数: 3.0×10⁶

冲刷结果:
• 最大冲刷深度: {max_scour:.2f} m
• 冲刷坑半径: 4.0 m
• 相对冲刷深度: {max_scour/2.0:.2f}

可视化要素:
🟤 河床地形 (带冲刷坑)
🔥 流速分布 (水面切片)
⚪ 桥墩结构
💛 速度矢量场  
🔵 流线轨迹"""
        
        plotter.add_text(info_text,
                        position='upper_left',
                        font_size=10,
                        color='white')
        
        # 操作说明
        control_text = """鼠标操作:
左键拖拽: 旋转视图
滚轮: 缩放
右键拖拽: 平移
Q键: 退出"""
        
        plotter.add_text(control_text,
                        position='lower_right',
                        font_size=9,
                        color='lightgray')
        
        # 设置相机
        plotter.camera_position = [(25, 25, 20), (0, 0, 0), (0, 0, 1)]
        plotter.camera.zoom(1.1)
        
        # 添加坐标轴
        plotter.add_axes(color='white', line_width=2)
        
        print("=" * 60)
        print("CFD可视化就绪!")
        print("• 使用鼠标旋转/缩放查看")
        print("• 查看流线、速度场、冲刷坑")
        print("• 按Q键退出")
        print("=" * 60)
        
        # 显示界面
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