#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Final Geological Interface - 最终地质界面
清晰显示断层效应和地层差异
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


def load_geological_data():
    """加载地质数据"""
    data_dir = Path("example3/data")
    
    try:
        borehole_data = pd.read_csv(data_dir / "realistic_borehole_data.csv")
        print(f"[OK] 加载数据: {len(borehole_data)} 条记录")
        
        formations = borehole_data['formation_name'].unique()
        print(f"[OK] 地层种类: {len(formations)}")
        
        # 统计断层影响
        normal_records = borehole_data[borehole_data['in_fault_zone'] == False]
        fault_records = borehole_data[borehole_data['in_fault_zone'] == True]
        
        print(f"[INFO] 正常区域: {len(normal_records)} 条记录")
        print(f"[INFO] 断层区域: {len(fault_records)} 条记录")
        
        return borehole_data, formations
        
    except Exception as e:
        print(f"[ERROR] 数据加载失败: {e}")
        return None, None


def create_clear_geological_view(viewport, borehole_data, formations):
    """创建清晰的地质视图"""
    if not viewport.plotter or borehole_data is None:
        return
    
    print("[INFO] 创建清晰地质视图...")
    
    # 获取数据范围
    x_min, x_max = borehole_data['x'].min(), borehole_data['x'].max()
    y_min, y_max = borehole_data['y'].min(), borehole_data['y'].max()
    z_min, z_max = borehole_data['z_bottom'].min(), borehole_data['z_top'].max()
    
    # 剖切位置
    x_cut = x_min + (x_max - x_min) * 0.5
    
    print(f"[INFO] 剖切位置: X = {x_cut:.0f}m")
    print(f"[INFO] 数据范围: Y:{y_min:.0f}-{y_max:.0f}, Z:{z_min:.0f}-{z_max:.0f}")
    
    # 按顺序显示地层
    layer_order = ['填土', '粘土', '粉质粘土', '细砂', '中砂', '粗砂', '砾砂', '卵石层', '强风化岩', '中风化岩', '微风化岩', '基岩']
    
    y_positions = np.linspace(y_min + 50, y_max - 50, len(layer_order))
    
    for i, formation in enumerate(layer_order):
        if formation not in formations:
            continue
            
        try:
            formation_data = borehole_data[borehole_data['formation_name'] == formation]
            
            # 分离正常和断层数据
            normal_data = formation_data[formation_data['in_fault_zone'] == False]
            fault_data = formation_data[formation_data['in_fault_zone'] == True]
            
            color = GeologicalColorScheme.get_formation_color(formation, enhanced=True)
            
            # 1. 正常区域（左侧）
            if len(normal_data) > 0:
                avg_thickness = normal_data['thickness'].mean()
                avg_z = normal_data['z_top'].mean() - avg_thickness/2
                
                normal_block = pv.Cube(
                    center=(x_cut - 100, y_positions[i], avg_z),
                    x_length=150,
                    y_length=30,
                    z_length=avg_thickness
                )
                
                viewport.plotter.add_mesh(
                    normal_block,
                    color=color,
                    opacity=0.9,
                    show_edges=True,
                    edge_color='black',
                    line_width=2,
                    label=f"{formation}_normal"
                )
                
                # 添加标签
                viewport.plotter.add_text(
                    f"{formation} (正常)",
                    position=[x_cut - 200, y_positions[i], avg_z],
                    font_size=10,
                    color='black'
                )
                
                print(f"[OK] 正常区域: {formation} (厚度: {avg_thickness:.1f}m, 记录: {len(normal_data)})")
            
            # 2. 断层区域（右侧，可能缺失）
            if len(fault_data) > 0:
                fault_thickness = fault_data['thickness'].mean()
                fault_z = fault_data['z_top'].mean() - fault_thickness/2
                
                # 某些地层在断层区明显减少或变薄
                reduction_factor = len(fault_data) / len(formation_data)
                if reduction_factor < 0.3:  # 严重缺失
                    fault_thickness *= 0.5
                    opacity = 0.6
                    edge_color = 'red'
                    status = "严重缺失"
                elif reduction_factor < 0.6:  # 部分缺失
                    fault_thickness *= 0.7
                    opacity = 0.7
                    edge_color = 'orange'
                    status = "部分缺失"
                else:  # 基本完整
                    opacity = 0.8
                    edge_color = 'darkred'
                    status = "基本完整"
                
                fault_block = pv.Cube(
                    center=(x_cut + 100, y_positions[i], fault_z - 10),  # 略微错位
                    x_length=120,
                    y_length=25,
                    z_length=fault_thickness
                )
                
                viewport.plotter.add_mesh(
                    fault_block,
                    color=color,
                    opacity=opacity,
                    show_edges=True,
                    edge_color=edge_color,
                    line_width=3,
                    label=f"{formation}_fault"
                )
                
                # 添加断层区标签
                viewport.plotter.add_text(
                    f"{formation} (断层-{status})",
                    position=[x_cut + 150, y_positions[i], fault_z],
                    font_size=10,
                    color='red'
                )
                
                print(f"[OK] 断层区域: {formation} (厚度: {fault_thickness:.1f}m, 记录: {len(fault_data)}, {status})")
            
            else:
                # 完全缺失的地层
                viewport.plotter.add_text(
                    f"{formation} (完全缺失)",
                    position=[x_cut + 150, y_positions[i], 0],
                    font_size=10,
                    color='red'
                )
                print(f"[WARNING] 断层区域: {formation} 完全缺失")
            
        except Exception as e:
            print(f"[ERROR] 处理地层 {formation} 失败: {e}")
    
    # 添加明显的断层带
    try:
        # 主断层带
        fault_zone = pv.Plane(
            center=[x_cut, (y_min + y_max)/2, (z_min + z_max)/2],
            direction=[1, 0, 0],
            i_size=y_max - y_min,
            j_size=z_max - z_min
        )
        
        viewport.plotter.add_mesh(
            fault_zone,
            color='red',
            opacity=0.3,
            show_edges=True,
            edge_color='darkred',
            line_width=4,
            label="断层带"
        )
        
        # 添加断层说明
        viewport.plotter.add_text(
            "断层破碎带",
            position=[x_cut, y_max - 100, z_max - 20],
            font_size=14,
            color='red'
        )
        
        print("[OK] 添加断层带")
        
    except Exception as e:
        print(f"[WARNING] 断层带失败: {e}")
    
    # 添加说明文字
    try:
        viewport.plotter.add_text(
            "左侧: 正常地层区域",
            position=[x_cut - 200, y_max - 50, z_max - 50],
            font_size=12,
            color='blue'
        )
        
        viewport.plotter.add_text(
            "右侧: 断层影响区域",
            position=[x_cut + 100, y_max - 50, z_max - 50],
            font_size=12,
            color='red'
        )
        
    except Exception as e:
        print(f"[WARNING] 说明文字失败: {e}")
    
    print("[OK] 清晰地质视图创建完成")


