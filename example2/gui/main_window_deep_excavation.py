#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Deep Excavation GUI (clean wrapper)
• 本文件用于替换历史上存在乱码的深基坑窗口实现。
• 复用 gui.main_window.MainWindow 的全部能力，只做轻量外观定制。
"""

from .main_window import MainWindow as BaseMainWindow


class MainWindow(BaseMainWindow):
    """深基坑场景专用主窗口（基于通用 MainWindow 复用）"""

    def init_ui(self):
        # 先调用通用主窗口的 UI 初始化
        super().init_ui()
        # 轻量定制标题等文案，避免大规模重复实现
        try:
            self.setWindowTitle("岩土工程分析系统 - 基坑工程（摩尔-库伦非线性） v2.0")
        except Exception:
            pass

