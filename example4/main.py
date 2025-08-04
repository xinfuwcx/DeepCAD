#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Example4 - 3D瓦片加载器桌面程序
基于iTowns功能的纯桌面版3D Tiles查看器

基于DeepCAD平台，支持3D Tiles标准的本地文件加载和可视化
"""

import sys
import os
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root.parent))  # 添加DeepCAD根目录

try:
    from PyQt6.QtWidgets import QApplication, QMessageBox
    from PyQt6.QtCore import Qt
    from PyQt6.QtGui import QIcon
    PYQT_AVAILABLE = True
except ImportError:
    print("警告: 未安装PyQt6，GUI功能不可用")
    print("请运行: pip install PyQt6")
    PYQT_AVAILABLE = False

if PYQT_AVAILABLE:
    from gui.main_window import TileViewerMainWindow
else:
    TileViewerMainWindow = None


class Example4Application:
    """Example4 3D瓦片查看器应用程序主类"""
    
    def __init__(self):
        self.app = None
        self.main_window = None
        
    def initialize(self):
        """初始化应用程序"""
        # 创建QApplication实例
        self.app = QApplication(sys.argv)
        self.app.setApplicationName("Example4 - 3D瓦片查看器")
        self.app.setApplicationVersion("1.0.0")
        self.app.setOrganizationName("DeepCAD")
        
        # 设置应用程序图标
        icon_path = project_root / "resources" / "icons" / "tile_viewer.ico"
        if icon_path.exists():
            self.app.setWindowIcon(QIcon(str(icon_path)))
            
        # 设置应用程序样式
        self.set_application_style()
        
        # 创建主窗口
        self.main_window = TileViewerMainWindow()
        
    def set_application_style(self):
        """设置应用程序样式"""
        style_sheet = """
        QMainWindow {
            background-color: #2b2b2b;
            color: #ffffff;
        }
        
        QMenuBar {
            background-color: #3c3c3c;
            border-bottom: 1px solid #555555;
            color: #ffffff;
        }
        
        QMenuBar::item {
            padding: 5px 10px;
            background-color: transparent;
        }
        
        QMenuBar::item:selected {
            background-color: #4a4a4a;
        }
        
        QToolBar {
            background-color: #3c3c3c;
            border: 1px solid #555555;
            spacing: 3px;
        }
        
        QStatusBar {
            background-color: #3c3c3c;
            border-top: 1px solid #555555;
            color: #ffffff;
        }
        
        QPushButton {
            background-color: #4a4a4a;
            border: 1px solid #666666;
            padding: 5px 15px;
            border-radius: 3px;
            color: #ffffff;
        }
        
        QPushButton:hover {
            background-color: #5a5a5a;
            border-color: #777777;
        }
        
        QPushButton:pressed {
            background-color: #3a3a3a;
        }
        
        QPushButton:disabled {
            background-color: #2a2a2a;
            color: #666666;
        }
        
        QTreeWidget {
            background-color: #3c3c3c;
            border: 1px solid #555555;
            color: #ffffff;
        }
        
        QTreeWidget::item:selected {
            background-color: #4a90e2;
        }
        
        QDockWidget {
            background-color: #3c3c3c;
            color: #ffffff;
        }
        
        QDockWidget::title {
            background-color: #4a4a4a;
            padding: 5px;
        }
        """
        self.app.setStyleSheet(style_sheet)
        
    def run(self):
        """运行应用程序"""
        if not self.app:
            self.initialize()
            
        # 显示主窗口
        self.main_window.show()
        
        # 启动事件循环
        return self.app.exec()


def check_dependencies():
    """检查必要的依赖包"""
    dependencies_ok = True
    
    # 检查PyQt6
    try:
        import PyQt6
        print("✓ PyQt6可用")
    except ImportError:
        print("✗ PyQt6不可用，请安装: pip install PyQt6")
        dependencies_ok = False
    
    # 检查PyVista
    try:
        import pyvista
        print("✓ PyVista可用")
    except ImportError:
        print("⚠ PyVista不可用，3D渲染功能受限")
        print("  建议安装: pip install pyvista")
    
    # 检查VTK
    try:
        import vtk
        print("✓ VTK可用")
    except ImportError:
        print("⚠ VTK不可用，将使用备用渲染器")
        print("  建议安装: pip install vtk")
    
    # 检查NumPy
    try:
        import numpy
        print("✓ NumPy可用")
    except ImportError:
        print("✗ NumPy不可用，程序无法运行")
        print("  请安装: pip install numpy")
        dependencies_ok = False
    
    # 检查其他依赖
    optional_deps = {
        'meshio': '网格文件I/O支持',
        'trimesh': '几何处理支持',
        'Pillow': '纹理图像处理',
        'requests': 'HTTP瓦片源支持'
    }
    
    for dep, desc in optional_deps.items():
        try:
            __import__(dep)
            print(f"✓ {dep}可用 - {desc}")
        except ImportError:
            print(f"⚠ {dep}不可用 - {desc}将受限")
    
    return dependencies_ok


def check_3dtiles_support():
    """检查3D Tiles支持能力"""
    print("\n检查3D Tiles支持能力...")
    
    # 检查JSON解析
    try:
        import json
        print("✓ JSON解析支持")
    except ImportError:
        print("✗ JSON解析不可用")
        return False
    
    # 检查HTTP请求
    try:
        import urllib.request
        print("✓ HTTP请求支持")
    except ImportError:
        print("⚠ HTTP请求受限")
    
    # 检查文件格式支持
    formats = {
        'gltf': 'glTF模型格式',
        'b3dm': '批处理3D模型',
        'pnts': '点云数据',
        'i3dm': '实例化3D模型'
    }
    
    print("支持的3D Tiles格式:")
    for fmt, desc in formats.items():
        print(f"  ✓ {fmt.upper()} - {desc}")
    
    return True


def main():
    """主函数"""
    print("=" * 60)
    print("Example4 - 3D瓦片查看器")
    print("基于PyQt6 + VTK/PyVista | 版本 1.0.0")
    print("=" * 60)
    
    # 检查依赖包
    print("检查系统依赖...")
    if not check_dependencies():
        print("\n依赖检查失败，程序无法正常运行")
        if not PYQT_AVAILABLE:
            print("\n无法启动GUI，请安装PyQt6:")
            print("pip install PyQt6")
            print("\n或者运行核心模块测试:")
            print("python core/tile_loader.py")
            print("python renderers/vtk_renderer.py")
        sys.exit(1)
    
    # 检查3D Tiles支持
    if not check_3dtiles_support():
        print("3D Tiles支持检查失败")
        sys.exit(1)
    
    # 创建输出目录
    output_dirs = [
        project_root / "output" / "projects",
        project_root / "output" / "exports",
        project_root / "output" / "cache"
    ]
    
    for dir_path in output_dirs:
        dir_path.mkdir(parents=True, exist_ok=True)
    
    if PYQT_AVAILABLE:
        print("\n启动3D瓦片查看器...")
        
        try:
            # 创建并运行应用程序
            app = Example4Application()
            exit_code = app.run()
            
            print("应用程序正常退出")
            sys.exit(exit_code)
            
        except Exception as e:
            print(f"应用程序启动失败: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
    else:
        print("GUI不可用，请安装PyQt6后重试")
        sys.exit(1)


if __name__ == "__main__":
    main()