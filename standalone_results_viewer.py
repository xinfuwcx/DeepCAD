#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
独立的深基坑分析结果查看器
不依赖example2模块，直接启动PyVista查看器
"""

import os
import sys
import json
from pathlib import Path

def main():
    """主函数"""
    print("🎯 深基坑两阶段开挖分析结果查看器")
    print("=" * 60)
    
    try:
        import pyvista as pv
        print("✅ PyVista可用")
        
        # 结果文件路径
        stage1_vtk = Path("../multi_stage_kratos_conversion/stage_1/VTK_Output/Structure_0_1.vtk")
        stage2_vtk = Path("../multi_stage_kratos_conversion/stage_2/VTK_Output/Structure_0_1.vtk")
        
        print("\n📁 检查结果文件:")
        if not stage1_vtk.exists():
            print(f"   ❌ 阶段1文件不存在: {stage1_vtk}")
            return False
        if not stage2_vtk.exists():
            print(f"   ❌ 阶段2文件不存在: {stage2_vtk}")
            return False
            
        size1 = stage1_vtk.stat().st_size / (1024*1024)
        size2 = stage2_vtk.stat().st_size / (1024*1024)
        print(f"   ✅ 阶段1: {size1:.1f} MB")
        print(f"   ✅ 阶段2: {size2:.1f} MB")
        
        print("\n🔄 加载VTK网格数据...")
        mesh1 = pv.read(str(stage1_vtk))
        mesh2 = pv.read(str(stage2_vtk))
        
        print(f"   阶段1: {mesh1.n_points:,}个点, {mesh1.n_cells:,}个单元")
        print(f"   阶段2: {mesh2.n_points:,}个点, {mesh2.n_cells:,}个单元")
        
        # 检查可用数据
        print(f"\n📊 可用数据字段:")
        for name in mesh1.array_names:
            print(f"      - {name}")
        
        # 创建3D查看器
        print(f"\n🎨 启动3D可视化界面...")
        plotter = pv.Plotter(shape=(1, 2), title="深基坑两阶段开挖分析结果")
        
        # 选择显示字段
        scalar_field = None
        if "DISPLACEMENT" in mesh1.array_names:
            scalar_field = "DISPLACEMENT"
        elif mesh1.array_names:
            scalar_field = mesh1.array_names[0]
        
        # 阶段1
        plotter.subplot(0, 0)
        if scalar_field:
            plotter.add_mesh(mesh1, scalars=scalar_field, show_edges=False, opacity=0.8)
        else:
            plotter.add_mesh(mesh1, show_edges=True, opacity=0.8)
        plotter.add_title("阶段1 - 初始开挖")
        plotter.camera_position = 'iso'
        
        # 阶段2
        plotter.subplot(0, 1)
        if scalar_field and scalar_field in mesh2.array_names:
            plotter.add_mesh(mesh2, scalars=scalar_field, show_edges=False, opacity=0.8)
        else:
            plotter.add_mesh(mesh2, show_edges=True, opacity=0.8)
        plotter.add_title("阶段2 - 进一步开挖")
        plotter.camera_position = 'iso'
        
        print(f"✅ 3D查看器已启动！")
        print(f"💡 操作提示:")
        print(f"   - 鼠标左键拖拽: 旋转")
        print(f"   - 鼠标右键拖拽: 缩放")
        print(f"   - 'r': 重置视角")
        print(f"   - 'q': 退出")
        
        # 显示
        plotter.show()
        return True
        
    except ImportError:
        print("❌ PyVista未安装，请运行: pip install pyvista")
        
        # 备选方案：启动简单的GUI
        try:
            from PyQt6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget, QLabel, QTextEdit, QPushButton
            from PyQt6.QtCore import Qt
            
            class SimpleViewer(QMainWindow):
                def __init__(self):
                    super().__init__()
                    self.setWindowTitle("深基坑分析结果")
                    self.setGeometry(100, 100, 600, 400)
                    
                    widget = QWidget()
                    self.setCentralWidget(widget)
                    layout = QVBoxLayout(widget)
                    
                    title = QLabel("🏗️ 深基坑两阶段开挖分析结果")
                    title.setAlignment(Qt.AlignmentFlag.AlignCenter)
                    title.setStyleSheet("font-size: 16px; font-weight: bold;")
                    layout.addWidget(title)
                    
                    info = QTextEdit()
                    info.setReadOnly(True)
                    info.setPlainText(f"""
分析完成！

结果文件位置:
• 阶段1: {stage1_vtk}
• 阶段2: {stage2_vtk}

建议使用ParaView查看详细结果:
1. 打开ParaView软件
2. 加载上述VTK文件
3. 查看DISPLACEMENT、STRESS等字段
4. 使用Warp by Vector显示变形

或安装PyVista进行3D查看:
pip install pyvista
                    """)
                    layout.addWidget(info)
                    
                    btn = QPushButton("打开文件夹")
                    btn.clicked.connect(lambda: os.startfile(stage1_vtk.parent))
                    layout.addWidget(btn)
            
            app = QApplication(sys.argv)
            window = SimpleViewer()
            window.show()
            print("✅ 简化界面已启动")
            sys.exit(app.exec())
            
        except ImportError:
            print("❌ PyQt6也未安装")
            print("📁 结果文件位置:")
            print(f"   阶段1: {stage1_vtk}")
            print(f"   阶段2: {stage2_vtk}")
            print("💡 请使用ParaView打开这些VTK文件查看结果")
            return False
    
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    main()
