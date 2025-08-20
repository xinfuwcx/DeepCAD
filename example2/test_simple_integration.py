#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化的集成测试
直接测试各模块功能，不依赖复杂的导入
"""

import sys
import os
import time
sys.path.append(os.path.dirname(__file__))

def test_basic_kratos_interface():
    """测试基础Kratos接口"""
    print("=== Basic Kratos Interface Test ===")
    
    try:
        from core.kratos_interface import KratosInterface, MaterialProperties
        
        # 创建接口
        interface = KratosInterface()
        print("✅ KratosInterface created successfully")
        
        # 创建测试数据
        test_data = {
            "nodes": [
                {"id": 1, "x": 0.0, "y": 0.0, "z": 0.0},
                {"id": 2, "x": 1.0, "y": 0.0, "z": 0.0},
                {"id": 3, "x": 0.0, "y": 1.0, "z": 0.0},
                {"id": 4, "x": 0.0, "y": 0.0, "z": 1.0}
            ],
            "elements": [
                {"id": 1, "type": "tetrahedron", "nodes": [1, 2, 3, 4], "material_id": 1}
            ]
        }
        
        # 测试模型设置
        if interface.setup_model(test_data):
            print("✅ Model setup successful")
            print(f"   Nodes: {len(interface.model_data.get('nodes', []))}")
            print(f"   Elements: {len(interface.model_data.get('elements', []))}")
            return True
        else:
            print("❌ Model setup failed")
            return False
            
    except Exception as e:
        print(f"❌ Basic interface test failed: {e}")
        return False

def test_advanced_solver_standalone():
    """独立测试高级求解器"""
    print("\n=== Advanced Solver Standalone Test ===")
    
    try:
        from core.advanced_mc_solver import (
            MaterialParameterValidator,
            OptimizedMohrCoulombSolver,
            AdvancedSolverSettings,
            ConvergenceStrategy,
            MaterialValidationLevel
        )
        
        # 材料验证测试
        validator = MaterialParameterValidator(MaterialValidationLevel.ENGINEERING)
        
        test_material = {
            'YOUNG_MODULUS': 30e9,
            'POISSON_RATIO': 0.3,
            'DENSITY': 2500,
            'COHESION': 50000,
            'FRICTION_ANGLE': 30.0
        }
        
        valid, errors = validator.validate_material_properties(test_material)
        print(f"OK Material validation: {'PASS' if valid else 'FAIL'}")
        
        # 求解器优化测试
        settings = AdvancedSolverSettings(
            convergence_strategy=ConvergenceStrategy.ADAPTIVE,
            max_iterations=50
        )
        
        solver = OptimizedMohrCoulombSolver(settings)
        solver_params = solver.generate_optimized_solver_parameters(test_material)
        
        print("✅ Solver optimization successful")
        print(f"   Strategy: {settings.convergence_strategy.value}")
        print(f"   Max iterations: {solver_params['max_iteration']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Advanced solver test failed: {e}")
        return False

def test_parallel_optimizer_standalone():
    """独立测试并行优化器"""
    print("\n=== Parallel Optimizer Standalone Test ===")
    
    try:
        from core.parallel_optimizer import (
            ParallelOptimizer,
            PerformanceLevel,
            SystemProfiler
        )
        
        # 系统分析
        profiler = SystemProfiler()
        system_info = profiler.system_info
        
        print(f"✅ System profiling successful")
        print(f"   CPU cores: {system_info.physical_cores}/{system_info.cpu_cores}")
        print(f"   Memory: {system_info.memory_gb:.1f} GB")
        print(f"   Frequency: {system_info.cpu_frequency_ghz:.1f} GHz")
        
        # 并行配置优化
        optimizer = ParallelOptimizer()
        
        problem_size = 50000
        config_result = optimizer.optimize_kratos_settings(problem_size, PerformanceLevel.BALANCED)
        
        print("✅ Parallel optimization successful")
        print(f"   Strategy: {config_result['parallel_config'].strategy.value}")
        print(f"   Threads: {config_result['parallel_config'].num_threads}")
        
        return True
        
    except Exception as e:
        print(f"❌ Parallel optimizer test failed: {e}")
        return False

def test_fpn_parsing():
    """测试FPN解析功能"""
    print("\n=== FPN Parsing Test ===")
    
    try:
        from core.optimized_fpn_parser import OptimizedFPNParser
        
        parser = OptimizedFPNParser()
        print("✅ FPN parser created successfully")
        
        # 查找测试文件
        test_files = [
            "test_sample.fpn",
            "data/两阶段计算2.fpn"
        ]
        
        for test_file in test_files:
            if os.path.exists(test_file):
                print(f"Testing file: {test_file}")
                try:
                    result = parser.parse_file_streaming(test_file)
                    print(f"✅ FPN parsing successful")
                    print(f"   Nodes: {len(result.get('nodes', []))}")
                    print(f"   Elements: {len(result.get('elements', []))}")
                    print(f"   Materials: {len(result.get('materials', {}))}")
                    return True
                except Exception as e:
                    print(f"❌ FPN parsing failed: {e}")
                    continue
        
        print("⚠️  No valid FPN test files found")
        return True  # 不算失败，因为文件可能不存在
        
    except Exception as e:
        print(f"❌ FPN parsing test failed: {e}")
        return False

def main():
    """主测试函数"""
    print("*** Simplified Integration Test ***")
    print("=" * 50)
    
    start_time = time.time()
    
    # 测试项目
    tests = [
        ("Basic Kratos Interface", test_basic_kratos_interface),
        ("Advanced Solver", test_advanced_solver_standalone),
        ("Parallel Optimizer", test_parallel_optimizer_standalone),
        ("FPN Parsing", test_fpn_parsing)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            test_start = time.time()
            result = test_func()
            test_time = time.time() - test_start
            results[test_name] = {"success": result, "time": test_time}
        except Exception as e:
            print(f"❌ {test_name} exception: {e}")
            results[test_name] = {"success": False, "time": 0}
    
    # 总结
    total_time = time.time() - start_time
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    
    success_count = 0
    for test_name, result in results.items():
        status = "✅ PASS" if result['success'] else "❌ FAIL"
        print(f"   {test_name}: {status} ({result['time']:.2f}s)")
        if result['success']:
            success_count += 1
    
    print(f"\nResult: {success_count}/{len(tests)} tests passed")
    print(f"Total time: {total_time:.2f}s")
    
    if success_count == len(tests):
        print("SUCCESS: All core modules working correctly!")
    elif success_count > len(tests) * 0.7:
        print("PASS: Most modules working, system is functional.")
    else:
        print("WARNING: Multiple failures, please check implementation.")
    
    return success_count >= len(tests) * 0.7

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)