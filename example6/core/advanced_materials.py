#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
高级材料和物理模型系统 - Advanced Materials and Physics Models
复杂材料本构关系、多相流模型、沉积物输运模型

Features:
- 非牛顿流体模型
- 多相流(水-气-沉积物)
- 复杂沉积物输运
- 河床演化模型
- 植被-流体相互作用
- 温度效应模型
"""

import numpy as np
import math
from typing import Dict, Any, List, Tuple, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod


class FluidType(Enum):
    """流体类型"""
    CLEAR_WATER = "clear_water"
    SEDIMENT_LADEN = "sediment_laden"
    DEBRIS_FLOW = "debris_flow"
    NON_NEWTONIAN = "non_newtonian"
    MULTIPHASE = "multiphase"


class SedimentType(Enum):
    """沉积物类型"""
    SAND = "sand"
    SILT = "silt"
    CLAY = "clay"
    GRAVEL = "gravel"
    COHESIVE = "cohesive"
    NON_COHESIVE = "non_cohesive"
    MIXED = "mixed"


class BedMaterial(Enum):
    """河床材料类型"""
    ALLUVIAL = "alluvial"      # 冲积层
    ROCK = "rock"              # 岩石
    CLAY = "clay"              # 粘土
    GRAVEL = "gravel"          # 砾石
    ARMOR_LAYER = "armor_layer"  # 护甲层


@dataclass
class FluidProperties:
    """流体物理性质"""
    # 基础物性
    density: float = 1000.0      # 密度 kg/m³
    viscosity: float = 1e-3      # 动力粘度 Pa·s
    temperature: float = 20.0    # 温度 °C
    
    # 非牛顿流体参数
    fluid_type: FluidType = FluidType.CLEAR_WATER
    consistency_index: float = 1.0      # 稠度系数
    flow_behavior_index: float = 1.0    # 流动指数
    yield_stress: float = 0.0           # 屈服应力 Pa
    
    # 多相流参数
    gas_fraction: float = 0.0           # 气相体积分数
    sediment_concentration: float = 0.0  # 泥沙浓度 kg/m³
    
    # 温度相关性
    thermal_expansion: float = 2.1e-4   # 热膨胀系数 1/K
    reference_temperature: float = 20.0  # 参考温度 °C


@dataclass
class SedimentProperties:
    """沉积物性质"""
    # 颗粒特性
    sediment_type: SedimentType = SedimentType.SAND
    density: float = 2650.0           # 颗粒密度 kg/m³
    d50: float = 0.5                  # 中值粒径 mm
    d90: float = 1.0                  # 90%通过粒径 mm
    d10: float = 0.1                  # 10%通过粒径 mm
    
    # 级配参数
    uniformity_coefficient: float = 2.0  # 不均匀系数 Cu = d60/d10
    curvature_coefficient: float = 1.0   # 曲率系数 Cc = d30²/(d60×d10)
    
    # 沉降特性
    settling_velocity: float = 0.05    # 沉降速度 m/s
    drag_coefficient: float = 1.0      # 阻力系数
    
    # 粘性土参数
    cohesion: float = 0.0             # 粘聚力 Pa
    friction_angle: float = 30.0       # 内摩擦角 度
    plasticity_index: float = 0.0     # 塑性指数
    
    # 侵蚀参数
    critical_shear_stress: float = 0.1  # 临界剪切应力 Pa
    erosion_rate_constant: float = 1e-5 # 侵蚀速率常数
    
    # 化学性质
    ph_value: float = 7.0             # pH值
    salinity: float = 0.0             # 盐度


@dataclass
class BedProperties:
    """河床性质"""
    # 床面材料
    bed_material: BedMaterial = BedMaterial.ALLUVIAL
    bed_roughness: float = 0.03       # 床面糙率 m
    bed_slope: float = 0.001          # 床面坡度
    
    # 孔隙结构
    porosity: float = 0.4             # 孔隙率
    permeability: float = 1e-12       # 渗透率 m²
    
    # 力学性质
    bed_density: float = 1800.0       # 床面密度 kg/m³
    youngs_modulus: float = 1e6       # 弹性模量 Pa
    poisson_ratio: float = 0.3        # 泊松比
    
    # 侵蚀阻力
    critical_shields_number: float = 0.047  # 临界希尔兹数
    armor_layer_thickness: float = 0.0      # 护甲层厚度 m
    consolidation_factor: float = 1.0       # 固结因子


class ViscosityModel(ABC):
    """粘度模型基类"""
    
    @abstractmethod
    def compute_viscosity(self, shear_rate: float, temperature: float, **kwargs) -> float:
        """计算粘度"""
        pass


class NewtonianViscosity(ViscosityModel):
    """牛顿流体粘度模型"""
    
    def __init__(self, viscosity: float):
        self.viscosity = viscosity
    
    def compute_viscosity(self, shear_rate: float, temperature: float, **kwargs) -> float:
        """牛顿流体粘度不依赖剪切率"""
        # 考虑温度效应
        temp_factor = math.exp(-0.025 * (temperature - 20.0))
        return self.viscosity * temp_factor


class PowerLawViscosity(ViscosityModel):
    """幂律流体粘度模型"""
    
    def __init__(self, consistency_index: float, flow_behavior_index: float):
        self.K = consistency_index
        self.n = flow_behavior_index
    
    def compute_viscosity(self, shear_rate: float, temperature: float, **kwargs) -> float:
        """幂律流体: τ = K * γ^n"""
        if shear_rate <= 0:
            return float('inf')
        return self.K * (shear_rate ** (self.n - 1))


class BinghamViscosity(ViscosityModel):
    """宾汉流体粘度模型"""
    
    def __init__(self, yield_stress: float, plastic_viscosity: float):
        self.tau_y = yield_stress
        self.mu_p = plastic_viscosity
    
    def compute_viscosity(self, shear_rate: float, temperature: float, **kwargs) -> float:
        """宾汉流体: τ = τ_y + μ_p * γ"""
        if shear_rate <= 0:
            return float('inf')
        return self.tau_y / shear_rate + self.mu_p


class CarreauViscosity(ViscosityModel):
    """Carreau模型 - 适用于聚合物溶液"""
    
    def __init__(self, zero_viscosity: float, infinite_viscosity: float,
                 time_constant: float, power_index: float):
        self.mu_0 = zero_viscosity
        self.mu_inf = infinite_viscosity
        self.lambda_c = time_constant
        self.n = power_index
    
    def compute_viscosity(self, shear_rate: float, temperature: float, **kwargs) -> float:
        """Carreau模型"""
        term = 1 + (self.lambda_c * shear_rate) ** 2
        return self.mu_inf + (self.mu_0 - self.mu_inf) * term ** ((self.n - 1) / 2)


class SedimentTransportModel(ABC):
    """沉积物输运模型基类"""
    
    @abstractmethod
    def compute_transport_rate(self, velocity: float, shear_stress: float,
                              sediment_props: SedimentProperties,
                              fluid_props: FluidProperties) -> float:
        """计算输沙率"""
        pass


class MeyerPeterMullerModel(SedimentTransportModel):
    """Meyer-Peter-Muller输沙公式"""
    
    def compute_transport_rate(self, velocity: float, shear_stress: float,
                              sediment_props: SedimentProperties,
                              fluid_props: FluidProperties) -> float:
        """MPM公式计算推移质输沙率"""
        g = 9.81
        s = sediment_props.density / fluid_props.density  # 相对密度
        d = sediment_props.d50 / 1000.0  # 转换为米
        
        # 临界剪切应力
        tau_c = 0.047 * (s - 1) * fluid_props.density * g * d
        
        # 希尔兹参数
        theta = shear_stress / ((s - 1) * fluid_props.density * g * d)
        theta_c = 0.047
        
        if theta <= theta_c:
            return 0.0
        
        # MPM公式
        phi = 8.0 * (theta - theta_c) ** 1.5
        
        # 单宽输沙率 kg/(m·s)
        q_s = phi * math.sqrt((s - 1) * g * d**3) * sediment_props.density
        
        return q_s


class EngelundHansenModel(SedimentTransportModel):
    """Engelund-Hansen全沙输沙模型"""
    
    def compute_transport_rate(self, velocity: float, shear_stress: float,
                              sediment_props: SedimentProperties,
                              fluid_props: FluidProperties) -> float:
        """E-H公式计算全沙输沙率"""
        g = 9.81
        s = sediment_props.density / fluid_props.density
        d = sediment_props.d50 / 1000.0
        
        # 摩阻流速
        u_star = math.sqrt(shear_stress / fluid_props.density)
        
        # 希尔兹参数
        theta = shear_stress / ((s - 1) * fluid_props.density * g * d)
        
        # E-H公式
        phi = 0.05 * theta ** 2.5 / ((s - 1) ** 2)
        
        # 单宽输沙率
        q_s = phi * velocity**3 / ((s - 1) * g)
        
        return q_s * sediment_props.density


class VanRijnModel(SedimentTransportModel):
    """Van Rijn分层输沙模型"""
    
    def compute_transport_rate(self, velocity: float, shear_stress: float,
                              sediment_props: SedimentProperties,
                              fluid_props: FluidProperties) -> float:
        """Van Rijn公式分别计算推移质和悬移质"""
        g = 9.81
        s = sediment_props.density / fluid_props.density
        d = sediment_props.d50 / 1000.0
        nu = fluid_props.viscosity / fluid_props.density
        
        # 摩阻流速
        u_star = math.sqrt(shear_stress / fluid_props.density)
        
        # 无量纲颗粒直径
        d_star = d * ((s - 1) * g / nu**2) ** (1/3)
        
        # 临界希尔兹参数
        if d_star <= 4:
            theta_cr = 0.24 / d_star
        elif d_star <= 10:
            theta_cr = 0.14 / d_star**0.64
        elif d_star <= 20:
            theta_cr = 0.04 / d_star**0.1
        elif d_star <= 150:
            theta_cr = 0.013 * d_star**0.29
        else:
            theta_cr = 0.055
        
        # 希尔兹参数
        theta = shear_stress / ((s - 1) * fluid_props.density * g * d)
        
        if theta <= theta_cr:
            return 0.0
        
        # 推移质输沙率
        T = (theta - theta_cr) / theta_cr
        if T <= 3:
            phi_b = 0.053 * T**1.5 / d_star**0.3
        else:
            phi_b = 0.1 * T**1.5 / d_star**0.3
        
        q_b = phi_b * math.sqrt((s - 1) * g * d**3) * sediment_props.density
        
        # 悬移质输沙率 (简化)
        if T > 1:
            phi_s = 0.012 * d_star * T**1.2 / ((s - 1)**2 * g)**0.6
            q_s = phi_s * velocity**3 * sediment_props.density / g
        else:
            q_s = 0.0
        
        return q_b + q_s


class BedEvolutionModel:
    """河床演化模型"""
    
    def __init__(self, bed_props: BedProperties):
        self.bed_props = bed_props
        self.armor_development = False
        
    def compute_bed_change(self, sediment_flux_gradient: float,
                          bed_shear_stress: float,
                          dt: float) -> float:
        """计算河床变化"""
        # Exner方程
        porosity = self.bed_props.porosity
        bed_density = self.bed_props.bed_density
        
        # 河床高程变化率
        dzb_dt = -sediment_flux_gradient / ((1 - porosity) * bed_density)
        
        # 考虑侵蚀阻力
        erosion_resistance = self.compute_erosion_resistance(bed_shear_stress)
        dzb_dt *= erosion_resistance
        
        # 河床高程变化
        dzb = dzb_dt * dt
        
        # 护甲层发展
        if self.armor_development:
            dzb = self.apply_armor_effect(dzb, bed_shear_stress)
        
        return dzb
    
    def compute_erosion_resistance(self, bed_shear_stress: float) -> float:
        """计算侵蚀阻力因子"""
        tau_cr = self.bed_props.critical_shields_number * 9.81 * 1000 * 0.001  # 简化
        
        if bed_shear_stress < tau_cr:
            return 0.0
        else:
            # 超线性增长的侵蚀率
            return (bed_shear_stress / tau_cr - 1.0) ** 1.5
    
    def apply_armor_effect(self, dzb: float, bed_shear_stress: float) -> float:
        """应用护甲层效应"""
        armor_thickness = self.bed_props.armor_layer_thickness
        
        if armor_thickness > 0 and dzb < 0:  # 冲刷情况
            # 护甲层减缓冲刷
            armor_factor = max(0.1, 1.0 - armor_thickness / 0.1)  # 最多减少90%
            dzb *= armor_factor
        
        return dzb


class AdvancedPhysicsManager:
    """高级物理模型管理器"""
    
    def __init__(self):
        self.fluid_props = FluidProperties()
        self.sediment_props = SedimentProperties()
        self.bed_props = BedProperties()
        
        # 模型选择
        self.viscosity_model = NewtonianViscosity(self.fluid_props.viscosity)
        self.transport_model = VanRijnModel()
        self.bed_evolution_model = BedEvolutionModel(self.bed_props)
        
        # 环境因子
        self.vegetation_effects = False
        self.temperature_effects = True
        self.salinity_effects = False
    
    def setup_fluid_model(self, fluid_type: FluidType, **kwargs):
        """设置流体模型"""
        self.fluid_props.fluid_type = fluid_type
        
        if fluid_type == FluidType.CLEAR_WATER:
            self.viscosity_model = NewtonianViscosity(self.fluid_props.viscosity)
            
        elif fluid_type == FluidType.NON_NEWTONIAN:
            model_type = kwargs.get('model_type', 'power_law')
            
            if model_type == 'power_law':
                self.viscosity_model = PowerLawViscosity(
                    kwargs.get('consistency_index', 1.0),
                    kwargs.get('flow_behavior_index', 1.0)
                )
            elif model_type == 'bingham':
                self.viscosity_model = BinghamViscosity(
                    kwargs.get('yield_stress', 0.0),
                    kwargs.get('plastic_viscosity', 1e-3)
                )
            elif model_type == 'carreau':
                self.viscosity_model = CarreauViscosity(
                    kwargs.get('zero_viscosity', 1.0),
                    kwargs.get('infinite_viscosity', 1e-3),
                    kwargs.get('time_constant', 1.0),
                    kwargs.get('power_index', 0.5)
                )
        
        elif fluid_type == FluidType.SEDIMENT_LADEN:
            # 含沙水流的有效粘度
            concentration = kwargs.get('sediment_concentration', 0.1)
            self.fluid_props.sediment_concentration = concentration
            
            # Einstein公式修正粘度
            effective_viscosity = self.fluid_props.viscosity * (1 + 2.5 * concentration)
            self.viscosity_model = NewtonianViscosity(effective_viscosity)
    
    def setup_sediment_model(self, sediment_type: SedimentType, **kwargs):
        """设置沉积物模型"""
        self.sediment_props.sediment_type = sediment_type
        
        # 根据沉积物类型选择输运模型
        if sediment_type in [SedimentType.SAND, SedimentType.GRAVEL]:
            self.transport_model = MeyerPeterMullerModel()  # 推移质为主
        elif sediment_type == SedimentType.SILT:
            self.transport_model = VanRijnModel()  # 悬移质为主
        elif sediment_type == SedimentType.COHESIVE:
            # 粘性土需要特殊处理
            self.transport_model = self.create_cohesive_transport_model()
        else:
            self.transport_model = EngelundHansenModel()  # 全沙模型
    
    def create_cohesive_transport_model(self):
        """创建粘性土输运模型"""
        class CohesiveTransportModel(SedimentTransportModel):
            def compute_transport_rate(self, velocity, shear_stress, sediment_props, fluid_props):
                # 粘性土侵蚀率与剪切应力的指数关系
                if shear_stress < sediment_props.critical_shear_stress:
                    return 0.0
                
                excess_stress = shear_stress - sediment_props.critical_shear_stress
                erosion_rate = sediment_props.erosion_rate_constant * excess_stress**1.5
                
                return erosion_rate
        
        return CohesiveTransportModel()
    
    def compute_effective_viscosity(self, shear_rate: float, temperature: float) -> float:
        """计算有效粘度"""
        base_viscosity = self.viscosity_model.compute_viscosity(shear_rate, temperature)
        
        # 温度修正
        if self.temperature_effects:
            temp_factor = math.exp(-0.025 * (temperature - self.fluid_props.reference_temperature))
            base_viscosity *= temp_factor
        
        # 含沙量修正
        if self.fluid_props.sediment_concentration > 0:
            conc_factor = 1 + 2.5 * self.fluid_props.sediment_concentration
            base_viscosity *= conc_factor
        
        # 盐度修正
        if self.salinity_effects and self.sediment_props.ph_value != 7.0:
            ph_factor = 1.0 + 0.1 * abs(self.sediment_props.ph_value - 7.0)
            base_viscosity *= ph_factor
        
        return base_viscosity
    
    def compute_sediment_transport(self, velocity: float, shear_stress: float) -> Dict[str, float]:
        """计算沉积物输运"""
        # 基础输沙率
        transport_rate = self.transport_model.compute_transport_rate(
            velocity, shear_stress, self.sediment_props, self.fluid_props
        )
        
        # 环境因子修正
        if self.vegetation_effects:
            vegetation_factor = self.compute_vegetation_effect(velocity)
            transport_rate *= vegetation_factor
        
        # 温度效应
        if self.temperature_effects:
            temp_factor = self.compute_temperature_effect()
            transport_rate *= temp_factor
        
        return {
            'transport_rate': transport_rate,
            'bedload_rate': transport_rate * 0.7,  # 假设70%推移质
            'suspended_rate': transport_rate * 0.3  # 30%悬移质
        }
    
    def compute_vegetation_effect(self, velocity: float) -> float:
        """计算植被效应"""
        # 简化的植被阻力模型
        if velocity < 0.5:
            return 0.5  # 低速时植被显著减少输沙
        elif velocity < 1.0:
            return 0.8  # 中速时部分减少
        else:
            return 1.0  # 高速时植被效应减弱
    
    def compute_temperature_effect(self) -> float:
        """计算温度效应"""
        temp_diff = self.fluid_props.temperature - self.fluid_props.reference_temperature
        
        # 温度影响沉降速度和粘度
        temp_factor = 1.0 + 0.02 * temp_diff  # 温度升高增加活跃度
        
        return max(0.5, min(2.0, temp_factor))
    
    def update_bed_evolution(self, sediment_flux_gradient: float,
                           bed_shear_stress: float, dt: float) -> float:
        """更新河床演化"""
        return self.bed_evolution_model.compute_bed_change(
            sediment_flux_gradient, bed_shear_stress, dt
        )
    
    def get_material_summary(self) -> Dict[str, Any]:
        """获取材料属性摘要"""
        return {
            'fluid_properties': {
                'type': self.fluid_props.fluid_type.value,
                'density': self.fluid_props.density,
                'viscosity': self.fluid_props.viscosity,
                'temperature': self.fluid_props.temperature,
                'sediment_concentration': self.fluid_props.sediment_concentration
            },
            'sediment_properties': {
                'type': self.sediment_props.sediment_type.value,
                'density': self.sediment_props.density,
                'd50': self.sediment_props.d50,
                'critical_shear_stress': self.sediment_props.critical_shear_stress,
                'cohesion': self.sediment_props.cohesion
            },
            'bed_properties': {
                'material': self.bed_props.bed_material.value,
                'roughness': self.bed_props.bed_roughness,
                'porosity': self.bed_props.porosity,
                'critical_shields': self.bed_props.critical_shields_number
            },
            'models': {
                'viscosity_model': type(self.viscosity_model).__name__,
                'transport_model': type(self.transport_model).__name__,
                'vegetation_effects': self.vegetation_effects,
                'temperature_effects': self.temperature_effects
            }
        }


# 便利函数
def create_clear_water_properties(temperature: float = 20.0) -> FluidProperties:
    """创建清水属性"""
    return FluidProperties(
        fluid_type=FluidType.CLEAR_WATER,
        temperature=temperature,
        density=1000.0,
        viscosity=1e-3
    )


def create_sand_properties(d50: float = 0.5) -> SedimentProperties:
    """创建砂土属性"""
    return SedimentProperties(
        sediment_type=SedimentType.SAND,
        d50=d50,
        d90=d50 * 2.0,
        d10=d50 * 0.2,
        density=2650.0,
        critical_shear_stress=0.1
    )


def create_alluvial_bed_properties() -> BedProperties:
    """创建冲积河床属性"""
    return BedProperties(
        bed_material=BedMaterial.ALLUVIAL,
        bed_roughness=0.03,
        porosity=0.4,
        critical_shields_number=0.047
    )


if __name__ == "__main__":
    # 测试高级材料模型
    print("=== 高级材料和物理模型测试 ===")
    
    # 创建物理模型管理器
    physics = AdvancedPhysicsManager()
    
    # 设置清水流动
    physics.setup_fluid_model(FluidType.CLEAR_WATER)
    physics.setup_sediment_model(SedimentType.SAND)
    
    print("基础配置:")
    summary = physics.get_material_summary()
    for category, props in summary.items():
        print(f"  {category}: {props}")
    
    # 测试粘度计算
    shear_rate = 10.0
    temperature = 25.0
    viscosity = physics.compute_effective_viscosity(shear_rate, temperature)
    print(f"\n有效粘度: {viscosity:.2e} Pa·s")
    
    # 测试输沙计算
    velocity = 1.0
    shear_stress = 2.0
    transport = physics.compute_sediment_transport(velocity, shear_stress)
    print(f"输沙率: {transport}")
    
    # 测试河床演化
    flux_gradient = -0.01
    bed_stress = 1.5
    dt = 3600.0  # 1小时
    bed_change = physics.update_bed_evolution(flux_gradient, bed_stress, dt)
    print(f"河床变化: {bed_change:.6f} m")
    
    # 测试非牛顿流体
    print("\n=== 非牛顿流体测试 ===")
    physics.setup_fluid_model(
        FluidType.NON_NEWTONIAN,
        model_type='power_law',
        consistency_index=0.5,
        flow_behavior_index=0.8
    )
    
    for sr in [0.1, 1.0, 10.0, 100.0]:
        visc = physics.compute_effective_viscosity(sr, 20.0)
        print(f"剪切率 {sr:6.1f} s⁻¹: 粘度 {visc:.3e} Pa·s")
    
    print("\n=== 粘性土输运测试 ===")
    physics.setup_sediment_model(SedimentType.COHESIVE)
    
    for stress in [0.05, 0.1, 0.2, 0.5, 1.0]:
        transport = physics.compute_sediment_transport(1.0, stress)
        print(f"剪切应力 {stress:.2f} Pa: 输沙率 {transport['transport_rate']:.2e} kg/(m·s)")