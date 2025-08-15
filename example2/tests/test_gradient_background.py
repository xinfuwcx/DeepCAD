#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试Abaqus风格渐变背景
"""

import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

try:
    import pyvista as pv
    import numpy as np
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    print("PyVista不可用")

def test_gradient_backgrounds():
    """测试不同的渐变背景效果"""
    if not PYVISTA_AVAILABLE:
        print("需要PyVista才能运行测试")
        return
        
    print("=== 测试Abaqus风格渐变背景 ===")
    
    # 创建测试网格
    mesh = pv.Sphere(radius=5)
    
    # 测试1: Abaqus经典渐变 (银灰到深蓝)
    print("测试1: Abaqus经典渐变背景...")
    plotter1 = pv.Plotter(window_size=(800, 600))
    plotter1.add_mesh(mesh, color='orange', opacity=0.7)
    
    try:
        # Abaqus风格: 底部银灰色，顶部深蓝色
        plotter1.set_background(
            color=[0.85, 0.85, 0.9],    # 底部银灰色
            top=[0.1, 0.2, 0.4]         # 顶部深蓝色
        )
        plotter1.add_text("Abaqus经典渐变\n底部银灰 -> 顶部深蓝", 
                         position='upper_left', font_size=14, color='white')
        print("✅ Abaqus渐变背景设置成功")
        plotter1.show()
        
    except Exception as e:
        print(f"❌ Abaqus渐变背景失败: {e}")
        plotter1.set_background([0.45, 0.5, 0.65])
        plotter1.add_text("Abaqus单色背景\n(渐变不支持)", 
                         position='upper_left', font_size=14, color='white')
        plotter1.show()
    
    # 测试2: 其他渐变风格
    print("测试2: 其他专业CAE软件风格...")
    plotter2 = pv.Plotter(window_size=(800, 600))
    plotter2.add_mesh(mesh, color='lightblue', opacity=0.8)
    
    try:
        # ANSYS风格: 黑到深灰
        plotter2.set_background(
            color=[0.0, 0.0, 0.0],      # 底部黑色
            top=[0.2, 0.2, 0.2]         # 顶部深灰
        )
        plotter2.add_text("ANSYS风格渐变\n底部黑色 -> 顶部深灰", 
                         position='upper_left', font_size=14, color='white')
        print("✅ ANSYS风格渐变背景设置成功")
        plotter2.show()
        
    except Exception as e:
        print(f"❌ ANSYS风格渐变失败: {e}")
    
    # 测试3: 温和渐变
    print("测试3: 温和专业渐变...")
    plotter3 = pv.Plotter(window_size=(800, 600))
    plotter3.add_mesh(mesh, color='gold', opacity=0.6)
    
    try:
        # 温和渐变: 浅蓝到白色
        plotter3.set_background(
            color=[1.0, 1.0, 1.0],      # 底部白色
            top=[0.7, 0.8, 1.0]         # 顶部浅蓝
        )
        plotter3.add_text("温和专业渐变\n底部白色 -> 顶部浅蓝", 
                         position='upper_left', font_size=14, color='black')
        print("✅ 温和渐变背景设置成功")
        plotter3.show()
        
    except Exception as e:
        print(f"❌ 温和渐变失败: {e}")

def test_with_preprocessor():
    """测试预处理器的渐变背景"""
    print("\n=== 测试预处理器渐变背景 ===")
    
    try:
        from modules.preprocessor import PreProcessor
        
        preprocessor = PreProcessor()
        
        # 测试背景设置
        preprocessor.set_abaqus_style_background()
        
        # 如果有真实数据，加载它
        fpn_file = project_root / "data" / "基坑fpn.fpn"
        if fpn_file.exists():
            print("使用真实FPN数据测试渐变背景...")
            preprocessor.load_fpn_file(str(fpn_file))
            
            if preprocessor.mesh:
                # 显示半透明土层效果配合渐变背景
                preprocessor.display_mesh()
                print("✅ 真实数据+渐变背景显示成功")
                return True
        else:
            print("未找到真实数据，但背景设置成功")
            return True
            
    except Exception as e:
        print(f"❌ 预处理器测试失败: {e}")
        return False

if __name__ == "__main__":
    print("Abaqus风格渐变背景测试")
    print("=" * 50)
    
    if PYVISTA_AVAILABLE:
        # 测试基本渐变背景
        test_gradient_backgrounds()
        
        # 测试预处理器集成
        test_with_preprocessor()
        
        print("\n🎨 渐变背景测试完成!")
        print("如果看到多个窗口展示不同的渐变效果，说明功能正常")
        
    else:
        print("需要安装PyVista才能运行测试")
        print("pip install pyvista")