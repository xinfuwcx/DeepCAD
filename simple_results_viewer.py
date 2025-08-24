#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化的深基坑分析结果查看器
直接启动PyVista 3D查看器加载VTK结果
"""

import os
import sys
import json
from pathlib import Path

def launch_pyvista_viewer():
    """启动PyVista 3D查看器"""
    print("🎨 启动深基坑分析结果3D查看器")
    print("=" * 60)
    
    try:
        import pyvista as pv
        import numpy as np
        
        # 设置PyVista为离屏渲染模式（如果需要）
        # pv.set_plot_theme("document")
        
        # 结果文件路径
        stage1_vtk = Path("../multi_stage_kratos_conversion/stage_1/VTK_Output/Structure_0_1.vtk")
        stage2_vtk = Path("../multi_stage_kratos_conversion/stage_2/VTK_Output/Structure_0_1.vtk")
        
        print("📁 检查结果文件:")
        if stage1_vtk.exists():
            size1 = stage1_vtk.stat().st_size / (1024*1024)
            print(f"   ✅ 阶段1: {stage1_vtk} ({size1:.1f} MB)")
        else:
            print(f"   ❌ 阶段1: {stage1_vtk} (未找到)")
            return False
            
        if stage2_vtk.exists():
            size2 = stage2_vtk.stat().st_size / (1024*1024)
            print(f"   ✅ 阶段2: {stage2_vtk} ({size2:.1f} MB)")
        else:
            print(f"   ❌ 阶段2: {stage2_vtk} (未找到)")
            return False
        
        print("\n🔄 加载VTK网格数据...")
        
        # 读取阶段1结果
        mesh1 = pv.read(str(stage1_vtk))
        print(f"   阶段1网格: {mesh1.n_points:,}个点, {mesh1.n_cells:,}个单元")
        
        # 读取阶段2结果
        mesh2 = pv.read(str(stage2_vtk))
        print(f"   阶段2网格: {mesh2.n_points:,}个点, {mesh2.n_cells:,}个单元")
        
        # 检查可用的数据数组
        print(f"\n📊 阶段1可用数据:")
        for name in mesh1.array_names:
            print(f"      - {name}")
        
        print(f"\n📊 阶段2可用数据:")
        for name in mesh2.array_names:
            print(f"      - {name}")
        
        # 创建3D查看器
        print(f"\n🎨 启动3D可视化界面...")
        
        # 创建双窗口布局
        plotter = pv.Plotter(shape=(1, 2), title="深基坑两阶段开挖分析结果对比")
        
        # 阶段1可视化
        plotter.subplot(0, 0)
        
        # 选择合适的标量场进行可视化
        scalar_name = None
        if "DISPLACEMENT" in mesh1.array_names:
            scalar_name = "DISPLACEMENT"
        elif "STRESS" in mesh1.array_names:
            scalar_name = "STRESS"
        elif mesh1.array_names:
            scalar_name = mesh1.array_names[0]
        
        if scalar_name:
            plotter.add_mesh(mesh1, scalars=scalar_name, show_edges=False, 
                           opacity=0.8, cmap="viridis")
        else:
            plotter.add_mesh(mesh1, show_edges=True, opacity=0.8)
        
        plotter.add_title("阶段1 - 初始开挖")
        plotter.camera_position = 'iso'
        
        # 阶段2可视化
        plotter.subplot(0, 1)
        
        if scalar_name and scalar_name in mesh2.array_names:
            plotter.add_mesh(mesh2, scalars=scalar_name, show_edges=False, 
                           opacity=0.8, cmap="viridis")
        else:
            plotter.add_mesh(mesh2, show_edges=True, opacity=0.8)
        
        plotter.add_title("阶段2 - 进一步开挖")
        plotter.camera_position = 'iso'
        
        # 添加颜色条
        if scalar_name:
            plotter.add_scalar_bar(scalar_name, vertical=True)
        
        print(f"✅ 3D查看器已启动！")
        print(f"💡 操作提示:")
        print(f"   - 鼠标左键拖拽: 旋转视角")
        print(f"   - 鼠标右键拖拽: 缩放")
        print(f"   - 鼠标中键拖拽: 平移")
        print(f"   - 'r': 重置视角")
        print(f"   - 'q': 退出")
        
        # 显示界面
        plotter.show()
        
        return True
        
    except ImportError:
        print(f"❌ PyVista未安装")
        print(f"请运行: pip install pyvista")
        return False
    except Exception as e:
        print(f"❌ 3D查看器启动失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def launch_simple_gui():
    """启动简化的GUI界面"""
    print("\n🖥️ 尝试启动简化GUI界面...")
    
    try:
        from PyQt6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget, QPushButton, QLabel, QTextEdit
        from PyQt6.QtCore import Qt
        
        class SimpleResultsViewer(QMainWindow):
            def __init__(self):
                super().__init__()
                self.setWindowTitle("深基坑两阶段开挖分析结果")
                self.setGeometry(100, 100, 800, 600)
                
                # 中央窗口
                central_widget = QWidget()
                self.setCentralWidget(central_widget)
                layout = QVBoxLayout(central_widget)
                
                # 标题
                title = QLabel("🏗️ 深基坑两阶段开挖分析结果")
                title.setAlignment(Qt.AlignmentFlag.AlignCenter)
                title.setStyleSheet("font-size: 18px; font-weight: bold; margin: 10px;")
                layout.addWidget(title)
                
                # 结果信息
                info_text = QTextEdit()
                info_text.setReadOnly(True)
                
                # 读取结果配置
                config_file = "../two_stage_analysis_results.json"
                if os.path.exists(config_file):
                    with open(config_file, 'r', encoding='utf-8') as f:
                        config = json.load(f)
                    
                    info_content = f"""
