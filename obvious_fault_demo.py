#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Obvious Fault Demo - 明显的断层演示
用最直观的方式显示断层效应
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from beautiful_geological_interface import BeautifulGeologyCAE, GeologicalColorScheme
from PyQt6.QtWidgets import QApplication

try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False


def create_obvious_fault_comparison(viewport):
    """创建明显的断层对比展示"""
    if not viewport.plotter:
        return
    
    print("[INFO] 创建明显的断层对比...")
    
    # 读取数据
    data_file = Path("example3/data/realistic_borehole_data.csv")
    df = pd.read_csv(data_file)
    
    # 地层列表和颜色
    formations = ['填土', '粘土', '粉质粘土', '细砂', '中砂', '粗砂', '砾砂', '卵石层']
    colors = ['#8B4513', '#FF0000', '#FF8C00', '#FFD700', '#32CD32', '#00CED1', '#1E90FF', '#9932CC']
    
    # 左侧：正常区域（完整的地层柱）
    print("创建正常区域...")
    x_normal = -200
    z_start = 0
    
    for i, (formation, color) in enumerate(zip(formations, colors)):
        # 创建大块地层
        layer_block = pv.Cube(
            center=(x_normal, 0, z_start - i*15 - 7.5),
            x_length=150,
            y_length=300,
            z_length=15
        )
        
        viewport.plotter.add_mesh(
            layer_block,
            color=color,
            opacity=0.9,
            show_edges=True,
            edge_color='black',
            line_width=2,
            label=f"normal_{formation}"
        )
        
        # 添加地层标签
        viewport.plotter.add_text(
            formation,
            position=[x_normal - 100, 0, z_start - i*15 - 7.5],
            font_size=12,
            color='white'
        )
    
    # 中间：断层带（红色）
    print("创建断层带...")
    fault_zone = pv.Plane(
        center=[0, 0, -60],
        direction=[1, 0, 0],
        i_size=300,
        j_size=120
    )
    
    viewport.plotter.add_mesh(
        fault_zone,
        color='red',
        opacity=0.7,
        show_edges=True,
        edge_color='darkred',
        line_width=5,
        label="fault_zone"
    )
    
    # 添加断层标签
    viewport.plotter.add_text(
        "断层带",
        position=[0, 0, 20],
        font_size=16,
        color='red'
    )
    
    # 右侧：断层影响区域（有缺失的地层）
    print("创建断层影响区域...")
    x_fault = 200
    
    # 根据实际数据显示缺失情况
    fault_percentages = {
        '填土': 22, '粘土': 22, '粉质粘土': 22, '细砂': 22,
        '中砂': 11, '粗砂': 9, '砾砂': 20, '卵石层': 17
    }
    
    for i, (formation, color) in enumerate(zip(formations, colors)):
        percentage = fault_percentages.get(formation, 22)
        
        if percentage > 15:  # 基本保留
            # 正常大小，但略有损坏
            layer_block = pv.Cube(
                center=(x_fault, 0, z_start - i*15 - 7.5 - 5),  # 略微下沉
                x_length=120,  # 略小
                y_length=250,  # 略小
                z_length=12    # 略薄
            )
            
            opacity = 0.8
            edge_color = 'orange'
            status = "轻微影响"
            
        else:  # 严重缺失
            # 明显更小的块
            layer_block = pv.Cube(
                center=(x_fault, 0, z_start - i*15 - 7.5 - 10),  # 明显下沉
                x_length=60,   # 很小
                y_length=150,  # 很小  
                z_length=6     # 很薄
            )
            
            opacity = 0.6
            edge_color = 'red'
            status = "严重缺失"
        
        viewport.plotter.add_mesh(
            layer_block,
            color=color,
            opacity=opacity,
            show_edges=True,
            edge_color=edge_color,
            line_width=3,
            label=f"fault_{formation}"
        )
        
        # 添加地层标签和状态
        viewport.plotter.add_text(
            f"{formation}\n({status})",
            position=[x_fault + 80, 0, z_start - i*15 - 7.5],
            font_size=10,
            color='red' if percentage < 15 else 'orange'
        )
        
        print(f"  {formation}: {percentage}% 保留 - {status}")
    
    # 添加说明文字
    viewport.plotter.add_text(
        "正常区域\n(完整地层序列)",
        position=[x_normal, 200, 50],
        font_size=14,
        color='blue'
    )
    
    viewport.plotter.add_text(
        "断层影响区域\n(地层缺失变薄)",
        position=[x_fault, 200, 50],
        font_size=14,
        color='red'
    )
    
    # 添加箭头指示断层影响
    try:
        arrow = pv.Arrow(
            start=[0, -200, 20],
            direction=[0, 0, -80],
            tip_length=0.3,
            tip_radius=0.15,
            shaft_radius=0.05,
            scale=50
        )
        
        viewport.plotter.add_mesh(
            arrow,
            color='red',
            label="fault_arrow"
        )
        
        viewport.plotter.add_text(
            "断层破坏方向",
            position=[0, -250, 0],
            font_size=12,
            color='red'
        )
        
    except Exception as e:
        print(f"[WARNING] 箭头创建失败: {e}")
    
    print("[OK] 明显断层对比创建完成")


def main():
    """主函数"""
    print(">> 明显断层效应演示")
    print("=" * 30)
    
    # 创建Qt应用
    app = QApplication(sys.argv)
    app.setApplicationName("明显断层效应演示")
    
    # 创建界面
    window = BeautifulGeologyCAE()
    window.show()
    
    # 更新界面信息
    window.data_manager.project_name_label.setText("断层效应对比演示")
    window.data_manager.boreholes_count.setText("100")
    window.data_manager.formations_count.setText("8")
    window.data_manager.faults_count.setText("2个局部断层")
    
    # 输出说明
    window.output_text.append("[OK] 明显断层效应演示")
    window.output_text.append("")
    window.output_text.append("对比展示:")
    window.output_text.append("  左侧: 正常地层区域 (完整)")
    window.output_text.append("  中间: 红色断层带")
    window.output_text.append("  右侧: 断层影响区域 (缺失)")
    window.output_text.append("")
    window.output_text.append("断层影响统计:")
    window.output_text.append("  中砂: 89% 缺失 (严重)")
    window.output_text.append("  粗砂: 91% 缺失 (严重)")
    window.output_text.append("  砾砂: 80% 缺失 (明显)")
    window.output_text.append("  卵石层: 83% 缺失 (明显)")
    window.output_text.append("  其他地层: 轻微影响")
    
    # 创建3D对比视图
    if PYVISTA_AVAILABLE and window.viewport_3d.plotter:
        create_obvious_fault_comparison(window.viewport_3d)
        
        # 设置最佳视角
        window.viewport_3d.plotter.reset_camera()
        window.viewport_3d.plotter.view_isometric()
        
        window.output_text.append("")
        window.output_text.append("[OK] 3D对比视图创建完成")
        window.output_text.append("应该能明显看到:")
        window.output_text.append("  - 左侧完整的彩色地层")
        window.output_text.append("  - 中间红色断层带")
        window.output_text.append("  - 右侧残缺的地层")
    
    window.status_label.setText("[OK] 断层效应对比演示")
    
    # 启动应用
    sys.exit(app.exec())


if __name__ == "__main__":
    main()