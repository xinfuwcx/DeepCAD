#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
检查Kratos安装状态和可用模块，特别关注地质模块
"""

import sys
import os
print(f"Python 解释器路径: {sys.executable}")
print(f"Python 版本: {sys.version}")
print("-" * 50)

# 检查项目中的Kratos路径
base_dir = os.path.dirname(os.path.abspath(__file__))
possible_paths = [
    os.path.join(base_dir, "core", "kratos_source", "kratos", "bin", "Release"),
    os.path.join(base_dir, "core", "kratos_source", "kratos", "bin", "Debug"),
]

print("检查项目中的Kratos路径:")
for path in possible_paths:
    if os.path.exists(path):
        print(f"  ✓ 找到Kratos路径: {path}")
        # 将Kratos添加到Python路径
        if path not in sys.path:
            sys.path.append(path)
            print(f"  已将Kratos路径添加到sys.path: {path}")
    else:
        print(f"  ✗ 未找到Kratos路径: {path}")

try:
    import KratosMultiphysics
    print("\nKratos 已成功导入")
    
    # 检查核心应用
    print("\n已安装的Kratos应用:")
    kratos_applications = [app for app in dir(KratosMultiphysics) if app.endswith('Application')]
    for app in sorted(kratos_applications):
        print(f"  - {app}")
    
    # 检查项目需要的特定应用
    required_apps = [
        "GeoMechanicsApplication",         # 地质力学
        "StructuralMechanicsApplication",  # 固体力学
        "FluidDynamicsApplication",        # 流体力学
        "FSIApplication",                  # 流固耦合
        "OptimizationApplication"          # 优化
    ]
    
    print("\n项目所需模块状态:")
    for app in required_apps:
        try:
            # 动态导入模块检查是否可用
            module_name = f"KratosMultiphysics.{app}"
            __import__(module_name)
            print(f"  ✓ {app} - 已安装且可导入")
        except ImportError:
            if app in kratos_applications:
                print(f"  ! {app} - 在KratosMultiphysics中注册但无法导入")
            else:
                print(f"  ✗ {app} - 未安装")
    
    # 特别检查地质模块
    print("\n地质模块详细检查:")
    try:
        import KratosMultiphysics.GeoMechanicsApplication
        print("  ✓ GeoMechanicsApplication 已安装且可导入")
        print(f"  模块路径: {KratosMultiphysics.GeoMechanicsApplication.__file__}")
    except ImportError as e:
        print(f"  ✗ GeoMechanicsApplication 导入失败: {e}")
        print("  可能需要单独安装或编译地质模块")
    
    # 检查Kratos路径
    try:
        if hasattr(KratosMultiphysics, '__path__') and KratosMultiphysics.__path__:
            print(f"\nKratos安装路径: {KratosMultiphysics.__path__}")
        elif hasattr(KratosMultiphysics, '__file__') and KratosMultiphysics.__file__:
            print(f"\nKratos模块文件: {KratosMultiphysics.__file__}")
        else:
            print("\nKratos路径信息不可用")
    except AttributeError:
        print("\nKratos路径信息无法获取")
    
except ImportError as e:
    print(f"Kratos未安装或无法导入: {e}")
    print("\n可能的解决方案:")
    print("1. 检查core/kratos_source/kratos目录是否存在")
    print("2. 运行scripts目录下的Kratos编译脚本")
    print("3. 对于地质模块，可能需要单独编译或安装") 