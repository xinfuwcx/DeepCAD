"""
Professional GemPy Interface Launcher
专业地质建模界面启动器
"""

import sys
import os
from PyQt6.QtWidgets import QApplication, QSplashScreen, QLabel
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QPixmap, QPainter, QFont, QColor

def create_splash_screen(app):
    """创建启动画面"""
    splash_pixmap = QPixmap(600, 400)
    splash_pixmap.fill(QColor(15, 23, 42))  # ABAQUS深色背景
    
    painter = QPainter(splash_pixmap)
    painter.setFont(QFont("Arial", 24, QFont.Weight.Bold))
    painter.setPen(QColor(59, 130, 246))  # 专业蓝色
    
    # 绘制标题
    painter.drawText(50, 100, "GemPy Professional Interface")
    painter.setFont(QFont("Arial", 14))
    painter.setPen(QColor(156, 163, 175))
    painter.drawText(50, 140, "ABAQUS CAE Level Professional Design")
    painter.drawText(50, 170, "Loading geological modeling system...")
    
    # 绘制特性列表
    painter.setFont(QFont("Arial", 11))
    painter.setPen(QColor(249, 115, 22))  # 橙色强调
    features = [
        "✓ Professional 3D Visualization",
        "✓ Complete Section System (XY/XZ/YZ)",
        "✓ Advanced Material Design",
        "✓ Real GemPy Integration", 
        "✓ Engineering Grade Interface"
    ]
    
    y_pos = 220
    for feature in features:
        painter.drawText(50, y_pos, feature)
        y_pos += 25
    
    painter.end()
    
    splash = QSplashScreen(splash_pixmap)
    splash.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint)
    return splash

def main():
    """主启动函数"""
    app = QApplication(sys.argv)
    app.setStyle('Fusion')
    
    # 显示启动画面
    splash = create_splash_screen(app)
    splash.show()
    app.processEvents()
    
    # 模拟加载过程
    import time
    for i in range(5):
        time.sleep(0.5)
        splash.showMessage(f"Loading components... {(i+1)*20}%", 
                          Qt.AlignmentFlag.AlignBottom | Qt.AlignmentFlag.AlignCenter,
                          QColor(59, 130, 246))
        app.processEvents()
    
    try:
        # 尝试启动ABAQUS级别界面
        splash.showMessage("Loading ABAQUS Ultimate Interface...", 
                          Qt.AlignmentFlag.AlignBottom | Qt.AlignmentFlag.AlignCenter,
                          QColor(249, 115, 22))
        app.processEvents()
        
        from gempy_abaqus_ultimate import GemPyAbaqusUltimate
        window = GemPyAbaqusUltimate()
        
    except ImportError:
        # 回退到专业界面
        splash.showMessage("Loading Professional Interface...", 
                          Qt.AlignmentFlag.AlignBottom | Qt.AlignmentFlag.AlignCenter,
                          QColor(16, 185, 129))
        app.processEvents()
        
        try:
            from gempy_professional_interface import GemPyProfessionalInterface
            window = GemPyProfessionalInterface()
        except ImportError:
            # 最终回退
            from PyQt6.QtWidgets import QMainWindow, QLabel
            window = QMainWindow()
            window.setCentralWidget(QLabel("Interface loading failed. Please check installation."))
            window.setWindowTitle("GemPy Interface - Error")
    
    # 关闭启动画面并显示主界面
    splash.finish(window)
    window.show()
    
    print("=== GemPy Professional Interface Started ===")
    print("Features available:")
    print("- Professional 3D visualization with PyVista")
    print("- Complete XY/XZ/YZ section system")
    print("- ABAQUS CAE level visual design")
    print("- Real GemPy geological modeling")
    print("- Advanced material design theme")
    print("- Professional dialog system")
    print("- Engineering grade interactions")
    print("===========================================")
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()