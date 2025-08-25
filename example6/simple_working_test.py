#!/usr/bin/env python3
"""
最简单的工作测试 - 绝对诚实版本
"""

print("=== 最简单测试 ===")

try:
    print("1. 测试导入...")
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    
    print("2. 导入求解器...")
    from core.empirical_solver import EmpiricalScourSolver
    print("   OK - 求解器导入成功")
    
    print("3. 导入参数...")
    from core.empirical_solver import create_test_parameters
    print("   OK - 参数导入成功")
    
    print("4. 创建对象...")
    solver = EmpiricalScourSolver()
    params = create_test_parameters()
    print(f"   OK - 桥墩直径: {params.pier_diameter}m")
    
    print("5. 尝试计算 (这里可能会卡住)...")
    print("   开始计算...")
    
    # 只测试一个简单方法
    try:
        result_hec18 = solver.solve_hec18(params)
        print(f"   HEC-18计算完成: {result_hec18}")
        
        print("6. 测试结果格式...")
        if hasattr(result_hec18, 'scour_depth'):
            print(f"   冲刷深度: {result_hec18.scour_depth}m")
        else:
            print(f"   结果: {result_hec18}")
        
        print("=== 成功 ===")
        print("核心计算功能正常工作")
        
    except Exception as calc_error:
        print(f"   计算失败: {calc_error}")
        raise
    
except Exception as e:
    print(f"=== 失败 ===")
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()
    print("基础功能就有问题")