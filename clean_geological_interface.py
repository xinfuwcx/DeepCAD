#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Clean Geological Interface - 干净的地质界面
加载真实数据并正确显示
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np

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


def load_realistic_data():
    """加载真实地质数据"""
    data_dir = Path("example3/data")
    
    try:
        borehole_data = pd.read_csv(data_dir / "realistic_borehole_data.csv")
        print(f"[OK] 加载数据: {len(borehole_data)} 条记录")
        
        formations = borehole_data['formation_name'].unique()
        print(f"[OK] 地层种类: {len(formations)}")
        
        return borehole_data, formations
        
    except Exception as e:
        print(f"[ERROR] 数据加载失败: {e}")
        return None, None


def create_geological_section(viewport, borehole_data, formations):
    """创建地质剖面"""
    if not viewport.plotter or borehole_data is None:
        return
    
    print("[INFO] 创建地质剖面...")
    
    # 获取数据范围
    x_min, x_max = borehole_data['x'].min(), borehole_data['x'].max()
    y_min, y_max = borehole_data['y'].min(), borehole_data['y'].max()
    z_min, z_max = borehole_data['z_bottom'].min(), borehole_data['z_top'].max()
    
    # 剖切位置
    x_cut = x_min + (x_max - x_min) * 0.5
    
    print(f"[INFO] 剖切位置: X = {x_cut:.0f}m")
    
    # 为每个地层创建剖面
    for i, formation in enumerate(formations):
        try:
            formation_data = borehole_data[borehole_data['formation_name'] == formation]
            if len(formation_data) == 0:
                continue
            
            color = GeologicalColorScheme.get_formation_color(formation, enhanced=True)
            
            # 计算平均厚度和位置
            avg_thickness = formation_data['thickness'].mean()
            avg_z_top = formation_data['z_top'].mean()
            avg_z_bottom = formation_data['z_bottom'].mean()
            
            # 创建地层矩形
            layer_rect = pv.Plane(
                center=[x_cut, (y_min + y_max)/2, (avg_z_top + avg_z_bottom)/2],
                direction=[1, 0, 0],
                i_size=y_max - y_min,
                j_size=avg_thickness
            )
            
            viewport.plotter.add_mesh(
                layer_rect,
                color=color,
                opacity=0.9,
                show_edges=True,
                edge_color='black',
                line_width=2,
                label=formation
            )
            
            # 添加地层标签
            viewport.plotter.add_text(
                formation,
                position=[x_cut + 20, y_max - 50, avg_z_top - i * 10],
                font_size=10,
                color='black'
            )
            
            print(f"[OK] 地层: {formation} (厚度: {avg_thickness:.1f}m)")
            
        except Exception as e:
            print(f"[ERROR] 地层 {formation} 创建失败: {e}")
    
    # 添加断层线
    try:
        fault_line = pv.Line(
            [x_cut, y_min + (y_max - y_min) * 0.4, z_max],
            [x_cut, y_min + (y_max - y_min) * 0.6, z_min]
        )
        
        viewport.plotter.add_mesh(
            fault_line,
            color='red',
            line_width=6,
            label="断层"
        )
        
        print("[OK] 添加断层线")
        
    except Exception as e:
        print(f"[WARNING] 断层线失败: {e}")


def main():
    """主函数"""
    print(">> 启动干净地质界面")
    print("=" * 30)
    
    # 创建Qt应用
    app = QApplication(sys.argv)
    app.setApplicationName("干净地质界面")
    
    # 创建界面
    window = BeautifulGeologyCAE()
    window.show()
    
    # 加载数据
    borehole_data, formations = load_realistic_data()
    
    if borehole_data is not None:
        # 更新界面信息
        window.data_manager.project_name_label.setText("真实地质数据")
        window.data_manager.boreholes_count.setText("100")
        window.data_manager.formations_count.setText(str(len(formations)))
        
        # 输出信息
        window.output_text.append("[OK] 数据加载成功")
        window.output_text.append(f"地层数量: {len(formations)}")
        window.output_text.append(f"数据记录: {len(borehole_data)}")
        
        # 统计断层影响
        fault_affected = borehole_data[borehole_data['in_fault_zone'] == True]
        window.output_text.append(f"断层影响: {len(fault_affected)} 条记录")
        
        # 显示部分地层缺失情况
        for formation in formations:
            total = len(borehole_data[borehole_data['formation_name'] == formation])
            fault_count = len(borehole_data[
                (borehole_data['formation_name'] == formation) & 
                (borehole_data['in_fault_zone'] == True)
            ])
            if fault_count < total * 0.5:  # 断层区明显减少
                window.output_text.append(f"{formation}: 断层区缺失明显")
        
        # 创建3D视图
        if PYVISTA_AVAILABLE and window.viewport_3d.plotter:
            create_geological_section(window.viewport_3d, borehole_data, formations)
            
            # 设置视图
            window.viewport_3d.plotter.reset_camera()
            window.viewport_3d.plotter.view_xz()
            
            window.output_text.append("[OK] 3D剖面创建完成")
        
        window.status_label.setText("[OK] 界面准备完成")
    
    else:
        window.status_label.setText("[ERROR] 数据加载失败")
    
    # 启动应用
    sys.exit(app.exec())


if __name__ == "__main__":
    main()