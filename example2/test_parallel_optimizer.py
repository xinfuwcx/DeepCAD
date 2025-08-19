#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试并行优化器
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from core.parallel_optimizer import (
    ParallelOptimizer,
    PerformanceLevel,
    get_optimal_kratos_config
)

def test_parallel_optimization():
    """测试并行优化功能"""
    print("=== Parallel Optimization Test ===")
    
    optimizer = ParallelOptimizer()
    
    # 系统信息
    system_info = optimizer.profiler.system_info
    print(f"System Info:")
    print(f"  CPU cores: {system_info.physical_cores} physical, {system_info.cpu_cores} logical")
    print(f"  Memory: {system_info.memory_gb:.1f} GB ({system_info.available_memory_gb:.1f} GB available)")
    print(f"  CPU frequency: {system_info.cpu_frequency_ghz:.1f} GHz")
    print(f"  Hyperthreading: {'Yes' if system_info.has_hyperthreading else 'No'}")
    print(f"  GPU: {'Yes' if system_info.has_gpu else 'No'}")
    
    # 测试不同问题规模的优化配置
    problem_sizes = [10000, 100000, 500000]
    
    for size in problem_sizes:
        print(f"\nProblem size: {size:,}")
        
        try:
            config_result = optimizer.optimize_kratos_settings(size, PerformanceLevel.BALANCED)
            
            config = config_result['parallel_config']
            kratos_settings = config_result['kratos_settings']
            
            print(f"  Parallel strategy: {config.strategy.value}")
            print(f"  Threads: {config.num_threads}")
            print(f"  Memory limit: {config.memory_limit_gb:.1f} GB")
            print(f"  GPU enabled: {'Yes' if config.gpu_enabled else 'No'}")
            print(f"  Linear solver: {kratos_settings['linear_solver_settings']['solver_type']}")
            
        except Exception as e:
            print(f"  Error: {e}")
    
    # 测试便捷函数
    print(f"\nTesting convenience function:")
    try:
        config = get_optimal_kratos_config(50000, PerformanceLevel.PERFORMANCE)
        print(f"  Performance config generated successfully")
        print(f"  Parallel type: {config['kratos_settings']['parallel_type']}")
    except Exception as e:
        print(f"  Error: {e}")
    
    print("=== Test COMPLETED ===")
    return True

if __name__ == "__main__":
    success = test_parallel_optimization()
    sys.exit(0 if success else 1)