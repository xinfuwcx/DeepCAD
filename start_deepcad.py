#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD Professional CAE System 启动器
统一启动入口，检查依赖并启动主程序
"""

import sys
import os
import subprocess
from pathlib import Path

def check_python_version():
    """检查Python版本"""
    if sys.version_info < (3, 8):
        print("错误: 需要Python 3.8或更高版本")
        print(f"当前版本: {sys.version}")
        return False
    return True

def check_dependencies():
    """检查必要的依赖库"""
    required_packages = {
        'PyQt6': 'PyQt6',
        'numpy': 'numpy',
        'pandas': 'pandas',
    }
    
    optional_packages = {
        'pyvista': 'pyvista (3D可视化)',
        'pyvistaqt': 'pyvistaqt (PyVista Qt集成)',
        'matplotlib': 'matplotlib (图表绘制)',
        'qtawesome': 'qtawesome (图标库)',
        'gempy': 'gempy (地质建模)',
        'psutil': 'psutil (系统监控)',
    }
    
    missing_required = []
    missing_optional = []
    
    print("检查依赖库...")
    print("=" * 50)
    
    # 检查必需依赖
    for package, display_name in required_packages.items():
        try:
            __import__(package)
            print(f"✓ {display_name}")
        except ImportError:
            print(f"× {display_name} (必需)")
            missing_required.append(package)
    
    # 检查可选依赖
    for package, display_name in optional_packages.items():
        try:
            __import__(package)
            print(f"✓ {display_name}")
        except ImportError:
            print(f"○ {display_name} (可选)")
            missing_optional.append(package)
    
    print("=" * 50)
    
    if missing_required:
        print("错误: 缺少必需的依赖库:")
        for pkg in missing_required:
            print(f"  - {pkg}")
        print("\n请使用以下命令安装:")
        print(f"pip install {' '.join(missing_required)}")
        return False
    
    if missing_optional:
        print("提示: 以下可选依赖未安装，可能影响部分功能:")
        for pkg in missing_optional:
            print(f"  - {pkg}")
        print("\n可选择安装:")
        print(f"pip install {' '.join(missing_optional)}")
    
    return True

def check_system_resources():
    """检查系统资源"""
    try:
        import psutil
        
        # 检查内存
        memory = psutil.virtual_memory()
        print(f"\n系统资源:")
        print(f"内存: {memory.total / 1024**3:.1f} GB 总量, {memory.available / 1024**3:.1f} GB 可用")
        
        if memory.available < 1 * 1024**3:  # 小于1GB
            print("警告: 可用内存较少，可能影响大型模型计算")
        
        # 检查磁盘空间
        disk = psutil.disk_usage('.')
        print(f"磁盘: {disk.free / 1024**3:.1f} GB 可用空间")
        
        if disk.free < 1 * 1024**3:  # 小于1GB
            print("警告: 磁盘空间不足，可能影响结果保存")
            
    except ImportError:
        print("无法检查系统资源 (psutil未安装)")

def setup_environment():
    """设置环境变量"""
    # 添加项目路径到Python路径
    project_root = Path(__file__).parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))
    
    # 设置Qt相关环境变量
    os.environ['QT_AUTO_SCREEN_SCALE_FACTOR'] = '1'
    os.environ['QT_ENABLE_HIGHDPI_SCALING'] = '1'
    
    # 设置PyVista相关环境变量
    os.environ['PYVISTA_OFF_SCREEN'] = 'false'
    
    print("环境设置完成")

def launch_application():
    """启动主应用程序"""
    try:
        print("\n启动DeepCAD Professional CAE System...")
        print("=" * 50)
        
        # 导入并启动主程序
        from deepcad_professional_cae import main
        return main()
        
    except ImportError as e:
        print(f"错误: 无法导入主程序模块")
        print(f"详细信息: {e}")
        return 1
    except Exception as e:
        print(f"错误: 启动失败")
        print(f"详细信息: {e}")
        import traceback
        traceback.print_exc()
        return 1

def main():
    """主函数"""
    print("DeepCAD Professional CAE System")
    print("专业级工程分析平台 v2.0")
    print("=" * 50)
    
    # 检查Python版本
    if not check_python_version():
        input("按Enter键退出...")
        return 1
    
    # 检查依赖
    if not check_dependencies():
        input("按Enter键退出...")
        return 1
    
    # 检查系统资源
    check_system_resources()
    
    # 设置环境
    setup_environment()
    
    # 启动应用
    try:
        result = launch_application()
        return result
    except KeyboardInterrupt:
        print("\n用户中断程序")
        return 0
    except Exception as e:
        print(f"未预期的错误: {e}")
        import traceback
        traceback.print_exc()
        input("按Enter键退出...")
        return 1

if __name__ == "__main__":
    sys.exit(main())