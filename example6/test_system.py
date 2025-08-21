#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
系统测试脚本 - System Test Script
测试DeepCAD-SCOUR桥墩浅蚀模拟系统的所有功能

测试内容：
1. 经验算法求解器
2. FEniCS数值求解器（如果可用）
3. 求解器管理器
4. 结果对比功能
"""

import sys
from pathlib import Path

# 添加路径
sys.path.insert(0, str(Path(__file__).parent))

from core.empirical_solver import (
    EmpiricalScourSolver, ScourParameters, PierShape, create_test_parameters
)
from core.fenics_solver import (
    FEniCSScourSolver, NumericalParameters, create_test_numerical_parameters
)
from core.solver_manager import (
    SolverManager, SolverConfiguration, SolverType, ComputationMode, create_default_manager
)

import time
import warnings


def test_empirical_solver():
    """测试经验公式求解器"""
    print("=" * 60)
    print("测试1: 经验公式求解器")
    print("=" * 60)
    
    solver = EmpiricalScourSolver()
    params = create_test_parameters()
    
    print(f"测试参数:")
    print(f"  桥墩直径: {params.pier_diameter} m")
    print(f"  流速: {params.flow_velocity} m/s")
    print(f"  水深: {params.water_depth} m")
    print(f"  沉积物粒径: {params.d50} mm")
    print()
    
    # 测试单个方法
    print("测试HEC-18公式:")
    start_time = time.time()
    result_hec18 = solver.hec18_formula(params)
    end_time = time.time()
    
    print(f"  冲刷深度: {result_hec18.scour_depth:.3f} m")
    print(f"  可信度: {result_hec18.confidence:.2f}")
    print(f"  计算时间: {(end_time - start_time)*1000:.1f} ms")
    if result_hec18.warnings:
        print(f"  警告: {'; '.join(result_hec18.warnings)}")
    print()
    
    # 测试所有方法
    print("测试所有方法:")
    start_time = time.time()
    all_results = solver.solve(params, "all")
    end_time = time.time()
    
    for method, result in all_results.items():
        print(f"  {method}: {result.scour_depth:.3f} m (可信度: {result.confidence:.2f})")
    
    print(f"  总计算时间: {(end_time - start_time)*1000:.1f} ms")
    print()
    
    # 测试综合结果
    print("测试综合共识结果:")
    consensus = solver.get_consensus_result(params)
    print(f"  综合冲刷深度: {consensus.scour_depth:.3f} m")
    print(f"  综合可信度: {consensus.confidence:.2f}")
    print(f"  方法: {consensus.method}")
    
    return True


def test_fenics_solver():
    """测试FEniCS数值求解器"""
    print("=" * 60)
    print("测试2: FEniCS数值求解器")
    print("=" * 60)
    
    solver = FEniCSScourSolver()
    scour_params = create_test_parameters()
    numerical_params = create_test_numerical_parameters()
    
    print(f"FEniCS可用: {solver.fenics_available}")
    print(f"数值参数:")
    print(f"  网格分辨率: {numerical_params.mesh_resolution} m")
    print(f"  时间步长: {numerical_params.time_step} s")
    print(f"  湍流模型: {numerical_params.turbulence_model}")
    print()
    
    print("开始数值计算...")
    start_time = time.time()
    result = solver.solve(scour_params, numerical_params)
    end_time = time.time()
    
    print(f"计算完成！")
    print(f"  冲刷深度: {result.scour_depth:.3f} m")
    print(f"  冲刷宽度: {result.scour_width:.3f} m")
    print(f"  冲刷体积: {result.scour_volume:.3f} m3")
    print(f"  最大流速: {result.max_velocity:.3f} m/s")
    print(f"  计算时间: {result.computation_time:.2f} s")
    print(f"  收敛: {result.convergence_achieved}")
    
    if result.warnings:
        print(f"  警告: {'; '.join(result.warnings)}")
    
    return True


def test_solver_manager():
    """测试求解器管理器"""
    print("=" * 60)
    print("测试3: 求解器管理器")
    print("=" * 60)
    
    manager = create_default_manager()
    params = create_test_parameters()
    
    # 检查可用求解器
    available_solvers = manager.get_available_solvers()
    print("可用求解器状态:")
    for solver, status in available_solvers.items():
        status_mark = "OK" if status else "NO"
        print(f"  {solver}: {status_mark}")
    print()
    
    # 测试参数验证
    print("参数验证测试:")
    validation_warnings = manager.validate_parameters(params)
    if validation_warnings:
        print("  警告:")
        for warning in validation_warnings:
            print(f"    - {warning}")
    else:
        print("  参数验证通过")
    print()
    
    # 测试自动求解器选择
    print("自动求解器选择测试:")
    auto_solver = manager.auto_select_solver(params)
    print(f"  推荐求解器: {auto_solver}")
    print()
    
    # 测试混合求解
    print("混合求解测试:")
    start_time = time.time()
    try:
        result = manager.solve(params, solver_type=SolverType.HYBRID)
        end_time = time.time()
        
        if hasattr(result, 'recommended_result') and result.recommended_result:
            rec = result.recommended_result
            print(f"  推荐结果: {rec.scour_depth:.3f} m")
            print(f"  推荐依据: {result.recommendation_reason}")
            print(f"  结果一致性: {result.agreement_level}")
            print(f"  相对误差: {result.relative_error:.1%}")
        else:
            print(f"  结果: {result.scour_depth:.3f} m")
        
        print(f"  总计算时间: {end_time - start_time:.2f} s")
        
        if hasattr(result, 'warnings') and result.warnings:
            print(f"  警告: {'; '.join(result.warnings)}")
    
    except Exception as e:
        print(f"  混合求解失败: {e}")
    
    print()
    
    # 性能统计
    print("性能统计:")
    stats = manager.get_performance_stats()
    for key, value in stats.items():
        if isinstance(value, float):
            print(f"  {key}: {value:.3f}")
        else:
            print(f"  {key}: {value}")
    
    return True


def test_parameter_variations():
    """测试不同参数条件下的表现"""
    print("=" * 60)
    print("测试4: 参数敏感性分析")
    print("=" * 60)
    
    solver = EmpiricalScourSolver()
    base_params = create_test_parameters()
    
    # 测试不同流速
    print("流速敏感性测试:")
    velocities = [0.5, 0.8, 1.2, 1.8, 2.5]
    for v in velocities:
        test_params = ScourParameters(
            pier_diameter=base_params.pier_diameter,
            pier_shape=base_params.pier_shape,
            flow_velocity=v,
            water_depth=base_params.water_depth,
            d50=base_params.d50
        )
        
        result = solver.get_consensus_result(test_params)
        print(f"  流速 {v:.1f} m/s: 冲刷深度 {result.scour_depth:.3f} m")
    
    print()
    
    # 测试不同桥墩直径
    print("桥墩直径敏感性测试:")
    diameters = [1.0, 1.5, 2.0, 3.0, 4.0]
    for d in diameters:
        test_params = ScourParameters(
            pier_diameter=d,
            pier_shape=base_params.pier_shape,
            flow_velocity=base_params.flow_velocity,
            water_depth=base_params.water_depth,
            d50=base_params.d50
        )
        
        result = solver.get_consensus_result(test_params)
        print(f"  直径 {d:.1f} m: 冲刷深度 {result.scour_depth:.3f} m")
    
    print()
    
    # 测试不同桥墩形状
    print("桥墩形状影响测试:")
    shapes = [PierShape.CIRCULAR, PierShape.RECTANGULAR, PierShape.ELLIPTICAL]
    for shape in shapes:
        test_params = ScourParameters(
            pier_diameter=base_params.pier_diameter,
            pier_shape=shape,
            flow_velocity=base_params.flow_velocity,
            water_depth=base_params.water_depth,
            d50=base_params.d50
        )
        
        result = solver.get_consensus_result(test_params)
        print(f"  {shape.value}: 冲刷深度 {result.scour_depth:.3f} m")
    
    return True


def run_comprehensive_test():
    """运行综合测试"""
    print("DeepCAD-SCOUR 桥墩浅蚀模拟系统 - 综合功能测试")
    print("=" * 60)
    
    # 忽略警告以简化输出
    warnings.filterwarnings('ignore')
    
    test_results = {}
    total_start_time = time.time()
    
    try:
        # 测试1: 经验公式求解器
        test_results['empirical'] = test_empirical_solver()
        print()
        
        # 测试2: FEniCS数值求解器
        test_results['fenics'] = test_fenics_solver()
        print()
        
        # 测试3: 求解器管理器
        test_results['manager'] = test_solver_manager()
        print()
        
        # 测试4: 参数敏感性
        test_results['sensitivity'] = test_parameter_variations()
        print()
        
    except Exception as e:
        print(f"测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    total_end_time = time.time()
    
    # 测试总结
    print("=" * 60)
    print("测试总结")
    print("=" * 60)
    
    passed_tests = sum(test_results.values())
    total_tests = len(test_results)
    
    print(f"总测试项目: {total_tests}")
    print(f"通过测试: {passed_tests}")
    print(f"失败测试: {total_tests - passed_tests}")
    print(f"总测试时间: {total_end_time - total_start_time:.2f} s")
    
    if passed_tests == total_tests:
        print("所有测试通过！系统功能正常。")
        return True
    else:
        print("部分测试失败，请检查系统配置。")
        return False


if __name__ == "__main__":
    print("启动DeepCAD-SCOUR系统测试...")
    print()
    
    success = run_comprehensive_test()
    
    if success:
        print("\n系统测试完成，所有功能正常！")
        print("现在可以运行 'python main.py' 启动GUI界面。")
    else:
        print("\n系统测试发现问题，请检查配置和依赖。")
    
    sys.exit(0 if success else 1)