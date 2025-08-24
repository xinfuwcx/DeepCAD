#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建正确的摩尔-库伦材料配置
基于RAG研究的参数对应关系
"""

import json
import math

def create_correct_mohr_coulomb_materials():
    """创建正确的摩尔-库伦材料配置"""
    print("🔧 创建正确的摩尔-库伦材料配置")
    print("=" * 60)
    
    # FPN材料配置（从原始数据提取）
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
    
    # 选择本构模型
    print("🎯 可选的摩尔-库伦本构模型:")
    print("   1. 标准摩尔-库伦: SmallStrainIsotropicPlasticity3DMohrCoulombMohrCoulomb")
    print("      - 参数: INTERNAL_FRICTION_ANGLE (弧度), INTERNAL_DILATANCY_ANGLE (弧度)")
    print("   2. 修正摩尔-库伦: SmallStrainIsotropicPlasticity3DModifiedMohrCoulombModifiedMohrCoulomb")
    print("      - 参数: FRICTION_ANGLE (度数), DILATANCY_ANGLE (度数)")
    print("   3. 损伤版摩尔-库伦: SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D")
    print("      - 参数: FRICTION_ANGLE (度数), DILATANCY_ANGLE (度数) + 损伤参数")
    
    # 创建三种配置
    configurations = [
        {
            "name": "standard_mohr_coulomb",
            "description": "标准摩尔-库伦",
            "constitutive_law": "SmallStrainIsotropicPlasticity3DMohrCoulombMohrCoulomb",
            "angle_unit": "radians",
            "angle_prefix": "INTERNAL_"
        },
        {
            "name": "modified_mohr_coulomb", 
            "description": "修正摩尔-库伦",
            "constitutive_law": "SmallStrainIsotropicPlasticity3DModifiedMohrCoulombModifiedMohrCoulomb",
            "angle_unit": "degrees",
            "angle_prefix": ""
        },
        {
            "name": "damage_mohr_coulomb",
            "description": "损伤版摩尔-库伦", 
            "constitutive_law": "SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D",
            "angle_unit": "degrees",
            "angle_prefix": ""
        }
    ]
    
    for config_type in configurations:
        print(f"\n🔧 创建{config_type['description']}配置:")
        materials_data = {"properties": []}
        
        for mat_id, config in fpn_materials.items():
            print(f"   材料 {mat_id} ({config['name']}): φ={config['phi']}°, c={config['c']/1000:.0f}kPa")
            
            # 基础参数
            phi_deg = config["phi"]
            phi_rad = math.radians(phi_deg)
            c_pa = config["c"]
            
            # 计算剪胀角
            if "粘土" in config["name"]:
                psi_deg = 0.0  # 粘土剪胀角为0
            else:
                psi_deg = max(0.0, phi_deg - 30.0)  # 砂土类
            psi_rad = math.radians(psi_deg)
            
            # 计算屈服应力
            sin_phi = math.sin(phi_rad)
            cos_phi = math.cos(phi_rad)
            sigma_t = 2.0 * c_pa * cos_phi / (1.0 + sin_phi)
            sigma_c = 2.0 * c_pa * cos_phi / (1.0 - sin_phi)
            
            # 确保最小值
            sigma_t = max(sigma_t, 1000.0)
            sigma_c = max(sigma_c, 10000.0)
            
            # 根据配置类型设置角度参数
            if config_type["angle_unit"] == "radians":
                friction_angle_param = phi_rad
                dilatancy_angle_param = psi_rad
            else:
                friction_angle_param = phi_deg
                dilatancy_angle_param = psi_deg
            
            # 创建材料配置
            variables = {
                # 弹性参数
                "YOUNG_MODULUS": float(config["E"]),
                "POISSON_RATIO": config["nu"],
                "DENSITY": config["density"],
                
                # 摩尔-库伦参数
                f"{config_type['angle_prefix']}FRICTION_ANGLE": friction_angle_param,
                f"{config_type['angle_prefix']}DILATANCY_ANGLE": dilatancy_angle_param,
                "COHESION": float(c_pa),
                
                # 重力加速度
                "VOLUME_ACCELERATION": [0.0, 0.0, -9.81]
            }
            
            # 添加屈服应力（修正和损伤版需要）
            if "Modified" in config_type["constitutive_law"] or "Damage" in config_type["constitutive_law"]:
                variables.update({
                    "YIELD_STRESS_TENSION": sigma_t,
                    "YIELD_STRESS_COMPRESSION": sigma_c
                })
            
            # 添加损伤参数（损伤版需要）
            if "Damage" in config_type["constitutive_law"]:
                variables.update({
                    "SOFTENING_TYPE": 0,
                    "FRACTURE_ENERGY": 100.0,
                    "HARDENING_CURVE": 1  # 损伤版也需要硬化曲线
                })
            
            material = {
                "model_part_name": f"Structure.MAT_{mat_id}",
                "properties_id": mat_id,
                "Material": {
                    "constitutive_law": {
                        "name": config_type["constitutive_law"]
                    },
                    "Variables": variables,
                    "Tables": {}
                }
            }
            
            materials_data["properties"].append(material)
        
        # 保存材料文件
        output_file = f"{config_type['name']}_materials.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(materials_data, f, indent=2, ensure_ascii=False)
        
        print(f"   ✅ {config_type['description']}配置已保存: {output_file}")
    
    print(f"\n🎯 总结:")
    print(f"   - 标准摩尔-库伦: 使用弧度，INTERNAL_前缀")
    print(f"   - 修正摩尔-库伦: 使用度数，无前缀，需要屈服应力")
    print(f"   - 损伤版摩尔-库伦: 使用度数，无前缀，需要屈服应力+损伤参数")
    print(f"   - 推荐使用: 修正摩尔-库伦（数值稳定性好）")

if __name__ == "__main__":
    create_correct_mohr_coulomb_materials()
