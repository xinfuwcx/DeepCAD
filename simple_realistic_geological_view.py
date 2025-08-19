#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple Realistic Geological View - 简单可靠的真实地质视图
显示局部断层效应，不会崩溃
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


def load_and_display_realistic_data():
    """加载并显示真实地质数据"""
    data_dir = Path("example3/data")
    
    try:
        # 读取真实钻孔数据
        borehole_data = pd.read_csv(data_dir / "realistic_borehole_data.csv")
        print(f"[OK] 加载数据: {len(borehole_data)} 条记录")
        
        # 统计断层影响
        normal_count = len(borehole_data[borehole_data['in_fault_zone'] == False])
        fault_count = len(borehole_data[borehole_data['in_fault_zone'] == True])
        
        print(f"[INFO] 正常区域记录: {normal_count}")
        print(f"[INFO] 断层影响记录: {fault_count}")
        
        # 检查地层分布
        formations = borehole_data['formation_name'].unique()
        print(f"[INFO] 地层种类: {list(formations)}")
        
        # 检查每个地层在断层区的情况
        for formation in formations:
            total = len(borehole_data[borehole_data['formation_name'] == formation])
            fault_affected = len(borehole_data[
                (borehole_data['formation_name'] == formation) & 
                (borehole_data['in_fault_zone'] == True)
            ])
            print(f"  {formation}: 总共{total}条, 断层影响{fault_affected}条")
        
        return borehole_data
        
    except Exception as e:
        print(f"[ERROR] 数据加载失败: {e}")
        return None


def create_simple_cross_section(viewport, borehole_data):
    """创建简单可靠的地质剖面"""
    if not viewport.plotter or borehole_data is None:
        return
    
    print("[INFO] 创建简单地质剖面...")
    
    # 获取数据范围
    x_min, x_max = borehole_data['x'].min(), borehole_data['x'].max()
    y_min, y_max = borehole_data['y'].min(), borehole_data['y'].max()
    z_min, z_max = borehole_data['z_bottom'].min(), borehole_data['z_top'].max()
    
    # 剖切位置
    x_cut = x_min + (x_max - x_min) * 0.5
    
    print(f"[INFO] 数据范围: X:{x_min:.0f}-{x_max:.0f}, Y:{y_min:.0f}-{y_max:.0f}, Z:{z_min:.0f}-{z_max:.0f}")
    print(f"[INFO] 剖切位置: X = {x_cut:.0f}m")
    
    # 获取地层列表
    formations = borehole_data['formation_name'].unique()
    layer_count = 0
    
    # 为每个地层创建两个区域：正常区域和断层区域
    for formation in formations:
        try:
            formation_data = borehole_data[borehole_data['formation_name'] == formation]
            
            # 分离正常和断层数据
            normal_data = formation_data[formation_data['in_fault_zone'] == False]
            fault_data = formation_data[formation_data['in_fault_zone'] == True]
            
            color = GeologicalColorScheme.get_formation_color(formation, enhanced=True)
            
            # 1. 创建正常区域
            if len(normal_data) > 0:
                avg_z_top = normal_data['z_top'].mean()
                avg_z_bottom = normal_data['z_bottom'].mean()
                avg_thickness = normal_data['thickness'].mean()
                
                # 正常区域矩形 (左侧)
                normal_rect = pv.Plane(
                    center=[x_cut, y_min + (y_max - y_min) * 0.25, (avg_z_top + avg_z_bottom) / 2],
                    direction=[1, 0, 0],
                    i_size=(y_max - y_min) * 0.4,
                    j_size=avg_thickness
                )
                
                viewport.plotter.add_mesh(
                    normal_rect,
                    color=color,
                    opacity=0.9,
                    show_edges=True,
                    edge_color='black',
                    line_width=2,
                    label=f"{formation}_normal"
                )
                
                print(f"[OK] 正常区域: {formation} (厚度: {avg_thickness:.1f}m)")
            
            # 2. 创建断层影响区域 (如果存在且不同)
            if len(fault_data) > 0:
                fault_avg_z_top = fault_data['z_top'].mean()
                fault_avg_z_bottom = fault_data['z_bottom'].mean()
                fault_avg_thickness = fault_data['thickness'].mean()
                
                # 断层区域矩形 (右侧，可能有位移)
                displacement = -10 if formation in ['中砂', '粗砂', '砾砂', '卵石层'] else -5
                
                fault_rect = pv.Plane(
                    center=[x_cut, y_min + (y_max - y_min) * 0.75, 
                           (fault_avg_z_top + fault_avg_z_bottom) / 2 + displacement],
                    direction=[1, 0, 0],
                    i_size=(y_max - y_min) * 0.3,
                    j_size=fault_avg_thickness * 0.8  # 可能变薄
                )
                
                viewport.plotter.add_mesh(
                    fault_rect,
                    color=color,
                    opacity=0.7,
                    show_edges=True,
                    edge_color='red',
                    line_width=3,
                    label=f"{formation}_fault"
                )
                
                print(f"[OK] 断层区域: {formation} (厚度: {fault_avg_thickness:.1f}m, 位移: {displacement}m)")
            
            # 添加地层标签
            label_z = avg_z_top if len(normal_data) > 0 else fault_avg_z_top
            viewport.plotter.add_text(
                formation,
                position=[x_cut + 20, y_max - 50, label_z - layer_count * 15],
                font_size=10,
                color='black'
            )
            
            layer_count += 1
            
        except Exception as e:
            print(f"[ERROR] 处理地层 {formation} 失败: {e}")
    
    # 添加明显的断层带
    try:
        # 主断层带 F1
        fault_zone = pv.Plane(
            center=[x_cut, y_min + (y_max - y_min) * 0.5, (z_min + z_max) / 2],
            direction=[1, 0, 0],
            i_size=80,
            j_size=z_max - z_min
        )
        
        viewport.plotter.add_mesh(
            fault_zone,
            color='red',
            opacity=0.6,
            show_edges=True,
            edge_color='darkred',
            line_width=4,
            label="主断层F1"
        )
        
        # 次断层带 F2
        fault_zone2 = pv.Plane(
            center=[x_cut, y_min + (y_max - y_min) * 0.7, (z_min + z_max) / 2],
            direction=[1, 0, 0],
            i_size=60,
            j_size=(z_max - z_min) * 0.8
        )
        
        viewport.plotter.add_mesh(
            fault_zone2,
            color='orange',
            opacity=0.5,
            show_edges=True,
            edge_color='darkorange',
            line_width=3,
            label="次断层F2"
        )
        
        print("[OK] 添加断层带")
        
    except Exception as e:
        print(f"[WARNING] 断层带失败: {e}")
    
    print(f"[OK] 地质剖面创建完成，共 {layer_count} 个地层")


