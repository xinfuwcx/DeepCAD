#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试高级摩尔-库伦求解器
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from core.advanced_mc_solver import (
    MaterialParameterValidator, 
    OptimizedMohrCoulombSolver,
    AdvancedSolverSettings,
    ConvergenceStrategy,
    MaterialValidationLevel
)

def test_simple():
    """简单测试"""
    print("=== Advanced Mohr-Coulomb Solver Test ===")
    
    # 测试材料验证
    validator = MaterialParameterValidator(MaterialValidationLevel.ENGINEERING)
    
    # 正常材料
    normal_material = {
        'YOUNG_MODULUS': 30e9,
        'POISSON_RATIO': 0.3,
        'DENSITY': 2500,
        'COHESION': 50000,
        'FRICTION_ANGLE': 30.0
    }
    
    valid, errors = validator.validate_material_properties(normal_material)
    print(f"Normal material validation: {'PASS' if valid else 'FAIL'}")
    if errors:
        print(f"Errors: {len(errors)}")
    
    # 测试求解器优化
    settings = AdvancedSolverSettings(
        convergence_strategy=ConvergenceStrategy.ADAPTIVE,
        max_iterations=50
    )
    
    solver = OptimizedMohrCoulombSolver(settings)
    
    try:
        # 生成求解器参数
        solver_params = solver.generate_optimized_solver_parameters(normal_material)
        print("Solver parameter generation: SUCCESS")
        print(f"Time step: {solver_params['time_stepping']['time_step']:.2e}")
        print(f"Max iterations: {solver_params['max_iteration']}")
        
        # 生成本构法则配置
        constitutive_config = solver.generate_constitutive_law_config(normal_material)
        print(f"Constitutive law: {constitutive_config['constitutive_law']['name']}")
        
        print("=== Test COMPLETED Successfully ===")
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    success = test_simple()
    sys.exit(0 if success else 1)