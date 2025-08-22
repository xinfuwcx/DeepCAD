#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD-SCOUR 增强版主程序
Enhanced Bridge Pier Scour Simulation System

Features:
- 高性能3D可视化 (PyVista)
- 智能网格生成 (GMSH)
- 多物理场耦合求解器
- 现代化用户界面
- 实时流场分析
"""

import sys
import os
from pathlib import Path

# 添加项目路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# 检查Python版本
if sys.version_info < (3, 7):
    print("错误: 需要Python 3.7或更高版本")
    sys.exit(1)

# 导入PyQt6
try:
    from PyQt6.QtWidgets import QApplication, QMessageBox, QSplashScreen
    from PyQt6.QtCore import Qt, QTimer, QLocale
    from PyQt6.QtGui import QIcon, QPixmap, QPainter, QBrush, QLinearGradient, QColor, QFont
except ImportError as e:
    print(f"错误: 无法导入PyQt6: {e}")
    print("请运行: pip install PyQt6")
    sys.exit(1)

# 检查必要依赖
def check_dependencies():
    """检查必要依赖"""
    missing_deps = []
    
    # 核心依赖
    try:
        import numpy
    except ImportError:
        missing_deps.append("numpy")
    
    try:
        import matplotlib
    except ImportError:
        missing_deps.append("matplotlib")
    
    # 可选但推荐的依赖
    optional_deps = []
    
    try:
        import pyvista
    except ImportError:
        optional_deps.append("pyvista (3D可视化)")
    
    try:
        import gmsh
    except ImportError:
        optional_deps.append("gmsh (网格生成)")
    
    try:
        import scipy
    except ImportError:
        optional_deps.append("scipy (数值计算)")
    
    try:
        import qtawesome
    except ImportError:
        optional_deps.append("qtawesome (图标)")
    
    return missing_deps, optional_deps


def create_splash_screen():
    """创建启动画面"""
    # 创建启动画面
    splash_pixmap = QPixmap(600, 400)
    splash_pixmap.fill(Qt.GlobalColor.transparent)
    
    painter = QPainter(splash_pixmap)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    
    # 创建渐变背景
    gradient = QLinearGradient(0, 0, 600, 400)
    gradient.setColorAt(0, QColor(30, 70, 110))
    gradient.setColorAt(0.5, QColor(0, 120, 215))
    gradient.setColorAt(1, QColor(50, 150, 250))
    
    painter.setBrush(QBrush(gradient))
    painter.setPen(Qt.PenStyle.NoPen)
    painter.drawRect(0, 0, 600, 400)
    
    # 绘制标题
    painter.setPen(QColor(255, 255, 255))
    title_font = QFont("Arial", 28, QFont.Weight.Bold)
    painter.setFont(title_font)
    painter.drawText(50, 120, "DeepCAD-SCOUR")
    
    # 绘制副标题
    subtitle_font = QFont("Arial", 16)
    painter.setFont(subtitle_font)
    painter.drawText(50, 160, "桥墩浅蚀模拟系统 - 增强版")
    painter.drawText(50, 190, "Bridge Pier Scour Simulation - Enhanced")
    
    # 绘制版本信息
    version_font = QFont("Arial", 12)
    painter.setFont(version_font)
    painter.drawText(50, 250, "版本 2.0.0")
    painter.drawText(50, 270, "基于 PyVista + GMSH + 自配置求解器")
    
    # 绘制特性列表
    features = [
        "✓ 高性能3D流场可视化",
        "✓ 智能网格自动生成", 
        "✓ 多物理场耦合求解",
        "✓ 实时参数敏感性分析"
    ]
    
    feature_font = QFont("Arial", 10)
    painter.setFont(feature_font)
    for i, feature in enumerate(features):
        painter.drawText(50, 310 + i * 20, feature)
    
    painter.end()
    
    splash = QSplashScreen(splash_pixmap)
    splash.setWindowFlags(Qt.WindowType.SplashScreen | Qt.WindowType.FramelessWindowHint)
    
    return splash


def setup_application():
    """设置应用程序"""
    app = QApplication(sys.argv)
    
    # 设置应用程序信息
    app.setApplicationName("DeepCAD-SCOUR Enhanced")
    app.setApplicationVersion("2.0.0")
    app.setOrganizationName("DeepCAD Engineering Solutions")
    app.setApplicationDisplayName("桥墩浅蚀模拟系统 - 增强版")
    
    # 设置语言环境
    QLocale.setDefault(QLocale(QLocale.Language.Chinese, QLocale.Country.China))
    
    # 设置全局字体
    font = QFont("Microsoft YaHei UI, Segoe UI, Arial", 9)
    app.setFont(font)
    
    # 设置应用程序图标
    try:
        icon_pixmap = QPixmap(64, 64)
        icon_pixmap.fill(Qt.GlobalColor.transparent)
        
        icon_painter = QPainter(icon_pixmap)
        icon_painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 绘制图标
        gradient = QLinearGradient(0, 0, 64, 64)
        gradient.setColorAt(0, QColor(0, 120, 215))
        gradient.setColorAt(1, QColor(0, 90, 160))
        
        icon_painter.setBrush(QBrush(gradient))
        icon_painter.setPen(Qt.PenStyle.NoPen)
        icon_painter.drawEllipse(4, 4, 56, 56)
        
        # 绘制水波纹效果
        icon_painter.setPen(Qt.PenStyle.SolidLine)
        icon_painter.setPen(QColor(255, 255, 255, 180))
        icon_painter.drawEllipse(16, 16, 32, 32)
        icon_painter.drawEllipse(20, 20, 24, 24)
        
        icon_painter.end()
        
        app.setWindowIcon(QIcon(icon_pixmap))
    except Exception as e:
        print(f"设置图标失败: {e}")
    
    return app


def main():
    """主程序入口"""
    # 检查依赖
    missing_deps, optional_deps = check_dependencies()
    
    if missing_deps:
        print("错误: 缺少必要依赖:")
        for dep in missing_deps:
            print(f"  - {dep}")
        print("\n请运行: pip install " + " ".join(missing_deps))
        sys.exit(1)
    
    # 创建应用程序
    app = setup_application()
    
    # 显示启动画面
    splash = create_splash_screen()
    splash.show()
    app.processEvents()
    
    # 更新启动信息
    def update_splash(message):
        splash.showMessage(
            message,
            Qt.AlignmentFlag.AlignBottom | Qt.AlignmentFlag.AlignLeft,
            QColor(255, 255, 255)
        )
        app.processEvents()
    
    try:
        # 加载模块
        update_splash("正在加载核心模块...")
        from gui.main_window import ScourMainWindow
        
        update_splash("正在初始化3D渲染引擎...")
        # 预热PyVista (如果可用)
        try:
            import pyvista as pv
            pv.set_plot_theme("default")
        except ImportError:
            pass
        
        update_splash("正在初始化求解器...")
        # 预热GMSH (如果可用)
        try:
            import gmsh
            gmsh.initialize()
            gmsh.option.setNumber("General.Terminal", 0)
            gmsh.finalize()
        except ImportError:
            pass
        
        update_splash("正在创建主界面...")
        
        # 创建主窗口
        main_window = ScourMainWindow()
        
        # 关闭启动画面
        splash.finish(main_window)
        
        # 显示主窗口
        main_window.show()
        
        # 显示可选依赖提示
        if optional_deps:
            QTimer.singleShot(1000, lambda: show_optional_deps_info(main_window, optional_deps))
        
        # 运行应用程序
        return app.exec()
        
    except ImportError as e:
        splash.close()
        QMessageBox.critical(
            None, 
            "导入错误", 
            f"无法导入必要模块:\n{str(e)}\n\n请检查安装是否完整。"
        )
        return 1
        
    except Exception as e:
        splash.close()
        QMessageBox.critical(
            None,
            "启动错误",
            f"应用程序启动失败:\n{str(e)}"
        )
        return 1


def show_optional_deps_info(parent, optional_deps):
    """显示可选依赖信息"""
    if not optional_deps:
        return
        
    msg = QMessageBox(parent)
    msg.setWindowTitle("可选功能提示")
    msg.setIcon(QMessageBox.Icon.Information)
    
    text = "以下可选依赖未安装，部分高级功能可能不可用:\n\n"
    for dep in optional_deps:
        text += f"• {dep}\n"
    
    text += "\n建议安装以获得完整功能体验:\n"
    text += "pip install pyvista gmsh scipy qtawesome"
    
    msg.setText(text)
    msg.setStandardButtons(QMessageBox.StandardButton.Ok)
    msg.exec()


if __name__ == "__main__":
    # 设置环境变量
    os.environ['QT_AUTO_SCREEN_SCALE_FACTOR'] = '1'
    
    # 启动应用程序
    exit_code = main()
    sys.exit(exit_code)