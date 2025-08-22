#!/usr/bin/env python3
"""测试Kratos直接法求解器"""

import KratosMultiphysics
from KratosMultiphysics.StructuralMechanicsApplication.structural_mechanics_analysis import StructuralMechanicsAnalysis

def test_kratos_analysis():
    """测试Kratos分析"""
    
    # 读取参数文件
    with open('temp_kratos_analysis/ProjectParameters.json', 'r') as f:
        parameters = KratosMultiphysics.Parameters(f.read())

    print('🚀 启动Kratos非线性分析 (直接法求解器)...')
    print('📋 求解器配置:')
    
    solver_settings = parameters["solver_settings"]
    linear_solver = solver_settings["linear_solver_settings"]
    
    print(f'   - 分析类型: {solver_settings["analysis_type"].GetString()}')
    print(f'   - 最大迭代: {solver_settings["max_iteration"].GetInt()}')
    print(f'   - 线性求解器: {linear_solver["solver_type"].GetString()}')
    print(f'   - 线搜索: {solver_settings["line_search"].GetBool()}')

    try:
        print('🔧 初始化分析...')
        # 切换到正确的工作目录
        import os
        os.chdir('temp_kratos_analysis')
        analysis = StructuralMechanicsAnalysis(KratosMultiphysics.Model(), parameters)
        
        print('⚡ 开始求解...')
        analysis.Run()
        
        print('✅ 分析成功完成!')
        return True
        
    except Exception as e:
        print(f'❌ 分析失败: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_kratos_analysis()
    print(f'\n🎯 最终结果: {"成功" if success else "失败"}')
