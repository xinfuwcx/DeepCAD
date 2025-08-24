#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试PyVista是否真的工作
"""
import pyvista as pv
import numpy as np

def create_simple_animation():
    """创建一个简单的动画"""
    print("Creating PyVista animation...")
    
    # 创建一个简单的球体
    sphere = pv.Sphere(radius=1.0, center=(0, 0, 0))
    
    # 创建绘图器
    plotter = pv.Plotter(off_screen=True, window_size=[800, 600])  # 离屏渲染
    plotter.set_background('black')
    
    # 添加球体
    plotter.add_mesh(sphere, color='red', opacity=0.8)
    
    # 添加文本
    plotter.add_text("PyVista Test Animation", position='upper_left', font_size=16, color='white')
    
    # 设置相机
    plotter.camera_position = [(3, 3, 3), (0, 0, 0), (0, 0, 1)]
    
    # 截图保存
    screenshot_path = 'pyvista_test.png'
    plotter.screenshot(screenshot_path)
    
    print(f"Screenshot saved to: {screenshot_path}")
    
    # 创建多帧动画
    for i in range(5):
        # 旋转球体
        rotated_sphere = sphere.rotate_y(i * 30)
        plotter.clear()
        plotter.add_mesh(rotated_sphere, color='red', opacity=0.8)
        plotter.add_text(f"Frame {i+1}", position='upper_left', font_size=16, color='white')
        
        frame_path = f'frame_{i:02d}.png'
        plotter.screenshot(frame_path)
        print(f"Frame {i+1} saved to: {frame_path}")
    
    plotter.close()
    return True

if __name__ == "__main__":
    try:
        result = create_simple_animation()
        print("SUCCESS: PyVista animation created!")
        print("Check the generated PNG files to see the results.")
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()