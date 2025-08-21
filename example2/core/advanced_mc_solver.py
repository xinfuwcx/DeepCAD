#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
高级摩尔-库伦求解器算法模块
提供优化的数值算法和收敛策略，专门针对岩土工程问题设计
"""

import numpy as np
import math
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ConvergenceStrategy(Enum):
    """收敛策略枚举"""
    STANDARD = "standard"
    ADAPTIVE = "adaptive"
    ROBUST = "robust"
    FAST = "fast"


class MaterialValidationLevel(Enum):
    """材料参数验证等级"""
    BASIC = "basic"
    ENGINEERING = "engineering"
    STRICT = "strict"


@dataclass
class AdvancedSolverSettings:
    """高级求解器设置"""
    # 收敛控制
    convergence_strategy: ConvergenceStrategy = ConvergenceStrategy.ADAPTIVE
    max_iterations: int = 100
    displacement_tolerance: float = 1e-6
    residual_tolerance: float = 1e-6
    energy_tolerance: float = 1e-8
    
    # 线搜索参数
    enable_line_search: bool = True
    line_search_tolerance: float = 0.8
    max_line_search_iterations: int = 10
    
    # 自适应策略
    adaptive_tolerance_factor: float = 0.1
    convergence_acceleration: bool = True
    stiffness_recovery: bool = True
    
    # 数值稳定性
    regularization_factor: float = 1e-12
    condition_number_limit: float = 1e12
    pivot_threshold: float = 1e-14


@dataclass
class MaterialConstraints:
    """材料参数约束"""
    # 弹性参数约束
    min_young_modulus: float = 1e6      # 1 MPa
    max_young_modulus: float = 100e9    # 100 GPa
    min_poisson_ratio: float = 0.0
    max_poisson_ratio: float = 0.49
    
    # 强度参数约束
    min_cohesion: float = 0.0           # 0 Pa (砂土)
    max_cohesion: float = 10e6          # 10 MPa
    min_friction_angle: float = 0.0     # 0° (纯粘性土)
    max_friction_angle: float = 50.0    # 50° (密实砂)
    
    # 几何约束
    min_density: float = 1000.0         # 1000 kg/m³
    max_density: float = 3000.0         # 3000 kg/m³


class MaterialParameterValidator:
    """材料参数验证器"""
    
    def __init__(self, validation_level: MaterialValidationLevel = MaterialValidationLevel.ENGINEERING):
        self.validation_level = validation_level
        self.constraints = MaterialConstraints()
        
    def validate_material_properties(self, properties: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """验证材料属性的合理性"""
        errors = []
        warnings = []
        
        # 基础验证
        errors.extend(self._validate_basic_parameters(properties))
        
        # 工程验证
        if self.validation_level in [MaterialValidationLevel.ENGINEERING, MaterialValidationLevel.STRICT]:
            errors.extend(self._validate_engineering_constraints(properties))
            warnings.extend(self._validate_engineering_recommendations(properties))
        
        # 严格验证
        if self.validation_level == MaterialValidationLevel.STRICT:
            errors.extend(self._validate_physical_consistency(properties))
            warnings.extend(self._validate_numerical_stability(properties))
        
        # 输出警告信息
        for warning in warnings:
            logger.warning(f"材料参数警告: {warning}")
            
        return len(errors) == 0, errors
    
    def _validate_basic_parameters(self, props: Dict[str, Any]) -> List[str]:
        """基础参数验证"""
        errors = []
        
        # 检查必需参数
        required_params = ['YOUNG_MODULUS', 'POISSON_RATIO', 'DENSITY']
        for param in required_params:
            if param not in props:
                errors.append(f"缺少必需参数: {param}")
                continue
            
            value = props[param]
            if not isinstance(value, (int, float)) or value <= 0:
                errors.append(f"参数 {param} 必须为正数")
        
        # 泊松比特殊检查
        if 'POISSON_RATIO' in props:
            nu = props['POISSON_RATIO']
            if nu < self.constraints.min_poisson_ratio or nu >= self.constraints.max_poisson_ratio:
                errors.append(f"泊松比 {nu:.3f} 超出合理范围 [{self.constraints.min_poisson_ratio}, {self.constraints.max_poisson_ratio})")
        
        return errors
    
    def _validate_engineering_constraints(self, props: Dict[str, Any]) -> List[str]:
        """工程约束验证"""
        errors = []
        
        # 弹性模量约束
        if 'YOUNG_MODULUS' in props:
            E = props['YOUNG_MODULUS']
            if E < self.constraints.min_young_modulus or E > self.constraints.max_young_modulus:
                errors.append(f"弹性模量 {E/1e9:.1f} GPa 超出工程范围 [{self.constraints.min_young_modulus/1e9:.1f}, {self.constraints.max_young_modulus/1e9:.1f}] GPa")
        
        # 密度约束
        if 'DENSITY' in props:
            rho = props['DENSITY']
            if rho < self.constraints.min_density or rho > self.constraints.max_density:
                errors.append(f"密度 {rho:.0f} kg/m³ 超出工程范围 [{self.constraints.min_density:.0f}, {self.constraints.max_density:.0f}] kg/m³")
        
        # 强度参数约束
        if 'COHESION' in props:
            c = props['COHESION']
            if c < self.constraints.min_cohesion or c > self.constraints.max_cohesion:
                errors.append(f"粘聚力 {c/1000:.1f} kPa 超出工程范围 [{self.constraints.min_cohesion/1000:.1f}, {self.constraints.max_cohesion/1000:.1f}] kPa")
        
        if 'FRICTION_ANGLE' in props:
            phi = props['FRICTION_ANGLE']
            phi_deg = math.degrees(phi) if phi < 1 else phi  # 修正：小于1认为是弧度，大于1认为是度
            if phi_deg < self.constraints.min_friction_angle or phi_deg > self.constraints.max_friction_angle:
                errors.append(f"内摩擦角 {phi_deg:.1f}° 超出工程范围 [{self.constraints.min_friction_angle:.1f}°, {self.constraints.max_friction_angle:.1f}°]")
        
        return errors
    
    def _validate_engineering_recommendations(self, props: Dict[str, Any]) -> List[str]:
        """工程建议验证（警告级别）"""
        warnings = []
        
        # 泊松比工程建议
        if 'POISSON_RATIO' in props:
            nu = props['POISSON_RATIO']
            if nu > 0.4:
                warnings.append(f"泊松比 {nu:.3f} 较大，可能导致体积锁死问题")
            elif nu < 0.1:
                warnings.append(f"泊松比 {nu:.3f} 较小，请确认是否为脆性材料")
        
        # 剪胀角建议 (ψ ≤ φ)
        if 'FRICTION_ANGLE' in props and 'DILATANCY_ANGLE' in props:
            phi = math.degrees(props['FRICTION_ANGLE']) if props['FRICTION_ANGLE'] < 1 else props['FRICTION_ANGLE']
            psi = math.degrees(props['DILATANCY_ANGLE']) if props['DILATANCY_ANGLE'] < 1 else props['DILATANCY_ANGLE']

            if psi > phi:
                warnings.append(f"剪胀角 {psi:.1f}° 大于内摩擦角 {phi:.1f}°，违反塑性理论 (ψ ≤ φ)")
            elif psi < 0:
                warnings.append(f"剪胀角 {psi:.1f}° 小于0°，建议设为0°或正值")
            elif psi > phi * 0.8:
                warnings.append(f"剪胀角 {psi:.1f}° 接近内摩擦角 {phi:.1f}°，建议使用 ψ ≤ φ - 10°")
        
        return warnings
    
    def _validate_physical_consistency(self, props: Dict[str, Any]) -> List[str]:
        """物理一致性验证"""
        errors = []
        
        # 弹性常数一致性检查
        if 'YOUNG_MODULUS' in props and 'POISSON_RATIO' in props:
            E = props['YOUNG_MODULUS']
            nu = props['POISSON_RATIO']
            
            # 计算剪切模量
            G = E / (2 * (1 + nu))
            
            # 计算体积模量
            K = E / (3 * (1 - 2 * nu))
            
            if K <= 0:
                errors.append(f"负体积模量 K={K/1e9:.1f} GPa，泊松比过大")
            
            if G <= 0:
                errors.append(f"负剪切模量 G={G/1e9:.1f} GPa，参数不合理")
        
        # 抗拉抗压强度一致性
        if 'YIELD_STRESS_TENSION' in props and 'YIELD_STRESS_COMPRESSION' in props:
            ft = props['YIELD_STRESS_TENSION']
            fc = props['YIELD_STRESS_COMPRESSION']
            
            if ft > fc:
                errors.append(f"抗拉强度 {ft/1e6:.1f} MPa 大于抗压强度 {fc/1e6:.1f} MPa，不符合土体特性")
        
        return errors
    
    def _validate_numerical_stability(self, props: Dict[str, Any]) -> List[str]:
        """数值稳定性验证"""
        warnings = []
        
        # 检查数值范围
        if 'YOUNG_MODULUS' in props and 'COHESION' in props:
            E = props['YOUNG_MODULUS']
            c = props['COHESION']
            
            # 弹性模量与粘聚力的比值
            E_c_ratio = E / c if c > 0 else float('inf')
            
            if E_c_ratio > 10000:
                warnings.append(f"弹性模量/粘聚力比值 {E_c_ratio:.0f} 过大，可能导致数值病态")
            elif E_c_ratio < 100:
                warnings.append(f"弹性模量/粘聚力比值 {E_c_ratio:.0f} 过小，材料过于柔软")
        
        return warnings


class AdvancedConvergenceController:
    """高级收敛控制器"""
    
    def __init__(self, settings: AdvancedSolverSettings):
        self.settings = settings
        self.iteration_history = []
        self.convergence_rate = 1.0
        self.stagnation_counter = 0
        
    def compute_adaptive_tolerance(self, iteration: int, residual_norm: float) -> float:
        """计算自适应收敛容差"""
        base_tolerance = self.settings.residual_tolerance
        
        if self.settings.convergence_strategy == ConvergenceStrategy.ADAPTIVE:
            # 基于收敛历史的自适应调整
            if len(self.iteration_history) > 3:
                recent_convergence = self._estimate_convergence_rate()
                if recent_convergence < 0.1:  # 收敛很快
                    return base_tolerance * 10  # 放松容差
                elif recent_convergence > 0.9:  # 收敛很慢
                    return base_tolerance * 0.1  # 严格容差
            
            # 基于迭代次数的调整
            if iteration > self.settings.max_iterations * 0.8:
                return base_tolerance * 10  # 后期放松容差避免死循环
                
        elif self.settings.convergence_strategy == ConvergenceStrategy.ROBUST:
            # 鲁棒策略：逐步收紧容差
            factor = max(0.1, 1.0 - iteration / self.settings.max_iterations)
            return base_tolerance * factor
            
        elif self.settings.convergence_strategy == ConvergenceStrategy.FAST:
            # 快速策略：较松的容差
            return base_tolerance * 5.0
            
        return base_tolerance
    
    def check_convergence(self, iteration: int, residuals: Dict[str, float]) -> Tuple[bool, str]:
        """检查收敛状态"""
        displacement_norm = residuals.get('displacement', float('inf'))
        residual_norm = residuals.get('residual', float('inf'))
        energy_norm = residuals.get('energy', float('inf'))
        
        # 记录历史
        self.iteration_history.append({
            'iteration': iteration,
            'displacement': displacement_norm,
            'residual': residual_norm,
            'energy': energy_norm
        })
        
        # 自适应容差
        disp_tol = self.compute_adaptive_tolerance(iteration, displacement_norm)
        res_tol = self.compute_adaptive_tolerance(iteration, residual_norm)
        
        # 收敛判断
        disp_converged = displacement_norm < disp_tol
        residual_converged = residual_norm < res_tol
        energy_converged = energy_norm < self.settings.energy_tolerance
        
        if disp_converged and residual_converged:
            return True, f"收敛成功 (位移: {displacement_norm:.2e}, 残差: {residual_norm:.2e})"
        
        # 检查停滞
        if self._check_stagnation():
            return False, f"收敛停滞，建议调整参数或网格"
        
        # 检查发散
        if self._check_divergence():
            return False, f"解发散，残差: {residual_norm:.2e}"
        
        return False, f"继续迭代 (位移: {displacement_norm:.2e}, 残差: {residual_norm:.2e})"
    
    def _estimate_convergence_rate(self) -> float:
        """估计收敛率"""
        if len(self.iteration_history) < 3:
            return 1.0
        
        recent = self.iteration_history[-3:]
        rate1 = recent[1]['residual'] / recent[0]['residual'] if recent[0]['residual'] > 0 else 1.0
        rate2 = recent[2]['residual'] / recent[1]['residual'] if recent[1]['residual'] > 0 else 1.0
        
        return (rate1 + rate2) / 2.0
    
    def _check_stagnation(self) -> bool:
        """检查收敛停滞"""
        if len(self.iteration_history) < 5:
            return False
        
        recent = self.iteration_history[-5:]
        residuals = [h['residual'] for h in recent]
        
        # 检查残差变化是否过小
        relative_change = abs(residuals[-1] - residuals[-5]) / residuals[-5] if residuals[-5] > 0 else 0
        
        if relative_change < 1e-3:
            self.stagnation_counter += 1
        else:
            self.stagnation_counter = 0
        
        return self.stagnation_counter > 3
    
    def _check_divergence(self) -> bool:
        """检查解发散"""
        if len(self.iteration_history) < 3:
            return False
        
        recent = self.iteration_history[-3:]
        
        # 检查残差是否连续增长
        increasing_residual = all(
            recent[i]['residual'] > recent[i-1]['residual'] * 1.1 
            for i in range(1, len(recent))
        )
        
        # 检查残差是否过大
        large_residual = recent[-1]['residual'] > self.settings.residual_tolerance * 1000
        
        return increasing_residual and large_residual


class OptimizedMohrCoulombSolver:
    """优化的摩尔-库伦求解器"""
    
    def __init__(self, settings: AdvancedSolverSettings = None):
        self.settings = settings or AdvancedSolverSettings()
        self.validator = MaterialParameterValidator()
        self.convergence_controller = AdvancedConvergenceController(self.settings)
        
    def generate_optimized_solver_parameters(self, material_properties: Dict[str, Any]) -> Dict[str, Any]:
        """生成优化的求解器参数"""
        
        # 验证材料参数
        is_valid, errors = self.validator.validate_material_properties(material_properties)
        if not is_valid:
            logger.error(f"材料参数验证失败: {'; '.join(errors)}")
            raise ValueError(f"材料参数不合理: {errors}")
        
        # 基础求解器配置
        solver_params = {
            "solver_type": "Static",
            "model_part_name": "Structure",
            "domain_size": 3,
            "echo_level": 1,
            "analysis_type": "non_linear",
            "rotation_dofs": True,
            
            # 时间步进
            "time_stepping": {
                "time_step": self._compute_optimal_time_step(material_properties)
            },
            
            # 迭代控制
            "max_iteration": self.settings.max_iterations,
            "convergence_criterion": "and_criterion",
            
            # 收敛容差
            "displacement_relative_tolerance": self.settings.displacement_tolerance,
            "residual_relative_tolerance": self.settings.residual_tolerance,
            "displacement_absolute_tolerance": self.settings.displacement_tolerance * 0.001,
            "residual_absolute_tolerance": self.settings.residual_tolerance * 0.001,
            
            # 线搜索
            "line_search": self.settings.enable_line_search,
            "line_search_tolerance": self.settings.line_search_tolerance,
            
            # 线性求解器
            "linear_solver_settings": self._generate_linear_solver_config(material_properties)
        }
        
        return solver_params
    
    def _compute_optimal_time_step(self, material_properties: Dict[str, Any]) -> float:
        """计算最优时间步长"""
        # 基于材料属性的自适应时间步长
        E = material_properties.get('YOUNG_MODULUS', 30e9)
        nu = material_properties.get('POISSON_RATIO', 0.3)
        rho = material_properties.get('DENSITY', 2500)
        
        # 估算波速
        c_wave = math.sqrt(E * (1 - nu) / (rho * (1 + nu) * (1 - 2*nu)))
        
        # 假设典型单元尺寸
        typical_element_size = 1.0  # 1m
        
        # CFL条件
        critical_time_step = typical_element_size / c_wave
        
        # 安全系数
        safety_factor = 0.1 if self.settings.convergence_strategy == ConvergenceStrategy.ROBUST else 0.5
        
        return critical_time_step * safety_factor
    
    def _generate_linear_solver_config(self, material_properties: Dict[str, Any]) -> Dict[str, Any]:
        """生成优化的线性求解器配置"""
        
        # 根据问题规模选择求解器
        estimated_dofs = 100000  # 估算自由度数量
        
        if estimated_dofs < 10000:
            # 小规模问题：直接法
            return {
                "solver_type": "skyline_lu_factorization",
                "scaling": True
            }
        elif estimated_dofs < 100000:
            # 中等规模：预处理共轭梯度
            return {
                "solver_type": "amgcl",
                "tolerance": self.settings.residual_tolerance * 0.1,
                "max_iteration": 500,
                "scaling": True,
                "verbosity": 1,
                "smoother_type": "ilu0",
                "krylov_type": "cg",
                "coarsening": {
                    "type": "smoothed_aggregation",
                    "relax": 0.67
                }
            }
        else:
            # 大规模问题：多重网格
            return {
                "solver_type": "amgcl",
                "tolerance": self.settings.residual_tolerance * 0.01,
                "max_iteration": 1000,
                "scaling": True,
                "verbosity": 0,
                "smoother_type": "spai0",
                "krylov_type": "bicgstab",
                "coarsening": {
                    "type": "smoothed_aggregation", 
                    "relax": 0.67,
                    "aggr": {
                        "eps_strong": 0.08
                    }
                }
            }
    
    def generate_constitutive_law_config(self, material_properties: Dict[str, Any]) -> Dict[str, Any]:
        """生成优化的本构法则配置"""
        
        # 检查是否需要高级本构模型
        has_tension = material_properties.get('YIELD_STRESS_TENSION', 0) > 0
        has_damage = True  # 默认启用损伤
        
        if has_tension and has_damage:
            # 使用修正摩尔-库伦+损伤模型
            constitutive_law = {
                "name": "SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D",
                "Variables": {
                    "YIELD_STRESS_TENSION": material_properties.get('YIELD_STRESS_TENSION', 0.1e6),
                    "YIELD_STRESS_COMPRESSION": material_properties.get('YIELD_STRESS_COMPRESSION', 10e6),
                    "FRICTION_ANGLE": material_properties.get('FRICTION_ANGLE', 30.0),  # degrees
                    # Note: this law does NOT take DILATANCY_ANGLE
                    "DAMAGE_THRESHOLD": 0.99,
                    "STRENGTH_RATIO": 10.0,
                    "FRACTURE_ENERGY": 100.0
                }
            }
        else:
            # 使用标准摩尔-库伦塑性模型
            constitutive_law = {
                "name": "MohrCoulombPlastic3DLaw",
                "Variables": {
                    "COHESION": material_properties.get('COHESION', 50000),
                    "INTERNAL_FRICTION_ANGLE": np.radians(material_properties.get('FRICTION_ANGLE', 30.0)),
                    "INTERNAL_DILATANCY_ANGLE": np.radians(self._compute_dilatancy_angle(material_properties)),
                    "YIELD_STRESS": material_properties.get('COHESION', 50000),
                    "ISOTROPIC_HARDENING_MODULUS": material_properties.get('YOUNG_MODULUS', 30e9) * 0.01,
                    "EXPONENTIAL_SATURATION_YIELD_STRESS": material_properties.get('COHESION', 50000) * 2.0,
                    "HARDENING_CURVE": 0,
                    "VISCOSITY": 1e-6
                }
            }
        
        return {"constitutive_law": constitutive_law}
    
    def _compute_dilatancy_angle(self, material_properties: Dict[str, Any]) -> float:
        """计算剪胀角 (ψ ≤ φ)"""
        friction_angle = material_properties.get('FRICTION_ANGLE', 30.0)

        # 使用经验关系：ψ = φ - 30° (Bolton, 1986)
        # 但不小于0度，且不大于摩擦角
        dilatancy_angle = max(0.0, min(friction_angle, friction_angle - 30.0))

        # 对于松散土，剪胀角更小
        density = material_properties.get('DENSITY', 2500)
        if density < 1800:  # 松散土
            dilatancy_angle *= 0.5

        return dilatancy_angle


# 测试和验证函数
def test_material_validation():
    """测试材料验证功能"""
    validator = MaterialParameterValidator(MaterialValidationLevel.ENGINEERING)
    
    # 测试正常材料
    normal_material = {
        'YOUNG_MODULUS': 30e9,
        'POISSON_RATIO': 0.3,
        'DENSITY': 2500,
        'COHESION': 50000,
        'FRICTION_ANGLE': 30.0
    }
    
    valid, errors = validator.validate_material_properties(normal_material)
    print(f"正常材料验证: {'通过' if valid else '失败'}")
    if errors:
        print(f"错误: {errors}")
    
    # 测试异常材料
    bad_material = {
        'YOUNG_MODULUS': -1000,  # 负值
        'POISSON_RATIO': 0.8,    # 过大
        'DENSITY': 500,          # 过小
        'FRICTION_ANGLE': 80.0   # 过大
    }
    
    valid, errors = validator.validate_material_properties(bad_material)
    print(f"异常材料验证: {'通过' if valid else '失败'}")
    if errors:
        print(f"错误: {errors}")


def test_solver_optimization():
    """测试求解器优化"""
    settings = AdvancedSolverSettings(
        convergence_strategy=ConvergenceStrategy.ADAPTIVE,
        max_iterations=50
    )
    
    solver = OptimizedMohrCoulombSolver(settings)
    
    material = {
        'YOUNG_MODULUS': 25e9,
        'POISSON_RATIO': 0.35,
        'DENSITY': 2200,
        'COHESION': 30000,
        'FRICTION_ANGLE': 28.0
    }
    
    # 生成求解器参数
    solver_params = solver.generate_optimized_solver_parameters(material)
    print("优化求解器参数生成成功")
    print(f"时间步长: {solver_params['time_stepping']['time_step']:.2e}")
    print(f"线性求解器: {solver_params['linear_solver_settings']['solver_type']}")
    
    # 生成本构法则配置
    constitutive_config = solver.generate_constitutive_law_config(material)
    print(f"本构法则: {constitutive_config['constitutive_law']['name']}")


if __name__ == "__main__":
    print("=== 高级摩尔-库伦求解器算法测试 ===")
    test_material_validation()
    print()
    test_solver_optimization()