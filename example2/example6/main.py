#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD-SCOUR: 精密桥墩浅蚀模拟系统
Professional Bridge Pier Scour Simulation System

基于FEniCS流体力学求解器的现代化CFD工程软件
Modern CFD Engineering Software based on FEniCS Flow Solver
"""

import sys
import os
from pathlib import Path
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import Qt, QLocale
from PyQt6.QtGui import QIcon, QPixmap, QPalette, QColor

# 添加项目根路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from example2.example6.gui.main_window import ScourMainWindow


def setup_application_style():
    """设置应用程序全局样式"""
    app = QApplication.instance()
    
    # 设置应用程序信息
    app.setApplicationName("DeepCAD-SCOUR")
    app.setApplicationVersion("1.0.0")
    app.setOrganizationName("DeepCAD Engineering Solutions")
    app.setApplicationDisplayName("桥墩浅蚀模拟系统")
    
    # 启用高DPI支持 (PyQt6已默认启用)
    
    # 设置全局字体
    font = app.font()
    font.setFamily("Microsoft YaHei UI, Segoe UI, Arial")
    font.setPointSize(9)
    app.setFont(font)
    
    # 创建专业级调色板
    palette = QPalette()
    
    # 主色调：蓝灰色系（专业工程软件风格）
    primary_color = QColor(45, 85, 125)      # 主色调
    secondary_color = QColor(65, 105, 145)   # 辅助色
    accent_color = QColor(0, 120, 215)       # 强调色
    
    # 背景色系
    bg_primary = QColor(248, 249, 250)       # 主背景
    bg_secondary = QColor(240, 242, 245)     # 次背景
    bg_widget = QColor(255, 255, 255)        # 组件背景
    
    # 文字色系
    text_primary = QColor(33, 37, 41)        # 主文字
    text_secondary = QColor(108, 117, 125)   # 次文字
    text_disabled = QColor(173, 181, 189)    # 禁用文字
    
    # 边框色系
    border_light = QColor(206, 212, 218)     # 浅边框
    border_medium = QColor(173, 181, 189)    # 中等边框
    
    # 设置调色板
    palette.setColor(QPalette.ColorRole.Window, bg_primary)
    palette.setColor(QPalette.ColorRole.WindowText, text_primary)
    palette.setColor(QPalette.ColorRole.Base, bg_widget)
    palette.setColor(QPalette.ColorRole.AlternateBase, bg_secondary)
    palette.setColor(QPalette.ColorRole.ToolTipBase, QColor(255, 255, 220))
    palette.setColor(QPalette.ColorRole.ToolTipText, text_primary)
    palette.setColor(QPalette.ColorRole.Text, text_primary)
    palette.setColor(QPalette.ColorRole.Button, bg_secondary)
    palette.setColor(QPalette.ColorRole.ButtonText, text_primary)
    palette.setColor(QPalette.ColorRole.BrightText, QColor(255, 0, 0))
    palette.setColor(QPalette.ColorRole.Link, accent_color)
    palette.setColor(QPalette.ColorRole.Highlight, accent_color)
    palette.setColor(QPalette.ColorRole.HighlightedText, QColor(255, 255, 255))
    
    app.setPalette(palette)
    
    # 应用全局样式表
    app.setStyleSheet("""
        /* 全局样式 */
        QMainWindow {
            background-color: #f8f9fa;
            color: #212529;
        }
        
        /* 工具栏样式 */
        QToolBar {
            background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                        stop: 0 #ffffff, stop: 1 #f0f2f5);
            border: none;
            border-bottom: 1px solid #dee2e6;
            padding: 4px;
            spacing: 2px;
        }
        
        QToolBar::separator {
            background-color: #dee2e6;
            width: 1px;
            margin: 4px;
        }
        
        QToolButton {
            background-color: transparent;
            border: 1px solid transparent;
            border-radius: 4px;
            padding: 6px;
            margin: 1px;
            min-width: 24px;
            min-height: 24px;
        }
        
        QToolButton:hover {
            background-color: #e9ecef;
            border-color: #ced4da;
        }
        
        QToolButton:pressed {
            background-color: #dee2e6;
            border-color: #adb5bd;
        }
        
        QToolButton:checked {
            background-color: #0078d4;
            color: white;
            border-color: #106ebe;
        }
        
        /* 状态栏样式 */
        QStatusBar {
            background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                        stop: 0 #f0f2f5, stop: 1 #ffffff);
            border-top: 1px solid #dee2e6;
            padding: 2px;
        }
        
        QStatusBar::item {
            border: none;
        }
        
        /* 菜单样式 */
        QMenuBar {
            background-color: #ffffff;
            border-bottom: 1px solid #dee2e6;
            padding: 2px;
        }
        
        QMenuBar::item {
            background: transparent;
            padding: 4px 8px;
            border-radius: 3px;
        }
        
        QMenuBar::item:selected {
            background-color: #e9ecef;
        }
        
        QMenu {
            background-color: #ffffff;
            border: 1px solid #ced4da;
            border-radius: 4px;
            padding: 4px;
        }
        
        QMenu::item {
            background: transparent;
            padding: 6px 20px 6px 20px;
            border-radius: 3px;
        }
        
        QMenu::item:selected {
            background-color: #0078d4;
            color: white;
        }
        
        QMenu::separator {
            height: 1px;
            background-color: #dee2e6;
            margin: 2px;
        }
        
        /* 分割器样式 */
        QSplitter::handle {
            background-color: #dee2e6;
        }
        
        QSplitter::handle:horizontal {
            width: 2px;
        }
        
        QSplitter::handle:vertical {
            height: 2px;
        }
        
        QSplitter::handle:hover {
            background-color: #0078d4;
        }
        
        /* 标签页样式 */
        QTabWidget::pane {
            border: 1px solid #ced4da;
            background-color: #ffffff;
        }
        
        QTabBar::tab {
            background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                        stop: 0 #ffffff, stop: 1 #f8f9fa);
            border: 1px solid #ced4da;
            border-bottom: none;
            padding: 8px 16px;
            margin-right: 2px;
        }
        
        QTabBar::tab:selected {
            background-color: #ffffff;
            border-bottom: 2px solid #0078d4;
        }
        
        QTabBar::tab:hover:!selected {
            background-color: #e9ecef;
        }
        
        /* 滚动条样式 */
        QScrollBar:vertical {
            background-color: #f8f9fa;
            width: 12px;
            border-radius: 6px;
        }
        
        QScrollBar::handle:vertical {
            background-color: #ced4da;
            border-radius: 6px;
            min-height: 20px;
        }
        
        QScrollBar::handle:vertical:hover {
            background-color: #adb5bd;
        }
        
        QScrollBar::add-line:vertical,
        QScrollBar::sub-line:vertical {
            height: 0px;
        }
        
        QScrollBar:horizontal {
            background-color: #f8f9fa;
            height: 12px;
            border-radius: 6px;
        }
        
        QScrollBar::handle:horizontal {
            background-color: #ced4da;
            border-radius: 6px;
            min-width: 20px;
        }
        
        QScrollBar::handle:horizontal:hover {
            background-color: #adb5bd;
        }
        
        QScrollBar::add-line:horizontal,
        QScrollBar::sub-line:horizontal {
            width: 0px;
        }
    """)


def create_application_icon():
    """创建应用程序图标"""
    # 创建一个简单的图标
    pixmap = QPixmap(32, 32)
    pixmap.fill(QColor(0, 120, 215))
    return QIcon(pixmap)


def main():
    """主程序入口"""
    # 创建应用程序
    app = QApplication(sys.argv)
    
    # 设置语言环境
    QLocale.setDefault(QLocale(QLocale.Language.Chinese, QLocale.Country.China))
    
    # 设置应用程序样式
    setup_application_style()
    
    # 设置应用程序图标
    app.setWindowIcon(create_application_icon())
    
    try:
        # 创建主窗口
        main_window = ScourMainWindow()
        
        # 显示主窗口
        main_window.show()
        
        # 运行应用程序
        sys.exit(app.exec())
        
    except Exception as e:
        print(f"启动应用程序失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()