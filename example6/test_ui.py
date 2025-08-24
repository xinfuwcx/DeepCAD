#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
界面测试脚本 - 快速预览美化效果
用于测试Abaqus风格界面和3D渲染效果
"""

import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from PyQt6.QtWidgets import QApplication, QMessageBox
from PyQt6.QtCore import Qt
from gui.main_window import ScourMainWindow


def main():
    """主函数"""
    app = QApplication(sys.argv)
    
    # 设置应用属性
    app.setApplicationName("DeepCAD-SCOUR Professional")
    app.setApplicationVersion("2.0")
    app.setOrganizationName("DeepCAD Engineering")
    
    # 启用高DPI缩放
    app.setAttribute(Qt.ApplicationAttribute.AA_EnableHighDpiScaling, True)
    app.setAttribute(Qt.ApplicationAttribute.AA_UseHighDpiPixmaps, True)
    
    # 设置全局字体
    from PyQt6.QtGui import QFont
    font = QFont("Segoe UI", 9)
    font.setStyleHint(QFont.StyleHint.System)
    app.setFont(font)
    
    try:
        # 创建主窗口
        window = ScourMainWindow()
        
        # 显示窗口
        window.show()
        
        # 显示欢迎消息
        QMessageBox.information(
            window,
            "DeepCAD-SCOUR Professional v2.0",
            """欢迎使用桥墩浅蚀模拟专业版！

新功能特性：
✓ Abaqus风格专业界面
✓ 超大3D视口 (2400x1400)
✓ 物理基础渲染 (PBR)
✓ 工作室级光照系统
✓ 高质量材质和阴影
✓ 渐变背景和抗锯齿

开始您的专业级工程分析之旅！"""
        )
        
        # 运行应用
        return app.exec()
        
    except ImportError as e:
        QMessageBox.critical(
            None,
            "依赖错误",
            f"缺少必要的依赖包：{e}\n\n"
            "请确保已安装：\n"
            "- PyQt6\n"
            "- PyVista\n" 
            "- NumPy\n"
            "- Matplotlib"
        )
        return 1
        
    except Exception as e:
        QMessageBox.critical(
            None,
            "启动错误", 
            f"程序启动失败：{e}\n\n"
            "请检查Python环境和依赖包。"
        )
        return 1


if __name__ == '__main__':
    sys.exit(main())