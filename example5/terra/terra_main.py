#!/usr/bin/env python3
"""
Terra - SuperMesh Studio 桌面版主程序
基于 GMSH + Kratos 的现代化 CAE 桌面平台
"""

import sys
import os
import logging
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# PyQt6 imports
from PyQt6.QtWidgets import QApplication, QSplashScreen, QMessageBox
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QPixmap, QIcon

# Terra imports
from gui.main_window import TerraMainWindow
from gui.widgets.fusion_splash import FusionSplashScreen
from core.config import TerraConfig
from core.gmsh_engine import GMSHEngine

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("terra.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class TerraApplication:
    """Terra 应用程序主类"""
    
    def __init__(self):
        """初始化 Terra 应用"""
        self.app = None
        self.main_window = None
        self.splash = None
        self.config = TerraConfig()
        
    def create_splash_screen(self):
        """创建精致的启动画面"""
        try:
            # 创建 Fusion 360 风格启动画面
            self.splash = FusionSplashScreen()
            self.splash.show_with_animation()
            
            # 处理事件，确保启动画面显示
            self.app.processEvents()
            
        except Exception as e:
            logger.warning(f"创建启动画面失败: {e}")
            # 回退到简单启动画面
            self.create_simple_splash()
    
    def create_simple_splash(self):
        """创建简单启动画面（回退方案）"""
        splash_pixmap = QPixmap(400, 300)
        splash_pixmap.fill(Qt.GlobalColor.darkBlue)
        
        self.splash = QSplashScreen(splash_pixmap)
        self.splash.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint)
        
        self.splash.showMessage(
            "Terra - SuperMesh Studio\n正在初始化...",
            Qt.AlignmentFlag.AlignCenter | Qt.AlignmentFlag.AlignBottom,
            Qt.GlobalColor.white
        )
        self.splash.show()
        self.app.processEvents()
    
    def check_dependencies(self):
        """检查依赖环境"""
        try:
            self.update_splash("检查 GMSH 环境...", 20)
            
            # 检查 GMSH
            import gmsh
            logger.info("GMSH 环境检查通过")
            
            self.update_splash("检查其他依赖...", 40)
            # 检查其他依赖
            import numpy
            import PyQt6
            logger.info("依赖环境检查完成")
            
            return True
            
        except ImportError as e:
            error_msg = f"依赖环境检查失败: {e}\n\n请运行: pip install -r requirements.txt"
            logger.error(error_msg)
            
            if self.splash:
                self.splash.close()
                
            QMessageBox.critical(None, "Terra 启动失败", error_msg)
            return False
    
    def update_splash(self, message, progress: int = 0):
        """更新启动画面信息"""
        if self.splash:
            if hasattr(self.splash, 'set_progress'):
                # Fusion 风格启动画面
                self.splash.set_progress(progress, message)
            else:
                # 简单启动画面
                self.splash.showMessage(
                    f"Terra - SuperMesh Studio\n{message}",
                    Qt.AlignmentFlag.AlignCenter | Qt.AlignmentFlag.AlignBottom,
                    Qt.GlobalColor.white
                )
            self.app.processEvents()
    
    def initialize_core_systems(self):
        """初始化核心系统"""
        try:
            self.update_splash("初始化几何引擎...", 60)
            
            # 初始化 GMSH 引擎
            self.gmsh_engine = GMSHEngine()
            logger.info("GMSH 引擎初始化完成")
            
            self.update_splash("准备用户界面...", 80)
            return True
            
        except Exception as e:
            error_msg = f"核心系统初始化失败: {e}"
            logger.error(error_msg)
            
            if self.splash:
                self.splash.close()
                
            QMessageBox.critical(None, "Terra 初始化失败", error_msg)
            return False
    
    def create_main_window(self):
        """创建主窗口"""
        try:
            self.main_window = TerraMainWindow(
                gmsh_engine=self.gmsh_engine,
                config=self.config
            )
            
            # 设置窗口图标
            # self.main_window.setWindowIcon(QIcon("resources/icons/terra_icon.png"))
            
            logger.info("主窗口创建完成")
            return True
            
        except Exception as e:
            error_msg = f"主窗口创建失败: {e}"
            logger.error(error_msg)
            
            QMessageBox.critical(None, "Terra 启动失败", error_msg)
            return False
    
    def show_main_window(self):
        """显示主窗口"""
        try:
            self.update_splash("启动完成!", 100)
            
            # 短暂延迟让用户看到完成状态
            QTimer.singleShot(500, self._finish_startup)
            
        except Exception as e:
            logger.error(f"显示主窗口失败: {e}")
    
    def _finish_startup(self):
        """完成启动过程"""
        try:
            # 关闭启动画面
            if self.splash:
                if hasattr(self.splash, 'finish_with_animation'):
                    self.splash.finish_with_animation(self.main_window)
                else:
                    self.splash.finish(self.main_window)
            
            # 显示主窗口
            self.main_window.show()
            
            # 窗口居中显示
            self.main_window.center_on_screen()
            
            logger.info("Terra 启动完成!")
            
        except Exception as e:
            logger.error(f"完成启动失败: {e}")
    
    def run(self):
        """运行 Terra 应用"""
        try:
            # 创建 QApplication
            self.app = QApplication(sys.argv)
            self.app.setApplicationName("Terra - SuperMesh Studio")
            self.app.setApplicationVersion("0.1.0")
            self.app.setOrganizationName("Terra CAE")
            
            # 设置应用样式
            self.app.setStyle('Fusion')  # 现代化样式
            
            logger.info("Terra 启动中...")
            
            # 显示启动画面
            self.create_splash_screen()
            
            # 检查依赖环境
            if not self.check_dependencies():
                return 1
            
            # 初始化核心系统
            if not self.initialize_core_systems():
                return 1
            
            # 创建主窗口
            if not self.create_main_window():
                return 1
            
            # 延迟显示主窗口（让用户看到启动画面）
            QTimer.singleShot(1000, self.show_main_window)
            
            # 运行事件循环
            return self.app.exec()
            
        except KeyboardInterrupt:
            logger.info("用户中断程序")
            return 0
        except Exception as e:
            logger.error(f"应用运行失败: {e}", exc_info=True)
            return 1
        finally:
            # 清理资源
            if hasattr(self, 'gmsh_engine'):
                self.gmsh_engine.cleanup()
            logger.info("Terra 已退出")

def main():
    """主函数"""
    terra_app = TerraApplication()
    exit_code = terra_app.run()
    sys.exit(exit_code)

if __name__ == "__main__":
    main()