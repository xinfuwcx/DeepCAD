#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD-SCOUR 优化版启动器
Optimized launcher for DeepCAD-SCOUR system

特点:
- 快速启动，简化依赖检查
- 优雅的错误处理
- 最小化资源占用
- 良好的用户体验
"""

import sys
import os
import time
from pathlib import Path

# 添加项目路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def check_python_version():
    """检查Python版本"""
    if sys.version_info < (3, 7):
        print("错误: 需要Python 3.7或更高版本")
        print(f"当前版本: Python {sys.version}")
        return False
    return True

def check_critical_dependencies():
    """检查关键依赖"""
    critical_deps = {
        'PyQt6': 'PyQt6.QtWidgets',
        'numpy': 'numpy',
        'matplotlib': 'matplotlib'
    }
    
    missing_deps = []
    
    for name, module in critical_deps.items():
        try:
            __import__(module)
        except ImportError:
            missing_deps.append(name)
    
    if missing_deps:
        print("错误: 缺少必要依赖包:")
        for dep in missing_deps:
            print(f"  - {dep}")
        print(f"\n请运行以下命令安装:")
        print(f"pip install {' '.join(missing_deps)}")
        return False
    
    return True

def setup_application():
    """设置应用程序"""
    # 延迟导入PyQt6以加快启动速度
    from PyQt6.QtWidgets import QApplication
    from PyQt6.QtCore import Qt, QLocale
    from PyQt6.QtGui import QFont, QIcon, QPixmap, QPainter, QBrush, QLinearGradient, QColor
    
    app = QApplication(sys.argv)
    
    # 基本设置
    app.setApplicationName("DeepCAD-SCOUR")
    app.setApplicationVersion("2.0 优化版")
    app.setOrganizationName("DeepCAD Engineering")
    
    # 设置中文环境
    QLocale.setDefault(QLocale(QLocale.Language.Chinese, QLocale.Country.China))
    
    # 设置字体
    font = QFont("Microsoft YaHei UI, Arial", 9)
    app.setFont(font)
    
    # 设置图标
    icon = create_app_icon()
    app.setWindowIcon(icon)
    
    # 设置样式
    set_app_style(app)
    
    return app

def create_app_icon():
    """创建应用程序图标"""
    from PyQt6.QtGui import QIcon, QPixmap, QPainter, QBrush, QLinearGradient, QColor
    from PyQt6.QtCore import Qt
    
    pixmap = QPixmap(48, 48)
    pixmap.fill(Qt.GlobalColor.transparent)
    
    painter = QPainter(pixmap)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    
    # 创建渐变
    gradient = QLinearGradient(0, 0, 48, 48)
    gradient.setColorAt(0, QColor(0, 120, 215))
    gradient.setColorAt(1, QColor(0, 90, 160))
    
    # 绘制圆形背景
    painter.setBrush(QBrush(gradient))
    painter.setPen(Qt.PenStyle.NoPen)
    painter.drawEllipse(2, 2, 44, 44)
    
    # 绘制水波纹
    painter.setPen(QColor(255, 255, 255, 150))
    painter.drawEllipse(12, 12, 24, 24)
    painter.drawEllipse(16, 16, 16, 16)
    
    # 绘制桥墩
    painter.setBrush(QBrush(QColor(255, 255, 255)))
    painter.drawRect(22, 10, 4, 16)
    
    painter.end()
    return QIcon(pixmap)

def set_app_style(app):
    """设置应用程序样式"""
    style = """
    QMainWindow {
        background-color: #f8fafc;
        color: #334155;
    }
    
    QMenuBar {
        background-color: #ffffff;
        border-bottom: 1px solid #e2e8f0;
        padding: 4px;
    }
    
    QMenuBar::item {
        background: transparent;
        padding: 6px 12px;
        border-radius: 4px;
    }
    
    QMenuBar::item:selected {
        background-color: #f1f5f9;
    }
    
    QStatusBar {
        background-color: #f8fafc;
        border-top: 1px solid #e2e8f0;
        color: #64748b;
    }
    
    QPushButton {
        background-color: #0078d4;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        font-weight: 500;
    }
    
    QPushButton:hover {
        background-color: #106ebe;
    }
    
    QPushButton:pressed {
        background-color: #005a9e;
    }
    
    QPushButton:disabled {
        background-color: #94a3b8;
        color: #cbd5e1;
    }
    
    QGroupBox {
        font-weight: 600;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        margin-top: 6px;
        padding-top: 6px;
        background-color: #ffffff;
    }
    
    QGroupBox::title {
        subcontrol-origin: margin;
        left: 10px;
        padding: 0 5px 0 5px;
    }
    
    QLineEdit, QDoubleSpinBox, QSpinBox, QComboBox {
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        padding: 6px;
        background-color: #ffffff;
    }
    
    QLineEdit:focus, QDoubleSpinBox:focus, QSpinBox:focus, QComboBox:focus {
        border-color: #0078d4;
        outline: none;
    }
    
    QTableWidget {
        border: 1px solid #cbd5e1;
        background-color: #ffffff;
        alternate-background-color: #f8fafc;
        gridline-color: #e2e8f0;
    }
    
    QHeaderView::section {
        background-color: #f1f5f9;
        border: none;
        border-right: 1px solid #e2e8f0;
        border-bottom: 1px solid #e2e8f0;
        padding: 8px;
        font-weight: 600;
    }
    
    QProgressBar {
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        text-align: center;
        background-color: #f1f5f9;
    }
    
    QProgressBar::chunk {
        background-color: #0078d4;
        border-radius: 3px;
    }
    """
    
    app.setStyleSheet(style)

def show_startup_message():
    """显示启动信息"""
    print("DeepCAD-SCOUR 桥墩冲刷分析系统")
    print("优化版 v2.0 - 快速、简洁、专业")
    print("=" * 50)

def main():
    """主程序入口"""
    # 显示启动信息
    show_startup_message()
    
    # 检查Python版本
    print("检查Python版本...", end=" ")
    if not check_python_version():
        input("按Enter键退出...")
        return 1
    print("OK")
    
    # 检查关键依赖
    print("检查依赖包...", end=" ")
    if not check_critical_dependencies():
        input("按Enter键退出...")
        return 1
    print("OK")
    
    # 创建应用程序
    print("初始化应用程序...", end=" ")
    try:
        app = setup_application()
        print("OK")
    except Exception as e:
        print(f"失败: {e}")
        input("按Enter键退出...")
        return 1
    
    # 导入并创建主窗口
    print("加载主界面...", end=" ")
    try:
        from gui.optimized_main_window import OptimizedMainWindow
        main_window = OptimizedMainWindow()
        print("OK")
    except ImportError as e:
        print(f"导入失败: {e}")
        print("\n建议: 检查是否存在gui/optimized_main_window.py文件")
        
        # 尝试加载原始主窗口
        try:
            print("尝试加载原始主窗口...", end=" ")
            from gui.main_window import ScourMainWindow
            main_window = ScourMainWindow()
            print("OK")
        except ImportError:
            print("所有界面加载失败")
            input("按Enter键退出...")
            return 1
    except Exception as e:
        print(f"创建主窗口失败: {e}")
        input("按Enter键退出...")
        return 1
    
    # 显示主窗口
    print("启动界面...", end=" ")
    try:
        main_window.show()
        print("OK")
        print("\n>> 系统启动成功！正在打开主界面...")
        print(">> 提示: 选择参数后点击'开始计算'即可进行冲刷分析")
        print("=" * 50)
    except Exception as e:
        print(f"显示窗口失败: {e}")
        input("按Enter键退出...")
        return 1
    
    # 运行应用程序
    try:
        return app.exec()
    except KeyboardInterrupt:
        print("\n用户中断程序")
        return 0
    except Exception as e:
        print(f"\n程序运行错误: {e}")
        return 1

if __name__ == "__main__":
    # 设置控制台编码
    if sys.platform.startswith('win'):
        os.system('chcp 65001 > nul')  # 设置UTF-8编码
    
    # 运行主程序
    exit_code = main()
    
    # 如果出错，等待用户输入
    if exit_code != 0:
        input("\n按Enter键退出...")
    
    sys.exit(exit_code)