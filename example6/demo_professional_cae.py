#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
专业CAE系统演示脚本
展示WSL FEniCS集成和专业3D可视化
"""

import sys
import time
import json
from pathlib import Path

# 设置路径
sys.path.insert(0, str(Path(__file__).parent))

def demo_wsl_fenics():
    """演示WSL FEniCS功能"""
    print("🎯 演示1: WSL FEniCS有限元计算")
    print("=" * 50)
    
    # 导入CAE服务
    from example6_service import Example6Service
    
    # 创建服务实例
    service = Example6Service()
    
    # 测试参数
    demo_params = {
        "pier_diameter": 2.5,
        "flow_velocity": 2.0,
        "water_depth": 5.0,
        "d50": 0.8e-3,
        "approach_angle": 0.0,
        "water_density": 1000.0,
        "sediment_density": 2650.0,
        "gravity": 9.81
    }
    
    print(f"📋 演示参数:")
    for key, value in demo_params.items():
        print(f"   {key}: {value}")
    
    print("\n🚀 开始CAE计算...")
    start_time = time.time()
    
    # 执行计算
    result = service.cae_simulate(demo_params)
    
    computation_time = time.time() - start_time
    
    if result.get("success"):
        print(f"✅ 计算成功! 耗时: {computation_time:.2f}秒")
        print(f"🏗️ 求解器: {result.get('method', '未知')}")
        print(f"🌊 冲刷深度: {result.get('scour_depth', 0):.3f} m")
        print(f"💨 最大流速: {result.get('max_velocity', 0):.3f} m/s")
        print(f"🔢 雷诺数: {result.get('reynolds_number', 0):.0f}")
        print(f"🌊 弗劳德数: {result.get('froude_number', 0):.3f}")
        
        if 'computation_environment' in result:
            print(f"🖥️ 计算环境: {result['computation_environment']}")
        
        return result
    else:
        print(f"❌ 计算失败: {result.get('error', '未知错误')}")
        return None

def demo_professional_gui():
    """演示专业GUI界面"""
    print("\n🎯 演示2: 专业CAE图形界面")
    print("=" * 50)
    
    try:
        from PyQt6.QtWidgets import QApplication
        from professional_cae_gui import ProfessionalCAEMainWindow
        
        print("🖥️ 启动专业CAE界面...")
        
        # 创建应用程序
        app = QApplication([])
        app.setApplicationName("DeepCAD专业CAE系统")
        
        # 创建主窗口
        window = ProfessionalCAEMainWindow()
        window.show()
        
        print("✅ 专业界面已启动!")
        print("📌 功能特点:")
        print("   • 专业级3D可视化 (PyVista + 光照系统)")
        print("   • WSL FEniCS有限元集成")
        print("   • 实时流场动画")
        print("   • 云图和等值面显示")
        print("   • 现代化参数面板")
        print("   • 异步计算线程")
        
        # 运行界面
        return app.exec()
        
    except ImportError as e:
        print(f"❌ GUI依赖缺失: {e}")
        print("💡 请安装: pip install PyQt6 pyvista pyvistaqt")
        return False

def demo_visualization_features():
    """演示可视化功能"""
    print("\n🎯 演示3: 高级可视化功能")
    print("=" * 50)
    
    try:
        import pyvista as pv
        import numpy as np
        
        print("🎨 创建专业级3D可视化演示...")
        
        # 创建绘图器
        plotter = pv.Plotter(off_screen=False, window_size=(800, 600))
        
        # 设置专业背景
        plotter.set_background('gradient')
        plotter.enable_anti_aliasing()
        plotter.enable_shadows()
        
        # 创建演示几何
        # 水道
        channel = pv.Box(bounds=[-15, 15, -8, 8, -1, 0])
        plotter.add_mesh(channel, color='ocean', opacity=0.7, label='水道')
        
        # 桥墩
        pier = pv.Cylinder(center=(0, 0, -0.5), radius=1.2, height=1.0, resolution=50)
        plotter.add_mesh(pier, color='steel', metallic=0.8, roughness=0.2, label='桥墩')
        
        # 流线
        x = np.linspace(-15, 15, 20)
        y = np.linspace(-8, 8, 15)
        z = np.linspace(-0.8, -0.2, 5)
        xx, yy, zz = np.meshgrid(x, y, z, indexing='ij')
        
        # 速度场
        r = np.sqrt(xx**2 + yy**2)
        u = 1.0 * (1 - np.exp(-0.5 * ((r - 1.2) / 0.5)**2))
        v = 0.1 * np.sin(xx)
        w = 0.05 * np.cos(yy)
        
        grid = pv.StructuredGrid(xx, yy, zz)
        grid.point_data['velocity'] = np.column_stack([u.ravel(), v.ravel(), w.ravel()])
        
        # 创建流线
        seed_points = [[-12, yi, -0.5] for yi in np.linspace(-6, 6, 8)]
        streamlines = grid.streamlines(vectors='velocity', start_position=seed_points)
        plotter.add_mesh(streamlines, color='cyan', line_width=3, label='流线')
        
        # 添加专业光照
        light1 = pv.Light(position=(20, 20, 20), intensity=1.0)
        light2 = pv.Light(position=(-10, 15, 10), intensity=0.6, color='lightblue')
        plotter.add_light(light1)
        plotter.add_light(light2)
        
        # 设置相机和显示
        plotter.camera_position = 'isometric'
        plotter.add_legend()
        plotter.show_bounds(grid='back')
        plotter.add_axes()
        
        print("✅ 可视化演示创建完成!")
        print("📌 可视化特点:")
        print("   • 专业级材质和光照")
        print("   • 流场流线可视化")
        print("   • 渐变背景和阴影")
        print("   • 金属材质桥墩")
        print("   • 半透明水体")
        
        # 显示
        plotter.show()
        
        return True
        
    except ImportError as e:
        print(f"❌ 可视化依赖缺失: {e}")
        print("💡 请安装: pip install pyvista")
        return False

def main():
    """主演示程序"""
    print("🌟 DeepCAD专业CAE系统 - 完整功能演示")
    print("=" * 60)
    print("✨ 特色功能:")
    print("   🐧 WSL FEniCS有限元计算")
    print("   🎨 专业级3D可视化")
    print("   ⚡ 异步计算线程")
    print("   🌊 流场动画和云图")
    print("   🏗️ 现代化GUI界面")
    print("=" * 60)
    
    # 演示选择
    while True:
        print("\n🎯 请选择演示:")
        print("1. WSL FEniCS有限元计算")
        print("2. 专业GUI界面启动")
        print("3. 高级可视化功能")
        print("4. 运行所有演示")
        print("0. 退出")
        
        choice = input("\n请输入选择 (0-4): ").strip()
        
        if choice == '0':
            print("👋 演示结束，感谢使用!")
            break
        elif choice == '1':
            demo_wsl_fenics()
        elif choice == '2':
            demo_professional_gui()
        elif choice == '3':
            demo_visualization_features()
        elif choice == '4':
            print("🚀 运行所有演示...")
            demo_wsl_fenics()
            demo_visualization_features()
            demo_professional_gui()
        else:
            print("❌ 无效选择，请重试")

if __name__ == "__main__":
    main()
