"""
GEM隐式建模系统 (GEM Implicit Modeling System)
GEological Modeling based on GemPy with Professional CAE Interface

专业级地质隐式建模CAE系统
基于GemPy构建，Abaqus风格界面设计
"""

import sys
import os
import traceback
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# 版本信息
__version__ = "1.0.0"
__author__ = "DeepCAD Team"
__description__ = "GEM隐式建模系统 - 专业级地质建模CAE软件"

def check_system_requirements():
    """检查系统依赖"""
    print("🔍 检查系统依赖...")
    
    requirements = {
        'Python': '3.8+',
        'PyQt6': '6.4+',
        'NumPy': '1.20+',
        'Pandas': '1.3+',
        'GemPy': '3.0+',
        'PyVista': '0.40+',
        'Matplotlib': '3.5+'
    }
    
    missing_packages = []
    available_packages = {}
    
    # 检查Python版本
    import sys
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    print(f"  ✓ Python: {python_version}")
    
    # 检查必需包
    for package, min_version in requirements.items():
        if package == 'Python':
            continue
            
        try:
            if package == 'PyQt6':
                from PyQt6 import QtCore
                version = QtCore.PYQT_VERSION_STR
            elif package == 'NumPy':
                import numpy
                version = numpy.__version__
            elif package == 'Pandas':
                import pandas
                version = pandas.__version__
            elif package == 'GemPy':
                import gempy
                version = gempy.__version__
            elif package == 'PyVista':
                import pyvista
                version = pyvista.__version__
            elif package == 'Matplotlib':
                import matplotlib
                version = matplotlib.__version__
            else:
                continue
                
            available_packages[package] = version
            print(f"  ✓ {package}: {version}")
            
        except ImportError:
            missing_packages.append(package)
            print(f"  ✗ {package}: 未安装")
    
    # 检查可选包
    optional_packages = {
        'qtawesome': '图标支持',
        'pyvistaqt': 'Qt集成支持',
        'vtk': '高级3D渲染',
        'scikit-learn': '机器学习功能',
        'scipy': '科学计算'
    }
    
    print("\n📦 可选包状态:")
    for package, description in optional_packages.items():
        try:
            __import__(package)
            print(f"  ✓ {package}: 可用 - {description}")
        except ImportError:
            print(f"  ⚠ {package}: 不可用 - {description}")
    
    return len(missing_packages) == 0, missing_packages, available_packages

def show_splash_screen():
    """显示启动画面"""
    from PyQt6.QtWidgets import QSplashScreen, QLabel, QVBoxLayout, QWidget
    from PyQt6.QtCore import Qt, QTimer
    from PyQt6.QtGui import QPixmap, QPainter, QFont, QColor
    
    # 创建启动画面
    splash_pixmap = QPixmap(500, 300)
    splash_pixmap.fill(QColor(45, 55, 72))  # 深蓝色背景
    
    painter = QPainter(splash_pixmap)
    painter.setPen(QColor(255, 255, 255))
    
    # 标题
    title_font = QFont("Arial", 24, QFont.Weight.Bold)
    painter.setFont(title_font)
    painter.drawText(50, 80, "GEM隐式建模系统")
    
    # 副标题
    subtitle_font = QFont("Arial", 14)
    painter.setFont(subtitle_font)
    painter.setPen(QColor(200, 200, 200))
    painter.drawText(50, 110, "GEM Implicit Modeling System")
    
    # 版本信息
    version_font = QFont("Arial", 12)
    painter.setFont(version_font)
    painter.setPen(QColor(150, 150, 150))
    painter.drawText(50, 140, f"版本 {__version__}")
    painter.drawText(50, 160, "基于GemPy的专业地质建模CAE系统")
    
    # 特性列表
    features = [
        "• Abaqus风格专业界面",
        "• 三维地质隐式建模",
        "• 实时可视化渲染",
        "• 智能数据导入",
        "• 地球物理模拟"
    ]
    
    feature_font = QFont("Arial", 10)
    painter.setFont(feature_font)
    painter.setPen(QColor(180, 180, 180))
    
    for i, feature in enumerate(features):
        painter.drawText(50, 200 + i * 18, feature)
    
    # 底部信息
    painter.setPen(QColor(120, 120, 120))
    painter.drawText(350, 280, f"© 2024 {__author__}")
    
    painter.end()
    
    return QSplashScreen(splash_pixmap)

def create_desktop_icon():
    """创建桌面图标（Windows）"""
    if sys.platform == "win32":
        try:
            import winshell
            from win32com.client import Dispatch
            
            desktop = winshell.desktop()
            shortcut_path = os.path.join(desktop, "GEM隐式建模系统.lnk")
            
            target = sys.executable
            arguments = f'"{__file__}"'
            
            shell = Dispatch('WScript.Shell')
            shortcut = shell.CreateShortCut(shortcut_path)
            shortcut.Targetpath = target
            shortcut.Arguments = arguments
            shortcut.WorkingDirectory = str(project_root)
            shortcut.IconLocation = target
            shortcut.save()
            
            print(f"✓ 桌面快捷方式已创建: {shortcut_path}")
            return True
        except Exception as e:
            print(f"⚠ 创建桌面快捷方式失败: {e}")
            return False
    return False

