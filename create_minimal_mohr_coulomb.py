#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建最小化的修正摩尔-库伦材料配置
只包含必要的参数
"""

import json
import math

def create_minimal_mohr_coulomb():
    """创建最小化的修正摩尔-库伦材料配置"""
    print("🔧 创建最小化的修正摩尔-库伦材料配置")
    print("=" * 60)
    
    # FPN材料配置
    fpn_materials = {
        2: {"name": "粉质粘土", "E": 15e6, "nu": 0.3, "density": 2039.43, "phi": 35.0, "c": 20000},
        3: {"name": "粉土", "E": 5e6, "nu": 0.3, "density": 1988.45, "phi": 26.0, "c": 9000},
        4: {"name": "粉质粘土", "E": 5e6, "nu": 0.3, "density": 1947.66, "phi": 24.0, "c": 10000},
        5: {"name": "粉土", "E": 5e6, "nu": 0.3, "density": 2121.01, "phi": 22.0, "c": 13000},
        6: {"name": "粉质粘土", "E": 40e6, "nu": 0.3, "density": 1988.45, "phi": 35.0, "c": 21000},
        7: {"name": "粉质粘土", "E": 8e6, "nu": 0.3, "density": 2121.01, "phi": 16.0, "c": 25000},
        8: {"name": "粉土", "E": 9e6, "nu": 0.3, "density": 2110.81, "phi": 20.7, "c": 20500},
        9: {"name": "粉质粘土", "E": 9e6, "nu": 0.3, "density": 2059.83, "phi": 23.0, "c": 14000},
        10: {"name": "粉质粘土", "E": 40e6, "nu": 0.3, "density": 2141.40, "phi": 35.0, "c": 35000},
        11: {"name": "粉土", "E": 12e6, "nu": 0.3, "density": 2059.83, "phi": 24.0, "c": 17000},
        12: {"name": "粉质粘土", "E": 20e6, "nu": 0.3, "density": 2070.02, "phi": 35.0, "c": 26000}
    }
    
    materials_data = {"properties": []}
    
    print("🧮 使用最小化参数集:")
    
    for mat_id, config in fpn_materials.items():
        print(f"材料 {mat_id} ({config['name']}): φ={config['phi']}°, c={config['c']/1000:.0f}kPa")
        
        # 基础参数
        phi_deg = config["phi"]
        phi_rad = math.radians(phi_deg)
        c_pa = config["c"]
        
        # 计算剪胀角
        if "粘土" in config["name"]:
            psi_deg = 0.0  # 粘土剪胀角为0
        else:
            psi_deg = max(0.0, phi_deg - 30.0)  # 砂土类
        
        # 计算屈服应力
        sin_phi = math.sin(phi_rad)
        cos_phi = math.cos(phi_rad)
        sigma_t = 2.0 * c_pa * cos_phi / (1.0 + sin_phi)
        sigma_c = 2.0 * c_pa * cos_phi / (1.0 - sin_phi)
        
        # 确保最小值
        sigma_t = max(sigma_t, 1000.0)
        sigma_c = max(sigma_c, 10000.0)
        
        # 创建材料配置 - 只包含最基本的参数
        material = {
            "model_part_name": f"Structure.MAT_{mat_id}",
            "properties_id": mat_id,
            "Material": {
                "constitutive_law": {
                    "name": "SmallStrainIsotropicPlasticity3DModifiedMohrCoulombModifiedMohrCoulomb"
                },
                "Variables": {
                    # 弹性参数
                    "YOUNG_MODULUS": float(config["E"]),
                    "POISSON_RATIO": config["nu"],
                    "DENSITY": config["density"],
                    
                    # 摩尔-库伦参数（度数）
                    "FRICTION_ANGLE": phi_deg,
                    "DILATANCY_ANGLE": psi_deg,
                    "COHESION": float(c_pa),
                    
                    # 屈服应力
                    "YIELD_STRESS_TENSION": sigma_t,
                    "YIELD_STRESS_COMPRESSION": sigma_c,
                    
                    # 硬化参数（只包含必要的）
                    "HARDENING_CURVE": 1,  # 1 = 线性硬化
                    
                    # 重力加速度
                    "VOLUME_ACCELERATION": [0.0, 0.0, -9.81]
                },
                "Tables": {}
            }
        }
        
        materials_data["properties"].append(material)
    
    # 保存材料文件
    output_file = "minimal_mohr_coulomb_materials.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(materials_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ 最小化摩尔-库伦配置已保存: {output_file}")
    print(f"   - 本构模型: SmallStrainIsotropicPlasticity3DModifiedMohrCoulombModifiedMohrCoulomb")
    print(f"   - 参数: 只包含必要的基础参数")
    print(f"   - HARDENING_CURVE = 1 (线性硬化)")
    print(f"   - 移除了HARDENING_MODULUS等可能未定义的参数")
    
    return output_file

if __name__ == "__main__":
    create_minimal_mohr_coulomb()
