#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

print("=== 快速启动Example2 ===")
print("正在启动DeepCAD系统测试程序...")

try:
    from PyQt6.QtWidgets import QApplication
    from gui.main_window import MainWindow
    
    app = QApplication(sys.argv)
    app.setApplicationName("Example2 - DeepCAD系统测试程序")
    
    window = MainWindow()
    window.show()
    
    print("✅ 应用程序启动成功!")
    print("📄 FPN文件导入功能已就绪")
    print("请点击前处理模块中的'📄 导入FPN文件'按钮来测试")
    
    sys.exit(app.exec())
    
except Exception as e:
    print(f"❌ 启动失败: {e}")
    import traceback
    traceback.print_exc()