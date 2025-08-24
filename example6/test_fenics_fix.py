#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化CAE测试 - 直接运行FEniCS求解，使用简单几何
"""

import sys
import os
sys.path.insert(0, '/mnt/e/DeepCAD')

# 直接导入核心模块
from example6.core.fenics_solver import FEniCSScourSolver, NumericalParameters
from example6.core.empirical_solver import ScourParameters, PierShape
import json

def simple_cae_test():
    print("=== 简化CAE测试 ===")
    
    # 创建测试参数
    scour_params = ScourParameters(
        pier_diameter=2.0,
        pier_shape=PierShape.CIRCULAR,
        flow_velocity=1.2,
        water_depth=4.0,
        d50=0.6
    )
    
    numerical_params = NumericalParameters(
        mesh_resolution=0.2,  # 粗网格
        time_step=0.1,
        max_iterations=10
    )
    
    print(f"桥墩直径: {scour_params.pier_diameter} m")
    print(f"流速: {scour_params.flow_velocity} m/s")
    print(f"水深: {scour_params.water_depth} m")
    
    # 求解器
    solver = FEniCSScourSolver()
    
    try:
        print("开始FEniCS求解...")
        result = solver.solve(scour_params, numerical_params)
        
        # 输出结果
        summary = {
            "success": result.success,
            "method": result.method,
            "scour_depth": result.scour_depth,
            "scour_width": result.scour_width,
            "scour_volume": result.scour_volume,
            "max_velocity": result.max_velocity,
            "reynolds_number": result.reynolds_number,
            "froude_number": result.froude_number,
            "computation_time": result.computation_time,
            "convergence_achieved": result.convergence_achieved
        }
        
        print("\n=== 求解结果 ===")
        print(json.dumps(summary, indent=2, ensure_ascii=False))
        
        # 保存结果
        with open('/mnt/e/DeepCAD/example6/outputs/simple_cae_result.json', 'w') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print("\n结果已保存到 example6/outputs/simple_cae_result.json")
        
    except Exception as e:
        print(f"求解失败: {e}")
        raise

if __name__ == "__main__":
    simple_cae_test()
