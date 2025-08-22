#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
统一冲刷计算器 - Unified Scour Calculator
简化的冲刷计算核心模块，整合所有计算方法

优化特点:
- 统一的计算接口
- 简单高效的缓存机制
- 明确的错误处理
- 易于扩展的架构
"""

import math
import numpy as np
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import hashlib
import time
from functools import lru_cache

# 导入原有的数据模型
from .empirical_solver import ScourParameters, ScourResult, PierShape


class CalculationMethod(Enum):
    """计算方法枚举"""
    HEC18 = "hec18"
    MELVILLE_CHIEW = "melville_chiew"
    CSU = "csu"
    SHEPPARD_MILLER = "sheppard_miller"


@dataclass
class CalculationConfig:
    """简化的计算配置"""
    method: CalculationMethod = CalculationMethod.HEC18
    enable_cache: bool = True
    cache_size: int = 100
    timeout_seconds: float = 30.0
    precision: int = 3  # 结果精度


class ScourCalculator:
    """统一的冲刷计算器"""
    
    def __init__(self, config: Optional[CalculationConfig] = None):
        self.config = config or CalculationConfig()
        self.cache = {}
        self.cache_hits = 0
        self.cache_misses = 0
        
        # 计算方法映射
        self.methods = {
            CalculationMethod.HEC18: self._calculate_hec18,
            CalculationMethod.MELVILLE_CHIEW: self._calculate_melville_chiew,
            CalculationMethod.CSU: self._calculate_csu,
            CalculationMethod.SHEPPARD_MILLER: self._calculate_sheppard_miller
        }
    
    def calculate(self, parameters: ScourParameters, 
                 method: Optional[CalculationMethod] = None) -> ScourResult:
        """
        统一计算接口
        
        Args:
            parameters: 冲刷计算参数
            method: 计算方法，默认使用配置中的方法
            
        Returns:
            ScourResult: 计算结果
        """
        method = method or self.config.method
        
        # 参数验证
        if not self._validate_parameters(parameters):
            return ScourResult(
                scour_depth=0.0,
                success=False,
                error_message="参数验证失败"
            )
        
        # 检查缓存
        if self.config.enable_cache:
            cache_key = self._generate_cache_key(parameters, method)
            cached_result = self._get_from_cache(cache_key)
            if cached_result:
                self.cache_hits += 1
                return cached_result
            self.cache_misses += 1
        
        # 执行计算
        start_time = time.time()
        try:
            calc_function = self.methods.get(method)
            if not calc_function:
                raise ValueError(f"不支持的计算方法: {method}")
            
            result = calc_function(parameters)
            
            # 检查超时
            if time.time() - start_time > self.config.timeout_seconds:
                return ScourResult(
                    scour_depth=0.0,
                    success=False,
                    error_message="计算超时"
                )
            
            # 精度处理
            result.scour_depth = round(result.scour_depth, self.config.precision)
            
            # 缓存结果
            if self.config.enable_cache and result.success:
                self._store_in_cache(cache_key, result)
            
            return result
            
        except Exception as e:
            return ScourResult(
                scour_depth=0.0,
                success=False,
                error_message=f"计算错误: {str(e)}"
            )
    
    def calculate_multiple(self, parameters: ScourParameters, 
                          methods: List[CalculationMethod]) -> Dict[CalculationMethod, ScourResult]:
        """
        多方法对比计算
        
        Args:
            parameters: 冲刷计算参数
            methods: 计算方法列表
            
        Returns:
            Dict: 方法名到结果的映射
        """
        results = {}
        for method in methods:
            results[method] = self.calculate(parameters, method)
        return results
    
    def get_method_info(self, method: CalculationMethod) -> Dict[str, Any]:
        """获取计算方法信息"""
        method_info = {
            CalculationMethod.HEC18: {
                'name': 'HEC-18公式',
                'description': '美国联邦公路管理局推荐公式',
                'reference': 'Richardson & Davis (2001)',
                'suitable_for': ['general', 'clear_water', 'live_bed'],
                'precision': 'medium',
                'speed': 'fast'
            },
            CalculationMethod.MELVILLE_CHIEW: {
                'name': 'Melville-Chiew公式',
                'description': '考虑时间发展的清水冲刷公式',
                'reference': 'Melville & Chiew (1999)',
                'suitable_for': ['clear_water', 'long_term'],
                'precision': 'high',
                'speed': 'medium'
            },
            CalculationMethod.CSU: {
                'name': 'CSU公式',
                'description': '科罗拉多州立大学公式',
                'reference': 'Richardson & Davis (1995)',
                'suitable_for': ['general', 'non_uniform_sediment'],
                'precision': 'medium',
                'speed': 'fast'
            },
            CalculationMethod.SHEPPARD_MILLER: {
                'name': 'Sheppard-Miller公式',
                'description': '复杂流场修正公式',
                'reference': 'Sheppard & Miller (2006)',
                'suitable_for': ['complex_flow', 'skewed_piers'],
                'precision': 'high',
                'speed': 'slow'
            }
        }
        return method_info.get(method, {})
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        total_requests = self.cache_hits + self.cache_misses
        hit_rate = (self.cache_hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'cache_size': len(self.cache),
            'cache_hits': self.cache_hits,
            'cache_misses': self.cache_misses,
            'hit_rate_percent': round(hit_rate, 1),
            'max_cache_size': self.config.cache_size
        }
    
    def clear_cache(self):
        """清空缓存"""
        self.cache.clear()
        self.cache_hits = 0
        self.cache_misses = 0
    
    def _validate_parameters(self, params: ScourParameters) -> bool:
        """参数验证"""
        if params.pier_diameter <= 0:
            return False
        if params.flow_velocity < 0:
            return False
        if params.water_depth <= 0:
            return False
        if params.d50 <= 0:
            return False
        return True
    
    def _generate_cache_key(self, params: ScourParameters, method: CalculationMethod) -> str:
        """生成缓存键"""
        # 创建参数字符串
        param_str = f"{method.value}_{params.pier_diameter}_{params.flow_velocity}_{params.water_depth}_{params.d50}_{params.pier_shape.value}"
        
        # 使用MD5哈希生成短键
        return hashlib.md5(param_str.encode()).hexdigest()[:16]
    
    def _get_from_cache(self, cache_key: str) -> Optional[ScourResult]:
        """从缓存获取结果"""
        return self.cache.get(cache_key)
    
    def _store_in_cache(self, cache_key: str, result: ScourResult):
        """存储结果到缓存"""
        # 如果缓存已满，移除最旧的项
        if len(self.cache) >= self.config.cache_size:
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
        
        self.cache[cache_key] = result
    
    # =================================================================
    # 具体计算方法实现
    # =================================================================
    
    def _calculate_hec18(self, params: ScourParameters) -> ScourResult:
        """HEC-18公式计算"""
        try:
            # 基本参数
            D = params.pier_diameter  # 桥墩宽度 (m)
            V = params.flow_velocity   # 流速 (m/s)
            h = params.water_depth     # 水深 (m)
            d50 = params.d50 / 1000.0  # 粒径转换为米
            
            # 形状系数
            K1 = self._get_shape_factor_hec18(params.pier_shape)
            
            # 流速比系数
            Vc = self._calculate_critical_velocity(d50, h)
            if V < Vc:
                # 清水冲刷
                K2 = 1.0
            else:
                # 活床冲刷
                K2 = 1.0
            
            # 角度系数（简化）
            K3 = 1.0
            
            # 床面条件系数
            K4 = 1.0
            
            # HEC-18公式
            ds = 2.0 * K1 * K2 * K3 * K4 * D**0.65 * h**0.35 / (d50**0.1)
            
            # 限制最大冲刷深度
            ds_max = 2.4 * D
            ds = min(ds, ds_max)
            
            return ScourResult(
                scour_depth=ds,
                success=True,
                computation_time=0.001,  # 快速计算
                method_used="HEC-18",
                parameters_used=params
            )
            
        except Exception as e:
            return ScourResult(
                scour_depth=0.0,
                success=False,
                error_message=f"HEC-18计算错误: {str(e)}"
            )
    
    def _calculate_melville_chiew(self, params: ScourParameters) -> ScourResult:
        """Melville-Chiew公式计算"""
        try:
            D = params.pier_diameter
            V = params.flow_velocity
            h = params.water_depth
            d50 = params.d50 / 1000.0
            
            # 计算临界速度
            Vc = self._calculate_critical_velocity(d50, h)
            
            if V >= Vc:
                return ScourResult(
                    scour_depth=0.0,
                    success=False,
                    error_message="Melville-Chiew公式仅适用于清水冲刷条件"
                )
            
            # 深度系数
            Kh = min(h/D, 2.6) if h/D <= 2.6 else 2.6
            
            # 粒径系数
            Kd = 1.0  # 简化处理
            
            # 形状系数
            Ks = self._get_shape_factor_melville(params.pier_shape)
            
            # Melville-Chiew公式
            ds = Kh * Ks * Kd * D
            
            return ScourResult(
                scour_depth=ds,
                success=True,
                computation_time=0.002,
                method_used="Melville-Chiew",
                parameters_used=params
            )
            
        except Exception as e:
            return ScourResult(
                scour_depth=0.0,
                success=False,
                error_message=f"Melville-Chiew计算错误: {str(e)}"
            )
    
    def _calculate_csu(self, params: ScourParameters) -> ScourResult:
        """CSU公式计算"""
        try:
            D = params.pier_diameter
            V = params.flow_velocity
            h = params.water_depth
            d50 = params.d50 / 1000.0
            
            # CSU公式 (简化版本)
            # ds/D = 2.0 * (h/D)^0.35 * (V/Vc)^0.43
            
            Vc = self._calculate_critical_velocity(d50, h)
            
            if V <= 0 or Vc <= 0:
                return ScourResult(
                    scour_depth=0.0,
                    success=False,
                    error_message="流速或临界流速无效"
                )
            
            # CSU公式
            ds_over_D = 2.0 * (h/D)**0.35 * (V/Vc)**0.43
            ds = ds_over_D * D
            
            # 形状修正
            shape_factor = self._get_shape_factor_hec18(params.pier_shape)
            ds *= shape_factor
            
            return ScourResult(
                scour_depth=ds,
                success=True,
                computation_time=0.002,
                method_used="CSU",
                parameters_used=params
            )
            
        except Exception as e:
            return ScourResult(
                scour_depth=0.0,
                success=False,
                error_message=f"CSU计算错误: {str(e)}"
            )
    
    def _calculate_sheppard_miller(self, params: ScourParameters) -> ScourResult:
        """Sheppard-Miller公式计算"""
        try:
            D = params.pier_diameter
            V = params.flow_velocity
            h = params.water_depth
            d50 = params.d50 / 1000.0
            
            # Sheppard-Miller公式 (简化实现)
            # 考虑更多复杂因素的修正
            
            # 基础HEC-18计算
            base_result = self._calculate_hec18(params)
            if not base_result.success:
                return base_result
            
            ds_base = base_result.scour_depth
            
            # Sheppard-Miller修正因子
            # 考虑桥墩角度效应
            angle_correction = 1.0 + 0.2 * abs(params.approach_angle) / 90.0
            
            # 复杂流场修正
            flow_complexity = 1.0 + 0.1 * (V / self._calculate_critical_velocity(d50, h))
            
            # 应用修正
            ds = ds_base * angle_correction * flow_complexity
            
            return ScourResult(
                scour_depth=ds,
                success=True,
                computation_time=0.005,  # 稍慢，因为更复杂
                method_used="Sheppard-Miller",
                parameters_used=params
            )
            
        except Exception as e:
            return ScourResult(
                scour_depth=0.0,
                success=False,
                error_message=f"Sheppard-Miller计算错误: {str(e)}"
            )
    
    # =================================================================
    # 辅助计算函数
    # =================================================================
    
    def _calculate_critical_velocity(self, d50: float, h: float) -> float:
        """计算临界流速"""
        g = 9.81
        s = 2.65  # 相对密度
        
        # Shields参数
        theta_c = 0.047  # 临界Shields参数
        
        # 临界剪切速度
        u_star_c = math.sqrt(theta_c * (s - 1) * g * d50)
        
        # 临界平均流速 (使用对数流速分布)
        kappa = 0.41  # von Karman常数
        z0 = d50 / 30.0  # 粗糙高度
        
        if z0 > 0 and h > z0:
            Vc = u_star_c / kappa * math.log(h / z0)
        else:
            Vc = u_star_c * 10  # 简化近似
        
        return max(Vc, 0.1)  # 避免过小的值
    
    def _get_shape_factor_hec18(self, shape: PierShape) -> float:
        """获取HEC-18形状系数"""
        factors = {
            PierShape.CIRCULAR: 1.0,
            PierShape.RECTANGULAR: 1.3,
            PierShape.ELLIPTICAL: 0.9,
            PierShape.COMPLEX: 1.2
        }
        return factors.get(shape, 1.0)
    
    def _get_shape_factor_melville(self, shape: PierShape) -> float:
        """获取Melville形状系数"""
        factors = {
            PierShape.CIRCULAR: 1.0,
            PierShape.RECTANGULAR: 1.3,
            PierShape.ELLIPTICAL: 0.9,
            PierShape.COMPLEX: 1.2
        }
        return factors.get(shape, 1.0)


# 便利函数
def quick_calculate(pier_diameter: float, flow_velocity: float, 
                   water_depth: float, d50: float, 
                   method: CalculationMethod = CalculationMethod.HEC18) -> ScourResult:
    """快速计算接口"""
    params = ScourParameters(
        pier_diameter=pier_diameter,
        pier_shape=PierShape.CIRCULAR,
        flow_velocity=flow_velocity,
        water_depth=water_depth,
        d50=d50
    )
    
    calculator = ScourCalculator()
    return calculator.calculate(params, method)


def compare_methods(pier_diameter: float, flow_velocity: float, 
                   water_depth: float, d50: float) -> Dict[str, float]:
    """对比所有方法的计算结果"""
    params = ScourParameters(
        pier_diameter=pier_diameter,
        pier_shape=PierShape.CIRCULAR,
        flow_velocity=flow_velocity,
        water_depth=water_depth,
        d50=d50
    )
    
    calculator = ScourCalculator()
    methods = list(CalculationMethod)
    results = calculator.calculate_multiple(params, methods)
    
    # 返回简化结果
    comparison = {}
    for method, result in results.items():
        if result.success:
            comparison[method.value] = result.scour_depth
        else:
            comparison[method.value] = None
    
    return comparison


if __name__ == "__main__":
    # 测试代码
    print("=== 统一冲刷计算器测试 ===")
    
    # 创建测试参数
    test_params = ScourParameters(
        pier_diameter=2.0,
        pier_shape=PierShape.CIRCULAR,
        flow_velocity=1.5,
        water_depth=4.0,
        d50=0.8
    )
    
    # 创建计算器
    calculator = ScourCalculator()
    
    # 测试单一方法
    result = calculator.calculate(test_params, CalculationMethod.HEC18)
    print(f"HEC-18结果: {result.scour_depth:.3f}m (成功: {result.success})")
    
    # 测试多方法对比
    methods = [CalculationMethod.HEC18, CalculationMethod.MELVILLE_CHIEW, CalculationMethod.CSU]
    multi_results = calculator.calculate_multiple(test_params, methods)
    
    print("\n多方法对比:")
    for method, result in multi_results.items():
        if result.success:
            print(f"  {method.value}: {result.scour_depth:.3f}m")
        else:
            print(f"  {method.value}: 计算失败 - {result.error_message}")
    
    # 测试缓存性能
    print(f"\n缓存统计: {calculator.get_cache_stats()}")
    
    # 测试便利函数
    quick_result = quick_calculate(2.0, 1.5, 4.0, 0.8)
    print(f"\n快速计算结果: {quick_result.scour_depth:.3f}m")
    
    print("\n=== 测试完成 ===")