#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Example2 - MIDAS模型桌面版计算程序
主程序入口

基于DeepCAD平台，支持MIDAS 2022版模型读取和Kratos计算
"""

import sys
import os
from pathlib import Path

# 设置控制台编码为UTF-8
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

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
    from gui.main_window import MainWindow
else:
    MainWindow = None


class Example2Application:
    """Example2应用程序主类"""
    
    def __init__(self):
        self.app = None
        self.main_window = None
        
    def initialize(self):
        """初始化应用程序"""
        # 创建QApplication实例
        self.app = QApplication(sys.argv)
        self.app.setApplicationName("Example2 - DeepCAD系统测试程序")
        self.app.setApplicationVersion("1.0.0")
        self.app.setOrganizationName("DeepCAD")
        
        # 设置应用程序图标
        icon_path = project_root / "resources" / "icons" / "app_icon.ico"
        if icon_path.exists():
            self.app.setWindowIcon(QIcon(str(icon_path)))
            
        # 设置应用程序样式
        self.set_application_style()
        
        # 创建主窗口
        self.main_window = MainWindow()

        # 应用退出时进行渲染器/Qt资源的干净清理，降低Windows上 wglMakeCurrent 报错
        try:
            self.app.aboutToQuit.connect(self._on_about_to_quit)
        except Exception:
            pass

    def _on_about_to_quit(self):
        """应用退出前的清理：关闭PyVista/Qt交互器，避免OpenGL上下文残留。"""
        try:
            if getattr(self, 'main_window', None):
                # 预处理3D视口清理
                try:
                    pp = getattr(self.main_window, 'preprocessor', None)
                    if pp and hasattr(pp, 'shutdown_viewer'):
                        pp.shutdown_viewer()
                except Exception:
                    pass
                # 后处理清理（若实现了类似接口）
                try:
                    po = getattr(self.main_window, 'postprocessor', None)
                    if po and hasattr(po, 'shutdown_viewer'):
                        po.shutdown_viewer()
                except Exception:
                    pass
        except Exception:
            pass
        
    def set_application_style(self):
        """设置应用程序样式"""
        style_sheet = """
        QMainWindow {
            background-color: #f0f0f0;
        }
        
        QMenuBar {
            background-color: #e0e0e0;
            border-bottom: 1px solid #c0c0c0;
        }
        
        QMenuBar::item {
            padding: 5px 10px;
            background-color: transparent;
        }
        
        QMenuBar::item:selected {
            background-color: #d0d0d0;
        }
        
        QToolBar {
            background-color: #e8e8e8;
            border: 1px solid #c0c0c0;
            spacing: 3px;
        }
        
        QStatusBar {
            background-color: #e0e0e0;
            border-top: 1px solid #c0c0c0;
        }
        
        QPushButton {
            background-color: #ffffff;
            border: 1px solid #c0c0c0;
            padding: 5px 15px;
            border-radius: 3px;
        }
        
        QPushButton:hover {
            background-color: #f0f8ff;
            border-color: #87ceeb;
        }
        
        QPushButton:pressed {
            background-color: #e0e8f0;
        }
        
        QPushButton:disabled {
            background-color: #f5f5f5;
            color: #a0a0a0;
        }
        """
        self.app.setStyleSheet(style_sheet)
        
    def run(self):
        """运行应用程序"""
        if not self.app:
            self.initialize()
            
        # 显示主窗口
        self.main_window.show()
    # 事件循环在 main() 中启动


def check_dependencies():
    """检查必要的依赖包"""
    # 检查PyQt6
    try:
        import PyQt6
        print("OK PyQt6可用")
        
        # 设置OpenGL兼容性模式 - 修复OpenGL上下文错误
        import os
        os.environ['QT_OPENGL'] = 'software'  # 强制软件渲染
        os.environ['QT_QUICK_BACKEND'] = 'software'  # Qt Quick软件渲染
        print("✅ OpenGL兼容性模式已设置")
        
    except ImportError:
        print("NO PyQt6不可用，请安装: pip install PyQt6")
        return False
    
    # 检查PyVista (可选)
    try:
        import pyvista as pv
        
        # 🔧 设置PyVista增强稳定模式 - 修复OpenGL错误
        pv.set_error_output_file("pyvista_errors.log")  # 错误日志
        pv.OFF_SCREEN = False  # 确保屏幕渲染
        
        # 更稳定的OpenGL设置
        try:
            pv.global_theme.multi_samples = 0        # 禁用多重采样
            pv.global_theme.show_edges = False       # 默认不显示边界
            pv.global_theme.line_width = 1           # 线宽设为1
            pv.global_theme.font.size = 12           # 字体大小
            pv.global_theme.background = 'white'     # 白色背景
            
            # OpenGL深度测试和混合设置
            try:
                pv.global_theme.depth_peeling.enabled = False  # 禁用深度剥离
            except AttributeError:
                pass  # 某些版本可能没有这个属性
            
            print("✅ PyVista增强稳定模式已配置")
        except Exception as e:
            print(f"⚠️ PyVista部分配置失败: {e}")
            
        print("OK PyVista可用")
    except ImportError:
        print("WARN PyVista不可用，3D显示功能受限")
    
    # 检查NumPy (使用DeepCAD项目的)
    try:
        import numpy
        print("OK NumPy可用")
    except ImportError:
        print("WARN NumPy不可用")
    
    return True


def check_kratos_availability():
    """检查Kratos可用性"""
    try:
        # 尝试导入DeepCAD的Kratos集成模块
        sys.path.append(str(project_root.parent))
        from core.kratos_integration import KratosIntegration
        print("OK Kratos计算引擎可用")
        return True
    except ImportError:
        print("❌ Kratos计算引擎不可用，无法进行分析计算。请安装并配置Kratos Multiphysics。")
        return False


def main():
    """主函数"""
    print("=" * 60)
    print("Example2 - DeepCAD系统测试程序")
    print("前处理 | 分析 | 后处理 | 版本 1.0.0")
    print("=" * 60)
    
    # 检查依赖包
    print("检查系统依赖...")
    if not check_dependencies():
        if not PYQT_AVAILABLE:
            print("\n无法启动GUI，请安装PyQt6:")
            print("pip install PyQt6")
            print("\n或者运行其他模块的测试:")
            print("python modules/preprocessor.py")
            print("python modules/analyzer.py")
            print("python modules/postprocessor.py")
            sys.exit(1)
    
    # 检查Kratos可用性
    check_kratos_availability()
    
    # 创建输出目录
    output_dirs = [
        project_root / "output" / "projects",
        project_root / "output" / "results", 
        project_root / "output" / "exports"
    ]
    
    for dir_path in output_dirs:
        dir_path.mkdir(parents=True, exist_ok=True)
    
    if PYQT_AVAILABLE:
        print("启动桌面应用程序...")
        
        try:
            # 创建并运行应用程序
            app = Example2Application()
            app.run()
            # 启动事件循环（PyQt6 使用 exec 而非 exec_）
            exit_code = app.app.exec()

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