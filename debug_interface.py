#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Debug Interface - 调试界面问题
"""

import sys
from pathlib import Path

# 添加路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

try:
    import pyvista as pv
    print("[OK] PyVista 可用")
    
    # 测试基本3D功能
    mesh = pv.Cube()
    print("[OK] 可以创建3D网格")
    
    try:
        plotter = pv.Plotter()
        plotter.add_mesh(mesh, color='red')
        print("[OK] 可以创建绘图器")
        plotter.close()
    except Exception as e:
        print(f"[ERROR] 绘图器测试失败: {e}")
    
except ImportError as e:
    print(f"[ERROR] PyVista 不可用: {e}")

try:
    from PyQt6.QtWidgets import QApplication, QMainWindow, QLabel
    print("[OK] PyQt6 可用")
    
    # 测试基本GUI
    app = QApplication(sys.argv)
    window = QMainWindow()
    window.setWindowTitle("测试窗口")
    
    label = QLabel("如果你能看到这个窗口，说明Qt界面正常")
    label.setStyleSheet("font-size: 14px; padding: 20px;")
    window.setCentralWidget(label)
    
    window.resize(400, 200)
    window.show()
    
    print("[OK] Qt界面测试窗口已显示")
    print("如果看不到窗口，可能是显示器或Qt配置问题")
    
    sys.exit(app.exec())
    
except ImportError as e:
    print(f"[ERROR] PyQt6 不可用: {e}")
except Exception as e:
    print(f"[ERROR] Qt测试失败: {e}")