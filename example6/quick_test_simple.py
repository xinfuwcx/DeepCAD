#!/usr/bin/env python3
"""
简单快速测试 - 最小依赖版本
"""

import sys
import os
import time
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

print("=== 快速测试开始 ===")
print("当前时间:", time.strftime("%H:%M:%S"))

try:
    print("1. 导入模块...")
    from core.empirical_solver import EmpiricalScourSolver, ScourParameters, PierShape
    print("   模块导入成功")
    
    print("2. 创建参数...")
    params = ScourParameters(
        pier_diameter=2.0,
        pier_shape=PierShape.CIRCULAR,
        flow_velocity=0.8,
        water_depth=3.0,
        d50=0.8
    )
    print(f"   参数: 直径{params.pier_diameter}m, 流速{params.flow_velocity}m/s")
    
    print("3. 创建求解器...")
    solver = EmpiricalScourSolver()
    print("   求解器创建成功")
    
    print("4. 执行单个方法...")
    result_hec18 = solver.solve_hec18(params)
    print(f"   HEC-18结果: {result_hec18}")
    
    if hasattr(result_hec18, 'scour_depth'):
        print(f"   冲刷深度: {result_hec18.scour_depth:.3f}m")
        print("=== 测试成功 ===")
    else:
        print(f"   结果异常: {type(result_hec18)}")
        print("=== 测试异常 ===")
        
except Exception as e:
    print(f"=== 测试失败 ===")
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()

print("结束时间:", time.strftime("%H:%M:%S"))