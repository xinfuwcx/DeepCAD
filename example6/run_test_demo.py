#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
运行测试案例演示
"""

import time
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import QTimer
from beautiful_main import BeautifulMainWindow

def automated_test():
    """自动化测试演示"""
    # 创建应用和窗口
    app = QApplication([])
    window = BeautifulMainWindow()
    window.show()
    
    def run_test_sequence():
        """运行测试序列"""
        print("🎯 开始自动化测试演示...")
        
        # 1. 加载山区河流预设
        print("📋 加载山区河流预设参数...")
        params = {"diameter": 1.5, "velocity": 2.5, "depth": 3.0, "d50": 2.0}
        window.load_preset(params)
        time.sleep(1)
        
        # 2. 开始计算
        print("🚀 启动计算...")
        window.start_calculation()
        
        print("✅ 测试演示已启动，请观察界面变化")
    
    # 延迟执行测试
    QTimer.singleShot(2000, run_test_sequence)
    
    return app.exec()

if __name__ == "__main__":
    automated_test()