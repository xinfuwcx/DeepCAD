#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基坑工程分析系统 - 安全启动脚本 (避免编码问题)
"""

import sys
import os
from pathlib import Path
from PyQt6.QtWidgets import QApplication

# 设置控制台编码为UTF-8
if sys.platform == "win32":
    os.environ['PYTHONIOENCODING'] = 'utf-8'

# 添加项目路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# 直接导入和启动主窗口
try:
    from example2.gui.main_window import MainWindow
    
    def main():
        app = QApplication(sys.argv)
        app.setApplicationName("基坑工程分析系统")
        app.setOrganizationName("DeepCAD")
        
        print("启动基坑工程分析系统...")
        
        # 创建主窗口
        window = MainWindow()
        window.show()
        
        print("界面启动成功!")
        
        # 启动应用
        return app.exec()
    
    if __name__ == "__main__":
        exit_code = main()
        sys.exit(exit_code)
        
except Exception as e:
    print(f"启动失败: {e}")
    import traceback
    traceback.print_exc()