class GEMApplication:
    """GEM应用程序管理器"""
    
    def __init__(self):
        self.app = None
        self.main_window = None
        self.splash = None
        
    def initialize(self):
        """初始化应用程序"""
        try:
            from PyQt6.QtWidgets import QApplication
            from PyQt6.QtCore import Qt
            from PyQt6.QtGui import QIcon
            
            # 创建应用程序实例
            self.app = QApplication(sys.argv)
            self.app.setApplicationName("GEM隐式建模系统")
            self.app.setApplicationDisplayName("GEM Implicit Modeling System")
            self.app.setApplicationVersion(__version__)
            self.app.setOrganizationName("DeepCAD")
            self.app.setOrganizationDomain("deepcad.ai")
            
            # 设置应用程序图标
            # icon_path = project_root / "resources" / "gem_icon.ico"
            # if icon_path.exists():
            #     self.app.setWindowIcon(QIcon(str(icon_path)))
            
            # 显示启动画面
            self.splash = show_splash_screen()
            self.splash.show()
            
            # 处理启动画面期间的事件
            self.app.processEvents()
            
            return True
            
        except Exception as e:
            print(f"❌ 应用程序初始化失败: {e}")
            traceback.print_exc()
            return False
            
    def load_main_window(self):
        """加载主窗口"""
        try:
            from gempy_main_window import GemPyMainWindow
            
            # 更新启动画面状态
            if self.splash:
                self.splash.showMessage(
                    "正在加载主界面...", 
                    Qt.AlignmentFlag.AlignBottom | Qt.AlignmentFlag.AlignCenter,
                    Qt.GlobalColor.white
                )
                self.app.processEvents()
            
            # 创建主窗口
            self.main_window = GemPyMainWindow()
            
            # 更新窗口标题
            self.main_window.setWindowTitle(f"GEM隐式建模系统 v{__version__}")
            
            return True
            
        except Exception as e:
            print(f"❌ 主窗口加载失败: {e}")
            traceback.print_exc()
            return False
            
    def show_main_window(self):
        """显示主窗口"""
        if self.main_window:
            # 关闭启动画面
            if self.splash:
                self.splash.finish(self.main_window)
                
            # 显示主窗口
            self.main_window.show()
            
            # 窗口居中显示
            self.center_window()
            
            return True
        return False
        
    def center_window(self):
        """窗口居中显示"""
        if self.main_window:
            from PyQt6.QtGui import QGuiApplication
            
            screen = QGuiApplication.primaryScreen()
            screen_geometry = screen.availableGeometry()
            window_geometry = self.main_window.frameGeometry()
            
            center_point = screen_geometry.center()
            window_geometry.moveCenter(center_point)
            self.main_window.move(window_geometry.topLeft())
            
    def run(self):
        """运行应用程序"""
        if self.app and self.main_window:
            try:
                return self.app.exec()
            except KeyboardInterrupt:
                print("\n👋 用户中断，正在退出...")
                return 0
            except Exception as e:
                print(f"❌ 应用程序运行错误: {e}")
                traceback.print_exc()
                return 1
        return 1

def install_requirements():
    """安装缺失的依赖包"""
    print("\n📦 正在安装缺失的依赖包...")
    
    requirements = [
        "PyQt6>=6.4.0",
        "numpy>=1.20.0",
        "pandas>=1.3.0", 
        "gempy>=3.0.0",
        "pyvista>=0.40.0",
        "matplotlib>=3.5.0",
        "scipy>=1.7.0",
        "scikit-learn>=1.0.0",
        "qtawesome>=1.2.0",
        "pyvistaqt>=0.9.0"
    ]
    
    import subprocess
    
    for requirement in requirements:
        try:
            print(f"安装 {requirement}...")
            subprocess.check_call([
                sys.executable, "-m", "pip", "install", requirement
            ])
        except subprocess.CalledProcessError as e:
            print(f"⚠ 安装 {requirement} 失败: {e}")
            
    print("✓ 依赖包安装完成")

def main():
    """主函数"""
    print("=" * 60)
    print(f"[GEM] {__description__}")
    print(f"版本: {__version__}")
    print(f"开发: {__author__}")
    print("=" * 60)
    
    # 检查系统依赖
    deps_ok, missing_packages, available_packages = check_system_requirements()
    
    if not deps_ok:
        print(f"\n❌ 缺少必需依赖包: {', '.join(missing_packages)}")
        
        install_choice = input("\n是否自动安装缺失的依赖包? (y/n): ").lower().strip()
        if install_choice in ['y', 'yes', '是']:
            install_requirements()
            
            # 重新检查依赖
            deps_ok, missing_packages, _ = check_system_requirements()
            if not deps_ok:
                print(f"\n❌ 仍然缺少依赖包: {', '.join(missing_packages)}")
                print("请手动安装后重试")
                return 1
        else:
            print("请手动安装依赖包后重试")
            return 1
    
    print("\n✅ 所有依赖检查通过")
    
    # 询问是否创建桌面快捷方式
    if len(sys.argv) == 1:  # 首次运行
        create_icon = input("\n是否创建桌面快捷方式? (y/n): ").lower().strip()
        if create_icon in ['y', 'yes', '是']:
            create_desktop_icon()
    
    print("\n🚀 启动GEM隐式建模系统...")
    
    # 创建并运行应用程序
    gem_app = GEMApplication()
    
    if not gem_app.initialize():
        print("❌ 应用程序初始化失败")
        return 1
        
    if not gem_app.load_main_window():
        print("❌ 主窗口加载失败")
        return 1
        
    if not gem_app.show_main_window():
        print("❌ 主窗口显示失败")
        return 1
        
    print("✅ GEM隐式建模系统启动成功")
    
    # 运行应用程序
    exit_code = gem_app.run()
    
    print("\n👋 GEM隐式建模系统已退出")
    return exit_code

if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n👋 用户中断")
        sys.exit(0)
    except Exception as e:
        print(f"\n💥 严重错误: {e}")
        traceback.print_exc()
        sys.exit(1)