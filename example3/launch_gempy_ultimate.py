#!/usr/bin/env python3
"""
简化的GemPy Ultimate启动器
Simplified GemPy Ultimate Launcher
"""

import sys
import os

# 添加当前目录到路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

try:
    print("=== Starting GemPy Ultimate ABAQUS Professional ===")
    print("Loading PyQt6...")
    
    from PyQt6.QtWidgets import QApplication
    from PyQt6.QtCore import Qt
    from PyQt6.QtGui import QFont
    
    print("Loading theme system...")
    from abaqus_style_theme import AbaqusStyleTheme
    
    print("Loading enhanced effects...")
    from enhanced_abaqus_effects import *
    
    print("Loading GemPy modules...")
    try:
        import gempy as gp
        import numpy as np
        import pandas as pd
        from gempy_workflow_manager import GemPyWorkflowManager
        from gempy_3d_visualization import GemPy3DVisualizer
        GEMPY_AVAILABLE = True
        print("GemPy engine loaded successfully")
    except ImportError as e:
        print(f"Warning: GemPy not available: {e}")
        GEMPY_AVAILABLE = False
    
    print("Loading main interface...")
    from gempy_ultimate_abaqus import GemPyUltimateAbaqus
    
    print("Creating application...")
    app = QApplication(sys.argv)
    app.setStyle('Fusion')
    
    # 设置专业字体
    font = QFont("Segoe UI", 9, QFont.Weight.Normal)
    app.setFont(font)
    
    print("Initializing main window...")
    window = GemPyUltimateAbaqus()
    
    print("Showing interface...")
    window.show()
    
    print("GemPy Ultimate ABAQUS Professional launched successfully!")
    print("ABAQUS-Level Interface Active")
    print("Professional Geological Modeling Ready")
    if GEMPY_AVAILABLE:
        print("Full GemPy Engine Available")
    else:
        print("Running in Professional Simulation Mode")
    
    print("===============================================")
    
    # 运行应用
    sys.exit(app.exec())
    
except ImportError as e:
    print(f"Import Error: {e}")
    print("Please check that all required modules are available")
    sys.exit(1)
    
except Exception as e:
    print(f"Startup Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)