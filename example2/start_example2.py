#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Example2 启动脚本 - MIDAS模型桌面计算程序
专业的基坑分析软件启动器
"""

import sys
import os
import traceback
from pathlib import Path

def setup_environment():
    """设置运行环境"""
    # 添加项目路径
    project_root = Path(__file__).parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))
    
    # 添加主项目根路径（用于Kratos集成）
    main_root = project_root.parent
    if str(main_root) not in sys.path:
        sys.path.insert(0, str(main_root))
    
    print(f"📁 Example2 项目目录: {project_root}")
    print(f"📁 主项目目录: {main_root}")

def check_dependencies():
    """检查依赖包"""
    print("\n🔍 检查依赖包...")
    
    required_packages = [
        ('PyQt6', 'GUI框架'),
        ('numpy', '数值计算'),
        ('pyvista', '3D可视化'),
        ('pathlib', '路径处理')
    ]
    
    missing_packages = []
    
    for package, description in required_packages:
        try:
            __import__(package)
            print(f"✅ {package} - {description}")
        except ImportError:
            print(f"❌ {package} - {description} (缺失)")
            missing_packages.append(package)
    
    # 检查可选包
    optional_packages = [
        ('pyvistaqt', 'PyVista Qt集成'),
        ('KratosMultiphysics', 'Kratos计算引擎'),
        ('psutil', '系统监控')
    ]
    
    print("\n🔍 检查可选包...")
    for package, description in optional_packages:
        try:
            __import__(package)
            print(f"✅ {package} - {description}")
        except ImportError:
            print(f"⚠️ {package} - {description} (可选，未安装)")
    
    if missing_packages:
        print(f"\n❌ 缺失必需包: {', '.join(missing_packages)}")
        print("请运行: pip install -r requirements.txt")
        return False
    
    print("\n✅ 依赖检查完成")
    return True

def check_system_compatibility():
    """检查系统兼容性"""
    print("\n🔍 系统兼容性检查...")
    
    # Python版本检查
    python_version = sys.version_info
    print(f"🐍 Python版本: {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    if python_version < (3, 8):
        print("❌ Python版本过低，需要Python 3.8+")
        return False
    
    # 操作系统检查
    import platform
    system = platform.system()
    print(f"💻 操作系统: {system} {platform.release()}")
    
    # OpenGL检查（用于3D渲染）
    try:
        import OpenGL.GL as gl
        print("✅ OpenGL支持")
    except ImportError:
        print("⚠️ OpenGL不可用，可能影响3D显示")
    
    print("✅ 系统兼容性检查完成")
    return True

def start_application():
    """启动主应用程序"""
    print("\n🚀 启动Example2 MIDAS模型计算程序...")
    
    try:
        # 导入PyQt6
        from PyQt6.QtWidgets import QApplication
        from PyQt6.QtCore import Qt
        from PyQt6.QtGui import QIcon
        
        # 创建QApplication
        app = QApplication(sys.argv)
        app.setApplicationName("Example2 MIDAS模型计算程序")
        app.setApplicationVersion("1.0")
        app.setOrganizationName("DeepCAD")
        
        # 设置应用程序图标
        try:
            icon_path = Path(__file__).parent / "resources" / "icon.ico"
            if icon_path.exists():
                app.setWindowIcon(QIcon(str(icon_path)))
        except Exception:
            pass
        
        # 导入主窗口
        from gui.main_window import MainWindow
        
        # 创建主窗口
        main_window = MainWindow()
        main_window.show()
        
        print("Example2 启动成功！")
        print("\n" + "="*60)
        print("Example2 - MIDAS模型桌面计算程序")
        print("功能：前处理 → 分析计算 → 后处理")
        print("支持：FPN导入、Kratos分析、结果可视化")
        print("="*60 + "\n")
        
        # 运行应用程序
        return app.exec()
        
    except ImportError as e:
        print(f"❌ 导入错误: {e}")
        print("请检查PyQt6是否正确安装")
        return 1
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        print("\n错误详情:")
        traceback.print_exc()
        return 1

def main():
    """主函数"""
    print("="*60)
    print("Example2 - MIDAS模型桌面计算程序")
    print("专业基坑分析软件")
    print("="*60)
    
    # 设置环境
    setup_environment()
    
    # 检查依赖
    if not check_dependencies():
        input("按Enter键退出...")
        return 1
    
    # 检查系统兼容性
    if not check_system_compatibility():
        input("按Enter键退出...")
        return 1
    
    # 启动应用程序
    try:
        return start_application()
    except KeyboardInterrupt:
        print("\n👋 用户取消启动")
        return 0
    except Exception as e:
        print(f"\n❌ 未知错误: {e}")
        traceback.print_exc()
        input("按Enter键退出...")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