def main():
    """主函数"""
    print(">> 启动最终地质界面")
    print("=" * 40)
    
    # 创建Qt应用
    app = QApplication(sys.argv)
    app.setApplicationName("最终地质界面 - 断层效应展示")
    
    # 创建界面
    window = BeautifulGeologyCAE()
    window.show()
    
    # 加载数据
    borehole_data, formations = load_geological_data()
    
    if borehole_data is not None:
        # 更新界面信息
        window.data_manager.project_name_label.setText("断层效应展示")
        window.data_manager.boreholes_count.setText("100")
        window.data_manager.formations_count.setText(str(len(formations)))
        
        # 统计信息
        fault_affected_holes = borehole_data[borehole_data['in_fault_zone'] == True]['borehole_id'].nunique()
        window.data_manager.faults_count.setText(f"影响{fault_affected_holes}个钻孔")
        
        # 输出详细信息
        window.output_text.append("[OK] 真实地质数据加载成功")
        window.output_text.append("")
        window.output_text.append("断层效应统计:")
        
        for formation in formations:
            total = len(borehole_data[borehole_data['formation_name'] == formation])
            fault_count = len(borehole_data[
                (borehole_data['formation_name'] == formation) & 
                (borehole_data['in_fault_zone'] == True)
            ])
            
            percentage = (fault_count / total * 100) if total > 0 else 0
            
            if percentage < 30:
                status = "严重缺失"
            elif percentage < 60:
                status = "部分缺失"
            else:
                status = "基本完整"
            
            window.output_text.append(f"  {formation}: {fault_count}/{total} ({percentage:.0f}%) - {status}")
        
        window.output_text.append("")
        window.output_text.append("视图说明:")
        window.output_text.append("  左侧: 正常地层区域（完整序列）")
        window.output_text.append("  右侧: 断层影响区域（部分缺失）")
        window.output_text.append("  红色边框: 断层破坏严重的地层")
        window.output_text.append("  橙色边框: 断层影响中等的地层")
        
        # 创建3D视图
        if PYVISTA_AVAILABLE and window.viewport_3d.plotter:
            create_clear_geological_view(window.viewport_3d, borehole_data, formations)
            
            # 设置视图
            window.viewport_3d.plotter.reset_camera()
            window.viewport_3d.plotter.view_isometric()
            
            window.output_text.append("")
            window.output_text.append("[OK] 3D地质视图创建完成")
        
        window.status_label.setText("[OK] 断层效应展示完成")
    
    else:
        window.status_label.setText("[ERROR] 数据加载失败")
    
    # 启动应用
    sys.exit(app.exec())


if __name__ == "__main__":
    main()