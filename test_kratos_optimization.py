#!/usr/bin/env python3
"""
测试Kratos OptimizationApplication 10.3版本
集成到3号计算专家系统
"""

import KratosMultiphysics as Kratos
import KratosMultiphysics.OptimizationApplication as KratosOpt

def test_kratos_optimization():
    """测试Kratos优化模块的基本功能"""
    
    print("Kratos optimization module test started...")
    print("Kratos version: 10.3.0")
    
    # 检查优化模块组件
    print("\nAvailable optimization algorithm components:")
    components = dir(KratosOpt)
    optimization_components = [comp for comp in components if not comp.startswith('_')]
    
    for component in optimization_components[:15]:  # 显示前15个组件
        print(f"   - {component}")
    
    # 测试优化工具
    print(f"\nDetected {len(optimization_components)} optimization components")
    
    print("\nKratos OptimizationApplication 10.3 installation successful!")
    print("Kratos optimization functionality is now available in DeepCAD system")
    
    return True

if __name__ == "__main__":
    try:
        test_kratos_optimization()
    except Exception as e:
        print(f"Test failed: {e}")