#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GEM Professional Implicit Modeling System 启动器
专业级地质隐式建模系统启动程序

集成Example3所有功能：
- gem_professional_system.py (主系统)
- enhanced_gempy_main_window.py (增强3D视口)
- 所有example3的地质建模模块
"""

import sys
import os
import subprocess
from pathlib import Path
import traceback

def check_python_version():
    """检查Python版本"""
    if sys.version_info < (3, 8):
        print("❌ 错误: 需要Python 3.8或更高版本")
        print(f"当前版本: {sys.version}")
        return False
    print(f"✅ Python版本: {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
    return True

def check_dependencies():
    """检查依赖库"""
    required_packages = {
        'PyQt6': 'PyQt6 (用户界面)',
        'numpy': 'NumPy (数值计算)',
        'pandas': 'Pandas (数据处理)',
    }
    
    geology_packages = {
        'gempy': 'GemPy (地质隐式建模)',
        'pyvista': 'PyVista (3D可视化)',
        'pyvistaqt': 'PyVistaQt (Qt集成)',
        'matplotlib': 'Matplotlib (图表绘制)',
        'qtawesome': 'QtAwesome (图标库)',
    }
    
    optional_packages = {
        'scipy': 'SciPy (科学计算)',
        'scikit-learn': 'Scikit-learn (机器学习)',
        'psutil': 'Psutil (系统监控)',
    }
    
    print("\n🔍 检查依赖库...")
    print("=" * 60)
    
    missing_required = []
    missing_geology = []
    missing_optional = []
    
    # 检查必需依赖
    print("📦 核心依赖:")
    for package, description in required_packages.items():
        try:
            __import__(package)
            print(f"  ✅ {description}")
        except ImportError:
            print(f"  ❌ {description} (必需)")
            missing_required.append(package)
    
    # 检查地质建模依赖
    print("\n🌍 地质建模依赖:")
    for package, description in geology_packages.items():
        try:
            __import__(package)
            print(f"  ✅ {description}")
        except ImportError:
            print(f"  ⚠️  {description} (推荐)")
            missing_geology.append(package)
    
    # 检查可选依赖
    print("\n🔧 可选依赖:")
    for package, description in optional_packages.items():
        try:
            __import__(package)
            print(f"  ✅ {description}")
        except ImportError:
            print(f"  ○ {description} (可选)")
            missing_optional.append(package)
    
    print("=" * 60)
    
    if missing_required:
        print("❌ 错误: 缺少必需的依赖库:")
        for pkg in missing_required:
            print(f"  - {pkg}")
        print("\n请使用以下命令安装:")
        print(f"pip install {' '.join(missing_required)}")
        return False, False
    
    geology_available = len(missing_geology) == 0
    if missing_geology:
        print("⚠️  警告: 缺少地质建模依赖，部分功能将不可用:")
        for pkg in missing_geology:
            print(f"  - {pkg}")
        print("\n推荐安装地质建模依赖:")
        print(f"pip install {' '.join(missing_geology)}")
    
    if missing_optional:
        print("💡 提示: 可选择安装以下依赖以获得更好体验:")
        for pkg in missing_optional:
            print(f"  - {pkg}")
        print(f"\npip install {' '.join(missing_optional)}")
    
    return True, geology_available

def check_example3_modules():
    """检查Example3模块"""
    print("\n🔬 检查Example3地质建模模块...")
    
    example3_path = Path(__file__).parent / "example3"
    if not example3_path.exists():
        print("❌ Example3目录不存在")
        return False
    
    required_modules = [
        'professional_gempy_cae.py',
        'gempy_main_window.py',
        'geophysical_modeling.py',
        'uncertainty_analysis.py',
        'enhanced_3d_viewer.py'
    ]
    
    available_modules = []
    for module in required_modules:
        module_path = example3_path / module
        if module_path.exists():
            print(f"  ✅ {module}")
            available_modules.append(module)
        else:
            print(f"  ❌ {module} (缺失)")
    
    success_rate = len(available_modules) / len(required_modules)
    if success_rate >= 0.6:
        print(f"✅ Example3模块检查通过 ({len(available_modules)}/{len(required_modules)})")
        return True
    else:
        print(f"❌ Example3模块不完整 ({len(available_modules)}/{len(required_modules)})")
        return False

def setup_environment():
    """设置环境变量"""
    print("\n⚙️  设置运行环境...")
    
    # 添加项目路径
    project_root = Path(__file__).parent
    example3_path = project_root / "example3"
    
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))
    if str(example3_path) not in sys.path:
        sys.path.insert(0, str(example3_path))
    
    # 设置Qt环境变量
    os.environ['QT_AUTO_SCREEN_SCALE_FACTOR'] = '1'
    os.environ['QT_ENABLE_HIGHDPI_SCALING'] = '1'
    
    # 设置PyVista环境变量
    os.environ['PYVISTA_OFF_SCREEN'] = 'false'
    os.environ['PYVISTA_USE_PANEL'] = 'false'
    
    print("✅ 环境设置完成")

def show_startup_options():
    """显示启动选项"""
    print("\n🚀 选择启动模式:")
    print("=" * 60)
    print("1. GEM专业隐式建模系统 (推荐)")
    print("   - 完整的Abaqus风格界面")
    print("   - 集成所有地质建模功能")
    print("   - 专业数据管理")
    print()
    print("2. 增强版GemPy主窗口")
    print("   - 增强3D可视化效果")
    print("   - 专业地质配色")
    print("   - 实时参数调节")
    print()
    print("3. 原版GemPy主窗口")
    print("   - Example3原始界面")
    print("   - 基础地质建模功能")
    print()
    print("4. 简单测试模式")
    print("   - 快速功能测试")
    print("   - 检查模块可用性")
    print()
    print("0. 退出")
    print("=" * 60)
    
    while True:
        try:
            choice = input("请选择 (1-4, 0退出): ").strip()
            if choice in ['0', '1', '2', '3', '4']:
                return choice
            else:
                print("请输入有效选项 (0-4)")
        except KeyboardInterrupt:
            print("\n用户中断")
            return '0'

def launch_gem_professional():
    """启动GEM专业系统"""
    try:
        print("\n🌍 启动GEM专业隐式建模系统...")
        from gem_professional_system import main
        return main()
    except ImportError as e:
        print(f"❌ 无法导入GEM专业系统: {e}")
        return 1
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        traceback.print_exc()
        return 1

def launch_enhanced_gempy():
    """启动增强版GemPy"""
    try:
        print("\n🔬 启动增强版GemPy主窗口...")
        from enhanced_gempy_main_window import main
        return main()
    except ImportError as e:
        print(f"❌ 无法导入增强版GemPy: {e}")
        return 1
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        traceback.print_exc()
        return 1

def launch_original_gempy():
    """启动原版GemPy"""
    try:
        print("\n📊 启动原版GemPy主窗口...")
        sys.path.insert(0, str(Path(__file__).parent / "example3"))
        from gempy_main_window import main
        return main()
    except ImportError as e:
        print(f"❌ 无法导入原版GemPy: {e}")
        return 1
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        traceback.print_exc()
        return 1

def launch_test_mode():
    """启动测试模式"""
    print("\n🧪 测试模式...")
    
    # 测试GemPy
    try:
        import gempy as gp
        print("✅ GemPy导入成功")
        
        # 创建简单模型
        model = gp.create_geomodel(
            project_name='Test_Model',
            extent=[0, 100, 0, 100, -100, 0],
            resolution=[10, 10, 10]
        )
        print("✅ GemPy模型创建成功")
        
    except ImportError:
        print("❌ GemPy不可用")
    except Exception as e:
        print(f"❌ GemPy测试失败: {e}")
    
    # 测试PyVista
    try:
        import pyvista as pv
        print("✅ PyVista导入成功")
        
        # 创建简单几何体
        sphere = pv.Sphere()
        print("✅ PyVista几何体创建成功")
        
    except ImportError:
        print("❌ PyVista不可用")
    except Exception as e:
        print(f"❌ PyVista测试失败: {e}")
    
    # 测试PyQt6
    try:
        from PyQt6.QtWidgets import QApplication, QLabel
        print("✅ PyQt6导入成功")
        
        app = QApplication([])
        label = QLabel("测试")
        print("✅ PyQt6组件创建成功")
        app.quit()
        
    except ImportError:
        print("❌ PyQt6不可用")
    except Exception as e:
        print(f"❌ PyQt6测试失败: {e}")
    
    print("\n测试完成，按Enter键退出...")
    input()
    return 0

def main():
    """主函数"""
    print("🌍 GEM Professional Implicit Modeling System")
    print("专业级地质隐式建模系统启动器 v2.0")
    print("=" * 60)
    
    # 检查Python版本
    if not check_python_version():
        input("按Enter键退出...")
        return 1
    
    # 检查依赖
    deps_ok, geology_available = check_dependencies()
    if not deps_ok:
        input("按Enter键退出...")
        return 1
    
    # 检查Example3模块
    example3_ok = check_example3_modules()
    
    # 设置环境
    setup_environment()
    
    # 显示系统状态
    print(f"\n📋 系统状态:")
    print(f"  核心依赖: ✅")
    print(f"  地质建模: {'✅' if geology_available else '⚠️ '}")
    print(f"  Example3模块: {'✅' if example3_ok else '⚠️ '}")
    
    # 选择启动模式
    choice = show_startup_options()
    
    if choice == '0':
        print("👋 再见!")
        return 0
    elif choice == '1':
        return launch_gem_professional()
    elif choice == '2':
        return launch_enhanced_gempy()
    elif choice == '3':
        return launch_original_gempy()
    elif choice == '4':
        return launch_test_mode()
    else:
        print("❌ 无效选择")
        return 1

if __name__ == "__main__":
    try:
        result = main()
        sys.exit(result)
    except KeyboardInterrupt:
        print("\n👋 用户中断程序")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ 未预期的错误: {e}")
        traceback.print_exc()
        input("按Enter键退出...")
        sys.exit(1)