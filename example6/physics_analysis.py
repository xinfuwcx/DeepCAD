#!/usr/bin/env python3
"""
完整CAE物理分析测试
"""

import sys
sys.path.insert(0, '/mnt/e/DeepCAD')

from example6.core.fenics_solver import FEniCSScourSolver, NumericalParameters
from example6.core.empirical_solver import ScourParameters, PierShape
import json

def physics_analysis_test():
    print("=== 桥墩冲刷CAE物理分析 ===")
    
    # 测试案例
    test_cases = [
        {
            "name": "小流速案例",
            "params": ScourParameters(
                pier_diameter=2.0, pier_shape=PierShape.CIRCULAR,
                flow_velocity=0.5, water_depth=4.0, d50=0.8
            )
        },
        {
            "name": "中等流速案例", 
            "params": ScourParameters(
                pier_diameter=2.0, pier_shape=PierShape.CIRCULAR,
                flow_velocity=1.2, water_depth=4.0, d50=0.6
            )
        },
        {
            "name": "高流速案例",
            "params": ScourParameters(
                pier_diameter=2.0, pier_shape=PierShape.CIRCULAR,
                flow_velocity=2.0, water_depth=4.0, d50=0.4
            )
        }
    ]
    
    numerical_params = NumericalParameters(
        mesh_resolution=0.2,
        time_step=0.1,
        max_iterations=10
    )
    
    solver = FEniCSScourSolver()
    all_results = []
    
    for case in test_cases:
        print(f"\n--- {case['name']} ---")
        params = case['params']
        
        print(f"流速: {params.flow_velocity} m/s")
        print(f"桥墩直径: {params.pier_diameter} m") 
        print(f"沉积物粒径: {params.d50} mm")
        
        # 计算无量纲参数
        Re = params.flow_velocity * params.pier_diameter / 1e-6
        Fr = params.flow_velocity / (9.81 * params.water_depth)**0.5
        
        print(f"雷诺数: {Re:.0f}")
        print(f"弗劳德数: {Fr:.3f}")
        
        try:
            result = solver.solve(params, numerical_params)
            
            # 计算冲刷深度与桥墩直径的比值
            relative_scour = result.scour_depth / params.pier_diameter
            
            case_result = {
                "case_name": case['name'],
                "flow_velocity": params.flow_velocity,
                "reynolds_number": Re,
                "froude_number": Fr,
                "scour_depth": result.scour_depth,
                "relative_scour": relative_scour,
                "scour_width": result.scour_width,
                "computation_time": result.computation_time,
                "physical_reasonable": relative_scour <= 3.0  # 合理性检查
            }
            
            print(f"冲刷深度: {result.scour_depth:.2f} m")
            print(f"相对冲刷深度 (ds/D): {relative_scour:.2f}")
            print(f"物理合理性: {'✓' if case_result['physical_reasonable'] else '✗'}")
            
            all_results.append(case_result)
            
        except Exception as e:
            print(f"计算失败: {e}")
            case_result = {
                "case_name": case['name'],
                "error": str(e)
            }
            all_results.append(case_result)
    
    # 保存完整分析结果
    output_file = '/mnt/e/DeepCAD/example6/outputs/physics_analysis.json'
    with open(output_file, 'w') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    print(f"\n完整分析结果已保存到: {output_file}")
    
    # 总结
    print("\n=== 分析总结 ===")
    successful_cases = [r for r in all_results if 'error' not in r]
    if successful_cases:
        print(f"成功计算案例: {len(successful_cases)}/{len(test_cases)}")
        reasonable_cases = [r for r in successful_cases if r.get('physical_reasonable', False)]
        print(f"物理合理案例: {len(reasonable_cases)}/{len(successful_cases)}")
        
        if reasonable_cases:
            avg_relative_scour = sum(r['relative_scour'] for r in reasonable_cases) / len(reasonable_cases)
            print(f"平均相对冲刷深度: {avg_relative_scour:.2f}")
        
        # 显示趋势
        print("\n流速-冲刷深度关系:")
        for r in successful_cases:
            print(f"  V={r['flow_velocity']} m/s → ds/D={r['relative_scour']:.2f}")

if __name__ == "__main__":
    physics_analysis_test()