📊 分析项目: {config['project_name']}
🔧 本构模型: {config['constitutive_model']}

📈 分析结果:
阶段1 - 初始开挖:
  • 节点数: {config['stages'][0]['nodes']:,}
  • 单元数: {config['stages'][0]['elements']:,}
  • 计算时间: {config['stages'][0]['computation_time']}
  • 结果文件: {config['stages'][0]['vtk_file']}

阶段2 - 进一步开挖:
  • 节点数: {config['stages'][1]['nodes']:,}
  • 单元数: {config['stages'][1]['elements']:,}
  • 计算时间: {config['stages'][1]['computation_time']}
  • 结果文件: {config['stages'][1]['vtk_file']}

🧱 材料配置:
  • 材料总数: {config['materials']['total_materials']}
  • 土体类型: {', '.join(config['materials']['soil_types'])}

📋 分析状态: {config['analysis_summary']['status']}
⏱️ 总计算时间: {config['analysis_summary']['total_time']}
🎯 收敛状态: {config['analysis_summary']['convergence']}

💡 建议: {config['analysis_summary']['recommendation']}
                    """
                    info_text.setPlainText(info_content)
                else:
                    info_text.setPlainText("未找到分析结果配置文件")
                
                layout.addWidget(info_text)
                
                # 按钮
                pyvista_btn = QPushButton("🎨 启动3D查看器 (PyVista)")
                pyvista_btn.clicked.connect(self.launch_pyvista)
                layout.addWidget(pyvista_btn)
                
                paraview_btn = QPushButton("📊 使用ParaView查看")
                paraview_btn.clicked.connect(self.open_paraview_guide)
                layout.addWidget(paraview_btn)
            
            def launch_pyvista(self):
                """启动PyVista查看器"""
                launch_pyvista_viewer()
            
            def open_paraview_guide(self):
                """显示ParaView使用指南"""
                from PyQt6.QtWidgets import QMessageBox
                msg = QMessageBox()
                msg.setWindowTitle("ParaView使用指南")
                msg.setText("""
使用ParaView查看结果:

1. 打开ParaView软件
2. 加载VTK文件:
   • 阶段1: multi_stage_kratos_conversion/stage_1/VTK_Output/Structure_0_1.vtk
   • 阶段2: multi_stage_kratos_conversion/stage_2/VTK_Output/Structure_0_1.vtk

3. 推荐查看变量:
   • DISPLACEMENT: 位移场
   • STRESS: 应力场
   • PLASTIC_STRAIN: 塑性应变

4. 可视化技巧:
   • 使用Warp by Vector显示变形
   • 设置合适的变形放大系数
   • 使用切片查看内部应力
                """)
                msg.exec()
        
        app = QApplication(sys.argv)
        window = SimpleResultsViewer()
        window.show()
        
        print("✅ 简化GUI界面已启动！")
        sys.exit(app.exec())
        
    except ImportError:
        print("❌ PyQt6未安装，无法启动GUI界面")
        return False
    except Exception as e:
        print(f"❌ GUI启动失败: {e}")
        return False

if __name__ == "__main__":
    print("🎯 深基坑两阶段开挖分析结果查看器")
    print("=" * 60)
    
    # 首先尝试PyVista 3D查看器
    success = launch_pyvista_viewer()
    
    if not success:
        # 备选方案：简化GUI界面
        launch_simple_gui()
