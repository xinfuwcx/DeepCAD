#!/usr/bin/env python3
"""
调试冲刷计算的物理参数
"""

import sys
sys.path.insert(0, '/mnt/e/DeepCAD')

from example6.core.fenics_solver import FEniCSScourSolver, NumericalParameters
from example6.core.empirical_solver import ScourParameters, PierShape
import json
import math

def debug_scour_physics():
    print("=== 冲刷计算物理参数调试 ===")
    
    # 测试参数
    params = ScourParameters(
        pier_diameter=2.0,
        pier_shape=PierShape.CIRCULAR,
        flow_velocity=1.2,
        water_depth=4.0,
        d50=0.6
    )
    
    # 手动计算物理参数，验证逻辑
    D = params.pier_diameter
    V = params.flow_velocity  
    d50 = params.d50 / 1000.0  # 转换为米
    rho_s = params.sediment_density
    rho_w = params.water_density
    g = params.gravity
    
    print(f"输入参数:")
    print(f"  桥墩直径 D = {D} m")
    print(f"  流速 V = {V} m/s") 
    print(f"  沉积物粒径 d50 = {d50*1000} mm = {d50} m")
    print(f"  沉积物密度 = {rho_s} kg/m³")
    print(f"  水密度 = {rho_w} kg/m³")
    
    # 剪切应力计算
    velocity_amplification = 2.0
    max_velocity = V * velocity_amplification
    
    kappa = 0.41
    z0 = d50 / 30.0
    z_ref = 0.1 * D
    
    u_star = max_velocity * kappa / math.log(z_ref / z0)
    tau_bed = rho_w * u_star**2
    
    print(f"\n剪切应力计算:")
    print(f"  最大流速 = {max_velocity:.2f} m/s")
    print(f"  粗糙度高度 z0 = {z0*1000:.3f} mm")
    print(f"  参考高度 z_ref = {z_ref:.2f} m")
    print(f"  摩擦速度 u* = {u_star:.3f} m/s")
    print(f"  床面剪切应力 τ = {tau_bed:.2f} Pa")
    
    # Shields参数
    specific_gravity = rho_s / rho_w
    theta = tau_bed / ((rho_s - rho_w) * g * d50)
    
    nu = 1e-6
    D_star = d50 * ((specific_gravity - 1) * g / nu**2)**(1/3)
    
    print(f"\nShields分析:")
    print(f"  比重 s = {specific_gravity:.2f}")
    print(f"  Shields参数 θ = {theta:.4f}")
    print(f"  颗粒雷诺数 D* = {D_star:.1f}")
    
    # 临界Shields参数
    if D_star <= 4:
        theta_cr = 0.30 / (1 + 1.2 * D_star) + 0.055 * (1 - math.exp(-0.020 * D_star))
    elif D_star <= 10:
        theta_cr = 0.14 * D_star**(-0.64)
    elif D_star <= 20:
        theta_cr = 0.04 * D_star**(-0.10)
    elif D_star <= 150:
        theta_cr = 0.013 * D_star**(0.29)
    else:
        theta_cr = 0.055
    
    theta_excess = max(0, theta - theta_cr)
    
    print(f"  临界Shields参数 θ_cr = {theta_cr:.4f}")
    print(f"  超额Shields参数 θ_excess = {theta_excess:.4f}")
    print(f"  是否发生冲刷: {'是' if theta_excess > 0 else '否'}")
    
    # 冲刷深度
    if theta_excess > 0:
        scour_depth = 1.2 * D * (theta_excess / theta_cr)**0.6
        scour_depth = min(scour_depth, 2.0 * D)
        relative_scour = scour_depth / D
        
        print(f"\n冲刷结果:")
        print(f"  冲刷深度 ds = {scour_depth:.2f} m")
        print(f"  相对冲刷深度 ds/D = {relative_scour:.2f}")
        print(f"  冲刷倍数 = {(theta_excess / theta_cr)**0.6:.2f}")
    else:
        print(f"\n冲刷结果: 无冲刷发生")
    
    # 现在用求解器验证
    print(f"\n=== FEniCS求解器验证 ===")
    solver = FEniCSScourSolver()
    numerical_params = NumericalParameters(mesh_resolution=0.2)
    
    try:
        result = solver.solve(params, numerical_params)
        print(f"求解器结果: ds = {result.scour_depth:.2f} m, ds/D = {result.scour_depth/D:.2f}")
    except Exception as e:
        print(f"求解器错误: {e}")

if __name__ == "__main__":
    debug_scour_physics()
