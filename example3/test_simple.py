#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化的GEM系统测试启动器
"""

import sys
import os
from pathlib import Path

# 添加当前目录到Python路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def test_imports():
    """测试核心导入"""
    print("检查系统依赖...")
    
    try:
        from PyQt6 import QtCore, QtWidgets
        print("[OK] PyQt6:", QtCore.PYQT_VERSION_STR)
    except ImportError as e:
        print("[ERROR] PyQt6导入失败:", e)
        return False
        
    try:
        import gempy
        print("[OK] GemPy:", gempy.__version__)
    except ImportError as e:
        print("[ERROR] GemPy导入失败:", e)
        return False
        
    try:
        import pyvista as pv
        print("[OK] PyVista:", pv.__version__)
    except ImportError as e:
        print("[ERROR] PyVista导入失败:", e)
        return False
        
    return True

def test_main_window():
    """测试主窗口"""
    try:
        from PyQt6.QtWidgets import QApplication
        
        app = QApplication(sys.argv)
        
        # 尝试导入主窗口
        from gempy_main_window import GemPyMainWindow
        
        window = GemPyMainWindow()
        window.show()
        
        print("[OK] 主窗口创建成功")
        return app.exec()
        
    except ImportError as e:
        print("[ERROR] 主窗口导入失败:", e)
        return False
    except Exception as e:
        print("[ERROR] 主窗口创建失败:", e)
        return False

def main():
    """主函数"""
    print("=" * 50)
    print("GEM隐式建模系统 - 简化测试")
    print("=" * 50)
    
    if not test_imports():
        print("系统依赖检查失败")
        return 1
        
    print("\n开始启动主窗口...")
    return test_main_window()

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)