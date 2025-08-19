#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple 3D Test - 最简单的3D测试
"""

import sys
from pathlib import Path
import pandas as pd

# 添加路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from beautiful_geological_interface import BeautifulGeologyCAE, GeologicalColorScheme
from PyQt6.QtWidgets import QApplication

try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False


def add_simple_test_content(viewport):
    """添加简单的测试内容"""
    if not viewport.plotter:
        print("[ERROR] 没有绘图器")
        return
    
    print("[INFO] 添加测试立方体...")
    
    # 创建几个不同颜色的立方体
    colors = ['red', 'green', 'blue', 'yellow', 'purple']
    
    for i, color in enumerate(colors):
        # 创建立方体
        cube = pv.Cube(center=(i*10, 0, 0))
        
        viewport.plotter.add_mesh(
            cube,
            color=color,
            opacity=0.8,
            show_edges=True,
            edge_color='black',
            line_width=2,
            label=f"cube_{i}"
        )
        
        print(f"[OK] 添加 {color} 立方体")
    
    # 添加地面
    ground = pv.Plane(center=(20, 0, -5), i_size=50, j_size=30)
    viewport.plotter.add_mesh(
        ground,
        color='lightgray',
        opacity=0.5,
        label="ground"
    )
    
    print("[OK] 添加地面")
    
    # 重置视图
    viewport.plotter.reset_camera()
    viewport.plotter.view_isometric()
    
    print("[OK] 3D内容添加完成，应该能看到5个彩色立方体")


def main():
    """主函数"""
    print(">> 简单3D测试")
    print("=" * 30)
    
    # 创建Qt应用
    app = QApplication(sys.argv)
    app.setApplicationName("简单3D测试")
    
    # 创建界面
    window = BeautifulGeologyCAE()
    window.show()
    
    # 更新界面信息
    window.data_manager.project_name_label.setText("3D功能测试")
    window.output_text.append("[测试] 界面已启动")
    
    if PYVISTA_AVAILABLE and window.viewport_3d.plotter:
        window.output_text.append("[测试] 3D视图可用")
        window.output_text.append("[测试] 正在添加测试内容...")
        
        # 添加简单测试内容
        add_simple_test_content(window.viewport_3d)
        
        window.output_text.append("[OK] 测试内容已添加")
        window.output_text.append("你应该能看到:")
        window.output_text.append("- 5个不同颜色的立方体")
        window.output_text.append("- 一个灰色地面")
        window.output_text.append("- 黑色边框线")
        
        if not window.viewport_3d.plotter:
            window.output_text.append("[ERROR] 3D绘图器不可用")
    else:
        window.output_text.append("[ERROR] 3D视图不可用")
    
    window.status_label.setText("[OK] 3D测试界面")
    
    print("界面已启动，检查是否能看到彩色立方体")
    
    # 启动应用
    sys.exit(app.exec())


if __name__ == "__main__":
    main()