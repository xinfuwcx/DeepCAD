#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Load Test Data into Professional Interface
加载测试数据到专业界面
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np

# 添加路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# 导入专业界面
from professional_abaqus_interface import ProfessionalGeologyCAE
from PyQt6.QtWidgets import QApplication

try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False


def load_geological_test_data():
    """加载地质测试数据"""
    data_dir = Path("example3/data")
    
    try:
        # 读取钻孔数据
        borehole_data = pd.read_csv(data_dir / "complex_borehole_data.csv")
        print(f"[OK] 加载钻孔数据: {len(borehole_data)} 条记录")
        
        # 读取地层点数据
        surface_points = pd.read_csv(data_dir / "complex_surface_points.csv")
        print(f"[OK] 加载地层点: {len(surface_points)} 个点")
        
        # 读取断层数据
        fault_data = pd.read_csv(data_dir / "complex_fault_data.csv")
        print(f"[OK] 加载断层数据: {len(fault_data)} 个点")
        
        return {
            'borehole_data': borehole_data,
            'surface_points': surface_points,
            'fault_data': fault_data
        }
        
    except Exception as e:
        print(f"[ERROR] 数据加载失败: {e}")
        return None


def create_demo_geological_surfaces(data):
    """从数据创建演示地质面"""
    if not PYVISTA_AVAILABLE or not data:
        return []
    
    surfaces = []
    
    # 从钻孔数据创建简单的地质层
    borehole_data = data['borehole_data']
    
    # 获取地层列表
    formations = borehole_data['formation_name'].unique()
    
    for i, formation in enumerate(formations[:6]):  # 只显示前6层避免过于复杂
        formation_data = borehole_data[borehole_data['formation_name'] == formation]
        
        if len(formation_data) < 4:  # 需要足够的点来创建面
            continue
            
        try:
            # 提取该地层的顶面点
            points = []
            for _, row in formation_data.iterrows():
                points.append([row['x'], row['y'], row['z_top']])
            
            if len(points) >= 4:
                points_array = np.array(points)
                
                # 创建点云
                cloud = pv.PolyData(points_array)
                
                # 使用Delaunay三角化创建面
                surface = cloud.delaunay_2d()
                
                # 稍微挤出一些厚度
                thickness = formation_data['thickness'].mean()
                if thickness > 0:
                    # 创建体积
                    surface = surface.extrude([0, 0, -thickness/2], capping=True)
                
                surfaces.append({
                    'mesh': surface,
                    'name': formation,
                    'color': formation_data['color'].iloc[0] if 'color' in formation_data.columns else None
                })
                
                print(f"[OK] 创建地层面: {formation}")
                
        except Exception as e:
            print(f"[WARNING] 创建 {formation} 失败: {e}")
    
    return surfaces


def visualize_borehole_data(viewport, data):
    """可视化钻孔数据"""
    if not viewport.plotter or not data:
        return
        
    borehole_data = data['borehole_data']
    
    # 按钻孔分组
    for borehole_id in borehole_data['borehole_id'].unique()[:10]:  # 只显示前10个钻孔
        bh_data = borehole_data[borehole_data['borehole_id'] == borehole_id]
        
        if len(bh_data) == 0:
            continue
            
        x = bh_data['x'].iloc[0]
        y = bh_data['y'].iloc[0]
        
        # 创建钻孔柱状图
        z_positions = []
        colors = []
        
        for _, row in bh_data.iterrows():
            z_top = row['z_top']
            z_bottom = row['z_bottom']
            thickness = z_top - z_bottom
            
            if thickness <= 0:
                continue
            
            # 创建圆柱体
            cylinder = pv.Cylinder(
                center=(x, y, (z_top + z_bottom) / 2),
                direction=(0, 0, 1),
                radius=1.5,
                height=thickness,
                resolution=12
            )
            
            # 使用地层颜色
            color = row['color'] if 'color' in row and pd.notna(row['color']) else '#8B4513'
            
            viewport.plotter.add_mesh(
                cylinder,
                color=color,
                opacity=0.8,
                show_edges=True
            )


def main():
    """主函数"""
    print(">> 启动专业地质建模界面并加载测试数据")
    print("=" * 50)
    
    # 创建Qt应用
    app = QApplication(sys.argv)
    app.setApplicationName("GEM Professional - 测试数据演示")
    
    # 创建主界面
    window = ProfessionalGeologyCAE()
    window.show()
    
    # 加载测试数据
    print("\n>> 加载测试数据...")
    data = load_geological_test_data()
    
    if data:
        # 更新数据管理器
        window.data_manager.project_name_label.setText("复杂地质测试用例")
        window.data_manager.extent_label.setText("1000×1000×200m")
        window.data_manager.boreholes_count.setText("100")
        window.data_manager.formations_count.setText("12")
        window.data_manager.faults_count.setText("3")
        
        # 输出加载信息
        window.output_text.append("[OK] 已加载复杂地质测试数据")
        window.output_text.append(f"  - 钻孔数据: {len(data['borehole_data'])} 条记录")
        window.output_text.append(f"  - 地层点: {len(data['surface_points'])} 个")
        window.output_text.append(f"  - 断层数据: {len(data['fault_data'])} 个点")
        
        # 在3D视口中可视化数据
        if PYVISTA_AVAILABLE and window.viewport_3d.plotter:
            print("\n>> 创建3D可视化...")
            
            # 可视化钻孔数据
            visualize_borehole_data(window.viewport_3d, data)
            
            # 创建地质面
            surfaces = create_demo_geological_surfaces(data)
            if surfaces:
                surface_meshes = [s['mesh'] for s in surfaces]
                surface_colors = [s['color'] for s in surfaces]
                
                # 添加到视口
                window.viewport_3d.add_geological_model(surface_meshes, surface_colors)
                
                window.output_text.append(f"[OK] 已创建 {len(surfaces)} 个地质面")
            
            # 重置视图
            window.viewport_3d.plotter.reset_camera()
            window.viewport_3d.plotter.view_isometric()
            
            print("[OK] 3D可视化完成")
        
        # 更新状态
        window.status_label.setText("测试数据加载完成 - 可以开始地质建模")
        
        print("\n>> 界面准备完成!")
        print("现在您可以:")
        print("  - 查看3D地质模型")
        print("  - 使用工具栏进行视图操作")
        print("  - 创建地质剖面")
        print("  - 导出模型数据")
    
    else:
        window.status_label.setText("数据加载失败")
        window.output_text.append("[ERROR] 测试数据加载失败")
    
    # 启动应用
    sys.exit(app.exec())


if __name__ == "__main__":
    main()