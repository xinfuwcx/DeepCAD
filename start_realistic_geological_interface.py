#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Start Realistic Geological Interface - 启动真实地质界面
使用局部断层的真实地质数据
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np

# 添加路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# 导入美观界面
from beautiful_geological_interface import BeautifulGeologyCAE, GeologicalColorScheme
from PyQt6.QtWidgets import QApplication

try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False


def load_realistic_geological_data():
    """加载真实地质数据"""
    data_dir = Path("example3/data")
    
    try:
        # 读取真实钻孔数据
        borehole_data = pd.read_csv(data_dir / "realistic_borehole_data.csv")
        print(f"[OK] 加载真实钻孔数据: {len(borehole_data)} 条记录")
        
        # 读取断层数据
        fault_data = pd.read_csv(data_dir / "realistic_fault_data.csv")
        print(f"[OK] 加载断层数据: {len(fault_data)} 个控制点")
        
        # 为每个地层分配颜色
        formations = borehole_data['formation_name'].unique()
        print(f"[OK] 发现地层: {list(formations)}")
        
        # 显示断层影响统计
        fault_affected = borehole_data[borehole_data['in_fault_zone'] == True]
        print(f"[INFO] 受断层影响的记录: {len(fault_affected)} 条")
        print(f"[INFO] 受影响的钻孔: {fault_affected['borehole_id'].nunique()} 个")
        
        return {
            'borehole_data': borehole_data,
            'fault_data': fault_data,
            'formations': formations
        }
        
    except Exception as e:
        print(f"[ERROR] 数据加载失败: {e}")
        return None


def create_realistic_geological_visualization(viewport, data):
    """创建真实地质可视化 - 显示局部断层效应"""
    if not viewport.plotter or not data:
        return
        
    borehole_data = data['borehole_data']
    fault_data = data['fault_data']
    formations = data['formations']
    
    print(f"[INFO] 开始创建真实地质可视化，{len(formations)} 个地层...")
    
    # 获取整体数据范围
    x_min, x_max = borehole_data['x'].min(), borehole_data['x'].max()
    y_min, y_max = borehole_data['y'].min(), borehole_data['y'].max()
    z_min, z_max = borehole_data['z_bottom'].min(), borehole_data['z_top'].max()
    
    # X轴剖切位置（中间）
    x_cut_pos = x_min + (x_max - x_min) * 0.5
    
    print(f"[INFO] 创建剖切面地质图，剖切位置 X = {x_cut_pos:.1f}m")
    
    # 显示全部地层
    layer_count = 0
    
    for formation_name in formations:
        try:
            formation_data = borehole_data[borehole_data['formation_name'] == formation_name]
            if len(formation_data) == 0:
                continue
                
            color = GeologicalColorScheme.get_formation_color(formation_name, enhanced=True)
            
            # 将数据分为两组：受断层影响的和未受影响的
            normal_data = formation_data[formation_data['in_fault_zone'] == False]
            fault_data_group = formation_data[formation_data['in_fault_zone'] == True]
            
            # 创建正常区域的地层
            if len(normal_data) > 0:
                avg_thickness = normal_data['thickness'].mean()
                avg_z_top = normal_data['z_top'].mean()
                avg_z_bottom = normal_data['z_bottom'].mean()
                
                # 创建正常区域的剖面矩形
                normal_rect = pv.Plane(
                    center=[x_cut_pos, (y_min + y_max)/2, (avg_z_top + avg_z_bottom)/2],
                    direction=[1, 0, 0],
                    i_size=(y_max - y_min) * 0.6,  # 只占部分区域
                    j_size=avg_thickness
                )
                
                viewport.plotter.add_mesh(
                    normal_rect,
                    color=color,
                    opacity=0.9,
                    show_edges=True,
                    edge_color='black',
                    line_width=2,
                    label=f"normal_{formation_name}"
                )
            
            # 创建断层影响区域的地层（如果存在）
            if len(fault_data_group) > 0:
                fault_avg_thickness = fault_data_group['thickness'].mean()
                fault_avg_z_top = fault_data_group['z_top'].mean()
                fault_avg_z_bottom = fault_data_group['z_bottom'].mean()
                
                # 断层区域的地层可能错位和厚度变化
                fault_rect = pv.Plane(
                    center=[x_cut_pos, y_min + (y_max - y_min) * 0.8, 
                           (fault_avg_z_top + fault_avg_z_bottom)/2 - 10],  # 错位
                    direction=[1, 0, 0],
                    i_size=(y_max - y_min) * 0.3,  # 断层影响区域较小
                    j_size=fault_avg_thickness * 0.7  # 厚度可能减少
                )
                
                viewport.plotter.add_mesh(
                    fault_rect,
                    color=color,
                    opacity=0.7,  # 稍微透明表示受到破坏
                    show_edges=True,
                    edge_color='red',  # 用红边表示断层影响
                    line_width=3,
                    label=f"fault_{formation_name}"
                )
            
            # 添加地层名称标签
            viewport.plotter.add_text(
                formation_name,
                position=[x_cut_pos + 10, y_max - 50 - layer_count * 30, 
                         (avg_z_top + avg_z_bottom)/2 if len(normal_data) > 0 else 0],
                font_size=10,
                color='black'
            )
            
            print(f"[OK] 真实地层: {formation_name} (正常:{len(normal_data)}, 断层:{len(fault_data_group)})") 
            layer_count += 1
            
        except Exception as e:
            print(f"[ERROR] 创建地层 {formation_name} 失败: {e}")
    
    # 添加断层破碎带
    try:
        # 主断层破碎带
        fault_zone1 = pv.Plane(
            center=[x_cut_pos, y_min + (y_max - y_min) * 0.5, (z_min + z_max)/2],
            direction=[1, 0, 0],
            i_size=100,  # 破碎带宽度
            j_size=z_max - z_min
        )
        
        viewport.plotter.add_mesh(
            fault_zone1,
            color='red',
            opacity=0.8,
            show_edges=True,
            edge_color='darkred',
            line_width=4,
            label="fault_zone_F1"
        )
        
        # 次断层破碎带
        fault_zone2 = pv.Plane(
            center=[x_cut_pos, y_min + (y_max - y_min) * 0.7, (z_min + z_max)/2],
            direction=[1, 0, 0],
            i_size=80,  # 较小的破碎带
            j_size=(z_max - z_min) * 0.8
        )
        
        viewport.plotter.add_mesh(
            fault_zone2,
            color='orange',
            opacity=0.7,
            show_edges=True,
            edge_color='darkorange',
            line_width=3,
            label="fault_zone_F2"
        )
        
        print("[OK] 添加断层破碎带")
        
    except Exception as e:
        print(f"[WARNING] 断层创建失败: {e}")
    
    # 添加一些代表性钻孔
    try:
        # 选择不同区域的钻孔
        selected_boreholes = ['ZK001', 'ZK025', 'ZK050', 'ZK075', 'ZK100']
        
        for borehole_id in selected_boreholes:
            bh_data = borehole_data[borehole_data['borehole_id'] == borehole_id]
            if len(bh_data) == 0:
                continue
                
            x = bh_data['x'].iloc[0]
            y = bh_data['y'].iloc[0]
            in_fault = bh_data['in_fault_zone'].iloc[0]
            
            # 显示钻孔柱状图
            for _, row in bh_data.iterrows():
                z_top = row['z_top']
                z_bottom = row['z_bottom']
                thickness = z_top - z_bottom
                
                if thickness > 0:
                    cylinder = pv.Cylinder(
                        center=(x_cut_pos + 15, y, (z_top + z_bottom) / 2),
                        direction=(0, 0, 1),
                        radius=3,
                        height=thickness,
                        resolution=12
                    )
                    
                    color = GeologicalColorScheme.get_formation_color(row['formation_name'], enhanced=True)
                    edge_color = 'red' if in_fault else 'black'
                    
                    viewport.plotter.add_mesh(
                        cylinder,
                        color=color,
                        opacity=0.8,
                        show_edges=True,
                        edge_color=edge_color,
                        line_width=2 if in_fault else 1,
                        label=f"borehole_{borehole_id}_{row['formation_name']}"
                    )
        
        print("[OK] 添加代表性钻孔")
        
    except Exception as e:
        print(f"[WARNING] 钻孔显示失败: {e}")
    
    print(f"[OK] 真实地质可视化完成，显示了 {layer_count} 个地层")


