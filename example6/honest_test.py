#!/usr/bin/env python3
"""
诚实的测试 - 基于实际的API
"""

print("=== 诚实测试开始 ===")

try:
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    
    from core.empirical_solver import EmpiricalScourSolver, create_test_parameters
    
    # 创建对象
    solver = EmpiricalScourSolver()
    params = create_test_parameters()
    
    print(f"桥墩直径: {params.pier_diameter}m")
    print(f"流速: {params.flow_velocity} m/s")
    print(f"水深: {params.water_depth}m")
    
    print("开始计算...")
    # 正确的API调用
    results_dict = solver.solve(params)  # 返回 Dict[str, ScourResult]
    
    print(f"结果类型: {type(results_dict)}")
    print(f"包含方法: {list(results_dict.keys())}")
    
    # 获取HEC-18结果
    if 'HEC-18' in results_dict:
        hec18_result = results_dict['HEC-18']
        print(f"HEC-18 结果类型: {type(hec18_result)}")
        print(f"HEC-18 冲刷深度: {hec18_result.scour_depth}m")
        
        # 计算流体参数
        V = params.flow_velocity
        D = params.pier_diameter  
        H = params.water_depth
        nu = 1e-6
        g = 9.81
        
        reynolds = V * D / nu
        froude = V / (g * H)**0.5
        
        print(f"雷诺数: {reynolds:.0f}")
        print(f"弗劳德数: {froude:.3f}")
        
        print("=== 成功 ===")
        print("这才是真正工作的版本")
        
except Exception as e:
    print(f"=== 失败 ===")
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()