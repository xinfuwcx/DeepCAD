#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动启动 Example2 主界面并加载两阶段 Kratos 计算结果
- 窗口1: 加载阶段1结果 (stage_1/VTK_Output/Structure_0_1.vtk)
- 窗口2: 加载阶段2结果 (stage_2/VTK_Output/Structure_0_1.vtk)
"""

import sys
import os
from pathlib import Path

# 确保可导入 example2 包
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from PyQt6.QtWidgets import QApplication
from example2.gui.main_window import MainWindow

# 使用12点左右计算的真实结果
STAGE1_VTK = ROOT / 'temp_kratos_analysis' / 'data' / 'VTK_Output_Stage_1' / 'Structure_0_1.vtk'
STAGE2_VTK = ROOT / 'temp_kratos_analysis' / 'data' / 'VTK_Output_Stage_2' / 'Structure_0_1.vtk'

def load_into_window(vtk_path: Path, title_suffix: str) -> MainWindow:
    w = MainWindow()
    try:
        # 使用后处理模块直接加载 VTK
        w.postprocessor.load_results(str(vtk_path))
        if hasattr(w, 'results_info_label'):
            w.results_info_label.setText(f'已加载: {vtk_path.name}')
            w.results_info_label.setStyleSheet('color: green;')
        if hasattr(w, 'status_label'):
            w.status_label.setText(f'结果加载完成 ({title_suffix})')

        # 自动设置专业工程视图
        setup_professional_view(w)

    except Exception as e:
        # 尝试回退到菜单的加载逻辑（若需要可扩展）
        if hasattr(w, 'status_label'):
            w.status_label.setText(f'自动加载失败: {e}')
    # 展示窗口并调整标题
    w.setWindowTitle(w.windowTitle() + f' - {title_suffix}')
    w.show()
    return w

def setup_professional_view(w: MainWindow):
    """设置专业工程视图"""
    try:
        # 1. 切换到后处理页签
        if hasattr(w, 'workflow_tabs'):
            w.workflow_tabs.setCurrentIndex(2)  # 后处理页签

        # 2. 切换到实体模式（不用半透明）
        if hasattr(w, 'set_solid_mode'):
            w.set_solid_mode()

        # 3. 设置后处理参数
        pp = w.postprocessor
        if pp:
            # 显示等值和变形
            pp.show_contour = True
            pp.show_deformed = True
            pp.deformation_scale = 30.0  # 变形放大系数
            pp.current_result_type = 'displacement'
            pp.current_component = 'magnitude'
            pp.show_wireframe = False  # 实体模式

            # 优化标尺显示
            pp.optimize_scalar_bar = True

            # 刷新显示
            pp.display_results()

            # 设置相机视角（等轴测，适合薄向模型）
            if pp.plotter:
                pp.plotter.camera_position = 'iso'
                pp.plotter.reset_camera()

        # 4. 更新UI控件状态
        if hasattr(w, 'show_contour'):
            w.show_contour.setChecked(True)
        if hasattr(w, 'show_deformed'):
            w.show_deformed.setChecked(True)
        if hasattr(w, 'show_wireframe'):
            w.show_wireframe.setChecked(False)

        print(f"✅ 专业工程视图设置完成: {w.windowTitle()}")

    except Exception as e:
        print(f"⚠️ 专业视图设置失败: {e}")

if __name__ == '__main__':
    # 基本检查
    if not STAGE1_VTK.exists() or not STAGE2_VTK.exists():
        print('❌ 找不到VTK结果文件:')
        print('   ', STAGE1_VTK)
        print('   ', STAGE2_VTK)
        sys.exit(1)

    print('🎯 启动Example2主界面，支持分析步切换...')
    print('   阶段1:', STAGE1_VTK)
    print('   阶段2:', STAGE2_VTK)

    app = QApplication(sys.argv)

    # 设置应用程序属性，避免OpenGL冲突
    from PyQt6.QtCore import Qt
    try:
        app.setAttribute(Qt.ApplicationAttribute.AA_UseDesktopOpenGL, True)
    except:
        pass  # 忽略属性设置错误

    # 创建主窗口
    print('🔄 创建主窗口...')
    w = MainWindow()
    w.setWindowTitle('DeepCAD - 多阶段分析结果查看器')

    # 切换到后处理标签页
    for i in range(w.workflow_tabs.count()):
        if "后处理" in w.workflow_tabs.tabText(i):
            w.workflow_tabs.setCurrentIndex(i)
            break

    # 默认加载阶段1结果
    try:
        w.postprocessor.load_results(str(STAGE1_VTK))
        w.results_info_label.setText(f"已加载: {STAGE1_VTK.name} (阶段1)")
        w.results_info_label.setStyleSheet("color: green;")
        w.status_label.setText("✅ 阶段1结果加载完成，可通过工具栏切换分析步")
        setup_professional_view(w)
        print('✅ 默认加载阶段1结果完成')
    except Exception as e:
        w.status_label.setText(f"❌ 默认加载失败: {e}")
        print(f'❌ 默认加载失败: {e}')

    w.show()
    sys.exit(app.exec())

