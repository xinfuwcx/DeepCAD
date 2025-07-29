#!/usr/bin/env python3
"""
GemPy依赖安装测试脚本
检查2号几何专家地质建模模块所需的所有依赖
"""

import sys
import importlib
import subprocess
from typing import Dict, List, Tuple

def test_import(module_name: str, package_name: str = None) -> Tuple[bool, str]:
    """测试模块导入"""
    try:
        importlib.import_module(module_name)
        return True, "OK - 可用"
    except ImportError as e:
        package = package_name or module_name
        return False, f"MISSING - 缺失 - 安装命令: pip install {package}"

def check_dependencies() -> Dict[str, Tuple[bool, str]]:
    """检查所有依赖"""
    dependencies = {
        # 核心科学计算库 (应该已有)
        'numpy': test_import('numpy'),
        'scipy': test_import('scipy'),
        'pandas': test_import('pandas'),
        'matplotlib': test_import('matplotlib'),
        
        # 现有几何库 (应该已有)
        'gmsh': test_import('gmsh'),
        'pyvista': test_import('pyvista'),
        'vtk': test_import('vtk'),
        
        # 机器学习库 (应该已有)
        'sklearn': test_import('sklearn', 'scikit-learn'),
        
        # GemPy及其依赖 (新增)
        'gempy': test_import('gempy'),
        'pymc': test_import('pymc'),
        'aesara': test_import('aesara'),
        'rbf': test_import('rbf'),
        'pykrige': test_import('pykrige'),
        'gemgis': test_import('gemgis'),
        
        # 其他新增依赖
        'gstools': test_import('gstools'),
        'rasterio': test_import('rasterio'),
    }
    
    return dependencies

def install_missing_dependencies(missing_deps: List[str]):
    """安装缺失的依赖"""
    if not missing_deps:
        print("所有依赖都已安装！")
        return
    
    print(f"\n准备安装 {len(missing_deps)} 个缺失的依赖...")
    
    # 特殊处理的包
    special_packages = {
        'sklearn': 'scikit-learn',
        'pymc': 'pymc>=5.10.0',
        'aesara': 'aesara>=2.9.0',
        'gempy': 'gempy>=3.0.0',
        'rbf': 'rbf>=2024.12.1',
        'gstools': 'gstools>=1.4.1',
        'pykrige': 'pykrige>=1.7.0'
    }
    
    install_commands = []
    for dep in missing_deps:
        package = special_packages.get(dep, dep)
        install_commands.append(package)
    
    # 批量安装
    cmd = [sys.executable, '-m', 'pip', 'install'] + install_commands
    print(f"执行命令: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print("安装成功！")
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"安装失败: {e}")
        print(f"错误输出: {e.stderr}")
        return False
    
    return True

def main():
    print("检查2号几何专家地质建模模块依赖...")
    print("=" * 60)
    
    dependencies = check_dependencies()
    
    # 分类显示结果
    available = []
    missing = []
    
    for name, (is_available, message) in dependencies.items():
        print(f"{name:12} - {message}")
        if is_available:
            available.append(name)
        else:
            missing.append(name)
    
    print("=" * 60)
    print(f"依赖状态总结:")
    print(f"   已安装: {len(available)} 个")
    print(f"   缺失:   {len(missing)} 个")
    
    if missing:
        print(f"\n缺失的依赖: {', '.join(missing)}")
        
        # 询问是否自动安装
        response = input("\n是否自动安装缺失的依赖? (y/n): ").lower().strip()
        if response == 'y':
            success = install_missing_dependencies(missing)
            if success:
                print("\n重新检查依赖状态...")
                # 重新检查
                new_dependencies = check_dependencies()
                still_missing = [name for name, (available, _) in new_dependencies.items() if not available]
                
                if still_missing:
                    print(f"仍有依赖缺失: {', '.join(still_missing)}")
                    print("请手动安装或检查网络连接")
                else:
                    print("所有依赖安装完成！")
        else:
            print("请手动安装缺失的依赖")
    else:
        print("\n所有依赖都已就绪！")
        print("2号几何专家地质建模模块可以正常使用")
    
    # 特别说明
    print("\n" + "=" * 60)
    print("重要说明:")
    print("1. GemPy v3需要Python 3.8+")
    print("2. 如果GemPy安装失败，系统会自动回退到增强RBF插值")
    print("3. PyVista和VTK应该已经在现有系统中可用")
    print("4. 所有新依赖都添加到了requirements.txt")
    
    # 测试基础功能
    print("\n测试基础功能...")
    try:
        import numpy as np
        import scipy.interpolate
        print("OK - RBF插值功能可用")
        
        try:
            import gempy
            print("OK - GemPy隐式建模可用")
        except ImportError:
            print("WARNING - GemPy不可用，将使用RBF备用方案")
        
        try:
            import pyvista
            print("OK - PyVista网格处理可用")
        except ImportError:
            print("WARNING - PyVista不可用，Three.js导出功能受限")
            
    except Exception as e:
        print(f"ERROR - 基础功能测试失败: {e}")

if __name__ == "__main__":
    main()