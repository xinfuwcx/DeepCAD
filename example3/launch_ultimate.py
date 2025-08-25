"""
Launch GemPy Ultimate ABAQUS Interface
启动GemPy终极ABAQUS界面
"""

import sys
import os
from PyQt6.QtWidgets import QApplication, QSplashScreen, QLabel, QVBoxLayout, QWidget
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QPixmap, QPainter, QFont, QColor, QLinearGradient

def create_ultimate_splash():
    """创建终极启动画面"""
    splash_pixmap = QPixmap(700, 450)
    splash_pixmap.fill(QColor(15, 23, 42))  # ABAQUS深色
    
    painter = QPainter(splash_pixmap)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    
    # 创建渐变背景
    gradient = QLinearGradient(0, 0, 700, 450)
    gradient.setColorAt(0, QColor(30, 58, 138))
    gradient.setColorAt(0.3, QColor(15, 23, 42))
    gradient.setColorAt(0.7, QColor(30, 58, 138))
    gradient.setColorAt(1, QColor(15, 23, 42))
    
    painter.fillRect(splash_pixmap.rect(), gradient)
    
    # 主标题
    painter.setFont(QFont("Arial", 28, QFont.Weight.Bold))
    painter.setPen(QColor(59, 130, 246))
    painter.drawText(50, 80, "GemPy Ultimate ABAQUS")
    
    # 副标题
    painter.setFont(QFont("Arial", 16, QFont.Weight.Bold))
    painter.setPen(QColor(249, 115, 22))
    painter.drawText(50, 120, "Professional Geological Modeling System")
    
    # 版本信息
    painter.setFont(QFont("Arial", 12))
    painter.setPen(QColor(156, 163, 175))
    painter.drawText(50, 150, "Version 2025.2.0 Ultimate Edition")
    
    # 特性列表
    painter.setFont(QFont("Arial", 11, QFont.Weight.Bold))
    painter.setPen(QColor(16, 185, 129))
    
    features = [
        "Ultimate ABAQUS CAE Level Visual Design",
        "Dynamic Status Indicators & Progress Bars", 
        "Professional Animation Effects System",
        "Real-time Performance Monitoring",
        "Advanced Notification Framework",
        "Complete 3D Geological Modeling",
        "Professional Section Analysis",
        "Engineering Grade User Interface"
    ]
    
    y_pos = 200
    for feature in features:
        painter.drawText(50, y_pos, f"✓ {feature}")
        y_pos += 25
    
    # 底部信息
    painter.setFont(QFont("Arial", 10))
    painter.setPen(QColor(107, 114, 128))
    painter.drawText(50, 420, "Loading ultimate professional interface...")
    
    painter.end()
    
    return QPixmap(splash_pixmap)

def main():
    """主启动函数"""
    app = QApplication(sys.argv)
    app.setStyle('Fusion')
    
    # 创建启动画面
    splash_pixmap = create_ultimate_splash()
    splash = QSplashScreen(splash_pixmap)
    splash.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint)
    splash.show()
    
    # 显示加载消息
    loading_messages = [
        "Initializing ABAQUS theme system...",
        "Loading enhanced effects framework...",
        "Setting up professional animations...",
        "Configuring dynamic indicators...",
        "Preparing geological modeling engine...",
        "Loading ultimate interface components...",
        "Finalizing professional workspace..."
    ]
    
    message_timer = QTimer()
    message_index = [0]
    
    def update_message():
        if message_index[0] < len(loading_messages):
            splash.showMessage(loading_messages[message_index[0]], 
                             Qt.AlignmentFlag.AlignBottom | Qt.AlignmentFlag.AlignCenter,
                             QColor(59, 130, 246))
            message_index[0] += 1
        else:
            message_timer.stop()
            launch_ultimate_interface()
    
    def launch_ultimate_interface():
        """启动终极界面"""
        try:
            splash.showMessage("Starting Ultimate ABAQUS Interface...", 
                             Qt.AlignmentFlag.AlignBottom | Qt.AlignmentFlag.AlignCenter,
                             QColor(249, 115, 22))
            app.processEvents()
            
            from gempy_ultimate_abaqus import GemPyUltimateAbaqus
            
            # 创建主窗口
            window = GemPyUltimateAbaqus()
            
            # 关闭启动画面并显示主界面
            splash.finish(window)
            window.show()
            
            print("=== GemPy Ultimate ABAQUS Launched Successfully ===")
            print("Interface features activated:")
            print("  - ABAQUS CAE level visual design")
            print("  - Dynamic status and progress system")  
            print("  - Professional animation effects")
            print("  - Real-time performance monitoring")
            print("  - Advanced notification framework")
            print("  - Complete geological modeling workflow")
            print("================================================")
            
        except ImportError as e:
            print(f"Import error: {e}")
            splash.showMessage("Error loading interface, trying fallback...", 
                             Qt.AlignmentFlag.AlignBottom | Qt.AlignmentFlag.AlignCenter,
                             QColor(239, 68, 68))
            
            # 尝试基础界面
            try:
                from gempy_professional_interface import GemPyProfessionalInterface
                window = GemPyProfessionalInterface()
                splash.finish(window)
                window.show()
                print("Fallback to professional interface")
            except Exception as e2:
                print(f"Fallback failed: {e2}")
                splash.close()
                return
    
    # 启动消息更新定时器
    message_timer.timeout.connect(update_message)
    message_timer.start(800)  # 每0.8秒更新一次消息
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()