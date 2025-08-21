#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
经验公式求解器 - Empirical Formula Solver
包含主要的桥墩冲刷经验公式计算方法

主要公式包括：
- HEC-18 公式（美国联邦公路管理局）
- Melville & Coleman 公式
- CSU (Colorado State University) 公式
- Sheppard & Miller 公式
"""

import math
import numpy as np
from typing import Dict, Any, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class PierShape(Enum):
    """桥墩形状枚举"""
    CIRCULAR = "circular"
    RECTANGULAR = "rectangular"
    ELLIPTICAL = "elliptical"
    COMPLEX = "complex"


@dataclass
class ScourParameters:
    """冲刷计算参数"""
    # 桥墩几何参数
    pier_diameter: float  # 桥墩特征尺寸 (m)
    pier_shape: PierShape  # 桥墩形状
    flow_velocity: float  # 来流速度 (m/s)
    water_depth: float  # 水深 (m)
    d50: float  # 中值粒径 (mm)
    
    # 可选参数
    pier_angle: float = 0.0  # 桥墩倾斜角度 (度)
    approach_angle: float = 0.0  # 来流角度 (度)
    d84: Optional[float] = None  # 84%通过粒径 (mm)
    sediment_density: float = 2650.0  # 沉积物密度 (kg/m³)
    water_density: float = 1000.0  # 水密度 (kg/m³)
    
    # 环境参数
    water_temperature: float = 20.0  # 水温 (°C)
    gravity: float = 9.81  # 重力加速度 (m/s²)


@dataclass
class ScourResult:
    """冲刷计算结果"""
    scour_depth: float  # 冲刷深度 (m)
    scour_width: float  # 冲刷宽度 (m)
    equilibrium_time: float  # 平衡时间 (hours)
    critical_velocity: float  # 临界流速 (m/s)
    reynolds_number: float  # 雷诺数
    froude_number: float  # 弗劳德数
    method: str  # 使用的计算方法
    confidence: float  # 可信度 (0-1)
    warnings: list  # 警告信息


class EmpiricalScourSolver:
    """经验公式冲刷求解器"""
    
    def __init__(self):
        self.name = "经验公式求解器"
        self.version = "1.0.0"
        self.supported_methods = [
            "HEC-18", "Melville-Coleman", "CSU", "Sheppard-Miller"
        ]
    
    def calculate_dimensional_parameters(self, params: ScourParameters) -> Dict[str, float]:
        """计算无量纲参数"""
        # 水的动力粘度（温度相关）
        kinematic_viscosity = self._get_kinematic_viscosity(params.water_temperature)
        
        # 雷诺数
        reynolds = params.flow_velocity * params.pier_diameter / kinematic_viscosity
        
        # 弗劳德数
        froude = params.flow_velocity / math.sqrt(params.gravity * params.water_depth)
        
        # 相对水深
        relative_depth = params.water_depth / params.pier_diameter
        
        # 颗粒雷诺数
        d50_m = params.d50 / 1000.0  # 转换为米
        particle_reynolds = params.flow_velocity * d50_m / kinematic_viscosity
        
        # 临界剪切速度
        specific_gravity = params.sediment_density / params.water_density
        critical_velocity = math.sqrt(
            params.gravity * d50_m * (specific_gravity - 1) * 0.047
        )
        
        # 流速比
        velocity_ratio = params.flow_velocity / critical_velocity if critical_velocity > 0 else 0
        
        return {
            'reynolds': reynolds,
            'froude': froude,
            'relative_depth': relative_depth,
            'particle_reynolds': particle_reynolds,
            'critical_velocity': critical_velocity,
            'velocity_ratio': velocity_ratio,
            'kinematic_viscosity': kinematic_viscosity
        }
    
    def _get_kinematic_viscosity(self, temperature: float) -> float:
        """根据水温计算运动粘度 (m²/s)"""
        # Vogel公式
        return (1.792e-6) * math.exp(-0.0255 * temperature)
    
    def hec18_formula(self, params: ScourParameters) -> ScourResult:
        """HEC-18 公式计算冲刷深度"""
        dim_params = self.calculate_dimensional_parameters(params)
        warnings = []
        
        # 检查适用条件
        if dim_params['froude'] > 0.8:
            warnings.append("弗劳德数 > 0.8，可能超出HEC-18适用范围")
        
        if dim_params['relative_depth'] < 2.0:
            warnings.append("相对水深 < 2.0，属于浅水条件")
        
        # 基本冲刷深度计算 (HEC-18 2012版)
        # ds/D = 2.0 * K1 * K2 * K3 * K4 * (V/Vc)^0.65 * Fr^0.43
        
        # 修正系数
        K1 = self._hec18_shape_factor(params.pier_shape, params.approach_angle)
        K2 = self._hec18_angle_factor(params.approach_angle)
        K3 = self._hec18_bed_condition_factor()  # 假设为明水河床
        K4 = self._hec18_size_factor(params.d50, params.pier_diameter)
        
        # 基础计算
        velocity_ratio = max(dim_params['velocity_ratio'], 0.1)  # 避免极小值
        froude_factor = max(dim_params['froude'], 0.01) ** 0.43
        
        # 计算相对冲刷深度
        relative_scour = 2.0 * K1 * K2 * K3 * K4 * (velocity_ratio ** 0.65) * froude_factor
        
        # 限制最大冲刷深度
        relative_scour = min(relative_scour, 3.0)  # HEC-18建议最大值
        
        scour_depth = relative_scour * params.pier_diameter
        
        # 估算冲刷宽度（经验关系）
        scour_width = scour_depth * 4.0
        
        # 估算平衡时间（Cardoso & Bettess公式）
        equilibrium_time = self._estimate_equilibrium_time_hec18(
            scour_depth, params.flow_velocity, params.d50
        )
        
        # 可信度评估
        confidence = self._assess_hec18_confidence(params, dim_params, warnings)
        
        return ScourResult(
            scour_depth=scour_depth,
            scour_width=scour_width,
            equilibrium_time=equilibrium_time,
            critical_velocity=dim_params['critical_velocity'],
            reynolds_number=dim_params['reynolds'],
            froude_number=dim_params['froude'],
            method="HEC-18",
            confidence=confidence,
            warnings=warnings
        )
    
    def melville_coleman_formula(self, params: ScourParameters) -> ScourResult:
        """Melville & Coleman 公式计算冲刷深度"""
        dim_params = self.calculate_dimensional_parameters(params)
        warnings = []
        
        # 检查适用条件
        if dim_params['froude'] > 1.0:
            warnings.append("超临界流条件，Melville公式精度可能下降")
        
        # Melville & Coleman (2000) 时间相关公式
        # ds = KI * Kd * Kh * Ks * Kθ * D
        
        # 流强系数 KI
        KI = self._melville_flow_intensity_factor(dim_params['velocity_ratio'])
        
        # 桥墩尺寸系数 Kd
        Kd = min(params.pier_diameter / params.d50 * 1000, 25.0)  # 限制最大值
        
        # 水深系数 Kh
        Kh = self._melville_depth_factor(dim_params['relative_depth'])
        
        # 沉积物级配系数 Ks（简化处理）
        Ks = 1.0  # 假设均匀沉积物
        
        # 来流角度系数 Kθ
        Ktheta = self._melville_angle_factor(params.approach_angle)
        
        # 计算最大冲刷深度
        scour_depth = KI * Kd * Kh * Ks * Ktheta * (params.d50 / 1000.0)
        
        # 限制合理范围
        scour_depth = min(scour_depth, 2.4 * params.pier_diameter)
        
        # 估算冲刷宽度
        scour_width = scour_depth * 3.5
        
        # 估算平衡时间
        equilibrium_time = self._estimate_equilibrium_time_melville(
            scour_depth, params.flow_velocity, params.d50
        )
        
        # 可信度评估
        confidence = self._assess_melville_confidence(params, dim_params, warnings)
        
        return ScourResult(
            scour_depth=scour_depth,
            scour_width=scour_width,
            equilibrium_time=equilibrium_time,
            critical_velocity=dim_params['critical_velocity'],
            reynolds_number=dim_params['reynolds'],
            froude_number=dim_params['froude'],
            method="Melville-Coleman",
            confidence=confidence,
            warnings=warnings
        )
    
    def csu_formula(self, params: ScourParameters) -> ScourResult:
        """CSU (Colorado State University) 公式"""
        dim_params = self.calculate_dimensional_parameters(params)
        warnings = []
        
        # CSU公式适用于宽水道中的圆形桥墩
        if params.pier_shape != PierShape.CIRCULAR:
            warnings.append("CSU公式专门针对圆形桥墩设计")
        
        # CSU公式: ds/D = 2.0 * (V/Vc)^0.65 * Fr^0.43
        velocity_ratio = max(dim_params['velocity_ratio'], 0.1)
        froude_factor = max(dim_params['froude'], 0.01) ** 0.43
        
        # 基础冲刷深度
        relative_scour = 2.0 * (velocity_ratio ** 0.65) * froude_factor
        
        # 水深修正
        if dim_params['relative_depth'] < 2.6:
            depth_correction = dim_params['relative_depth'] / 2.6
            relative_scour *= depth_correction
            warnings.append("浅水修正已应用")
        
        scour_depth = relative_scour * params.pier_diameter
        scour_depth = min(scour_depth, 2.6 * params.pier_diameter)  # CSU建议限制
        
        # 估算冲刷宽度
        scour_width = scour_depth * 4.2
        
        # 估算平衡时间
        equilibrium_time = self._estimate_equilibrium_time_csu(
            scour_depth, params.flow_velocity, params.d50
        )
        
        # 可信度评估
        confidence = self._assess_csu_confidence(params, dim_params, warnings)
        
        return ScourResult(
            scour_depth=scour_depth,
            scour_width=scour_width,
            equilibrium_time=equilibrium_time,
            critical_velocity=dim_params['critical_velocity'],
            reynolds_number=dim_params['reynolds'],
            froude_number=dim_params['froude'],
            method="CSU",
            confidence=confidence,
            warnings=warnings
        )
    
    def sheppard_miller_formula(self, params: ScourParameters) -> ScourResult:
        """Sheppard & Miller 复杂流场公式"""
        dim_params = self.calculate_dimensional_parameters(params)
        warnings = []
        
        # Sheppard & Miller公式考虑更多物理机制
        # ds/D = f(Re, Fr, σ/D, h/D, θ)
        
        # 雷诺数影响
        Re = dim_params['reynolds']
        if Re < 2000:
            Re_factor = 0.9
            warnings.append("层流或过渡流条件")
        elif Re > 200000:
            Re_factor = 1.1
            warnings.append("高雷诺数湍流")
        else:
            Re_factor = 1.0
        
        # 基础冲刷计算
        base_scour = 1.5 * (dim_params['velocity_ratio'] ** 0.6) * \
                     (dim_params['froude'] ** 0.4)
        
        # 几何修正
        shape_factor = self._sheppard_shape_factor(params.pier_shape)
        angle_factor = self._sheppard_angle_factor(params.approach_angle)
        depth_factor = self._sheppard_depth_factor(dim_params['relative_depth'])
        
        # 综合修正
        relative_scour = base_scour * Re_factor * shape_factor * angle_factor * depth_factor
        relative_scour = min(relative_scour, 2.8)  # 限制最大值
        
        scour_depth = relative_scour * params.pier_diameter
        
        # 估算冲刷宽度
        scour_width = scour_depth * 3.8
        
        # 估算平衡时间
        equilibrium_time = self._estimate_equilibrium_time_sheppard(
            scour_depth, params.flow_velocity, params.d50
        )
        
        # 可信度评估
        confidence = self._assess_sheppard_confidence(params, dim_params, warnings)
        
        return ScourResult(
            scour_depth=scour_depth,
            scour_width=scour_width,
            equilibrium_time=equilibrium_time,
            critical_velocity=dim_params['critical_velocity'],
            reynolds_number=dim_params['reynolds'],
            froude_number=dim_params['froude'],
            method="Sheppard-Miller",
            confidence=confidence,
            warnings=warnings
        )
    
    # HEC-18 修正系数方法
    def _hec18_shape_factor(self, shape: PierShape, angle: float) -> float:
        """HEC-18 形状系数 K1"""
        if shape == PierShape.CIRCULAR:
            return 1.0
        elif shape == PierShape.RECTANGULAR:
            # 考虑来流角度的矩形桥墩修正
            return 1.3 * (1 + 0.1 * abs(angle) / 15.0)
        elif shape == PierShape.ELLIPTICAL:
            return 1.1
        else:
            return 1.2  # 复杂形状
    
    def _hec18_angle_factor(self, angle: float) -> float:
        """HEC-18 角度系数 K2"""
        angle_rad = math.radians(abs(angle))
        if angle_rad == 0:
            return 1.0
        else:
            return (math.cos(angle_rad) + (math.sin(angle_rad) / math.sqrt(2))) ** 0.65
    
    def _hec18_bed_condition_factor(self) -> float:
        """HEC-18 河床条件系数 K3"""
        return 1.1  # 明水河床条件
    
    def _hec18_size_factor(self, d50: float, diameter: float) -> float:
        """HEC-18 粒径系数 K4"""
        ratio = (diameter * 1000) / d50  # D/d50
        if ratio < 25:
            return 0.4 * (ratio ** 0.15)
        else:
            return 1.0
    
    # Melville 修正系数方法
    def _melville_flow_intensity_factor(self, velocity_ratio: float) -> float:
        """Melville 流强系数 KI"""
        if velocity_ratio < 1.0:
            return velocity_ratio ** 0.65
        else:
            return 1.0
    
    def _melville_depth_factor(self, relative_depth: float) -> float:
        """Melville 水深系数 Kh"""
        if relative_depth > 2.6:
            return 1.0
        elif relative_depth > 0.2:
            return 0.78 * (relative_depth ** 0.255)
        else:
            return 0.78 * (0.2 ** 0.255)
    
    def _melville_angle_factor(self, angle: float) -> float:
        """Melville 角度系数 Kθ"""
        angle_rad = math.radians(abs(angle))
        return (math.cos(angle_rad) + math.sin(angle_rad)) ** 0.65
    
    # Sheppard 修正系数方法
    def _sheppard_shape_factor(self, shape: PierShape) -> float:
        """Sheppard 形状系数"""
        if shape == PierShape.CIRCULAR:
            return 1.0
        elif shape == PierShape.RECTANGULAR:
            return 1.3
        elif shape == PierShape.ELLIPTICAL:
            return 1.1
        else:
            return 1.25
    
    def _sheppard_angle_factor(self, angle: float) -> float:
        """Sheppard 角度系数"""
        angle_rad = math.radians(abs(angle))
        return 1.0 + 0.2 * math.sin(2 * angle_rad)
    
    def _sheppard_depth_factor(self, relative_depth: float) -> float:
        """Sheppard 水深系数"""
        if relative_depth > 3.0:
            return 1.0
        else:
            return 0.57 * math.log(2.24 * relative_depth)
    
    # 平衡时间估算方法
    def _estimate_equilibrium_time_hec18(self, scour_depth: float, velocity: float, d50: float) -> float:
        """HEC-18 平衡时间估算"""
        # 基于Cardoso & Bettess (1999)
        if scour_depth <= 0:
            return 0
        
        d50_m = d50 / 1000.0
        return 12.0 * (scour_depth ** 1.6) / (velocity * d50_m ** 0.4)
    
    def _estimate_equilibrium_time_melville(self, scour_depth: float, velocity: float, d50: float) -> float:
        """Melville 平衡时间估算"""
        if scour_depth <= 0:
            return 0
        
        d50_m = d50 / 1000.0
        return 8.5 * (scour_depth ** 1.8) / (velocity * d50_m ** 0.3)
    
    def _estimate_equilibrium_time_csu(self, scour_depth: float, velocity: float, d50: float) -> float:
        """CSU 平衡时间估算"""
        if scour_depth <= 0:
            return 0
        
        d50_m = d50 / 1000.0
        return 15.0 * (scour_depth ** 1.5) / (velocity * d50_m ** 0.5)
    
    def _estimate_equilibrium_time_sheppard(self, scour_depth: float, velocity: float, d50: float) -> float:
        """Sheppard 平衡时间估算"""
        if scour_depth <= 0:
            return 0
        
        d50_m = d50 / 1000.0
        return 10.0 * (scour_depth ** 1.7) / (velocity * d50_m ** 0.35)
    
    # 可信度评估方法
    def _assess_hec18_confidence(self, params: ScourParameters, dim_params: Dict, warnings: list) -> float:
        """评估HEC-18结果可信度"""
        confidence = 1.0
        
        # 弗劳德数影响
        if dim_params['froude'] > 0.8:
            confidence *= 0.8
        elif dim_params['froude'] < 0.2:
            confidence *= 0.9
        
        # 相对水深影响
        if dim_params['relative_depth'] < 2.0:
            confidence *= 0.85
        
        # 速度比影响
        if dim_params['velocity_ratio'] > 3.0:
            confidence *= 0.7
        elif dim_params['velocity_ratio'] < 0.5:
            confidence *= 0.8
        
        return max(confidence, 0.3)
    
    def _assess_melville_confidence(self, params: ScourParameters, dim_params: Dict, warnings: list) -> float:
        """评估Melville结果可信度"""
        confidence = 1.0
        
        if dim_params['froude'] > 1.0:
            confidence *= 0.7
        
        if params.pier_shape != PierShape.CIRCULAR:
            confidence *= 0.9
        
        return max(confidence, 0.4)
    
    def _assess_csu_confidence(self, params: ScourParameters, dim_params: Dict, warnings: list) -> float:
        """评估CSU结果可信度"""
        confidence = 1.0
        
        if params.pier_shape != PierShape.CIRCULAR:
            confidence *= 0.8
        
        if dim_params['relative_depth'] < 2.6:
            confidence *= 0.85
        
        return max(confidence, 0.4)
    
    def _assess_sheppard_confidence(self, params: ScourParameters, dim_params: Dict, warnings: list) -> float:
        """评估Sheppard结果可信度"""
        confidence = 1.0
        
        # Sheppard公式考虑了更多因素，通常更可靠
        if dim_params['reynolds'] < 2000 or dim_params['reynolds'] > 200000:
            confidence *= 0.9
        
        return max(confidence, 0.5)
    
    def solve(self, params: ScourParameters, method: str = "all") -> Dict[str, ScourResult]:
        """主求解方法"""
        results = {}
        
        if method == "all" or method == "HEC-18":
            results["HEC-18"] = self.hec18_formula(params)
        
        if method == "all" or method == "Melville-Coleman":
            results["Melville-Coleman"] = self.melville_coleman_formula(params)
        
        if method == "all" or method == "CSU":
            results["CSU"] = self.csu_formula(params)
        
        if method == "all" or method == "Sheppard-Miller":
            results["Sheppard-Miller"] = self.sheppard_miller_formula(params)
        
        return results
    
    def get_consensus_result(self, params: ScourParameters) -> ScourResult:
        """获取综合共识结果"""
        all_results = self.solve(params, "all")
        
        # 权重计算（基于可信度）
        total_weight = sum(result.confidence for result in all_results.values())
        
        if total_weight == 0:
            # 如果所有结果都不可信，返回最保守的估算
            max_scour = max(result.scour_depth for result in all_results.values())
            return ScourResult(
                scour_depth=max_scour,
                scour_width=max_scour * 4.0,
                equilibrium_time=24.0,
                critical_velocity=self.calculate_dimensional_parameters(params)['critical_velocity'],
                reynolds_number=self.calculate_dimensional_parameters(params)['reynolds'],
                froude_number=self.calculate_dimensional_parameters(params)['froude'],
                method="Conservative-Consensus",
                confidence=0.3,
                warnings=["所有方法可信度较低，采用保守估算"]
            )
        
        # 加权平均
        weighted_scour = sum(
            result.scour_depth * result.confidence 
            for result in all_results.values()
        ) / total_weight
        
        weighted_width = sum(
            result.scour_width * result.confidence 
            for result in all_results.values()
        ) / total_weight
        
        weighted_time = sum(
            result.equilibrium_time * result.confidence 
            for result in all_results.values()
        ) / total_weight
        
        # 综合可信度
        consensus_confidence = total_weight / len(all_results)
        
        # 收集所有警告
        all_warnings = []
        for result in all_results.values():
            all_warnings.extend(result.warnings)
        unique_warnings = list(set(all_warnings))
        
        dim_params = self.calculate_dimensional_parameters(params)
        
        return ScourResult(
            scour_depth=weighted_scour,
            scour_width=weighted_width,
            equilibrium_time=weighted_time,
            critical_velocity=dim_params['critical_velocity'],
            reynolds_number=dim_params['reynolds'],
            froude_number=dim_params['froude'],
            method="Weighted-Consensus",
            confidence=consensus_confidence,
            warnings=unique_warnings
        )


def create_test_parameters() -> ScourParameters:
    """创建测试参数"""
    return ScourParameters(
        pier_diameter=2.0,
        pier_shape=PierShape.CIRCULAR,
        pier_angle=0.0,
        flow_velocity=0.8,
        water_depth=3.0,
        approach_angle=0.0,
        d50=0.8,
        sediment_density=2650.0,
        water_density=1000.0,
        water_temperature=20.0
    )


if __name__ == "__main__":
    # 测试经验公式求解器
    solver = EmpiricalScourSolver()
    test_params = create_test_parameters()
    
    print("=== 桥墩冲刷经验公式求解器测试 ===")
    print(f"桥墩直径: {test_params.pier_diameter} m")
    print(f"流速: {test_params.flow_velocity} m/s")
    print(f"水深: {test_params.water_depth} m")
    print(f"沉积物粒径: {test_params.d50} mm")
    print()
    
    # 计算所有方法
    results = solver.solve(test_params, "all")
    
    for method, result in results.items():
        print(f"=== {method} 结果 ===")
        print(f"冲刷深度: {result.scour_depth:.3f} m")
        print(f"冲刷宽度: {result.scour_width:.3f} m")
        print(f"平衡时间: {result.equilibrium_time:.1f} h")
        print(f"雷诺数: {result.reynolds_number:.0f}")
        print(f"弗劳德数: {result.froude_number:.3f}")
        print(f"可信度: {result.confidence:.2f}")
        if result.warnings:
            print(f"警告: {'; '.join(result.warnings)}")
        print()
    
    # 综合结果
    consensus = solver.get_consensus_result(test_params)
    print(f"=== {consensus.method} ===")
    print(f"综合冲刷深度: {consensus.scour_depth:.3f} m")
    print(f"综合可信度: {consensus.confidence:.2f}")