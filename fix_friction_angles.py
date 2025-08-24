#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复materials.json中的摩擦角，从度数转换为弧度
"""

import json
import math

def fix_friction_angles():
    """修复摩擦角单位"""
    print("🔧 修复摩擦角单位：度数 → 弧度")
    
    # 从FPN分析结果中读取真实的摩擦角数据
    with open('fpn_materials_analysis.json', 'r', encoding='utf-8') as f:
        fpn_materials = json.load(f)
    
    # 摩擦角映射（度数 → 弧度）
    friction_angles_deg = {}
    for mat_id, mat_data in fpn_materials.items():
        props = mat_data.get('properties', {})
        if 'FRICTION_ANGLE' in props:
            friction_angles_deg[int(mat_id)] = props['FRICTION_ANGLE']
    
    print("从FPN文件中提取的摩擦角（度数）:")
    for mat_id, angle_deg in friction_angles_deg.items():
        angle_rad = math.radians(angle_deg)
        print(f"  材料{mat_id}: {angle_deg}° = {angle_rad:.4f} rad")
    
    # 创建修复后的materials.json
    materials_data = {
        "properties": []
    }
    
    # 材料2-12的配置（跳过材料1和13，因为MDPA中不存在）
    material_configs = {
        2: {"name": "2细砂", "E": 15000000.0, "density": 2039.43, "friction": 0.0, "cohesion": 20000.0},
        3: {"name": "3粉质粘土", "E": 5000000.0, "density": 1988.45, "friction": 26.0, "cohesion": 9000.0},
        4: {"name": "4粉质粘土", "E": 5000000.0, "density": 1947.66, "friction": 24.0, "cohesion": 10000.0},
        5: {"name": "5粉质粘土", "E": 5000000.0, "density": 2121.01, "friction": 22.0, "cohesion": 13000.0},
        6: {"name": "6粉质粘土", "E": 40000000.0, "density": 1988.45, "friction": 0.0, "cohesion": 21000.0},
        7: {"name": "7粉质粘土", "E": 8000000.0, "density": 2121.01, "friction": 14.0, "cohesion": 25000.0},
        8: {"name": "8粉质粘土", "E": 9000000.0, "density": 2110.81, "friction": 20.7, "cohesion": 20500.0},
        9: {"name": "9粉质粘土", "E": 9000000.0, "density": 2059.83, "friction": 23.0, "cohesion": 14000.0},
        10: {"name": "10粉质粘土", "E": 40000000.0, "density": 2141.40, "friction": 0.0, "cohesion": 35000.0},
        11: {"name": "11粉质粘土", "E": 12000000.0, "density": 2059.83, "friction": 24.0, "cohesion": 17000.0},
        12: {"name": "12粉质粘土", "E": 20000000.0, "density": 2070.02, "friction": 0.0, "cohesion": 26000.0}
    }
    
    for mat_id, config in material_configs.items():
        friction_deg = config["friction"]
        friction_rad = math.radians(friction_deg)
        
        material = {
            "model_part_name": f"Structure.MAT_{mat_id}",
            "properties_id": mat_id,
            "Material": {
                "constitutive_law": {
                    "name": "SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D"
                },
                "Variables": {
                    "YOUNG_MODULUS": config["E"],
                    "POISSON_RATIO": 0.3,
                    "DENSITY": config["density"],
                    "FRICTION_ANGLE": friction_rad,  # 使用弧度
                    "DILATANCY_ANGLE": 0.0,
                    "COHESION": config["cohesion"],
                    "YIELD_STRESS_TENSION": config["cohesion"] * 2,
                    "YIELD_STRESS_COMPRESSION": config["cohesion"] * 2,
                    "SOFTENING_TYPE": 0,
                    "FRACTURE_ENERGY": 100.0
                },
                "Tables": {}
            }
        }
        materials_data["properties"].append(material)
    
    # 保存修复后的材料文件
    with open('materials_fixed_friction.json', 'w', encoding='utf-8') as f:
        json.dump(materials_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ 修复完成！生成了 materials_fixed_friction.json")
    print(f"   包含 {len(materials_data['properties'])} 种材料")
    print("   所有摩擦角已转换为弧度单位")
    
    return True

if __name__ == "__main__":
    fix_friction_angles()
