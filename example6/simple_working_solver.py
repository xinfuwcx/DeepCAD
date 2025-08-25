#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化但能工作的冲刷求解器 - 专门为3D流场分析设计
"""

import math
from dataclasses import dataclass
from enum import Enum

class PierShape(Enum):
    CIRCULAR = "circular"
    RECTANGULAR = "rectangular"

@dataclass
class SimpleScourParams:
    pier_diameter: float
    flow_velocity: float  
    water_depth: float
    d50: float = 0.8
    sediment_density: float = 2650.0
    water_density: float = 1000.0
    gravity: float = 9.81

@dataclass  
class SimpleResult:
    scour_depth: float
    reynolds_number: float
    froude_number: float
    success: bool = True

class SimpleWorkingSolver:
    """简化但真正能工作的求解器"""
    
    def __init__(self):
        self.name = "简化工作求解器"
    
    def calculate_scour(self, params: SimpleScourParams) -> SimpleResult:
        """使用简化的HEC-18公式"""
        try:
            # 基础参数
            V = params.flow_velocity
            D = params.pier_diameter
            H = params.water_depth
            d50_m = params.d50 / 1000.0
            g = params.gravity
            
            # 流体参数
            nu = 1e-6  # 运动粘度
            reynolds = V * D / nu
            froude = V / math.sqrt(g * H)
            
            # 简化HEC-18公式: ds/D = 2.0 * K1 * (V/Vc)^0.65 * Fr^0.43
            
            # 修正系数
            K1 = 1.0  # 圆形桥墩
            
            # 临界速度
            specific_gravity = params.sediment_density / params.water_density
            Vc = math.sqrt(g * d50_m * (specific_gravity - 1) * 0.047)
            
            # 防止除零
            if Vc <= 0:
                Vc = 1.0
                
            # 计算冲刷深度
            velocity_ratio = V / Vc
            ds_over_D = 2.0 * K1 * (velocity_ratio**0.65) * (froude**0.43)
            scour_depth = ds_over_D * D
            
            # 限制合理范围
            scour_depth = max(0, min(scour_depth, 3.0 * D))
            
            return SimpleResult(
                scour_depth=scour_depth,
                reynolds_number=reynolds,
                froude_number=froude,
                success=True
            )
            
        except Exception as e:
            print(f"计算失败: {e}")
            # 返回默认值
            return SimpleResult(
                scour_depth=1.5,
                reynolds_number=500000,
                froude_number=0.3,
                success=False
            )

def create_simple_params():
    """创建简单测试参数"""
    return SimpleScourParams(
        pier_diameter=2.0,
        flow_velocity=2.8,
        water_depth=8.0,
        d50=0.8
    )

if __name__ == "__main__":
    print("=== 简化求解器测试 ===")
    solver = SimpleWorkingSolver()
    params = create_simple_params()
    
    result = solver.calculate_scour(params)
    
    print(f"冲刷深度: {result.scour_depth:.2f} m")
    print(f"雷诺数: {result.reynolds_number:.0f}")
    print(f"弗劳德数: {result.froude_number:.3f}")
    print(f"成功: {result.success}")