#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
土层颜色演示脚本
展示不同土层的颜色区分效果
"""

import sys
from pathlib import Path
import numpy as np

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

try:
    import pyvista as pv
    from modules.preprocessor import PreProcessor
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    print("PyVista不可用")

def create_soil_layer_demo():
    """创建土层颜色演示"""
    if not PYVISTA_AVAILABLE:
        print("需要PyVista才能运行演示")
        return
        
    print("=== 土层颜色演示 ===")
    
    # 材料颜色配置
    material_colors = {
        1: {'color': [0.6, 0.3, 0.1], 'opacity': 0.5, 'name': '填土'},
        2: {'color': [1.0, 0.6, 0.2], 'opacity': 0.6, 'name': '粉质粘土'},
        3: {'color': [0.5, 0.5, 0.5], 'opacity': 0.4, 'name': '淤泥质土'},
        4: {'color': [0.8, 0.2, 0.2], 'opacity': 0.7, 'name': '粘土'},
        5: {'color': [1.0, 1.0, 0.3], 'opacity': 0.6, 'name': '砂土'},
        6: {'color': [0.1, 0.3, 0.6], 'opacity': 0.8, 'name': '基岩'},
        7: {'color': [0.4, 0.8, 0.4], 'opacity': 0.6, 'name': '土层7'},
        8: {'color': [0.8, 0.4, 0.8], 'opacity': 0.6, 'name': '土层8'},
        9: {'color': [0.2, 0.8, 0.8], 'opacity': 0.6, 'name': '土层9'},
        10: {'color': [0.7, 0.7, 0.7], 'opacity': 0.9, 'name': '混凝土桩'},
        11: {'color': [0.9, 0.9, 0.9], 'opacity': 0.95, 'name': '钢支撑'},
        12: {'color': [0.8, 0.8, 0.8], 'opacity': 0.85, 'name': '混凝土'}
    }
    
    # 创建演示场景
    plotter = pv.Plotter(window_size=(1600, 1000))
    
    # 设置Abaqus风格背景
    try:
        plotter.set_background([0.45, 0.5, 0.65])  # Abaqus蓝灰色
    except:
        plotter.set_background('white')
    
    # 创建不同土层的立方体，按垂直分层排列
    layer_height = 8
    layer_width = 40
    layer_depth = 30
    
    for i, (mat_id, props) in enumerate(material_colors.items()):
        # 计算位置 - 垂直堆叠，从上到下
        z_position = (len(material_colors) - i - 1) * layer_height - len(material_colors) * layer_height / 2
        
        # 创建土层立方体
        layer = pv.Cube(
            center=(0, 0, z_position),
            x_length=layer_width,
            y_length=layer_depth, 
            z_length=layer_height
        )
        
        # 添加到场景
        if mat_id in [10, 11, 12]:  # 支护结构
            plotter.add_mesh(
                layer,
                color=props['color'],
                metallic=0.8,
                roughness=0.2,
                pbr=True,
                opacity=props['opacity'],
                show_edges=True,
                edge_color='white',
                line_width=0.5,
                label=props['name']
            )
        else:  # 土体材料
            plotter.add_mesh(
                layer,
                color=props['color'],
                opacity=props['opacity'],
                show_edges=True,
                edge_color='white',
                line_width=0.5,
                label=props['name']
            )
        
        # 添加文字标签
        text_pos = (layer_width/2 + 5, 0, z_position)
        plotter.add_point_labels(
            [text_pos], 
            [f"{mat_id}: {props['name']}"],
            point_size=0,
            font_size=12,
            text_color='black',
            always_visible=True
        )
    
    # 添加标题
    plotter.add_text(
        "DeepCAD 土层颜色演示\n不同材料层的颜色区分效果",
        position='upper_left',
        font_size=16,
        color='darkblue'
    )
    
    # 显示坐标轴
    plotter.show_axes()
    
    # 设置相机视角
    plotter.view_isometric()
    
    print("显示土层演示窗口...")
    print("共12种材料的颜色配置:")
    for mat_id, props in material_colors.items():
        r, g, b = props['color']
        print(f"  材料{mat_id:2d}: {props['name']:12s} - RGB({r:.1f}, {g:.1f}, {b:.1f}) 透明度:{props['opacity']:.1f}")
    
    plotter.show()

def test_with_real_data():
    """使用真实数据测试土层颜色"""
    print("\n=== 使用真实FPN数据测试 ===")
    
    try:
        preprocessor = PreProcessor()
        
        # 检查真实FPN文件
        fpn_file = project_root / "data" / "基坑fpn.fpn"
        if fpn_file.exists():
            print("加载真实FPN文件...")
            preprocessor.load_fpn_file(str(fpn_file))
            
            if preprocessor.mesh:
                print("✅ 真实数据加载成功")
                print(f"材料类型: {np.unique(preprocessor.mesh.cell_data['MaterialID'])}")
                
                # 显示真实数据的半透明效果
                print("显示真实数据的土层颜色效果...")
                preprocessor.display_mesh()
                
                return True
        else:
            print("❌ 未找到真实FPN文件")
            return False
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

if __name__ == "__main__":
    print("土层颜色演示程序")
    print("=" * 50)
    
    if PYVISTA_AVAILABLE:
        # 1. 显示颜色配置演示
        create_soil_layer_demo()
        
        # 2. 测试真实数据
        test_with_real_data()
        
        print("\n演示完成！")
    else:
        print("需要安装PyVista才能运行演示")
        print("pip install pyvista")