def main():
    """主函数"""
    print(">> 启动简单可靠的真实地质视图")
    print("=" * 50)
    
    # 创建Qt应用
    app = QApplication(sys.argv)
    app.setApplicationName("简单真实地质视图")
    
    # 创建界面
    window = BeautifulGeologyCAE()
    window.show()
    
    # 加载数据
    print("\n>> 加载真实地质数据...")
    borehole_data = load_and_display_realistic_data()
    
    if borehole_data is not None:
        # 更新界面信息
        formations = borehole_data['formation_name'].unique()
        fault_affected_holes = borehole_data[borehole_data['in_fault_zone'] == True]['borehole_id'].nunique()
        
        window.data_manager.project_name_label.setText("简单真实地质演示")
        window.data_manager.extent_label.setText("1000×1000×200m")
        window.data_manager.boreholes_count.setText("100")
        window.data_manager.formations_count.setText(str(len(formations)))
        window.data_manager.faults_count.setText(f"2个断层影响{fault_affected_holes}个钻孔")
        
        # 输出信息
        window.output_text.append("[OK] 真实地质数据加载成功")
        window.output_text.append(f"  地层类型: {len(formations)} 种")
        window.output_text.append(f"  数据记录: {len(borehole_data)} 条")
        window.output_text.append(f"  断层影响: {fault_affected_holes} 个钻孔")
        
        # 显示各地层在断层区的分布情况
        for formation in formations:
            total = len(borehole_data[borehole_data['formation_name'] == formation])
            fault_count = len(borehole_data[
                (borehole_data['formation_name'] == formation) & 
                (borehole_data['in_fault_zone'] == True)
            ])
            if fault_count < total:  # 有地层缺失
                window.output_text.append(f"  {formation}: {fault_count}/{total} 在断层区 (部分缺失)")
        
        # 创建3D视图
        if PYVISTA_AVAILABLE and window.viewport_3d.plotter:
            print("\n>> 创建3D剖面...")
            
            create_simple_cross_section(window.viewport_3d, borehole_data)
            
            # 设置视图
            window.viewport_3d.plotter.reset_camera()
            window.viewport_3d.plotter.view_xz()
            
            window.output_text.append("[OK] 3D地质剖面创建完成")
            window.output_text.append("  显示效果:")
            window.output_text.append("  >> 左侧: 正常地层区域")
            window.output_text.append("  >> 右侧: 断层影响区域")
            window.output_text.append("  >> 红色带: 断层破碎带")
            window.output_text.append("  >> 部分地层在断层区缺失或变薄")
            
            print("[OK] 3D剖面完成")
        
        window.status_label.setText("[OK] 简单真实地质视图准备完成")
    
    else:
        window.status_label.setText("[ERROR] 数据加载失败")
        window.output_text.append("[ERROR] 无法加载真实地质数据")
    
    # 启动应用
    sys.exit(app.exec())


if __name__ == "__main__":
    main()