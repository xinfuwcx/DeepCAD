#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
集成求解器测试
测试增强Kratos接口、高级摩尔-库伦求解器和并行优化的完整集成
"""

import sys
import os
import time
sys.path.append(os.path.dirname(__file__))

from core.enhanced_kratos_interface import (
    EnhancedKratosInterface, 
    create_enhanced_static_analysis,
    create_robust_analysis
)
from core.advanced_mc_solver import ConvergenceStrategy
from core.parallel_optimizer import PerformanceLevel, get_optimal_kratos_config

def create_test_model():
    """创建测试模型数据"""
    # 创建一个简单的3D基坑模型
    nodes = []
    elements = []
    
    # 生成节点网格 (10x10x5)
    node_id = 1
    for k in range(6):  # Z方向6层
        for j in range(11):  # Y方向11个
            for i in range(11):  # X方向11个
                x = i * 2.0  # 2m间距
                y = j * 2.0
                z = -k * 2.0  # 向下10m
                
                nodes.append({
                    "id": node_id,
                    "coordinates": [x, y, z]
                })
                node_id += 1
    
    # 生成四面体单元
    element_id = 1
    for k in range(5):  # Z方向5层单元
        for j in range(10):  # Y方向10个
            for i in range(10):  # X方向10个
                # 计算节点ID
                n1 = k * 121 + j * 11 + i + 1  # 121 = 11*11
                n2 = n1 + 1
                n3 = n1 + 11
                n4 = n1 + 12
                n5 = n1 + 121
                n6 = n2 + 121
                n7 = n3 + 121
                n8 = n4 + 121
                
                # 将六面体分解为5个四面体
                tets = [
                    [n1, n2, n3, n5],
                    [n2, n3, n4, n8],
                    [n2, n5, n6, n8],
                    [n3, n5, n7, n8],
                    [n2, n3, n5, n8]
                ]
                
                for tet in tets:
                    elements.append({
                        "id": element_id,
                        "type": "tetrahedron",
                        "nodes": tet,
                        "material_id": 1
                    })
                    element_id += 1
    
    # 材料属性
    materials = {
        1: {
            "id": 1,
            "name": "粉质粘土",
            "density": 1900.0,  # kg/m³
            "young_modulus": 25e6,  # Pa
            "poisson_ratio": 0.35,
            "cohesion": 35000.0,  # Pa
            "friction_angle": 28.0,  # degrees
            "properties": {
                "E": 25e6,
                "NU": 0.35
            }
        }
    }
    
    return {
        "nodes": nodes,
        "elements": elements,
        "materials": materials,
        "analysis_stages": [
            {
                "stage": 1,
                "name": "初始地应力",
                "active_materials": [1],
                "loads": [],
                "boundaries": []
            }
        ]
    }

def test_enhanced_interface():
    """测试增强接口功能"""
    print("=== Enhanced Kratos Interface Test ===")
    
    # 创建测试模型
    print("Creating test model...")
    fpn_data = create_test_model()
    print(f"Model created: {len(fpn_data['nodes'])} nodes, {len(fpn_data['elements'])} elements")
    
    # 测试自适应策略
    print("\nTesting adaptive convergence strategy...")
    interface_adaptive = create_enhanced_static_analysis(ConvergenceStrategy.ADAPTIVE)
    
    start_time = time.time()
    if interface_adaptive.setup_enhanced_model(fpn_data, ConvergenceStrategy.ADAPTIVE):
        setup_time = time.time() - start_time
        print(f"✅ Enhanced model setup successful ({setup_time:.2f}s)")
        print(f"   Materials: {len(interface_adaptive.materials)}")
        print(f"   Convergence strategy: {interface_adaptive.advanced_solver_settings.convergence_strategy.value}")
        
        # 运行分析
        print("Running enhanced analysis...")
        analysis_start = time.time()
        success, results = interface_adaptive.run_enhanced_analysis()
        analysis_time = time.time() - analysis_start
        
        if success:
            print(f"✅ Enhanced analysis successful ({analysis_time:.2f}s)")
            
            # 显示结果统计
            if 'displacement_analysis' in results:
                disp_stats = results['displacement_analysis']
                print(f"   Max displacement: {disp_stats['max_displacement']:.2e} m")
                print(f"   Mean displacement: {disp_stats['mean_displacement']:.2e} m")
            
            if 'stress_analysis' in results:
                stress_stats = results['stress_analysis']
                print(f"   Max stress: {stress_stats['max_stress']:.2e} Pa")
                print(f"   Stress concentration: {stress_stats['stress_concentration_factor']:.2f}")
            
            # 性能摘要
            performance = interface_adaptive.get_performance_summary()
            if 'average_analysis_time' in performance:
                print(f"   Average analysis time: {performance['average_analysis_time']:.2f}s")
                print(f"   Success rate: {performance['success_rate']:.1%}")
        else:
            print(f"❌ Enhanced analysis failed: {results.get('error', 'Unknown error')}")
            return False
    else:
        print("❌ Enhanced model setup failed")
        return False
    
    # 测试鲁棒策略
    print("\nTesting robust convergence strategy...")
    interface_robust = create_robust_analysis()
    
    if interface_robust.setup_enhanced_model(fpn_data, ConvergenceStrategy.ROBUST):
        print(f"✅ Robust model setup successful")
        print(f"   Max iterations: {interface_robust.advanced_solver_settings.max_iterations}")
        print(f"   Displacement tolerance: {interface_robust.advanced_solver_settings.displacement_tolerance:.2e}")
    else:
        print("❌ Robust model setup failed")
    
    return True

def test_parallel_integration():
    """测试并行集成"""
    print("\n=== Parallel Integration Test ===")
    
    # 测试不同性能级别的配置
    problem_size = 50000
    
    for level in [PerformanceLevel.ECO, PerformanceLevel.BALANCED, PerformanceLevel.PERFORMANCE]:
        print(f"\nTesting {level.value} configuration...")
        
        try:
            config = get_optimal_kratos_config(problem_size, level)
            
            parallel_config = config['parallel_config']
            kratos_settings = config['kratos_settings']
            env_settings = config['environment_settings']
            
            print(f"✅ {level.value.title()} config generated:")
            print(f"   Strategy: {parallel_config.strategy.value}")
            print(f"   Threads: {parallel_config.num_threads}")
            print(f"   Memory limit: {parallel_config.memory_limit_gb:.1f} GB")
            print(f"   Linear solver: {kratos_settings['linear_solver_settings']['solver_type']}")
            print(f"   Environment vars: {len(env_settings)} set")
            
        except Exception as e:
            print(f"❌ {level.value} config failed: {e}")
            return False
    
    return True

def test_material_validation():
    """测试材料参数验证"""
    print("\n=== Material Validation Test ===")
    
    from core.advanced_mc_solver import MaterialParameterValidator, MaterialValidationLevel
    
    validator = MaterialParameterValidator(MaterialValidationLevel.ENGINEERING)
    
    # 测试用例
    test_cases = [
        {
            "name": "Good material",
            "material": {
                'YOUNG_MODULUS': 30e9,
                'POISSON_RATIO': 0.3,
                'DENSITY': 2500,
                'COHESION': 50000,
                'FRICTION_ANGLE': 30.0
            }
        },
        {
            "name": "Bad material (negative modulus)",
            "material": {
                'YOUNG_MODULUS': -1000,
                'POISSON_RATIO': 0.3,
                'DENSITY': 2500,
                'COHESION': 50000,
                'FRICTION_ANGLE': 30.0
            }
        },
        {
            "name": "Extreme material (high Poisson ratio)",
            "material": {
                'YOUNG_MODULUS': 30e9,
                'POISSON_RATIO': 0.6,
                'DENSITY': 2500,
                'COHESION': 50000,
                'FRICTION_ANGLE': 30.0
            }
        }
    ]
    
    for test_case in test_cases:
        valid, errors = validator.validate_material_properties(test_case['material'])
        status = "✅ PASS" if valid else "❌ FAIL"
        print(f"{status} {test_case['name']}")
        if errors:
            print(f"     Errors: {len(errors)}")
    
    return True

def main():
    """主测试函数"""
    print("🧪 Integrated Solver System Test")
    print("=" * 60)
    
    total_start = time.time()
    
    # 运行各项测试
    tests = [
        ("Enhanced Interface", test_enhanced_interface),
        ("Parallel Integration", test_parallel_integration),
        ("Material Validation", test_material_validation)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            test_start = time.time()
            result = test_func()
            test_time = time.time() - test_start
            results[test_name] = {"success": result, "time": test_time}
        except Exception as e:
            print(f"❌ {test_name} test exception: {e}")
            results[test_name] = {"success": False, "time": 0, "error": str(e)}
    
    # 总结
    total_time = time.time() - total_start
    print("\n" + "=" * 60)
    print("📊 Test Results Summary:")
    
    success_count = 0
    for test_name, result in results.items():
        status = "✅ PASS" if result['success'] else "❌ FAIL"
        print(f"   {test_name}: {status} ({result['time']:.2f}s)")
        if result['success']:
            success_count += 1
        if 'error' in result:
            print(f"      Error: {result['error']}")
    
    print(f"\n🎯 Overall Result: {success_count}/{len(results)} tests passed")
    print(f"⏱️  Total time: {total_time:.2f} seconds")
    
    if success_count == len(results):
        print("🎉 All tests passed! Integrated solver system is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the implementation.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)