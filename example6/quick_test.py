#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速测试脚本 - 确保界面不会崩溃
"""

import sys
import traceback
from PyQt6.QtWidgets import QApplication

try:
    from beautiful_main import BeautifulMainWindow, ScourResult
    print("✅ 导入成功")
    
    # 创建应用
    app = QApplication(sys.argv)
    print("✅ QApplication创建成功")
    
    # 创建窗口
    window = BeautifulMainWindow()
    print("✅ 主窗口创建成功")
    
    # 显示窗口
    window.show()
    print("✅ 窗口显示成功")
    
    # 运行应用
    print("🚀 启动应用...")
    app.exec()
    
except Exception as e:
    print(f"❌ 错误: {e}")
    traceback.print_exc()