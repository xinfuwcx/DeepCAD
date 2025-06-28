#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Kratos安装后配置脚本
设置环境变量、测试安装、生成示例代码
"""

import os
import sys
import platform
import subprocess
from pathlib import Path

def create_env_script(kratos_path):
    """创建环境变量设置脚本"""
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}"
    
    if platform.system() == 'Windows':
        # Windows批处理脚本
        bat_content = f"""@echo off
REM Kratos环境变量配置
set KRATOS_PATH={kratos_path}
set PYTHONPATH=%PYTHONPATH%;{kratos_path}\\lib\\python{python_version}\\site-packages
set PATH=%PATH%;{kratos_path}\\bin

echo [INFO] Kratos环境变量已设置
echo KRATOS_PATH: %KRATOS_PATH%
echo.
echo [INFO] 现在可以在Python中导入Kratos:
echo import KratosMultiphysics
"""
        
        with open("setup_kratos_env.bat", "w", encoding="utf-8") as f:
            f.write(bat_content)
        
        print(f"[OK] 创建环境脚本: setup_kratos_env.bat")
        return "setup_kratos_env.bat"
    
    else:
        # Linux/macOS shell脚本
        sh_content = f"""#!/bin/bash
# Kratos环境变量配置
export KRATOS_PATH="{kratos_path}"
export PYTHONPATH="$PYTHONPATH:{kratos_path}/lib/python{python_version}/site-packages"
export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:{kratos_path}/lib"

echo "[INFO] Kratos环境变量已设置"
echo "KRATOS_PATH: $KRATOS_PATH"
echo
echo "[INFO] 现在可以在Python中导入Kratos:"
echo "import KratosMultiphysics"
"""
        
        with open("setup_kratos_env.sh", "w", encoding="utf-8") as f:
            f.write(sh_content)
        
        # 设置执行权限
        os.chmod("setup_kratos_env.sh", 0o755)
        
        print(f"[OK] 创建环境脚本: setup_kratos_env.sh")
        return "setup_kratos_env.sh"

def test_kratos_installation(kratos_path):
    """测试Kratos安装"""
    print("[INFO] 测试Kratos安装...")
    
    # 添加Kratos路径到Python路径
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}"
    kratos_python_path = os.path.join(kratos_path, "lib", f"python{python_version}", "site-packages")
    
    if kratos_python_path not in sys.path:
        sys.path.insert(0, kratos_python_path)
    
    test_results = {}
    
    # 测试核心模块
    try:
        import KratosMultiphysics
        test_results['Core'] = True
        print("[OK] Kratos核心模块导入成功")
        
        # 获取版本信息
        try:
            version = KratosMultiphysics.__version__
        except AttributeError:
            version = "未知版本"
        print(f"[INFO] Kratos版本: {version}")
        
    except ImportError as e:
        test_results['Core'] = False
        print(f"[ERROR] Kratos核心模块导入失败: {e}")
        return False
    
    # 测试关键应用
    applications = {
        'StructuralMechanicsApplication': '结构力学',
        'GeomechanicsApplication': '地质力学',
        'IgaApplication': 'IGA等几何分析',
        'OptimizationApplication': '优化模块',
        'FluidDynamicsApplication': '流体力学',
        'LinearSolversApplication': '线性求解器',
        'SolidMechanicsApplication': '固体力学',
        'ContactStructuralMechanicsApplication': '接触结构力学'
    }
    
    successful_apps = []
    failed_apps = []
    
    for app_name, app_desc in applications.items():
        try:
            exec(f"import KratosMultiphysics.{app_name}")
            successful_apps.append((app_name, app_desc))
            print(f"[OK] {app_desc} ({app_name}) 可用")
        except ImportError:
            failed_apps.append((app_name, app_desc))
            print(f"[WARNING] {app_desc} ({app_name}) 不可用")
    
    print(f"\n[INFO] 成功导入 {len(successful_apps)} 个应用")
    print(f"[INFO] 失败导入 {len(failed_apps)} 个应用")
    
    # 基本功能测试
    try:
        model = KratosMultiphysics.Model()
        model_part = model.CreateModelPart("TestPart")
        model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
        
        # 创建节点
        model_part.CreateNewNode(1, 0.0, 0.0, 0.0)
        model_part.CreateNewNode(2, 1.0, 0.0, 0.0)
        model_part.CreateNewNode(3, 0.0, 1.0, 0.0)
        
        print(f"[OK] 基本功能测试成功 (创建了 {model_part.NumberOfNodes()} 个节点)")
        
    except Exception as e:
        print(f"[ERROR] 基本功能测试失败: {e}")
        return False
    
    return len(successful_apps) > 0

def create_example_scripts():
    """创建示例脚本"""
    print("[INFO] 创建示例脚本...")
    
    # 基本示例
    basic_example = """#!/usr/bin/env python
# -*- coding: utf-8 -*-
'''
Kratos基本使用示例
'''

