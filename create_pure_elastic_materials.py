#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建纯弹性材料配置，只包含弹性参数
"""

import json

def create_pure_elastic_materials():
    """创建纯弹性材料配置"""
    print("🔧 创建纯弹性材料配置")
    print("=" * 60)
    
    # FPN材料配置（只保留弹性参数）
    fpn_materials = {
        2: {"name": "粉质粘土", "E": 15e6, "nu": 0.3, "density": 2039.43},
        3: {"name": "粉土", "E": 5e6, "nu": 0.3, "density": 1988.45},
        4: {"name": "粉质粘土", "E": 5e6, "nu": 0.3, "density": 1947.66},
        5: {"name": "粉土", "E": 5e6, "nu": 0.3, "density": 2121.01},
        6: {"name": "粉质粘土", "E": 40e6, "nu": 0.3, "density": 1988.45},
        7: {"name": "粉质粘土", "E": 8e6, "nu": 0.3, "density": 2121.01},
        8: {"name": "粉土", "E": 9e6, "nu": 0.3, "density": 2110.81},
        9: {"name": "粉质粘土", "E": 9e6, "nu": 0.3, "density": 2059.83},
        10: {"name": "粉质粘土", "E": 40e6, "nu": 0.3, "density": 2141.40},
        11: {"name": "粉土", "E": 12e6, "nu": 0.3, "density": 2059.83},
        12: {"name": "粉质粘土", "E": 20e6, "nu": 0.3, "density": 2070.02}
    }
    
    materials_data = {"properties": []}
    
    print("🧮 使用纯弹性模型:")
    
    for mat_id, config in fpn_materials.items():
        print(f"材料 {mat_id} ({config['name']}): E={config['E']/1e6:.0f}MPa, ν={config['nu']}")
        
        # 创建材料配置 - 使用纯弹性模型
        material = {
            "model_part_name": f"Structure.MAT_{mat_id}",
            "properties_id": mat_id,
            "Material": {
                "constitutive_law": {
                    "name": "LinearElastic3DLaw"
                },
                "Variables": {
                    # 只包含弹性参数
                    "YOUNG_MODULUS": float(config["E"]),
                    "POISSON_RATIO": config["nu"],
                    "DENSITY": config["density"],
                    "VOLUME_ACCELERATION": [0.0, 0.0, -9.81]
                },
                "Tables": {}
            }
        }
        
        materials_data["properties"].append(material)
    
    # 保存材料文件
    output_file = "pure_elastic_materials.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(materials_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ 纯弹性材料配置已保存: {output_file}")
    print(f"   - 本构模型: LinearElastic3DLaw")
    print(f"   - 材料数量: {len(materials_data['properties'])}")
    print(f"   - 参数: 只包含E、ν、ρ、重力")
    print(f"   - 状态: 应该可以正常运行分析")
    
    return output_file

if __name__ == "__main__":
    create_pure_elastic_materials()
