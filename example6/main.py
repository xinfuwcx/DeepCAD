#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD-SCOUR: 精密桥墩浅蚀模拟系统
Professional Bridge Pier Scour Simulation System

独立的桥墩浅蚀模拟系统 - 基于FEniCS流体力学求解器
Independent Bridge Pier Scour Simulation System based on FEniCS
"""

import sys
import os
from pathlib import Path
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import Qt, QLocale
from PyQt6.QtGui import QIcon, QPixmap, QPalette, QColor

# 添加当前项目路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from gui.main_window import ScourMainWindow


def setup_application_style():
    """设置应用程序全局样式"""
    app = QApplication.instance()
    
    # 设置应用程序信息
    app.setApplicationName("DeepCAD-SCOUR")
    app.setApplicationVersion("1.0.0")
    app.setOrganizationName("DeepCAD Engineering Solutions")
    app.setApplicationDisplayName("桥墩浅蚀模拟系统")
    
    # 设置全局字体
    font = app.font()
    font.setFamily("Microsoft YaHei UI, Segoe UI, Arial")
    font.setPointSize(9)
    app.setFont(font)
    
    # 创建专业级调色板
    palette = QPalette()
    
    # 主色调：深蓝灰色系（专业工程软件风格）
    primary_color = QColor(30, 70, 110)      # 深主色调
    secondary_color = QColor(50, 90, 130)    # 辅助色
    accent_color = QColor(0, 120, 215)       # 蓝色强调
    success_color = QColor(40, 167, 69)      # 成功绿色
    warning_color = QColor(255, 193, 7)      # 警告黄色
    danger_color = QColor(220, 53, 69)       # 危险红色
    
    # 背景色系
    bg_primary = QColor(248, 250, 252)       # 主背景 - 更浅的蓝灰
    bg_secondary = QColor(241, 245, 249)     # 次背景
    bg_widget = QColor(255, 255, 255)        # 组件背景
    bg_dark = QColor(226, 232, 240)          # 深色背景
    
    # 文字色系
    text_primary = QColor(15, 23, 42)        # 深色主文字
    text_secondary = QColor(71, 85, 105)     # 次文字
    text_disabled = QColor(148, 163, 184)    # 禁用文字
    text_muted = QColor(100, 116, 139)       # 淡化文字
    
    # 边框色系
    border_light = QColor(226, 232, 240)     # 浅边框
    border_medium = QColor(203, 213, 225)    # 中等边框
    border_dark = QColor(148, 163, 184)      # 深边框
    
    # 设置调色板
    palette.setColor(QPalette.ColorRole.Window, bg_primary)
    palette.setColor(QPalette.ColorRole.WindowText, text_primary)
    palette.setColor(QPalette.ColorRole.Base, bg_widget)
    palette.setColor(QPalette.ColorRole.AlternateBase, bg_secondary)
    palette.setColor(QPalette.ColorRole.ToolTipBase, QColor(255, 255, 248))
    palette.setColor(QPalette.ColorRole.ToolTipText, text_primary)
    palette.setColor(QPalette.ColorRole.Text, text_primary)
    palette.setColor(QPalette.ColorRole.Button, bg_secondary)
    palette.setColor(QPalette.ColorRole.ButtonText, text_primary)
    palette.setColor(QPalette.ColorRole.BrightText, QColor(255, 255, 255))
    palette.setColor(QPalette.ColorRole.Link, accent_color)
    palette.setColor(QPalette.ColorRole.Highlight, accent_color)
    palette.setColor(QPalette.ColorRole.HighlightedText, QColor(255, 255, 255))
    
    app.setPalette(palette)
    
    # 应用全局样式表
    app.setStyleSheet("""
        /* 全局样式 */
        QMainWindow {
            background-color: #f8fafc;
            color: #0f172a;
        }
        
        /* 工具栏样式 - 现代化设计 */
        QToolBar {
            background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                        stop: 0 #ffffff, stop: 0.5 #fafbfc, stop: 1 #f1f5f9);
            border: none;
            border-bottom: 1px solid #e2e8f0;
            padding: 8px;
            spacing: 4px;
        }
        
        QToolBar::separator {
            background-color: #cbd5e1;
            width: 1px;
            margin: 6px;
        }
        
        QToolButton {
            background-color: transparent;
            border: 1px solid transparent;
            border-radius: 6px;
            padding: 8px;
            margin: 2px;
            min-width: 32px;
            min-height: 32px;
            color: #334155;
            font-weight: 500;
        }
        
        QToolButton:hover {
            background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                        stop: 0 #f1f5f9, stop: 1 #e2e8f0);
            border-color: #cbd5e1;
        }
        
        QToolButton:pressed {
            background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                        stop: 0 #e2e8f0, stop: 1 #cbd5e1);
            border-color: #94a3b8;
        }
        
        QToolButton:checked {
            background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                        stop: 0 #0078d4, stop: 1 #005a9e);
            color: white;
            border-color: #005a9e;
        }
        
        /* 状态栏样式 */
        QStatusBar {
            background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                        stop: 0 #f8fafc, stop: 1 #f1f5f9);
            border-top: 1px solid #e2e8f0;
            padding: 4px;
            color: #475569;
        }
        
        QStatusBar::item {
            border: none;
        }
        
        /* 菜单样式 */
        QMenuBar {
            background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                        stop: 0 #ffffff, stop: 1 #f8fafc);
            border-bottom: 1px solid #e2e8f0;
            padding: 4px;
        }
        
        QMenuBar::item {
            background: transparent;
            padding: 6px 12px;
            border-radius: 4px;
            color: #334155;
            font-weight: 500;
        }
        
        QMenuBar::item:selected {
            background-color: #f1f5f9;
            color: #0f172a;
        }
        
        QMenu {
            background-color: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 6px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        QMenu::item {
            background: transparent;
            padding: 8px 16px;
            border-radius: 4px;
            color: #334155;
        }
        
        QMenu::item:selected {
            background-color: #0078d4;
            color: white;
        }
        
        QMenu::separator {
            height: 1px;
            background-color: #e2e8f0;
            margin: 4px;
        }
        
        /* 分割器样式 */
        QSplitter::handle {
            background-color: #e2e8f0;
        }
        
        QSplitter::handle:horizontal {
            width: 3px;
        }
        
        QSplitter::handle:vertical {
            height: 3px;
        }
        
        QSplitter::handle:hover {
            background: qlineargradient(x1: 0, y1: 0, x2: 1, y2: 0,
                                        stop: 0 #0078d4, stop: 1 #005a9e);
        }
        
        /* 标签页样式 */
        QTabWidget::pane {
            border: 1px solid #cbd5e1;
            background-color: #ffffff;
            border-radius: 6px;
        }
        
        QTabBar::tab {
            background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                        stop: 0 #f8fafc, stop: 1 #f1f5f9);
            border: 1px solid #cbd5e1;
            border-bottom: none;
            padding: 10px 18px;
            margin-right: 3px;
            border-top-left-radius: 6px;
            border-top-right-radius: 6px;
            color: #475569;
        }
        
        QTabBar::tab:selected {
            background-color: #ffffff;
            border-bottom: 3px solid #0078d4;
            color: #0f172a;
            font-weight: 600;
        }
        
        QTabBar::tab:hover:!selected {
            background-color: #f1f5f9;
            color: #334155;
        }
        
        /* 滚动条样式 - 现代化细滚动条 */
        QScrollBar:vertical {
            background-color: #f8fafc;
            width: 14px;
            border-radius: 7px;
            margin: 0;
        }
        
        QScrollBar::handle:vertical {
            background: qlineargradient(x1: 0, y1: 0, x2: 1, y2: 0,
                                        stop: 0 #cbd5e1, stop: 1 #94a3b8);
            border-radius: 7px;
            min-height: 30px;
            margin: 2px;
        }
        
        QScrollBar::handle:vertical:hover {
            background: qlineargradient(x1: 0, y1: 0, x2: 1, y2: 0,
                                        stop: 0 #94a3b8, stop: 1 #64748b);
        }
        
        QScrollBar::add-line:vertical,
        QScrollBar::sub-line:vertical {
            height: 0px;
        }
        
        QScrollBar:horizontal {
            background-color: #f8fafc;
            height: 14px;
            border-radius: 7px;
            margin: 0;
        }
        
        QScrollBar::handle:horizontal {
            background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                        stop: 0 #cbd5e1, stop: 1 #94a3b8);
            border-radius: 7px;
            min-width: 30px;
            margin: 2px;
        }
        
        QScrollBar::handle:horizontal:hover {
            background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                        stop: 0 #94a3b8, stop: 1 #64748b);
        }
        
        QScrollBar::add-line:horizontal,
        QScrollBar::sub-line:horizontal {
            width: 0px;
        }
        
        /* 进度条样式 */
        QProgressBar {
            background-color: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            text-align: center;
            height: 20px;
        }
        
        QProgressBar::chunk {
            background: qlineargradient(x1: 0, y1: 0, x2: 1, y2: 0,
                                        stop: 0 #0078d4, stop: 1 #005a9e);
            border-radius: 7px;
            margin: 1px;
        }
    """)


def create_application_icon():
    """创建精美的应用程序图标"""
    pixmap = QPixmap(64, 64)
    pixmap.fill(Qt.GlobalColor.transparent)
    
    from PyQt6.QtGui import QPainter, QBrush, QPen, QLinearGradient
    
    painter = QPainter(pixmap)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    
    # 创建渐变背景
    gradient = QLinearGradient(0, 0, 64, 64)
    gradient.setColorAt(0, QColor(0, 120, 215))
    gradient.setColorAt(1, QColor(0, 90, 160))
    
    # 绘制圆形背景
    painter.setBrush(QBrush(gradient))
    painter.setPen(Qt.PenStyle.NoPen)
    painter.drawEllipse(4, 4, 56, 56)
    
    # 绘制水波纹
    painter.setPen(QPen(QColor(255, 255, 255, 180), 2))
    
    # 第一层波纹
    from PyQt6.QtGui import QPainterPath
    wave1 = QPainterPath()
    wave1.moveTo(16, 32)
    wave1.quadTo(24, 24, 32, 32)
    wave1.quadTo(40, 40, 48, 32)
    painter.drawPath(wave1)
    
    # 第二层波纹
    wave2 = QPainterPath()
    wave2.moveTo(18, 38)
    wave2.quadTo(26, 30, 34, 38)
    wave2.quadTo(42, 46, 46, 38)
    painter.drawPath(wave2)
    
    # 绘制桥墩符号
    painter.setBrush(QBrush(QColor(255, 255, 255)))
    painter.setPen(QPen(QColor(255, 255, 255), 1))
    painter.drawRect(30, 16, 4, 20)
    
    painter.end()
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