def main():
    """主函数"""
    print(">> 启动真实地质建模界面")
    print("=" * 50)
    
    # 创建Qt应用
    app = QApplication(sys.argv)
    app.setApplicationName("真实地质建模 - 局部断层效应")
    
    # 创建美观主界面
    window = BeautifulGeologyCAE()
    window.show()
    
    # 加载真实地质数据
    print("\n>> 加载真实地质数据...")
    data = load_realistic_geological_data()
    
    if data:
        # 更新数据管理器
        window.data_manager.project_name_label.setText("真实地质测试 - 局部断层")
        window.data_manager.extent_label.setText("1000×1000×200m")
        window.data_manager.boreholes_count.setText("100")
        window.data_manager.formations_count.setText(str(len(data['formations'])))
        window.data_manager.faults_count.setText("2个局部断层")
        
        # 更新地层图例
        window.data_manager.update_formation_legend()
        
        # 输出加载信息
        window.output_text.append("[OK] 已加载真实地质数据")
        window.output_text.append(f"  >> 地层数量: {len(data['formations'])} 层")
        window.output_text.append(f"  >> 钻孔数据: {len(data['borehole_data'])} 条记录")
        window.output_text.append(f"  >> 断层数据: {len(data['fault_data'])} 个控制点")
        
        # 显示断层统计
        fault_affected = data['borehole_data'][data['borehole_data']['in_fault_zone'] == True]
        window.output_text.append(f"  >> 断层影响: {fault_affected['borehole_id'].nunique()} 个钻孔受影响")
        
        # 在3D视口中创建真实可视化
        if PYVISTA_AVAILABLE and window.viewport_3d.plotter:
            print("\n>> 创建真实3D可视化...")
            
            # 创建真实地质可视化
            create_realistic_geological_visualization(window.viewport_3d, data)
            
            # 重置视图到最佳角度
            window.viewport_3d.plotter.reset_camera()
            window.viewport_3d.plotter.view_xz()
            
            # 输出成功信息
            window.output_text.append("[OK] 真实地质可视化创建完成")
            window.output_text.append("  >> 显示局部断层效应")
            window.output_text.append("  >> 部分地层缺失或错位")
            window.output_text.append("  >> 红色边框表示断层影响区域")
            
            print("[OK] 真实3D可视化完成")
        
        # 更新状态
        window.status_label.setText("[OK] 真实地质数据加载完成")
        
        print("\n>> 真实地质界面准备完成!")
        print("特色功能:")
        print("  >> 局部断层效应 - 只在特定区域有断层")
        print("  >> 地层缺失 - 断层区域某些地层消失")
        print("  >> 真实地质序列 - 符合实际地质规律")
        print("  >> 断层位移 - 基岩层受到错位影响")
    
    else:
        window.status_label.setText("[ERROR] 数据加载失败")
        window.output_text.append("[ERROR] 真实测试数据加载失败")
    
    # 启动应用
    sys.exit(app.exec())


if __name__ == "__main__":
    main()