#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
调试摩擦角参数问题
"""

import json

def debug_friction_angle():
    """调试摩擦角参数"""
    print("🔍 调试摩擦角参数问题")
    
    # 检查当前materials.json中的参数
    with open('multi_stage_kratos_conversion/stage_1/materials.json', 'r', encoding='utf-8') as f:
        materials = json.load(f)
    
    print("当前materials.json中的摩擦角参数:")
    for prop in materials['properties']:
        mat_name = prop['model_part_name']
        variables = prop['Material']['Variables']
        if 'FRICTION_ANGLE' in variables:
            friction = variables['FRICTION_ANGLE']
            print(f"  {mat_name}: FRICTION_ANGLE = {friction}")
    
    print("\n🔧 尝试不同的参数名称...")
    
    # 创建测试版本，使用不同的参数名
    test_materials = {
        "properties": []
    }
    
    # 只测试一个材料
    test_material = {
        "model_part_name": "Structure.MAT_3",
        "properties_id": 3,
        "Material": {
            "constitutive_law": {
                "name": "SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D"
            },
            "Variables": {
                "YOUNG_MODULUS": 5000000.0,
                "POISSON_RATIO": 0.3,
                "DENSITY": 1988.45,
                # 尝试不同的摩擦角参数名
                "FRICTION_ANGLE": 0.4538,  # 26度的弧度
                "INTERNAL_FRICTION_ANGLE": 0.4538,  # 备选名称1
                "PHI": 0.4538,  # 备选名称2
                "FRICTION_ANGLE_PHI": 0.4538,  # 备选名称3
                "DILATANCY_ANGLE": 0.0,
                "COHESION": 9000.0,
                "YIELD_STRESS_TENSION": 18000.0,
                "YIELD_STRESS_COMPRESSION": 45000.0,
                "SOFTENING_TYPE": 0,
                "FRACTURE_ENERGY": 100.0
            },
            "Tables": {}
        }
    }
    
    test_materials["properties"].append(test_material)
    
    # 保存测试文件
    with open('test_friction_material.json', 'w', encoding='utf-8') as f:
        json.dump(test_materials, f, indent=2, ensure_ascii=False)
    
    print("✅ 创建了测试材料文件: test_friction_material.json")
    print("   包含多种摩擦角参数名称")
    
    # 建议
    print("\n💡 建议:")
    print("1. 检查Kratos文档中摩擦角的正确参数名")
    print("2. 可能需要使用度数而不是弧度")
    print("3. 或者摩擦角需要在本构模型中单独设置")
    
    return True

if __name__ == "__main__":
    debug_friction_angle()
