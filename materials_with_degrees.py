#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建使用度数的完整材料文件
"""

import json

def create_materials_with_degrees():
    """创建使用度数的完整材料文件"""
    print("🔧 创建使用度数的完整材料文件")
    
    materials_data = {
        "properties": []
    }
    
    # 材料配置（使用度数）
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
                    "FRICTION_ANGLE": friction_deg,  # 使用度数
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
    
    # 保存材料文件
    with open('materials_degrees.json', 'w', encoding='utf-8') as f:
        json.dump(materials_data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ 创建完成: materials_degrees.json")
    print(f"   包含 {len(materials_data['properties'])} 种材料")
    print("   所有摩擦角使用度数单位")
    
    # 显示摩擦角值
    print("\n📋 摩擦角设置:")
    for mat_id, config in material_configs.items():
        print(f"   材料{mat_id}: {config['friction']}°")
    
    return True

if __name__ == "__main__":
    create_materials_with_degrees()