import KratosMultiphysics

def main():
    print("Kratos基本使用示例")
    print("==================")
    
    # 创建模型
    model = KratosMultiphysics.Model()
    model_part = model.CreateModelPart("MainModelPart")
    
    # 添加变量
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.VELOCITY)
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.ACCELERATION)
    
    # 创建节点
    model_part.CreateNewNode(1, 0.0, 0.0, 0.0)
    model_part.CreateNewNode(2, 1.0, 0.0, 0.0)
    model_part.CreateNewNode(3, 1.0, 1.0, 0.0)
    model_part.CreateNewNode(4, 0.0, 1.0, 0.0)
    
    # 创建单元
    properties = model_part.GetProperties()[1]
    model_part.CreateNewElement("Element2D4N", 1, [1, 2, 3, 4], properties)
    
    print(f"模型部件: {model_part.Name}")
    print(f"节点数: {model_part.NumberOfNodes()}")
    print(f"单元数: {model_part.NumberOfElements()}")
    
    # 设置边界条件
    for node in model_part.Nodes:
        if node.X == 0.0:  # 左边界固定
            node.Fix(KratosMultiphysics.DISPLACEMENT_X)
            node.Fix(KratosMultiphysics.DISPLACEMENT_Y)
    
    print("基本设置完成!")

if __name__ == "__main__":
    main()
"""
    
    with open("examples/kratos_basic_example.py", "w", encoding="utf-8") as f:
        f.write(basic_example)
    
    # 地质力学示例
    geomech_example = """#!/usr/bin/env python  
# -*- coding: utf-8 -*-
'''
Kratos地质力学示例 - 深基坑工程
'''

import KratosMultiphysics
try:
    import KratosMultiphysics.GeomechanicsApplication
    GEOMECH_AVAILABLE = True
except ImportError:
    GEOMECH_AVAILABLE = False
    print("GeomechanicsApplication不可用")

def main():
    if not GEOMECH_AVAILABLE:
        print("需要安装GeomechanicsApplication")
        return
    
    print("Kratos地质力学示例")
    print("==================")
    
    # 创建地质力学模型
    model = KratosMultiphysics.Model()
    model_part = model.CreateModelPart("GeoMechanicsModelPart")
    
    # 添加地质力学变量
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.WATER_PRESSURE)
    
    # 设置材料属性
    properties = model_part.GetProperties()[1]
    properties.SetValue(KratosMultiphysics.YOUNG_MODULUS, 30000000.0)  # Pa
    properties.SetValue(KratosMultiphysics.POISSON_RATIO, 0.3)
    properties.SetValue(KratosMultiphysics.DENSITY, 2000.0)  # kg/m³
    
    print("地质力学模型创建完成!")
    print(f"杨氏模量: {properties.GetValue(KratosMultiphysics.YOUNG_MODULUS)} Pa")
    print(f"泊松比: {properties.GetValue(KratosMultiphysics.POISSON_RATIO)}")

if __name__ == "__main__":
    main()
"""
    
    with open("examples/kratos_geomech_example.py", "w", encoding="utf-8") as f:
        f.write(geomech_example)
    
    print("[OK] 示例脚本已创建:")
    print("     - examples/kratos_basic_example.py")
    print("     - examples/kratos_geomech_example.py")

def main():
    """主函数"""
    print("=" * 60)
    print("Kratos安装后配置")
    print("=" * 60)
    
    # 查找Kratos安装目录
    kratos_install_dir = None
    possible_dirs = ["kratos_install", "Kratos/install", "../kratos_install"]
    
    for dir_path in possible_dirs:
        if os.path.exists(dir_path):
            kratos_install_dir = os.path.abspath(dir_path)
            break
    
    if not kratos_install_dir:
        print("[ERROR] 未找到Kratos安装目录")
        print("请确保已成功编译和安装Kratos")
        return False
    
    print(f"[INFO] 找到Kratos安装目录: {kratos_install_dir}")
    
    # 创建环境脚本
    env_script = create_env_script(kratos_install_dir)
    
    # 测试安装
    if test_kratos_installation(kratos_install_dir):
        print("[OK] Kratos安装测试成功")
    else:
        print("[ERROR] Kratos安装测试失败")
        return False
    
    # 创建示例目录
    os.makedirs("examples", exist_ok=True)
    
    # 创建示例脚本
    create_example_scripts()
    
    print("\n" + "=" * 60)
    print("配置完成!")
    print("=" * 60)
    print(f"1. 运行环境脚本: {env_script}")
    print("2. 测试示例: python examples/kratos_basic_example.py")
    print("3. 地质力学示例: python examples/kratos_geomech_example.py")
    print("\n开始使用Kratos进行深基坑工程分析!")
    
    return True

if __name__ == "__main__":
    if main():
        sys.exit(0)
    else:
        print("[ERROR] 配置失败")
        sys.exit(1)
