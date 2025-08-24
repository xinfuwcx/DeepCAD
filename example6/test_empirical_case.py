#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
经验方法测试案例 - Empirical Methods Test Case
基于实际工程的桥墩冲刷经验公式计算测试

工程背景：某高速公路跨河大桥，圆形桥墩
水文条件：洪水期高流速，沙质河床
"""

import sys
import time
from pathlib import Path
import numpy as np

# 添加路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from core.empirical_solver import (
    ScourParameters, ScourResult, PierShape, 
    HEC18Solver, MelvilleChiewSolver, CSUSolver, SheppardMillerSolver
)


def create_test_case():
    """创建典型工程测试案例"""
    # 实际工程参数（某高速公路跨河大桥）
    test_params = ScourParameters(
        pier_diameter=2.8,              # 桥墩直径 2.8m
        pier_shape=PierShape.CIRCULAR,  # 圆形桥墩
        flow_velocity=2.2,              # 洪水流速 2.2 m/s
        water_depth=6.5,                # 水深 6.5m
        approach_angle=0.0,             # 正向来流
        d50=0.65,                       # 中值粒径 0.65mm (中粗砂)
        d84=1.2,                        # d84粒径 1.2mm
        sediment_density=2650.0,        # 沉积物密度
        water_density=1000.0,           # 水密度
        gravity=9.81,                   # 重力加速度
        pier_width=None,                # 圆形桥墩不需要
        pier_length=None,
        froude_number=None,             # 自动计算
        reynolds_number=None            # 自动计算
    )
    
    return test_params


def run_hec18_method(params: ScourParameters):
    """运行HEC-18方法"""
    print("=" * 50)
    print("🔬 HEC-18经验公式方法测试")
    print("=" * 50)
    
    solver = HEC18Solver()
    
    print("输入参数:")
    print(f"  桥墩直径 (D): {params.pier_diameter} m")
    print(f"  流速 (V): {params.flow_velocity} m/s") 
    print(f"  水深 (h): {params.water_depth} m")
    print(f"  沉积物粒径 (d50): {params.d50} mm")
    print(f"  桥墩形状: {params.pier_shape.value}")
    
    start_time = time.time()
    result = solver.solve(params)
    end_time = time.time()
    
    print(f"\n🧮 HEC-18计算结果:")
    if result.success:
        print(f"  ✅ 计算成功")
        print(f"  🌊 冲刷深度: {result.scour_depth:.3f} m")
        print(f"  📊 Froude数: {result.froude_number:.3f}")
        print(f"  📊 Reynolds数: {result.reynolds_number:.0f}")
        print(f"  ⏱️  计算时间: {(end_time - start_time)*1000:.2f} ms")
        
        # 计算相对冲刷深度
        relative_depth = result.scour_depth / params.pier_diameter
        print(f"  📏 相对冲刷深度 (ds/D): {relative_depth:.2f}")
        
        # 工程判断
        if relative_depth < 1.0:
            risk_level = "低风险"
        elif relative_depth < 2.0:
            risk_level = "中等风险" 
        elif relative_depth < 3.0:
            risk_level = "高风险"
        else:
            risk_level = "极高风险"
        
        print(f"  ⚠️  风险等级: {risk_level}")
        
        # 输出关键无量纲参数
        print(f"\n📐 关键无量纲参数:")
        print(f"  水深比 (h/D): {params.water_depth/params.pier_diameter:.2f}")
        print(f"  流速比 (V/Vc): 需要计算起动流速")
        
        if result.warnings:
            print(f"  ⚠️  警告信息:")
            for warning in result.warnings:
                print(f"    - {warning}")
    else:
        print(f"  ❌ 计算失败: {result.error_message}")
    
    return result


def run_multiple_methods(params: ScourParameters):
    """运行多种经验方法对比"""
    print("\n" + "=" * 50)
    print("📊 多种经验方法对比分析")
    print("=" * 50)
    
    # 初始化所有求解器
    solvers = {
        "HEC-18": HEC18Solver(),
        "Melville-Chiew": MelvilleChiewSolver(), 
        "CSU": CSUSolver(),
        "Sheppard-Miller": SheppardMillerSolver()
    }
    
    results = {}
    print(f"{'方法':<15} {'冲刷深度(m)':<12} {'相对深度':<10} {'Froude数':<10} {'状态':<8}")
    print("-" * 60)
    
    # 运行所有方法
    for method_name, solver in solvers.items():
        try:
            start_time = time.time()
            result = solver.solve(params)
            end_time = time.time()
            
            if result.success:
                relative_depth = result.scour_depth / params.pier_diameter
                results[method_name] = {
                    'scour_depth': result.scour_depth,
                    'relative_depth': relative_depth,
                    'froude_number': result.froude_number,
                    'computation_time': end_time - start_time,
                    'success': True
                }
                
                print(f"{method_name:<15} {result.scour_depth:<12.3f} {relative_depth:<10.2f} "
                      f"{result.froude_number:<10.3f} {'✅':<8}")
            else:
                results[method_name] = {'success': False, 'error': result.error_message}
                print(f"{method_name:<15} {'N/A':<12} {'N/A':<10} {'N/A':<10} {'❌':<8}")
                
        except Exception as e:
            results[method_name] = {'success': False, 'error': str(e)}
            print(f"{method_name:<15} {'N/A':<12} {'N/A':<10} {'N/A':<10} {'❌':<8}")
    
    # 统计分析
    successful_results = [r for r in results.values() if r.get('success')]
    if len(successful_results) > 1:
        scour_depths = [r['scour_depth'] for r in successful_results]
        
        print(f"\n📈 统计分析:")
        print(f"  成功方法数: {len(successful_results)}/{len(solvers)}")
        print(f"  平均冲刷深度: {np.mean(scour_depths):.3f} m")
        print(f"  标准差: {np.std(scour_depths):.3f} m")
        print(f"  最大值: {np.max(scour_depths):.3f} m")
        print(f"  最小值: {np.min(scour_depths):.3f} m")
        print(f"  变异系数: {np.std(scour_depths)/np.mean(scour_depths)*100:.1f}%")
        
        # 工程建议
        max_depth = np.max(scour_depths)
        mean_depth = np.mean(scour_depths)
        print(f"\n🏗️  工程建议:")
        print(f"  保守设计值: {max_depth:.3f} m (采用最大预测值)")
        print(f"  平均设计值: {mean_depth:.3f} m (采用平均预测值)")
        print(f"  建议安全系数: 1.2-1.5")
        print(f"  最终设计深度: {max_depth * 1.3:.3f} m (含安全系数1.3)")
    
    return results


def sensitivity_analysis(base_params: ScourParameters):
    """参数敏感性分析"""
    print("\n" + "=" * 50) 
    print("🎛️  参数敏感性分析")
    print("=" * 50)
    
    solver = HEC18Solver()  # 使用HEC-18作为基准
    
    # 基准计算
    base_result = solver.solve(base_params)
    if not base_result.success:
        print("❌ 基准计算失败，无法进行敏感性分析")
        return
    
    base_depth = base_result.scour_depth
    print(f"基准冲刷深度: {base_depth:.3f} m")
    
    # 敏感性参数
    sensitivity_params = {
        'pier_diameter': [2.0, 2.4, 2.8, 3.2, 3.6],  # ±30%
        'flow_velocity': [1.7, 2.0, 2.2, 2.4, 2.7],  # ±23%
        'water_depth': [5.0, 5.8, 6.5, 7.3, 8.0],    # ±23%
        'd50': [0.4, 0.5, 0.65, 0.8, 1.0]             # ±54%
    }
    
    print(f"\n{'参数':<15} {'变化范围':<20} {'敏感性系数':<12} {'影响程度':<10}")
    print("-" * 60)
    
    for param_name, values in sensitivity_params.items():
        results = []
        
        for value in values:
            # 创建修改参数的副本
            test_params = ScourParameters(
                pier_diameter=value if param_name == 'pier_diameter' else base_params.pier_diameter,
                pier_shape=base_params.pier_shape,
                flow_velocity=value if param_name == 'flow_velocity' else base_params.flow_velocity,
                water_depth=value if param_name == 'water_depth' else base_params.water_depth,
                d50=value if param_name == 'd50' else base_params.d50
            )
            
            result = solver.solve(test_params)
            if result.success:
                results.append(result.scour_depth)
            else:
                results.append(np.nan)
        
        # 计算敏感性系数 (相对变化率)
        if len(results) >= 3:
            # 使用中心差分计算敏感性
            base_idx = len(values) // 2  # 中间值索引
            base_val = values[base_idx]
            base_depth_local = results[base_idx]
            
            if not np.isnan(base_depth_local):
                # 计算平均敏感性
                sensitivities = []
                for i, (val, depth) in enumerate(zip(values, results)):
                    if not np.isnan(depth) and val != base_val:
                        rel_param_change = (val - base_val) / base_val
                        rel_depth_change = (depth - base_depth_local) / base_depth_local
                        if abs(rel_param_change) > 1e-6:
                            sensitivity = rel_depth_change / rel_param_change
                            sensitivities.append(sensitivity)
                
                if sensitivities:
                    avg_sensitivity = np.mean(sensitivities)
                    
                    # 影响程度分类
                    if abs(avg_sensitivity) > 1.0:
                        impact = "非常高"
                    elif abs(avg_sensitivity) > 0.5:
                        impact = "高"
                    elif abs(avg_sensitivity) > 0.2:
                        impact = "中等"
                    else:
                        impact = "低"
                    
                    param_range = f"[{min(values):.2f}, {max(values):.2f}]"
                    print(f"{param_name:<15} {param_range:<20} {avg_sensitivity:<12.3f} {impact:<10}")
                else:
                    print(f"{param_name:<15} {'计算失败':<20} {'N/A':<12} {'N/A':<10}")
    
    print(f"\n📝 敏感性分析结论:")
    print(f"  1. 敏感性系数 > 1.0: 参数变化1%，冲刷深度变化>1%")
    print(f"  2. 桥墩直径和流速通常是最敏感的参数")
    print(f"  3. 设计时应重点控制高敏感性参数的精度")


def main():
    """主测试程序"""
    print("🌊 桥墩冲刷经验方法测试案例")
    print("=" * 60)
    print("工程背景: 某高速公路跨河大桥圆形桩基冲刷分析")
    print("=" * 60)
    
    # 创建测试案例
    test_params = create_test_case()
    
    # 1. HEC-18方法详细测试
    hec18_result = run_hec18_method(test_params)
    
    # 2. 多方法对比
    comparison_results = run_multiple_methods(test_params)
    
    # 3. 敏感性分析
    sensitivity_analysis(test_params)
    
    # 总结报告
    print("\n" + "=" * 60)
    print("📋 测试总结报告")
    print("=" * 60)
    
    if hec18_result.success:
        print(f"✅ 主要计算结果:")
        print(f"  HEC-18冲刷深度: {hec18_result.scour_depth:.3f} m")
        print(f"  相对冲刷深度: {hec18_result.scour_depth/test_params.pier_diameter:.2f}")
        print(f"  Froude数: {hec18_result.froude_number:.3f}")
        
        successful_methods = sum(1 for r in comparison_results.values() if r.get('success'))
        print(f"\n📊 对比分析:")
        print(f"  成功方法: {successful_methods}/{len(comparison_results)}")
        
        if successful_methods > 1:
            depths = [r['scour_depth'] for r in comparison_results.values() if r.get('success')]
            print(f"  结果范围: [{min(depths):.3f}, {max(depths):.3f}] m")
            print(f"  平均值: {np.mean(depths):.3f} m")
        
        print(f"\n🏗️  工程建议:")
        design_depth = hec18_result.scour_depth * 1.3  # 安全系数1.3
        print(f"  设计冲刷深度: {design_depth:.3f} m")
        print(f"  桩基埋深建议: ≥ {design_depth + 2.0:.1f} m")
        print(f"  防护措施: 建议设置抛石护底")
    
    print(f"\n✨ 测试完成！经验方法计算准确快速，适合工程初步设计。")
    
    return hec18_result, comparison_results


if __name__ == "__main__":
    try:
        main()
        print(f"\n🎉 经验方法测试案例执行成功！")
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()