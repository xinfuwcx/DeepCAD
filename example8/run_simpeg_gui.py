"""
SimPEG 界面启动脚本
用于启动 SimPEG 专业地球物理界面
"""

import sys
import os
from pathlib import Path

# 添加项目路径
current_dir = Path(__file__).parent
project_root = current_dir.parent
sys.path.insert(0, str(current_dir))
sys.path.insert(0, str(project_root))

def check_dependencies():
    """检查依赖包"""
    required_packages = [
        'PyQt6',
        'numpy', 
        'scipy',
        'matplotlib',
        'pandas',
        'pyvista',
        'pyvistaqt',
        'discretize',
        'h5py'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            if package == 'PyQt6':
                import PyQt6
            elif package == 'pyvistaqt':
                import pyvistaqt
            else:
                __import__(package)
            print(f"✓ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"✗ {package} (缺失)")
    
    if missing_packages:
        print(f"\n缺失的依赖包: {', '.join(missing_packages)}")
        print("请运行以下命令安装:")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    # 检查 SimPEG
    try:
        import SimPEG
        print(f"✓ SimPEG (版本 {SimPEG.__version__})")
    except ImportError:
        print("✗ SimPEG (缺失)")
        print("请运行: pip install simpeg")
        return False
    
    return True

def setup_environment():
    """设置环境变量"""
    # 设置 Qt 相关环境变量
    os.environ['QT_API'] = 'pyqt6'
    
    # 确保 pyvista 使用正确的后端
    try:
        import pyvista as pv
        pv.set_plot_theme('default')
        pv.start_xvfb()  # 如果在无头环境中运行
    except:
        pass

def main():
    """主函数"""
    print("=" * 60)
    print("SimPEG 专业地球物理界面启动器")
    print("=" * 60)
    
    print("\n检查依赖包...")
    if not check_dependencies():
        print("\n依赖包检查失败，请先安装缺失的包")
        return 1
    
    print("\n设置环境...")
    setup_environment()
    
    print("\n启动 SimPEG 界面...")
    
    try:
        # 导入并启动主界面
        from main import main as start_gui
        start_gui()
        
    except ImportError as e:
        print(f"导入错误: {e}")
        print("请确保所有模块文件都在正确位置")
        return 1
        
    except Exception as e:
        print(f"启动错误: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
