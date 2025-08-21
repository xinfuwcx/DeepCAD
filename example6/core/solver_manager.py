#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
求解器管理模块 - Solver Manager
统一管理经验公式和FEniCS数值求解器，提供统一接口

主要功能：
- 求解器注册和管理
- 自动求解器选择
- 结果比较和验证
- 计算性能监控
"""

import time
import math
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, field
from enum import Enum
import warnings

# 导入求解器
from .empirical_solver import (
    EmpiricalScourSolver, ScourParameters, ScourResult, PierShape
)
from .fenics_solver import (
    FEniCSScourSolver, NumericalParameters, NumericalResult, TurbulenceModel
)


class SolverType(Enum):
    """求解器类型枚举"""
    EMPIRICAL = "empirical"
    NUMERICAL = "numerical"
    HYBRID = "hybrid"
    AUTO = "auto"


class ComputationMode(Enum):
    """计算模式枚举"""
    FAST = "fast"          # 快速模式：仅经验公式
    BALANCED = "balanced"   # 平衡模式：经验+简化数值
    ACCURATE = "accurate"   # 精确模式：完整数值计算
    VALIDATION = "validation"  # 验证模式：所有方法对比


@dataclass
class SolverConfiguration:
    """求解器配置"""
    # 求解器选择
    solver_type: SolverType = SolverType.AUTO
    computation_mode: ComputationMode = ComputationMode.BALANCED
    
    # 经验公式配置
    empirical_methods: List[str] = field(default_factory=lambda: ["HEC-18", "Melville-Coleman"])
    use_consensus: bool = True
    
    # 数值求解配置
    numerical_enabled: bool = True
    fallback_to_empirical: bool = True
    
    # 性能配置
    max_computation_time: float = 300.0  # 最大计算时间（秒）
    parallel_execution: bool = False
    
    # 验证配置
    result_validation: bool = True
    tolerance_check: bool = True
    outlier_detection: bool = True


@dataclass
class ComparisonResult:
    """结果比较"""
    empirical_result: Optional[ScourResult] = None
    numerical_result: Optional[NumericalResult] = None
    
    # 比较指标
    scour_depth_difference: float = 0.0
    relative_error: float = 0.0
    agreement_level: str = "unknown"
    
    # 推荐结果
    recommended_result: Optional[Union[ScourResult, NumericalResult]] = None
    recommendation_reason: str = ""
    
    # 统计信息
    computation_times: Dict[str, float] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)


class SolverManager:
    """求解器管理器"""
    
    def __init__(self, config: Optional[SolverConfiguration] = None):
        self.config = config or SolverConfiguration()
        
        # 初始化求解器
        self.empirical_solver = EmpiricalScourSolver()
        self.numerical_solver = FEniCSScourSolver()
        
        # 求解器状态
        self.solver_status = {
            'empirical': True,
            'numerical': self.numerical_solver.fenics_available
        }
        
        # 计算历史
        self.computation_history = []
        
    def get_available_solvers(self) -> Dict[str, bool]:
        """获取可用求解器状态"""
        return {
            'empirical_solver': self.solver_status['empirical'],
            'numerical_solver': self.solver_status['numerical'],
            'fenics_available': self.numerical_solver.fenics_available,
            'supported_methods': self.empirical_solver.supported_methods
        }
    
    def auto_select_solver(self, scour_params: ScourParameters) -> SolverType:
        """自动选择求解器"""
        # 基于参数特征自动选择最适合的求解器
        
        # 检查雷诺数范围
        kinematic_viscosity = 1e-6  # 简化
        reynolds = (scour_params.flow_velocity * scour_params.pier_diameter / 
                   kinematic_viscosity)
        
        # 检查弗劳德数
        froude = (scour_params.flow_velocity / 
                 math.sqrt(scour_params.gravity * scour_params.water_depth))
        
        # 决策逻辑
        if not self.solver_status['numerical']:
            return SolverType.EMPIRICAL
        
        # 复杂流动条件偏向数值求解
        if (froude > 0.8 or reynolds > 100000 or 
            abs(scour_params.approach_angle) > 15 or
            scour_params.pier_shape != PierShape.CIRCULAR):
            return SolverType.NUMERICAL
        
        # 标准条件下优先经验公式（快速）
        if (0.2 < froude < 0.6 and 10000 < reynolds < 50000 and 
            scour_params.pier_shape == PierShape.CIRCULAR):
            return SolverType.EMPIRICAL
        
        # 其他情况使用混合模式
        return SolverType.HYBRID
    
    def validate_parameters(self, scour_params: ScourParameters) -> List[str]:
        """参数验证"""
        warnings = []
        
        # 几何参数检查
        if scour_params.pier_diameter <= 0:
            warnings.append("桥墩直径必须大于0")
        
        if scour_params.water_depth <= scour_params.pier_diameter:
            warnings.append("水深过浅，可能影响计算精度")
        
        # 流体参数检查
        if scour_params.flow_velocity <= 0:
            warnings.append("流速必须大于0")
        
        if scour_params.flow_velocity > 3.0:
            warnings.append("流速过高，超出经验公式适用范围")
        
        # 沉积物参数检查
        if scour_params.d50 <= 0:
            warnings.append("沉积物粒径必须大于0")
        
        if scour_params.d50 > 10.0:
            warnings.append("沉积物过粗，可能不易冲刷")
        
        # 无量纲参数检查
        kinematic_viscosity = 1e-6
        reynolds = (scour_params.flow_velocity * scour_params.pier_diameter / 
                   kinematic_viscosity)
        froude = (scour_params.flow_velocity / 
                 math.sqrt(scour_params.gravity * scour_params.water_depth))
        
        if reynolds < 1000:
            warnings.append("雷诺数过低，可能为层流条件")
        elif reynolds > 1000000:
            warnings.append("雷诺数过高，湍流模型可能不适用")
        
        if froude > 1.0:
            warnings.append("超临界流条件，经验公式精度下降")
        
        return warnings
    
    def solve_empirical(self, scour_params: ScourParameters) -> Dict[str, Any]:
        """经验公式求解"""
        start_time = time.time()
        
        try:
            if self.config.use_consensus:
                # 使用综合共识结果
                result = self.empirical_solver.get_consensus_result(scour_params)
                results = {"consensus": result}
            else:
                # 使用指定方法
                methods = self.config.empirical_methods
                results = {}
                for method in methods:
                    method_results = self.empirical_solver.solve(scour_params, method)
                    results.update(method_results)
            
            computation_time = time.time() - start_time
            
            return {
                'success': True,
                'results': results,
                'computation_time': computation_time,
                'solver_type': 'empirical'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'computation_time': time.time() - start_time,
                'solver_type': 'empirical'
            }
    
    def solve_numerical(self, scour_params: ScourParameters,
                       numerical_params: Optional[NumericalParameters] = None) -> Dict[str, Any]:
        """数值求解"""
        start_time = time.time()
        
        if not self.solver_status['numerical']:
            return {
                'success': False,
                'error': 'FEniCS求解器不可用',
                'computation_time': 0.0,
                'solver_type': 'numerical'
            }
        
        try:
            # 默认数值参数
            if numerical_params is None:
                if self.config.computation_mode == ComputationMode.FAST:
                    numerical_params = NumericalParameters(
                        mesh_resolution=0.2, time_step=0.2, max_iterations=20
                    )
                elif self.config.computation_mode == ComputationMode.ACCURATE:
                    numerical_params = NumericalParameters(
                        mesh_resolution=0.05, time_step=0.05, max_iterations=100
                    )
                else:  # BALANCED
                    numerical_params = NumericalParameters(
                        mesh_resolution=0.1, time_step=0.1, max_iterations=50
                    )
            
            result = self.numerical_solver.solve(scour_params, numerical_params)
            computation_time = time.time() - start_time
            
            return {
                'success': True,
                'result': result,
                'computation_time': computation_time,
                'solver_type': 'numerical'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'computation_time': time.time() - start_time,
                'solver_type': 'numerical'
            }
    
    def solve_hybrid(self, scour_params: ScourParameters,
                    numerical_params: Optional[NumericalParameters] = None) -> ComparisonResult:
        """混合求解（经验+数值）"""
        # 并行或顺序执行
        empirical_result = None
        numerical_result = None
        computation_times = {}
        warnings = []
        
        # 经验公式计算
        emp_solve_result = self.solve_empirical(scour_params)
        if emp_solve_result['success']:
            if 'consensus' in emp_solve_result['results']:
                empirical_result = emp_solve_result['results']['consensus']
            else:
                # 取第一个结果
                empirical_result = list(emp_solve_result['results'].values())[0]
            computation_times['empirical'] = emp_solve_result['computation_time']
        else:
            warnings.append(f"经验公式计算失败: {emp_solve_result.get('error', '')}")
        
        # 数值计算
        num_solve_result = self.solve_numerical(scour_params, numerical_params)
        if num_solve_result['success']:
            numerical_result = num_solve_result['result']
            computation_times['numerical'] = num_solve_result['computation_time']
        else:
            warnings.append(f"数值计算失败: {num_solve_result.get('error', '')}")
            
            # 如果数值计算失败且启用了fallback，确保有经验结果
            if self.config.fallback_to_empirical and empirical_result is None:
                emp_solve_result = self.solve_empirical(scour_params)
                if emp_solve_result['success']:
                    results = emp_solve_result['results']
                    empirical_result = (results['consensus'] if 'consensus' in results 
                                      else list(results.values())[0])
        
        # 结果比较
        return self.compare_results(empirical_result, numerical_result, 
                                  computation_times, warnings)
    
    def compare_results(self, empirical_result: Optional[ScourResult],
                       numerical_result: Optional[NumericalResult],
                       computation_times: Dict[str, float],
                       warnings: List[str]) -> ComparisonResult:
        """比较结果"""
        comparison = ComparisonResult(
            empirical_result=empirical_result,
            numerical_result=numerical_result,
            computation_times=computation_times,
            warnings=warnings
        )
        
        if empirical_result is None and numerical_result is None:
            comparison.agreement_level = "no_results"
            comparison.recommendation_reason = "所有求解方法均失败"
            return comparison
        
        if empirical_result is None:
            comparison.recommended_result = numerical_result
            comparison.recommendation_reason = "仅数值结果可用"
            comparison.agreement_level = "numerical_only"
            return comparison
        
        if numerical_result is None:
            comparison.recommended_result = empirical_result
            comparison.recommendation_reason = "仅经验公式结果可用"
            comparison.agreement_level = "empirical_only"
            return comparison
        
        # 两种结果都可用，进行比较
        emp_depth = empirical_result.scour_depth
        num_depth = numerical_result.scour_depth
        
        if emp_depth == 0 and num_depth == 0:
            comparison.scour_depth_difference = 0
            comparison.relative_error = 0
            comparison.agreement_level = "excellent"
            comparison.recommended_result = empirical_result  # 更快
            comparison.recommendation_reason = "两种方法均预测无冲刷，采用经验公式结果"
            return comparison
        
        # 计算差异
        if max(emp_depth, num_depth) > 0:
            comparison.scour_depth_difference = abs(emp_depth - num_depth)
            comparison.relative_error = comparison.scour_depth_difference / max(emp_depth, num_depth)
        else:
            comparison.relative_error = 0
        
        # 评估一致性
        if comparison.relative_error < 0.15:
            comparison.agreement_level = "excellent"
            # 选择可信度更高的结果
            if empirical_result.confidence > 0.8:
                comparison.recommended_result = empirical_result
                comparison.recommendation_reason = "经验公式结果可靠且计算快速"
            else:
                comparison.recommended_result = numerical_result
                comparison.recommendation_reason = "数值计算结果更可靠"
        elif comparison.relative_error < 0.30:
            comparison.agreement_level = "good"
            # 选择数值结果（通常更准确）
            comparison.recommended_result = numerical_result
            comparison.recommendation_reason = "数值计算考虑了更多物理细节"
        elif comparison.relative_error < 0.50:
            comparison.agreement_level = "moderate"
            # 保守选择较大值
            if num_depth > emp_depth:
                comparison.recommended_result = numerical_result
                comparison.recommendation_reason = "采用保守的数值计算结果"
            else:
                comparison.recommended_result = empirical_result
                comparison.recommendation_reason = "采用保守的经验公式结果"
        else:
            comparison.agreement_level = "poor"
            # 结果差异很大，需要人工判断
            comparison.recommended_result = numerical_result  # 默认数值结果
            comparison.recommendation_reason = "结果差异较大，建议检查输入参数和边界条件"
            comparison.warnings.append("经验公式和数值计算结果差异超过50%")
        
        return comparison
    
    def solve(self, scour_params: ScourParameters,
             numerical_params: Optional[NumericalParameters] = None,
             solver_type: Optional[SolverType] = None) -> Union[ScourResult, NumericalResult, ComparisonResult]:
        """主求解接口"""
        # 参数验证
        param_warnings = self.validate_parameters(scour_params)
        if param_warnings:
            warnings.warn("参数验证警告: " + "; ".join(param_warnings))
        
        # 确定求解器类型
        if solver_type is None:
            solver_type = self.config.solver_type
        
        if solver_type == SolverType.AUTO:
            solver_type = self.auto_select_solver(scour_params)
        
        # 执行计算
        start_time = time.time()
        
        try:
            if solver_type == SolverType.EMPIRICAL:
                result = self.solve_empirical(scour_params)
                if result['success']:
                    if 'consensus' in result['results']:
                        return result['results']['consensus']
                    else:
                        return list(result['results'].values())[0]
                else:
                    raise RuntimeError(f"经验公式计算失败: {result.get('error', '')}")
            
            elif solver_type == SolverType.NUMERICAL:
                result = self.solve_numerical(scour_params, numerical_params)
                if result['success']:
                    return result['result']
                else:
                    if self.config.fallback_to_empirical:
                        warnings.warn("数值计算失败，回退到经验公式")
                        return self.solve(scour_params, solver_type=SolverType.EMPIRICAL)
                    else:
                        raise RuntimeError(f"数值计算失败: {result.get('error', '')}")
            
            elif solver_type in [SolverType.HYBRID, SolverType.AUTO]:
                return self.solve_hybrid(scour_params, numerical_params)
            
            else:
                raise ValueError(f"未知的求解器类型: {solver_type}")
        
        finally:
            # 记录计算历史
            total_time = time.time() - start_time
            self.computation_history.append({
                'timestamp': time.time(),
                'solver_type': solver_type,
                'computation_time': total_time,
                'parameters': scour_params
            })
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """获取性能统计"""
        if not self.computation_history:
            return {'message': '无计算历史记录'}
        
        empirical_times = [h['computation_time'] for h in self.computation_history 
                          if h['solver_type'] == SolverType.EMPIRICAL]
        numerical_times = [h['computation_time'] for h in self.computation_history 
                          if h['solver_type'] == SolverType.NUMERICAL]
        
        stats = {
            'total_computations': len(self.computation_history),
            'empirical_computations': len(empirical_times),
            'numerical_computations': len(numerical_times),
        }
        
        if empirical_times:
            stats['empirical_avg_time'] = sum(empirical_times) / len(empirical_times)
            stats['empirical_max_time'] = max(empirical_times)
        
        if numerical_times:
            stats['numerical_avg_time'] = sum(numerical_times) / len(numerical_times)
            stats['numerical_max_time'] = max(numerical_times)
        
        return stats
    
    def export_comparison_report(self, comparison: ComparisonResult, 
                               filename: str) -> bool:
        """导出比较报告"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write("# 桥墩冲刷计算结果比较报告\n\n")
                
                # 基本信息
                f.write("## 计算概要\n")
                f.write(f"- 推荐结果: {comparison.recommendation_reason}\n")
                f.write(f"- 一致性评级: {comparison.agreement_level}\n")
                f.write(f"- 相对误差: {comparison.relative_error:.2%}\n\n")
                
                # 经验公式结果
                if comparison.empirical_result:
                    emp = comparison.empirical_result
                    f.write("## 经验公式结果\n")
                    f.write(f"- 方法: {emp.method}\n")
                    f.write(f"- 冲刷深度: {emp.scour_depth:.3f} m\n")
                    f.write(f"- 冲刷宽度: {emp.scour_width:.3f} m\n")
                    f.write(f"- 平衡时间: {emp.equilibrium_time:.1f} h\n")
                    f.write(f"- 可信度: {emp.confidence:.2f}\n")
                    if emp.warnings:
                        f.write(f"- 警告: {'; '.join(emp.warnings)}\n")
                    f.write("\n")
                
                # 数值计算结果
                if comparison.numerical_result:
                    num = comparison.numerical_result
                    f.write("## 数值计算结果\n")
                    f.write(f"- 方法: {num.method}\n")
                    f.write(f"- 冲刷深度: {num.scour_depth:.3f} m\n")
                    f.write(f"- 冲刷宽度: {num.scour_width:.3f} m\n")
                    f.write(f"- 冲刷体积: {num.scour_volume:.3f} m³\n")
                    f.write(f"- 平衡时间: {num.equilibrium_time:.1f} h\n")
                    f.write(f"- 最大流速: {num.max_velocity:.3f} m/s\n")
                    f.write(f"- 最大剪应力: {num.max_shear_stress:.1f} Pa\n")
                    f.write(f"- 计算时间: {num.computation_time:.2f} s\n")
                    if num.warnings:
                        f.write(f"- 警告: {'; '.join(num.warnings)}\n")
                    f.write("\n")
                
                # 性能对比
                f.write("## 性能对比\n")
                for solver, time_cost in comparison.computation_times.items():
                    f.write(f"- {solver}: {time_cost:.2f} s\n")
                f.write("\n")
                
                # 总体警告
                if comparison.warnings:
                    f.write("## 警告信息\n")
                    for warning in comparison.warnings:
                        f.write(f"- {warning}\n")
            
            return True
            
        except Exception as e:
            warnings.warn(f"报告导出失败: {e}")
            return False


