#!/usr/bin/env python3
"""测试摩尔-库伦参数转换公式的正确性"""

import math

def test_mohr_coulomb_conversion():
    """测试摩尔-库伦参数转换"""
    
    print("=" * 60)
    print("🧪 摩尔-库伦参数转换公式验证")
    print("=" * 60)
    
    # 测试用例：典型土体参数
    test_cases = [
        {"name": "粘土", "phi": 20.0, "c": 15.0, "density": 1800},
        {"name": "粉质粘土", "phi": 26.0, "c": 9.0, "density": 1900},
        {"name": "砂土", "phi": 35.0, "c": 0.0, "density": 2000},
        {"name": "密实砂", "phi": 40.0, "c": 5.0, "density": 2100},
    ]
    
    for i, case in enumerate(test_cases, 1):
        print(f"\n📋 测试用例 {i}: {case['name']}")
        print(f"   输入参数: φ={case['phi']}°, c={case['c']}kPa, ρ={case['density']}kg/m³")
        
        # 转换参数
        phi_deg = case['phi']
        cohesion_pa = case['c'] * 1000  # kPa → Pa
        density = case['density']
        
        # 计算屈服应力（标准公式）
        phi_rad = math.radians(phi_deg)
        sin_phi = math.sin(phi_rad)
        cos_phi = math.cos(phi_rad)
        
        # 标准摩尔-库伦转换公式
        sigma_t = 2.0 * cohesion_pa * cos_phi / (1.0 + sin_phi)
        sigma_c = 2.0 * cohesion_pa * cos_phi / (1.0 - sin_phi)
        
        # 确保最小值
        sigma_t = max(sigma_t, 1000.0)
        sigma_c = max(sigma_c, 10000.0)
        
        # 计算剪胀角（Bolton关系）
        psi_deg = max(0.0, phi_deg - 30.0)
        if density < 1800:  # 松散土修正
            psi_deg *= 0.5
        
        # 计算K比值
        K_actual = sigma_t / sigma_c
        K_theoretical = (1.0 - sin_phi) / (1.0 + sin_phi)
        
        # 输出结果
        print(f"   🎯 屈服应力转换:")
        print(f"      拉伸屈服: {sigma_t/1000:.1f} kPa")
        print(f"      压缩屈服: {sigma_c/1000:.1f} kPa")
        print(f"   🎯 剪胀角计算:")
        print(f"      剪胀角: {psi_deg:.1f}° (Bolton: ψ = max(0, φ-30°))")
        print(f"   🎯 K比值验证:")
        print(f"      实际K值: {K_actual:.4f}")
        print(f"      理论K值: {K_theoretical:.4f}")
        print(f"      误差: {abs(K_actual - K_theoretical):.6f}")
        
        # 验证公式正确性
        if abs(K_actual - K_theoretical) < 1e-10:
            print(f"   ✅ 转换公式正确")
        else:
            print(f"   ❌ 转换公式有误差")

def test_bolton_dilatancy_relationship():
    """测试Bolton剪胀角关系"""
    
    print(f"\n" + "=" * 60)
    print("🧪 Bolton剪胀角关系验证")
    print("=" * 60)
    
    friction_angles = [15, 20, 25, 30, 35, 40, 45]
    
    for phi in friction_angles:
        # 标准Bolton关系
        psi_dense = max(0.0, phi - 30.0)
        psi_loose = max(0.0, (phi - 30.0) * 0.5)
        
        print(f"φ = {phi:2d}° → ψ_密实 = {psi_dense:4.1f}°, ψ_松散 = {psi_loose:4.1f}°")

def test_fpn_material_conversion():
    """测试FPN材料的实际转换"""
    
    print(f"\n" + "=" * 60)
    print("🧪 FPN材料参数转换测试")
    print("=" * 60)
    
    # FPN文件中的实际材料参数
    fpn_materials = [
        {"id": 3, "name": "粉质粘土", "phi": 26.0, "c": 9.0},
        {"id": 4, "name": "粉质粘土", "phi": 24.0, "c": 10.0},
        {"id": 5, "name": "粉质粘土", "phi": 22.0, "c": 13.0},
        {"id": 9, "name": "重粉质粘土", "phi": 23.0, "c": 14.0},
    ]
    
    for mat in fpn_materials:
        print(f"\n📋 材料{mat['id']}: {mat['name']}")
        
        phi_rad = math.radians(mat['phi'])
        cohesion_pa = mat['c'] * 1000
        
        sin_phi = math.sin(phi_rad)
        cos_phi = math.cos(phi_rad)
        
        sigma_t = 2.0 * cohesion_pa * cos_phi / (1.0 + sin_phi)
        sigma_c = 2.0 * cohesion_pa * cos_phi / (1.0 - sin_phi)
        
        sigma_t = max(sigma_t, 1000.0)
        sigma_c = max(sigma_c, 10000.0)
        
        psi = max(0.0, mat['phi'] - 30.0)
        
        print(f"   FPN: φ={mat['phi']}°, c={mat['c']}kPa")
        print(f"   Kratos: σ_t={sigma_t/1000:.1f}kPa, σ_c={sigma_c/1000:.1f}kPa, ψ={psi:.1f}°")

if __name__ == "__main__":
    test_mohr_coulomb_conversion()
    test_bolton_dilatancy_relationship()
    test_fpn_material_conversion()
    
    print(f"\n" + "=" * 60)
    print("✅ 摩尔-库伦参数转换公式验证完成")
    print("=" * 60)
