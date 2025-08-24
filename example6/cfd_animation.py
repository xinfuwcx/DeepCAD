#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基于PyVista的CFD后处理动画
展示桥墩冲刷演化全过程
"""

import numpy as np
import pyvista as pv
import time
from pathlib import Path
import sys

# 添加路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

class CFDPostProcessor:
    """CFD后处理器"""
    
    def __init__(self):
        self.plotter = None
        self.mesh_data = {}
        self.time_steps = []
        
    def create_initial_geometry(self, pier_diameter=2.0, domain_size=20.0):
        """创建初始几何"""
        print("创建初始CFD几何...")
        
        # 计算域
        domain_length = domain_size
        domain_width = domain_size * 0.6
        water_depth = 4.0
        
        # 创建水域
        water_bounds = [-domain_length/2, domain_length/2, 
                       -domain_width/2, domain_width/2, 
                       0, water_depth]
        water_mesh = pv.ImageData(dimensions=[100, 60, 20], 
                                 spacing=[domain_length/99, domain_width/59, water_depth/19])
        water_mesh.origin = (-domain_length/2, -domain_width/2, 0)
        
        # 创建河床
        bed_mesh = pv.Plane(center=(0, 0, 0), 
                           i_size=domain_length, 
                           j_size=domain_width,
                           i_resolution=100, 
                           j_resolution=60)
        
        # 创建桥墩
        pier_mesh = pv.Cylinder(center=(0, 0, water_depth/2),
                               radius=pier_diameter/2,
                               height=water_depth,
                               resolution=32)
        
        return {
            'water': water_mesh,
            'bed': bed_mesh,
            'pier': pier_mesh,
            'domain_bounds': water_bounds
        }
    
    def calculate_flow_field(self, geometry, time_step, flow_velocity=1.5):
        """计算流场（基于势流+粘性修正）"""
        water_mesh = geometry['water']
        pier_radius = 1.0
        
        # 获取网格点坐标
        points = water_mesh.points
        x, y, z = points[:, 0], points[:, 1], points[:, 2]
        
        # 势流解
        r = np.sqrt(x**2 + y**2)
        theta = np.arctan2(y, x)
        
        # 避免奇点
        r = np.maximum(r, pier_radius * 1.01)
        
        # 速度场（修正的势流）
        u = flow_velocity * (1 - pier_radius**2 * np.cos(2*theta) / r**2)
        v = -flow_velocity * pier_radius**2 * np.sin(2*theta) / r**2
        w = np.zeros_like(u)
        
        # 在桥墩内部设置速度为零
        mask = r <= pier_radius
        u[mask] = 0
        v[mask] = 0
        w[mask] = 0
        
        # 添加时间相关的湍流扰动
        turbulence_factor = 0.1 * np.sin(time_step * 2 * np.pi / 10)
        u += turbulence_factor * flow_velocity * np.random.normal(0, 0.1, u.shape)
        v += turbulence_factor * flow_velocity * np.random.normal(0, 0.05, v.shape)
        
        # 速度大小
        velocity_magnitude = np.sqrt(u**2 + v**2 + w**2)
        
        # 压力场（伯努利方程）
        pressure = 0.5 * 1000 * (flow_velocity**2 - velocity_magnitude**2)
        
        # 剪切应力（简化）
        shear_stress = 1000 * 0.005 * velocity_magnitude**2
        
        # 添加数据到网格
        water_mesh['velocity'] = np.column_stack([u, v, w])
        water_mesh['velocity_magnitude'] = velocity_magnitude
        water_mesh['pressure'] = pressure
        water_mesh['shear_stress'] = shear_stress
        
        return water_mesh
    
    def calculate_scour_evolution(self, geometry, time_step, max_time=50):
        """计算冲刷演化"""
        bed_mesh = geometry['bed']
        pier_radius = 1.0
        
        # 获取床面点坐标
        points = bed_mesh.points
        x, y = points[:, 0], points[:, 1]
        
        # 距桥墩的距离
        r = np.sqrt(x**2 + y**2)
        
        # 冲刷演化函数
        t_factor = time_step / max_time
        max_scour_depth = 3.0 * pier_radius  # 最大冲刷深度
        
        # 冲刷坑形状（随时间演化）
        scour_depth = np.zeros_like(r)
        
        # 在桥墩周围产生冲刷
        scour_radius = 4.0 * pier_radius
        mask = r <= scour_radius
        
        if mask.any():
            # 冲刷深度分布（高斯型，随时间增长）
            normalized_r = r[mask] / scour_radius
            scour_intensity = np.exp(-3 * normalized_r**2)  # 高斯分布
            growth_factor = 1 - np.exp(-t_factor * 2)  # 时间增长因子
            
            scour_depth[mask] = -max_scour_depth * scour_intensity * growth_factor
        
        # 更新Z坐标
        points[:, 2] = scour_depth
        bed_mesh.points = points
        
        # 添加冲刷深度数据
        bed_mesh['scour_depth'] = scour_depth
        bed_mesh['erosion_rate'] = np.abs(scour_depth) / (time_step + 1)
        
        return bed_mesh
    
    def create_streamlines(self, flow_mesh, geometry):
        """创建流线"""
        # 种子点（上游多个位置）
        domain_bounds = geometry['domain_bounds']
        seed_points = []
        
        # 在上游创建种子点网格
        for y in np.linspace(-5, 5, 10):
            for z in np.linspace(0.5, 3.5, 5):
                seed_points.append([-8, y, z])
        
        seed_points = np.array(seed_points)
        
        # 生成流线
        streamlines = flow_mesh.streamlines(
            vectors='velocity',
            start_position=seed_points,
            max_time=20.0,
            initial_step_length=0.1,
            integration_direction='forward'
        )
        
        return streamlines
    
    def setup_plotter(self):
        """设置PyVista绘图器"""
        self.plotter = pv.Plotter(notebook=False, window_size=[1200, 800])
        self.plotter.set_background('#0a0a0a')  # 黑色背景
        
        # 添加光源
        self.plotter.add_light(pv.Light(position=(10, 10, 10), color='white'))
        
        return self.plotter
    
    def animate_scour_process(self, pier_diameter=2.0, flow_velocity=1.5, max_time_steps=100):
        """动画展示冲刷过程"""
        print("开始CFD动画渲染...")
        
        # 创建绘图器
        plotter = self.setup_plotter()
        
        # 创建初始几何
        geometry = self.create_initial_geometry(pier_diameter)
        
        # 动画参数
        frame_count = 0
        
        def update_scene():
            nonlocal frame_count
            
            # 清除之前的actors
            plotter.clear()
            
            # 当前时间步
            time_step = frame_count
            
            print(f"渲染第 {frame_count+1}/{max_time_steps} 帧...")
            
            # 计算流场
            flow_mesh = self.calculate_flow_field(geometry, time_step, flow_velocity)
            
            # 计算冲刷演化
            bed_mesh = self.calculate_scour_evolution(geometry, time_step, max_time_steps)
            
            # 创建流线
            streamlines = self.create_streamlines(flow_mesh, geometry)
            
            # 添加河床（带冲刷坑）
            plotter.add_mesh(bed_mesh, 
                           scalars='scour_depth',
                           cmap='terrain_r',
                           opacity=0.9,
                           scalar_bar_args={'title': '冲刷深度 (m)'})
            
            # 添加水面切片（显示流场）
            water_slice = flow_mesh.slice(normal=[0, 0, 1], origin=[0, 0, 2])
            plotter.add_mesh(water_slice,
                           scalars='velocity_magnitude',
                           cmap='plasma',
                           opacity=0.7,
                           scalar_bar_args={'title': '流速 (m/s)'})
            
            # 添加流线
            plotter.add_mesh(streamlines,
                           color='cyan',
                           line_width=2,
                           opacity=0.8)
            
            # 添加桥墩
            pier_mesh = geometry['pier']
            plotter.add_mesh(pier_mesh,
                           color='lightgray',
                           opacity=0.9)
            
            # 添加速度矢量（稀疏显示）
            if frame_count % 5 == 0:  # 每5帧显示一次矢量
                sampling_grid = pv.ImageData(dimensions=[20, 15, 8])
                vector_points = flow_mesh.sample(sampling_grid)
                arrows = vector_points.glyph(orient='velocity', 
                                           scale='velocity_magnitude',
                                           factor=0.5)
                plotter.add_mesh(arrows, 
                               color='yellow',
                               opacity=0.6)
            
            # 添加文本信息
            info_text = f"""CFD冲刷演化分析
