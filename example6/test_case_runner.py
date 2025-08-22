#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
桥墩冲刷分析测试算例运行器
Bridge Pier Scour Analysis Test Case Runner

创建和运行真实的工程测试算例
"""

import sys
import time
from pathlib import Path
from typing import Dict, Any, List

# 添加路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from core.empirical_solver import (
    EmpiricalScourSolver, ScourParameters, PierShape
)
from core.fenics_solver import (
    FEniCSScourSolver, NumericalParameters, TurbulenceModel
)
from core.advanced_solver import AdvancedSolverManager


def create_test_cases() -> List[Dict[str, Any]]:
    """创建标准测试算例"""
    
    test_cases = [
        {
            "name": "小型圆形桥墩 - 低流速",
            "description": "典型的城市河流中的小型圆形桥墩",
            "parameters": ScourParameters(
                pier_diameter=1.2,           # 1.2米直径
                pier_shape=PierShape.CIRCULAR,
                flow_velocity=0.8,           # 0.8 m/s 低流速
                water_depth=3.0,             # 3米水深
                approach_angle=0.0,          # 正向来流
                d50=0.5,                     # 0.5mm 中等粗砂
                sediment_density=2650.0,
                water_density=1000.0,
                gravity=9.81
            ),
            "expected_scour": {
                "hec18": 1.8,  # 预期HEC-18结果约1.8m
                "range": (1.2, 2.5)  # 合理范围
            }
        },
        
        {
            "name": "大型圆形桥墩 - 高流速",
            "description": "主要河流中的大型圆形桥墩，高流速工况",
            "parameters": ScourParameters(
                pier_diameter=3.0,           # 3米直径大桥墩
                pier_shape=PierShape.CIRCULAR,
                flow_velocity=2.5,           # 2.5 m/s 高流速
                water_depth=8.0,             # 8米深水
                approach_angle=0.0,
                d50=0.3,                     # 0.3mm 细砂
                sediment_density=2650.0,
                water_density=1000.0,
                gravity=9.81
            ),
            "expected_scour": {
                "hec18": 6.5,  # 预期约6.5m深冲刷
                "range": (5.0, 9.0)
            }
        },
        
        {
            "name": "矩形桥墩 - 斜向来流",
            "description": "矩形截面桥墩，15度斜向来流",
            "parameters": ScourParameters(
                pier_diameter=2.0,           # 等效直径2m
                pier_shape=PierShape.RECTANGULAR,
                flow_velocity=1.8,           # 1.8 m/s 中等流速
                water_depth=5.5,             # 5.5米水深
                approach_angle=15.0,         # 15度斜向来流
                d50=0.8,                     # 0.8mm 粗砂
                sediment_density=2650.0,
                water_density=1000.0,
                gravity=9.81
            ),
            "expected_scour": {
                "hec18": 3.2,  # 预期约3.2m
                "range": (2.5, 4.5)
            }
        },
        
        {
            "name": "复杂形状桥墩 - 极端工况",
            "description": "复杂形状桥墩，极端流速和水深条件",
            "parameters": ScourParameters(
                pier_diameter=2.5,
                pier_shape=PierShape.COMPLEX,
                flow_velocity=3.2,           # 极高流速
                water_depth=12.0,            # 深水
                approach_angle=30.0,         # 30度大角度来流
                d50=0.2,                     # 极细砂
                sediment_density=2650.0,
                water_density=1000.0,
                gravity=9.81
            ),
            "expected_scour": {
                "hec18": 8.5,  # 预期大冲刷深度
                "range": (7.0, 12.0)
            }
        }
    ]
    
    return test_cases


def run_empirical_test(test_case: Dict[str, Any]) -> Dict[str, Any]:
    """运行经验公式测试"""
    print(f"\n🔬 运行经验公式测试: {test_case['name']}")
    print(f"   描述: {test_case['description']}")
    
    solver = EmpiricalScourSolver()
    params = test_case['parameters']
    
    print(f"   参数: D={params.pier_diameter}m, V={params.flow_velocity}m/s, H={params.water_depth}m, d50={params.d50}mm")
    
    start_time = time.time()
    
    # 计算各种经验公式
    results = {}
    
    try:
        hec18_result = solver.solve_hec18(params)
        results['HEC-18'] = {
            'scour_depth': hec18_result.scour_depth,
            'success': hec18_result.success,
            'computation_time': hec18_result.computation_time,
            'froude_number': hec18_result.froude_number,
            'reynolds_number': hec18_result.reynolds_number
        }
        print(f"   ✓ HEC-18: {hec18_result.scour_depth:.3f}m")
    except Exception as e:
        results['HEC-18'] = {'error': str(e), 'success': False}
        print(f"   ✗ HEC-18: 失败 - {e}")
    
    try:
        melville_result = solver.solve_melville_chiew(params)
        results['Melville-Chiew'] = {
            'scour_depth': melville_result.scour_depth,
            'success': melville_result.success,
            'computation_time': melville_result.computation_time,
            'froude_number': melville_result.froude_number,
            'reynolds_number': melville_result.reynolds_number
        }
        print(f"   ✓ Melville-Chiew: {melville_result.scour_depth:.3f}m")
    except Exception as e:
        results['Melville-Chiew'] = {'error': str(e), 'success': False}
        print(f"   ✗ Melville-Chiew: 失败 - {e}")
    
    try:
        csu_result = solver.solve_csu(params)
        results['CSU'] = {
            'scour_depth': csu_result.scour_depth,
            'success': csu_result.success,
            'computation_time': csu_result.computation_time,
            'froude_number': csu_result.froude_number,
            'reynolds_number': csu_result.reynolds_number
        }
        print(f"   ✓ CSU: {csu_result.scour_depth:.3f}m")
    except Exception as e:
        results['CSU'] = {'error': str(e), 'success': False}
        print(f"   ✗ CSU: 失败 - {e}")
    
    try:
        sheppard_result = solver.solve_sheppard_miller(params)
        results['Sheppard-Miller'] = {
            'scour_depth': sheppard_result.scour_depth,
            'success': sheppard_result.success,
            'computation_time': sheppard_result.computation_time,
            'froude_number': sheppard_result.froude_number,
            'reynolds_number': sheppard_result.reynolds_number
        }
        print(f"   ✓ Sheppard-Miller: {sheppard_result.scour_depth:.3f}m")
    except Exception as e:
        results['Sheppard-Miller'] = {'error': str(e), 'success': False}
        print(f"   ✗ Sheppard-Miller: 失败 - {e}")
    
    total_time = time.time() - start_time
    
    # 分析结果
    valid_results = [r['scour_depth'] for r in results.values() 
                    if r.get('success') and 'scour_depth' in r]
    
    if valid_results:
        mean_scour = sum(valid_results) / len(valid_results)
        max_scour = max(valid_results)
        min_scour = min(valid_results)
        
        print(f"   📊 统计: 平均={mean_scour:.3f}m, 范围=[{min_scour:.3f}, {max_scour:.3f}]m")
        
        # 与预期对比
        expected = test_case.get('expected_scour', {})
        if 'hec18' in expected:
            if 'HEC-18' in results and results['HEC-18'].get('success'):
                actual = results['HEC-18']['scour_depth']
                error = abs(actual - expected['hec18']) / expected['hec18'] * 100
                print(f"   🎯 HEC-18预期: {expected['hec18']}m, 实际: {actual:.3f}m, 误差: {error:.1f}%")
        
        print(f"   ⏱️  计算时间: {total_time:.3f}秒")
    else:
        print("   ❌ 所有方法都失败了")
    
    return {
        'test_case': test_case['name'],
        'results': results,
        'statistics': {
            'mean_scour': mean_scour if valid_results else 0,
            'max_scour': max_scour if valid_results else 0,
            'min_scour': min_scour if valid_results else 0,
            'valid_methods': len(valid_results),
            'total_methods': len(results)
        },
        'computation_time': total_time
    }


def run_fenics_test(test_case: Dict[str, Any]) -> Dict[str, Any]:
    """运行FEniCS CFD测试"""
    print(f"\n🌊 运行FEniCS CFD测试: {test_case['name']}")
    
    solver = FEniCSScourSolver()
    params = test_case['parameters']
    
    # 数值参数（简化用于测试）
    numerical_params = NumericalParameters(
        mesh_resolution=0.2,    # 较粗网格以加快计算
        time_step=0.2,
        total_time=50.0,        # 短时间模拟
        turbulence_model=TurbulenceModel.K_EPSILON,
        max_iterations=20,      # 减少迭代次数
        convergence_tolerance=1e-4
    )
    
    print(f"   网格分辨率: {numerical_params.mesh_resolution}m")
    print(f"   湍流模型: {numerical_params.turbulence_model.value}")
    
    start_time = time.time()
    
    try:
        result = solver.solve(params, numerical_params)
        
        computation_time = time.time() - start_time
        
        print(f"   ✓ CFD计算完成")
        print(f"   📊 冲刷深度: {result.scour_depth:.3f}m")
        print(f"   📊 冲刷宽度: {result.scour_width:.3f}m")
        print(f"   📊 最大流速: {result.max_velocity:.3f}m/s")
        print(f"   📊 最大剪应力: {result.max_shear_stress:.1f}Pa")
        print(f"   📊 Reynolds数: {result.reynolds_number:.0f}")
        print(f"   📊 Froude数: {result.froude_number:.3f}")
        print(f"   ⏱️  计算时间: {computation_time:.2f}秒")
        
        if result.warnings:
            print(f"   ⚠️  警告: {'; '.join(result.warnings)}")
        
        return {
            'test_case': test_case['name'],
            'success': True,
            'scour_depth': result.scour_depth,
            'scour_width': result.scour_width,
            'scour_volume': result.scour_volume,
            'max_velocity': result.max_velocity,
            'max_shear_stress': result.max_shear_stress,
            'reynolds_number': result.reynolds_number,
            'froude_number': result.froude_number,
            'equilibrium_time': result.equilibrium_time,
            'convergence_achieved': result.convergence_achieved,
            'computation_time': computation_time,
            'warnings': result.warnings,
            'method': result.method
        }
        
    except Exception as e:
        computation_time = time.time() - start_time
        print(f"   ❌ FEniCS计算失败: {e}")
        print(f"   ⏱️  失败时间: {computation_time:.2f}秒")
        
        return {
            'test_case': test_case['name'],
            'success': False,
            'error': str(e),
            'computation_time': computation_time
        }


def compare_results(empirical_result: Dict, fenics_result: Dict) -> Dict[str, Any]:
    """对比经验公式和CFD结果"""
    print(f"\n📊 结果对比分析: {empirical_result['test_case']}")
    
    comparison = {
        'test_case': empirical_result['test_case'],
        'methods_comparison': {},
        'agreement_analysis': {},
        'recommendations': {}
    }
    
    # 获取经验公式推荐值
    emp_stats = empirical_result.get('statistics', {})
    emp_mean = emp_stats.get('mean_scour', 0)
    emp_max = emp_stats.get('max_scour', 0)
    
    # CFD结果
    cfd_scour = fenics_result.get('scour_depth', 0) if fenics_result.get('success') else 0
    
    comparison['methods_comparison'] = {
        'empirical_mean': emp_mean,
        'empirical_max': emp_max,
        'cfd_result': cfd_scour,
        'empirical_methods_count': emp_stats.get('valid_methods', 0),
        'cfd_success': fenics_result.get('success', False)
    }
    
    if emp_mean > 0 and cfd_scour > 0:
        ratio = cfd_scour / emp_mean
        difference = abs(cfd_scour - emp_mean)
        relative_diff = difference / max(emp_mean, cfd_scour) * 100
        
        comparison['agreement_analysis'] = {
            'ratio_cfd_to_empirical': ratio,
            'absolute_difference': difference,
            'relative_difference_percent': relative_diff,
            'agreement_level': (
                'excellent' if relative_diff < 15 else
                'good' if relative_diff < 30 else
                'fair' if relative_diff < 50 else
                'poor'
            )
        }
        
        print(f"   经验公式平均: {emp_mean:.3f}m")
        print(f"   CFD数值结果: {cfd_scour:.3f}m")
        print(f"   相对差异: {relative_diff:.1f}%")
        print(f"   一致性评级: {comparison['agreement_analysis']['agreement_level']}")
        
        # 推荐
        if relative_diff < 20:
            recommendation = "结果一致性良好，可优先使用经验公式进行快速估算"
        elif ratio > 1.5:
            recommendation = "CFD结果显著高于经验公式，建议采用CFD结果并检查边界条件"
        elif ratio < 0.7:
            recommendation = "经验公式结果显著高于CFD，建议进一步验证网格和数值参数"
        else:
            recommendation = "两种方法有一定差异，建议结合使用并考虑工程安全系数"
        
        comparison['recommendations']['primary_recommendation'] = recommendation
        print(f"   💡 建议: {recommendation}")
    
    else:
        print(f"   ⚠️  无法对比：经验公式={emp_mean:.3f}m, CFD={'成功' if fenics_result.get('success') else '失败'}")
    
    return comparison


def generate_test_report(all_results: List[Dict[str, Any]]) -> str:
    """生成测试报告"""
    report = []
    report.append("=" * 80)
    report.append("桥墩冲刷分析系统 - 测试算例报告")
    report.append("Bridge Pier Scour Analysis System - Test Cases Report")
    report.append("=" * 80)
    report.append(f"测试时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    report.append(f"测试算例数量: {len(all_results)}")
    report.append("")
    
    for i, result in enumerate(all_results, 1):
        report.append(f"{i}. {result['test_case']}")
        report.append("-" * 60)
        
        # 经验公式结果
        if 'empirical' in result:
            emp = result['empirical']
            report.append("经验公式结果:")
            for method, data in emp['results'].items():
                if data.get('success'):
                    report.append(f"  - {method}: {data['scour_depth']:.3f}m")
                else:
                    report.append(f"  - {method}: 失败")
            
            stats = emp['statistics']
            if stats['valid_methods'] > 0:
                report.append(f"  平均冲刷深度: {stats['mean_scour']:.3f}m")
                report.append(f"  有效方法数: {stats['valid_methods']}/{stats['total_methods']}")
        
        # CFD结果
        if 'fenics' in result:
            cfd = result['fenics']
            if cfd.get('success'):
                report.append("FEniCS CFD结果:")
                report.append(f"  - 冲刷深度: {cfd['scour_depth']:.3f}m")
                report.append(f"  - 冲刷宽度: {cfd['scour_width']:.3f}m")
                report.append(f"  - 最大流速: {cfd['max_velocity']:.3f}m/s")
                report.append(f"  - Reynolds数: {cfd['reynolds_number']:.0f}")
                report.append(f"  - 计算时间: {cfd['computation_time']:.2f}s")
            else:
                report.append("FEniCS CFD结果: 计算失败")
        
        # 对比分析
        if 'comparison' in result:
            comp = result['comparison']
            if 'agreement_analysis' in comp:
                agree = comp['agreement_analysis']
                report.append("方法对比:")
                report.append(f"  - 相对差异: {agree['relative_difference_percent']:.1f}%")
                report.append(f"  - 一致性: {agree['agreement_level']}")
        
        report.append("")
    
    return "\n".join(report)


def main():
    """主测试程序"""
    print("启动桥墩冲刷分析系统测试")
    print("=" * 80)
    
    # 创建测试算例
    test_cases = create_test_cases()
    print(f"创建了 {len(test_cases)} 个测试算例")
    
    all_results = []
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n🧪 执行测试算例 {i}/{len(test_cases)}")
        print("=" * 80)
        
        result_entry = {
            'test_case': test_case['name'],
            'parameters': test_case['parameters']
        }
        
        # 运行经验公式测试
        empirical_result = run_empirical_test(test_case)
        result_entry['empirical'] = empirical_result
        
        # 运行FEniCS CFD测试（可能较慢）
        print("\n⏳ 准备运行CFD测试（可能需要几分钟）...")
        fenics_result = run_fenics_test(test_case)
        result_entry['fenics'] = fenics_result
        
        # 对比分析
        comparison = compare_results(empirical_result, fenics_result)
        result_entry['comparison'] = comparison
        
        all_results.append(result_entry)
        
        print(f"\n✅ 测试算例 {i} 完成")
    
    # 生成测试报告
    print("\n📄 生成测试报告...")
    report = generate_test_report(all_results)
    
    # 保存报告
    report_file = current_dir / "test_results_report.txt"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"📄 测试报告已保存: {report_file}")
    print("\n" + "=" * 80)
    print("🎉 所有测试算例执行完成！")
    print("=" * 80)
    
    # 打印摘要
    successful_empirical = sum(1 for r in all_results if r['empirical']['statistics']['valid_methods'] > 0)
    successful_fenics = sum(1 for r in all_results if r['fenics'].get('success', False))
    
    print(f"📊 测试摘要:")
    print(f"  - 经验公式成功: {successful_empirical}/{len(test_cases)}")
    print(f"  - FEniCS CFD成功: {successful_fenics}/{len(test_cases)}")
    print(f"  - 详细报告: {report_file}")
    
    return all_results


if __name__ == "__main__":
    try:
        results = main()
    except KeyboardInterrupt:
        print("\n⏹️  测试被用户中断")
    except Exception as e:
        print(f"\n❌ 测试执行失败: {e}")
        import traceback
        traceback.print_exc()