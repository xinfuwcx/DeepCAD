"""
桥墩冲刷分析服务类
Bridge Pier Scour Analysis Services

提供桥墩冲刷分析的核心业务逻辑和数据处理服务
"""

import asyncio
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from pathlib import Path

# 导入example6的求解器
import sys
example6_path = Path(__file__).parent.parent.parent.parent / "example6"
sys.path.insert(0, str(example6_path))

from core.empirical_solver import (
    EmpiricalScourSolver, ScourParameters, ScourResult
)
from core.fenics_solver import (
    FEniCSScourSolver, NumericalParameters, NumericalResult
)
from core.advanced_solver import AdvancedSolverManager


class BridgeScourService:
    """桥墩冲刷分析服务"""
    
    def __init__(self):
        self.empirical_solver = EmpiricalScourSolver()
        self.fenics_solver = FEniCSScourSolver()
        self.advanced_solver = AdvancedSolverManager()
        
        # 缓存常用计算结果
        self._result_cache: Dict[str, Any] = {}
        self._cache_size_limit = 100
    
    def _generate_cache_key(self, params: ScourParameters, 
                          analysis_type: str, **kwargs) -> str:
        """生成缓存键"""
        key_parts = [
            f"D{params.pier_diameter}",
            f"V{params.flow_velocity}",
            f"H{params.water_depth}",
            f"d{params.d50}",
            f"type{analysis_type}"
        ]
        
        if kwargs:
            for k, v in sorted(kwargs.items()):
                key_parts.append(f"{k}{v}")
        
        return "_".join(key_parts)
    
    def _get_from_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """从缓存获取结果"""
        return self._result_cache.get(cache_key)
    
    def _save_to_cache(self, cache_key: str, result: Dict[str, Any]):
        """保存结果到缓存"""
        if len(self._result_cache) >= self._cache_size_limit:
            # 移除最旧的缓存项
            oldest_key = next(iter(self._result_cache))
            del self._result_cache[oldest_key]
        
        self._result_cache[cache_key] = {
            'result': result,
            'timestamp': datetime.utcnow(),
            'cache_key': cache_key
        }
    
    async def run_empirical_analysis(self, 
                                   params: ScourParameters) -> Dict[str, Any]:
        """运行经验公式分析"""
        
        cache_key = self._generate_cache_key(params, "empirical")
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            return cached_result['result']
        
        start_time = datetime.utcnow()
        
        # 并行计算各种经验公式
        async def run_method(method_name: str, solve_func):
            try:
                return method_name, await asyncio.get_event_loop().run_in_executor(
                    None, solve_func, params
                )
            except Exception as e:
                return method_name, ScourResult(
                    scour_depth=0.0,
                    success=False,
                    error_message=str(e),
                    method_used=method_name
                )
        
        # 创建任务
        tasks = [
            run_method("HEC-18", self.empirical_solver.solve_hec18),
            run_method("Melville-Chiew", self.empirical_solver.solve_melville_chiew),
            run_method("CSU", self.empirical_solver.solve_csu),
            run_method("Sheppard-Miller", self.empirical_solver.solve_sheppard_miller)
        ]
        
        # 并行执行
        results = await asyncio.gather(*tasks)
        
        # 整理结果
        method_results = {}
        scour_depths = []
        
        for method_name, result in results:
            method_results[method_name] = {
                "scour_depth": result.scour_depth,
                "success": result.success,
                "computation_time": result.computation_time,
                "reynolds_number": result.reynolds_number,
                "froude_number": result.froude_number,
                "warnings": result.warnings,
                "error_message": result.error_message
            }
            
            if result.success:
                scour_depths.append(result.scour_depth)
        
        # 统计分析
        if scour_depths:
            mean_scour = np.mean(scour_depths)
            std_scour = np.std(scour_depths)
            min_scour = np.min(scour_depths)
            max_scour = np.max(scour_depths)
            
            # 推荐值 (保守取较大值)
            recommended_scour = max_scour if max_scour > 0 else mean_scour
            
            # 方法一致性评估
            if len(scour_depths) > 1:
                coefficient_of_variation = std_scour / mean_scour if mean_scour > 0 else 0
                if coefficient_of_variation < 0.2:
                    agreement = "excellent"
                elif coefficient_of_variation < 0.4:
                    agreement = "good"
                elif coefficient_of_variation < 0.6:
                    agreement = "fair"
                else:
                    agreement = "poor"
            else:
                agreement = "insufficient_data"
        else:
            mean_scour = std_scour = min_scour = max_scour = 0.0
            recommended_scour = 0.0
            agreement = "no_valid_results"
        
        computation_time = (datetime.utcnow() - start_time).total_seconds()
        
        final_result = {
            "analysis_type": "empirical_formulas",
            "methods": method_results,
            "statistics": {
                "mean_scour_depth": mean_scour,
                "standard_deviation": std_scour,
                "min_scour_depth": min_scour,
                "max_scour_depth": max_scour,
                "recommended_scour_depth": recommended_scour,
                "method_agreement": agreement,
                "valid_methods": len(scour_depths),
                "total_methods": len(results)
            },
            "input_parameters": {
                "pier_diameter": params.pier_diameter,
                "flow_velocity": params.flow_velocity,
                "water_depth": params.water_depth,
                "d50": params.d50,
                "approach_angle": params.approach_angle
            },
            "computation_info": {
                "computation_time": computation_time,
                "start_time": start_time.isoformat(),
                "completed_time": datetime.utcnow().isoformat(),
                "cache_used": False
            }
        }
        
        # 保存到缓存
        self._save_to_cache(cache_key, final_result)
        
        return final_result
    
    async def run_fenics_analysis(self, 
                                params: ScourParameters,
                                numerical_params: NumericalParameters) -> Dict[str, Any]:
        """运行FEniCS CFD分析"""
        
        cache_key = self._generate_cache_key(
            params, "fenics",
            mesh_res=numerical_params.mesh_resolution,
            turb_model=numerical_params.turbulence_model.value
        )
        
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            return cached_result['result']
        
        start_time = datetime.utcnow()
        
        # 运行FEniCS求解
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None, self.fenics_solver.solve, params, numerical_params
            )
            
            # 后处理分析
            analysis_metrics = self._analyze_cfd_results(result, params)
            
            final_result = {
                "analysis_type": "fenics_cfd",
                "scour_results": {
                    "scour_depth": result.scour_depth,
                    "scour_width": result.scour_width,
                    "scour_volume": result.scour_volume,
                    "equilibrium_time": result.equilibrium_time
                },
                "flow_field": {
                    "max_velocity": result.max_velocity,
                    "max_shear_stress": result.max_shear_stress,
                    "reynolds_number": result.reynolds_number,
                    "froude_number": result.froude_number
                },
                "numerical_info": {
                    "computation_time": result.computation_time,
                    "iterations": result.iterations,
                    "convergence_achieved": result.convergence_achieved,
                    "method": result.method,
                    "mesh_resolution": numerical_params.mesh_resolution,
                    "turbulence_model": numerical_params.turbulence_model.value,
                    "time_step": numerical_params.time_step
                },
                "analysis_metrics": analysis_metrics,
                "input_parameters": {
                    "pier_diameter": params.pier_diameter,
                    "flow_velocity": params.flow_velocity,
                    "water_depth": params.water_depth,
                    "d50": params.d50
                },
                "warnings": result.warnings,
                "computation_info": {
                    "start_time": start_time.isoformat(),
                    "completed_time": datetime.utcnow().isoformat(),
                    "cache_used": False
                }
            }
            
        except Exception as e:
            final_result = {
                "analysis_type": "fenics_cfd",
                "success": False,
                "error": str(e),
                "fallback_used": True,
                "computation_info": {
                    "start_time": start_time.isoformat(),
                    "error_time": datetime.utcnow().isoformat(),
                    "cache_used": False
                }
            }
        
        # 保存到缓存
        self._save_to_cache(cache_key, final_result)
        
        return final_result
    
    def _analyze_cfd_results(self, result: NumericalResult, 
                           params: ScourParameters) -> Dict[str, Any]:
        """分析CFD结果，提取工程指标"""
        
        # 计算关键无量纲参数
        pier_reynolds = (result.reynolds_number if result.reynolds_number > 0 
                        else params.flow_velocity * params.pier_diameter / 1e-6)
        
        froude_number = (result.froude_number if result.froude_number > 0
                        else params.flow_velocity / np.sqrt(9.81 * params.water_depth))
        
        # 冲刷特征分析
        relative_scour_depth = result.scour_depth / params.pier_diameter
        relative_scour_width = result.scour_width / params.pier_diameter
        
        # 流场特征
        velocity_amplification = (result.max_velocity / params.flow_velocity 
                                if params.flow_velocity > 0 else 1.0)
        
        # 安全系数评估
        if result.scour_depth > 0:
            if relative_scour_depth < 1.0:
                risk_level = "low"
            elif relative_scour_depth < 2.0:
                risk_level = "moderate"
            elif relative_scour_depth < 3.0:
                risk_level = "high"
            else:
                risk_level = "critical"
        else:
            risk_level = "minimal"
        
        return {
            "dimensionless_parameters": {
                "reynolds_number": pier_reynolds,
                "froude_number": froude_number,
                "relative_scour_depth": relative_scour_depth,
                "relative_scour_width": relative_scour_width
            },
            "flow_characteristics": {
                "velocity_amplification_factor": velocity_amplification,
                "max_shear_stress": result.max_shear_stress,
                "flow_separation": velocity_amplification > 1.5,
                "wake_formation": True if velocity_amplification > 1.3 else False
            },
            "scour_assessment": {
                "scour_category": self._classify_scour_depth(relative_scour_depth),
                "risk_level": risk_level,
                "equilibrium_reached": result.equilibrium_time < 100.0,
                "scour_rate": (result.scour_depth / result.equilibrium_time 
                             if result.equilibrium_time > 0 else 0)
            },
            "quality_metrics": {
                "convergence_quality": "excellent" if result.convergence_achieved else "poor",
                "computational_efficiency": self._assess_efficiency(result.computation_time, 
                                                                   result.iterations),
                "result_reliability": self._assess_reliability(result)
            }
        }
    
    def _classify_scour_depth(self, relative_depth: float) -> str:
        """分类冲刷深度"""
        if relative_depth < 0.5:
            return "shallow"
        elif relative_depth < 1.5:
            return "moderate"
        elif relative_depth < 2.5:
            return "deep"
        else:
            return "extreme"
    
    def _assess_efficiency(self, computation_time: float, iterations: int) -> str:
        """评估计算效率"""
        time_per_iteration = computation_time / iterations if iterations > 0 else float('inf')
        
        if time_per_iteration < 0.1:
            return "excellent"
        elif time_per_iteration < 0.5:
            return "good"
        elif time_per_iteration < 2.0:
            return "fair"
        else:
            return "poor"
    
    def _assess_reliability(self, result: NumericalResult) -> str:
        """评估结果可靠性"""
        reliability_score = 0
        
        # 收敛性检查
        if result.convergence_achieved:
            reliability_score += 3
        
        # 物理合理性检查
        if 0 < result.scour_depth < 10 * result.scour_depth:  # 假设pier_diameter可访问
            reliability_score += 2
        
        # 警告数量
        warning_count = len(result.warnings) if result.warnings else 0
        if warning_count == 0:
            reliability_score += 2
        elif warning_count <= 2:
            reliability_score += 1
        
        # 计算时间合理性
        if 1.0 < result.computation_time < 600.0:
            reliability_score += 1
        
        if reliability_score >= 7:
            return "high"
        elif reliability_score >= 5:
            return "medium"
        elif reliability_score >= 3:
            return "low"
        else:
            return "questionable"
    
    async def run_comparison_analysis(self, 
                                    params: ScourParameters,
                                    numerical_params: NumericalParameters) -> Dict[str, Any]:
        """运行方法对比分析"""
        
        start_time = datetime.utcnow()
        
        # 并行运行不同方法
        tasks = [
            self.run_empirical_analysis(params),
            self.run_fenics_analysis(params, numerical_params)
        ]
        
        try:
            empirical_result, fenics_result = await asyncio.gather(*tasks, return_exceptions=True)
        except Exception as e:
            return {
                "analysis_type": "comparison",
                "success": False,
                "error": f"对比分析失败: {str(e)}",
                "computation_info": {
                    "start_time": start_time.isoformat(),
                    "error_time": datetime.utcnow().isoformat()
                }
            }
        
        # 处理异常结果
        if isinstance(empirical_result, Exception):
            empirical_result = {"error": str(empirical_result), "success": False}
        if isinstance(fenics_result, Exception):
            fenics_result = {"error": str(fenics_result), "success": False}
        
        # 对比分析
        comparison_metrics = self._compare_methods(empirical_result, fenics_result)
        
        return {
            "analysis_type": "method_comparison",
            "methods": {
                "empirical": empirical_result,
                "fenics": fenics_result
            },
            "comparison": comparison_metrics,
            "recommendations": self._generate_recommendations(comparison_metrics),
            "computation_info": {
                "start_time": start_time.isoformat(),
                "completed_time": datetime.utcnow().isoformat(),
                "total_time": (datetime.utcnow() - start_time).total_seconds()
            }
        }
    
    def _compare_methods(self, empirical_result: Dict, fenics_result: Dict) -> Dict[str, Any]:
        """对比不同方法的结果"""
        
        comparison = {
            "scour_depth_comparison": {},
            "method_agreement": {},
            "computational_comparison": {},
            "reliability_comparison": {}
        }
        
        # 提取冲刷深度
        emp_scour = empirical_result.get("statistics", {}).get("recommended_scour_depth", 0)
        fen_scour = fenics_result.get("scour_results", {}).get("scour_depth", 0)
        
        if emp_scour > 0 and fen_scour > 0:
            ratio = fen_scour / emp_scour
            difference = abs(fen_scour - emp_scour)
            relative_difference = difference / max(emp_scour, fen_scour) * 100
            
            comparison["scour_depth_comparison"] = {
                "empirical_scour": emp_scour,
                "fenics_scour": fen_scour,
                "ratio_fenics_to_empirical": ratio,
                "absolute_difference": difference,
                "relative_difference_percent": relative_difference,
                "agreement_level": self._assess_agreement(relative_difference)
            }
        
        # 计算时间对比
        emp_time = empirical_result.get("computation_info", {}).get("computation_time", 0)
        fen_time = fenics_result.get("numerical_info", {}).get("computation_time", 0)
        
        comparison["computational_comparison"] = {
            "empirical_time": emp_time,
            "fenics_time": fen_time,
            "speedup_ratio": fen_time / emp_time if emp_time > 0 else float('inf'),
            "efficiency_assessment": "empirical_preferred" if fen_time > 10 * emp_time else "comparable"
        }
        
        return comparison
    
    def _assess_agreement(self, relative_difference: float) -> str:
        """评估方法一致性"""
        if relative_difference < 10:
            return "excellent"
        elif relative_difference < 25:
            return "good"
        elif relative_difference < 50:
            return "fair"
        else:
            return "poor"
    
    def _generate_recommendations(self, comparison: Dict[str, Any]) -> Dict[str, Any]:
        """生成使用建议"""
        
        scour_comp = comparison.get("scour_depth_comparison", {})
        comp_comp = comparison.get("computational_comparison", {})
        
        recommendations = {
            "primary_method": "empirical",
            "verification_method": "fenics",
            "confidence_level": "medium",
            "notes": []
        }
        
        # 基于一致性确定推荐方法
        agreement = scour_comp.get("agreement_level", "unknown")
        if agreement in ["excellent", "good"]:
            recommendations["confidence_level"] = "high"
            recommendations["notes"].append("经验公式与CFD结果一致性良好，可优先使用经验公式")
        elif agreement == "fair":
            recommendations["confidence_level"] = "medium"
            recommendations["notes"].append("方法间存在一定差异，建议两种方法结合使用")
        else:
            recommendations["primary_method"] = "fenics"
            recommendations["confidence_level"] = "low"
            recommendations["notes"].append("方法间差异较大，建议使用CFD方法并进一步验证")
        
        # 基于计算效率的建议
        speedup = comp_comp.get("speedup_ratio", 1)
        if speedup > 100:
            recommendations["notes"].append("CFD计算时间较长，初步设计可优先使用经验公式")
        
        return recommendations
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        return {
            "cache_size": len(self._result_cache),
            "cache_limit": self._cache_size_limit,
            "cache_usage": len(self._result_cache) / self._cache_size_limit * 100,
            "cached_analyses": list(self._result_cache.keys())
        }
    
    def clear_cache(self):
        """清空缓存"""
        self._result_cache.clear()
    
    def get_solver_capabilities(self) -> Dict[str, Any]:
        """获取求解器能力信息"""
        return {
            "empirical_solver": {
                "methods": ["HEC-18", "Melville-Chiew", "CSU", "Sheppard-Miller"],
                "speed": "very_fast",
                "accuracy": "engineering",
                "applicability": "general_bridges"
            },
            "fenics_solver": {
                "available": self.fenics_solver.fenics_available,
                "methods": ["Navier-Stokes", "k-ω SST", "Sediment Transport"],
                "speed": "moderate",
                "accuracy": "high",
                "applicability": "complex_geometries"
            },
            "advanced_solver": {
                "available": True,
                "methods": ["FSI", "Morphodynamics", "Adaptive Mesh"],
                "speed": "slow",
                "accuracy": "research_grade",
                "applicability": "research_and_complex_cases"
            }
        }