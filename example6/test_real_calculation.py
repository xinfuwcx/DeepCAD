#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
真实测试计算功能 - 不依赖GUI
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_empirical_solver():
    """测试经验公式求解器"""
    print("=== 测试经验公式求解器 ===")
    
    try:
        from core.empirical_solver import EmpiricalScourSolver, create_test_parameters
        
        # 创建求解器和参数
        solver = EmpiricalScourSolver()
        params = create_test_parameters()
        
        print("参数:")
        print(f"  桥墩直径: {params.pier_diameter} m")
        print(f"  流速: {params.flow_velocity} m/s")
        print(f"  水深: {params.water_depth} m")
        print()
        
        # 执行计算
        print("执行 solver.solve(params)...")
        raw_result = solver.solve(params)
        
        print(f"原始结果类型: {type(raw_result)}")
        print(f"原始结果内容: {raw_result}")
        print()
        
        # 模拟我在GUI中的处理逻辑
        print("=== 模拟GUI处理逻辑 ===")
        if isinstance(raw_result, dict):
            print("结果是字典格式")
            main_method = 'HEC-18'
            if main_method in raw_result:
                result = raw_result[main_method]
                print(f"选择 {main_method} 结果: {result}")
            else:
                result = list(raw_result.values())[0]
                print(f"使用第一个结果: {result}")
            
            print(f"选中结果类型: {type(result)}")
            print(f"选中结果: {result}")
            
            # 检查result类型并处理
            if not isinstance(result, dict):
                print("结果不是字典，需要转换")
                if hasattr(result, 'scour_depth'):
                    scour_depth = result.scour_depth
                    print(f"从ScourResult对象提取scour_depth: {scour_depth}")
                else:
                    scour_depth = float(result) if result is not None else 0.0
                    print(f"转换为浮点数: {scour_depth}")
                result_dict = {'scour_depth': scour_depth, 'success': True}
            else:
                result_dict = result
                print("结果已经是字典格式")
            
            # 添加流体参数
            V = params.flow_velocity
            D = params.pier_diameter  
            H = params.water_depth
            nu = 1e-6
            g = 9.81
            
            result_dict['reynolds_number'] = V * D / nu
            result_dict['froude_number'] = V / (g * H)**0.5
            result_dict['success'] = True
            
            print("最终结果:")
            print(f"  冲刷深度: {result_dict.get('scour_depth', 0):.2f} m")
            print(f"  雷诺数: {result_dict.get('reynolds_number', 0):.0f}")
            print(f"  弗劳德数: {result_dict.get('froude_number', 0):.3f}")
            
            return True, result_dict
            
    except Exception as e:
        print(f"测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False, None

def test_step_by_step():
    """分步测试每个环节"""
    print("\n=== 分步测试 ===")
    
    # 1. 参数创建
    print("步骤1: 创建参数")
    try:
        from core.empirical_solver import create_test_parameters
        params = create_test_parameters()
        print("OK - 参数创建成功")
    except Exception as e:
        print(f"ERROR - 参数创建失败: {e}")
        return
    
    # 2. 求解器创建
    print("\n步骤2: 创建求解器")
    try:
        from core.empirical_solver import EmpiricalScourSolver
        solver = EmpiricalScourSolver()
        print("OK - 求解器创建成功")
    except Exception as e:
        print(f"ERROR - 求解器创建失败: {e}")
        return
    
    # 3. 计算执行
    print("\n步骤3: 执行计算")
    try:
        raw_result = solver.solve(params)
        print(f"OK - 计算执行成功，结果类型: {type(raw_result)}")
        return raw_result
    except Exception as e:
        print(f"ERROR - 计算执行失败: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("真实功能测试开始...")
    
    # 分步测试
    raw_result = test_step_by_step()
    
    if raw_result is not None:
        print("\n=== 完整测试 ===")
        success, final_result = test_empirical_solver()
        
        if success:
            print("\n=== 测试成功! ===")
            print("GUI中的问题可能在于界面集成，而不是核心计算")
        else:
            print("\n=== 测试失败! ===")
    else:
        print("\n=== 基础计算就有问题 ===")