def create_default_manager() -> SolverManager:
    """创建默认求解器管理器"""
    config = SolverConfiguration(
        solver_type=SolverType.AUTO,
        computation_mode=ComputationMode.BALANCED,
        empirical_methods=["HEC-18", "Melville-Coleman"],
        use_consensus=True,
        numerical_enabled=True,
        fallback_to_empirical=True
    )
    return SolverManager(config)


if __name__ == "__main__":
    # 测试求解器管理器
    from empirical_solver import create_test_parameters
    
    print("=== 求解器管理器测试 ===")
    
    manager = create_default_manager()
    test_params = create_test_parameters()
    
    print("可用求解器:", manager.get_available_solvers())
    print()
    
    # 测试混合求解
    result = manager.solve(test_params, solver_type=SolverType.HYBRID)
    
    if isinstance(result, ComparisonResult):
        print("=== 混合求解结果 ===")
        print(f"推荐方法: {result.recommendation_reason}")
        print(f"一致性: {result.agreement_level}")
        print(f"相对误差: {result.relative_error:.2%}")
        
        if result.recommended_result:
            rec = result.recommended_result
            if hasattr(rec, 'method'):
                print(f"推荐冲刷深度: {rec.scour_depth:.3f} m ({rec.method})")
        
        print(f"计算时间: {result.computation_times}")
        
        if result.warnings:
            print(f"警告: {'; '.join(result.warnings)}")
    
    print()
    print("性能统计:", manager.get_performance_stats())