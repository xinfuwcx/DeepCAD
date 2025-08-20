#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Clean Geological Visualization - 干净的地质剖切显示
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


def load_geological_data():
    """加载地质数据"""
    data_dir = Path("example3/data")
    
    try:
        borehole_data = pd.read_csv(data_dir / "complex_borehole_data.csv")
        print(f"[OK] 加载钻孔数据: {len(borehole_data)} 条记录")
        
        formations = borehole_data['formation_name'].unique()
        print(f"[OK] 发现地层: {list(formations)}")
        
        # 添加增强颜色
        borehole_data['enhanced_color'] = borehole_data['formation_name'].apply(
            lambda x: GeologicalColorScheme.get_formation_color(x, enhanced=True)
        )
        
        return {
            'borehole_data': borehole_data,
            'formations': formations
        }
        
    except Exception as e:
        print(f"[ERROR] 数据加载失败: {e}")
        return None


def create_clean_section_view(viewport, data):
    """创建真正的地质剖切视图 - 基于钻孔数据的真实地层形态"""
    if not viewport.plotter or not data:
        return
        
    borehole_data = data['borehole_data']
    formations = data['formations']
    
    # 获取数据范围
    x_min, x_max = borehole_data['x'].min(), borehole_data['x'].max()
    y_min, y_max = borehole_data['y'].min(), borehole_data['y'].max()
    z_min, z_max = borehole_data['z_bottom'].min(), borehole_data['z_top'].max()
    
    # 剖切位置
    x_cut_pos = x_min + (x_max - x_min) * 0.5
    
    print(f"[INFO] 创建真实地质剖切，剖切位置 X = {x_cut_pos:.1f}m")
    
    # 找到靠近剖切面的钻孔
    section_boreholes = []
    for borehole_id in borehole_data['borehole_id'].unique():
        bh_info = borehole_data[borehole_data['borehole_id'] == borehole_id].iloc[0]
        x, y = bh_info['x'], bh_info['y'] 
        
        if abs(x - x_cut_pos) < 100:  # 100m范围内的钻孔
            section_boreholes.append((borehole_id, x, y))
    
    # 按Y坐标排序
    section_boreholes.sort(key=lambda x: x[2])
    
    print(f"[INFO] 选择了 {len(section_boreholes)} 个钻孔用于剖切")
    
    # 为每个地层创建真实的剖切面
    layer_count = 0
    for formation_name in formations:
        formation_data = borehole_data[borehole_data['formation_name'] == formation_name]
        if len(formation_data) < 3:
            continue
            
        try:
            color = GeologicalColorScheme.get_formation_color(formation_name, enhanced=True)
            
            # 收集该地层在剖切线上的点
            section_points_top = []
            section_points_bottom = []
            
            for bh_id, x, y in section_boreholes:
                bh_data = formation_data[formation_data['borehole_id'] == bh_id]
                if len(bh_data) > 0:
                    row = bh_data.iloc[0]
                    z_top = row['z_top']
                    z_bottom = row['z_bottom']
                    
                    section_points_top.append([x_cut_pos, y, z_top])
                    section_points_bottom.append([x_cut_pos, y, z_bottom])
            
            if len(section_points_top) >= 3:
                # 创建顶面线
                top_points = np.array(section_points_top)
                bottom_points = np.array(section_points_bottom)
                
                # 排序以确保正确连接
                top_sorted = top_points[np.argsort(top_points[:, 1])]
                bottom_sorted = bottom_points[np.argsort(bottom_points[:, 1])]
                
                # 创建地层轮廓
                all_points = np.vstack([top_sorted, bottom_sorted[::-1]])  # 底部点逆序以形成闭合轮廓
                
                # 创建2D多边形
                polygon_2d = []
                for pt in all_points:
                    polygon_2d.append([pt[1], pt[2]])  # Y, Z 坐标
                
                # 创建多边形面
                try:
                    from scipy.spatial import ConvexHull
                    hull = ConvexHull(polygon_2d)
                    
                    # 创建3D多边形
                    poly_points = []
                    poly_faces = []
                    
                    for i, (y, z) in enumerate(polygon_2d):
                        poly_points.append([x_cut_pos, y, z])
                    
                    # 创建面
                    hull_faces = []
                    for simplex in hull.simplices:
                        hull_faces.extend([3, simplex[0], simplex[1], simplex[2]])
                    
                    polygon = pv.PolyData(poly_points, faces=hull_faces)
                    
                    # 显示地层多边形
                    viewport.plotter.add_mesh(
                        polygon,
                        color=color,
                        opacity=0.8,
                        show_edges=True,
                        edge_color='black',
                        line_width=2,
                        label=f"section_{formation_name}"
                    )
                    
                    layer_count += 1
                    print(f"[OK] 真实剖切地层: {formation_name} ({len(section_points_top)}个控制点)")
                    
                except:
                    # 降级方案：使用简单线条连接
                    for i in range(len(top_sorted)-1):
                        # 顶线
                        top_line = pv.Line(top_sorted[i], top_sorted[i+1])
                        viewport.plotter.add_mesh(
                            top_line,
                            color=color,
                            line_width=4,
                            label=f"top_line_{formation_name}_{i}"
                        )
                        
                        # 底线
                        bottom_line = pv.Line(bottom_sorted[i], bottom_sorted[i+1])
                        viewport.plotter.add_mesh(
                            bottom_line,
                            color=color,
                            line_width=4,
                            label=f"bottom_line_{formation_name}_{i}"
                        )
                    
                    print(f"[OK] 线条剖切地层: {formation_name}")
                    layer_count += 1
                    
        except Exception as e:
            print(f"[ERROR] 创建地层 {formation_name} 失败: {e}")
    
    # 添加断层线
    try:
        # 主断层
        fault_line1 = pv.Line(
            [x_cut_pos, y_min + y_extent*0.4, z_max],
            [x_cut_pos, y_min + y_extent*0.6, z_min]
        )
        viewport.plotter.add_mesh(
            fault_line1,
            color='red',
            line_width=8,
            label="fault1"
        )
        
        # 次断层
        fault_line2 = pv.Line(
            [x_cut_pos, y_min + y_extent*0.7, z_max-20],
            [x_cut_pos, y_min + y_extent*0.8, z_min+20]
        )
        viewport.plotter.add_mesh(
            fault_line2,
            color='darkred',
            line_width=6,
            label="fault2"
        )
        
        print("[OK] 添加断层线")
        
    except Exception as e:
        print(f"[WARNING] 断层线失败: {e}")
    
    # 添加几个代表性钻孔
    try:
        selected_ids = ['ZK001', 'ZK010', 'ZK020', 'ZK030']
        
        for borehole_id in selected_ids:
            bh_data = borehole_data[borehole_data['borehole_id'] == borehole_id]
            if len(bh_data) == 0:
                continue
                
            x = bh_data['x'].iloc[0]
            y = bh_data['y'].iloc[0]
            
            # 显示钻孔柱状图
            for _, row in bh_data.iterrows():
                z_top = row['z_top']
                z_bottom = row['z_bottom'] 
                thickness = z_top - z_bottom
                
                if thickness > 0:
                    cylinder = pv.Cylinder(
                        center=(x_cut_pos + 10, y, (z_top + z_bottom) / 2),
                        direction=(0, 0, 1),
                        radius=3,
                        height=thickness,
                        resolution=12
                    )
                    
                    color = row['enhanced_color']
                    
                    viewport.plotter.add_mesh(
                        cylinder,
                        color=color,
                        opacity=0.8,
                        show_edges=True,
                        edge_color='black',
                        line_width=1,
                        label=f"borehole_{borehole_id}"
                    )
        
        print("[OK] 添加代表性钻孔")
        
    except Exception as e:
        print(f"[WARNING] 钻孔失败: {e}")
    
    print(f"[OK] 成功创建 {layer_count} 个地层的剖切显示")


def main():
    """主函数"""
    print(">> 启动干净的地质剖切界面")
    print("=" * 50)
    
    # 创建Qt应用
    app = QApplication(sys.argv)
    app.setApplicationName("Clean Geological Section")
    
    # 创建主界面
    window = BeautifulGeologyCAE()
    window.show()
    
    # 加载数据
    data = load_geological_data()
    
    if data:
        # 更新界面信息
        window.data_manager.project_name_label.setText("干净剖切演示")
        window.data_manager.extent_label.setText("1000×1000×200m")
        window.data_manager.boreholes_count.setText("100")
        window.data_manager.formations_count.setText(str(len(data['formations'])))
        
        # 创建剖切视图
        if PYVISTA_AVAILABLE and window.viewport_3d.plotter:
            create_clean_section_view(window.viewport_3d, data)
            
            # 设置视图
            window.viewport_3d.plotter.reset_camera()
            window.viewport_3d.plotter.view_xz()
            
            window.output_text.append("[OK] 干净的地质剖切视图创建完成")
        
        window.status_label.setText("[OK] 剖切视图加载完成")
    
    else:
        window.status_label.setText("[ERROR] 数据加载失败")
    
    # 启动应用
    sys.exit(app.exec())


if __name__ == "__main__":
    main()