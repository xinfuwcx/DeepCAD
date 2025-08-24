#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解决摩擦角参数问题
"""

import json
import math

def create_test_materials():
    """创建测试材料配置，尝试不同的摩擦角参数名"""
    print("🔧 创建测试材料配置")
    
    # 测试不同的摩擦角参数名称
    test_configs = [
        {
            "name": "使用度数",
            "friction_param": "FRICTION_ANGLE",
            "friction_value": 26.0  # 度数
        },
        {
            "name": "使用弧度", 
            "friction_param": "FRICTION_ANGLE",
            "friction_value": math.radians(26.0)  # 弧度
        },
        {
            "name": "使用PHI参数",
            "friction_param": "PHI", 
            "friction_value": math.radians(26.0)
        },
        {
            "name": "使用INTERNAL_FRICTION_ANGLE",
            "friction_param": "INTERNAL_FRICTION_ANGLE",
            "friction_value": math.radians(26.0)
        }
    ]
    
    for i, config in enumerate(test_configs):
        materials_data = {
            "properties": [{
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
                        config["friction_param"]: config["friction_value"],
                        "DILATANCY_ANGLE": 0.0,
                        "COHESION": 9000.0,
                        "YIELD_STRESS_TENSION": 18000.0,
                        "YIELD_STRESS_COMPRESSION": 45000.0,
                        "SOFTENING_TYPE": 0,
                        "FRACTURE_ENERGY": 100.0
                    },
                    "Tables": {}
                }
            }]
        }
        
        filename = f"test_materials_{i+1}_{config['name'].replace(' ', '_')}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(materials_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ 创建了 {filename}")
        print(f"   参数: {config['friction_param']} = {config['friction_value']}")
    
    print("\n💡 建议测试步骤:")
    print("1. 依次替换materials.json文件")
    print("2. 运行简单的Kratos测试")
    print("3. 观察是否还有摩擦角警告")

def research_kratos_friction_angle():
    """研究Kratos摩擦角参数的正确设置方法"""
    print("\n🔍 研究Kratos摩擦角参数")
    
    # 基于Kratos文档的常见摩擦角参数名
    common_params = [
        "FRICTION_ANGLE",           # 最常见
        "PHI",                      # 希腊字母φ
        "INTERNAL_FRICTION_ANGLE",  # 内摩擦角
        "FRICTION_ANGLE_PHI",       # 组合名称
        "MOHR_COULOMB_PHI",        # 摩尔-库伦特定
        "ANGLE_OF_FRICTION"         # 英文全称
    ]
    
    print("常见的摩擦角参数名称:")
    for param in common_params:
        print(f"  - {param}")
    
    print("\n📋 可能的原因:")
    print("1. 参数名称不正确")
    print("2. 需要使用度数而不是弧度")
    print("3. 本构模型需要特殊的参数设置")
    print("4. 需要在本构模型初始化时单独设置")
    
    print("\n🎯 解决方案:")
    print("1. 查看Kratos官方文档")
    print("2. 检查SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D的参数要求")
    print("3. 尝试使用LinearElastic3DLaw作为对比")
    print("4. 考虑使用更简单的MohrCoulombPlasticPotential3D")

def main():
    """主函数"""
    print("🔧 解决Kratos摩擦角参数问题")
    print("=" * 50)
    
    create_test_materials()
    research_kratos_friction_angle()
    
    print("\n" + "=" * 50)
    print("✅ 测试文件已创建，可以开始调试摩擦角参数")

if __name__ == "__main__":
    main()