时间: {time_step*0.1:.1f} 小时
流速: {flow_velocity:.1f} m/s
桥墩直径: {pier_diameter:.1f} m
最大冲刷深度: {abs(np.min(bed_mesh['scour_depth'])):.2f} m"""
            
            plotter.add_text(info_text, 
                           position='upper_left',
                           font_size=10,
                           color='white')
            
            # 设置视角
            plotter.camera_position = [(15, 15, 12), (0, 0, 0), (0, 0, 1)]
            
            frame_count += 1
            
            # 如果达到最大帧数，重新开始
            if frame_count >= max_time_steps:
                frame_count = 0
        
        # 创建静态动画帧
        print("生成动画帧...")
        for i in range(min(20, max_time_steps)):  # 生成20帧预览
            frame_count = i
            update_scene()
            
            # 截图保存
            screenshot_name = f'scour_frame_{i:03d}.png'
            plotter.screenshot(screenshot_name, transparent_background=False)
            
            if i == 0:
                # 显示第一帧
                plotter.show(interactive=True)
                break
        
        return plotter

def main():
    """主函数"""
    print("=" * 60)
    print("PyVista CFD后处理动画系统")
    print("=" * 60)
    
    try:
        # 检查PyVista
        import pyvista as pv
        print(f"PyVista版本: {pv.__version__}")
        
        # 创建后处理器
        processor = CFDPostProcessor()
        
        # 启动动画
        print("\n启动CFD冲刷演化动画...")
        print("按 'q' 退出动画")
        
        processor.animate_scour_process(
            pier_diameter=2.0,
            flow_velocity=1.5,
            max_time_steps=50
        )
        
    except ImportError:
        print("ERROR: 需要安装PyVista")
        print("安装命令: pip install pyvista")
    
    except Exception as e:
        print(f"动画创建失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()