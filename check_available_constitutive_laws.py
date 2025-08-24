#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查Kratos中可用的本构模型
"""

import sys
import os

try:
    print("🔧 检查可用的本构模型")
    print("=" * 50)
    
    import KratosMultiphysics
    from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
    
    print("📋 检查KratosComponents中的本构模型:")
    
    # 获取所有注册的组件
    components = []
    try:
        # 尝试获取所有本构法则
        for name in dir(KratosMultiphysics.KratosComponents):
            if 'ConstitutiveLaw' in name:
                components.append(name)
        
        print(f"   找到 {len(components)} 个本构法则组件:")
        for comp in sorted(components)[:10]:  # 只显示前10个
            print(f"      - {comp}")
        if len(components) > 10:
            print(f"      ... 还有 {len(components)-10} 个")
            
    except Exception as e:
        print(f"   ❌ 获取组件失败: {e}")
    
    # 检查常见的本构模型名称
    print("\n🔍 测试常见本构模型:")
    common_laws = [
        "LinearElasticIsotropic3DLaw",
        "LinearElastic3DLaw", 
        "ElasticIsotropic3DLaw",
        "LinearElasticPlaneStress2DLaw",
        "LinearElasticPlaneStrain2DLaw",
        "SmallStrainJ2Plasticity3DLaw",
        "HyperElasticIsotropicNeoHookean3DLaw"
    ]
    
    available_laws = []
    for law_name in common_laws:
        try:
            # 尝试获取本构法则
            law = KratosMultiphysics.KratosComponents[law_name]
            available_laws.append(law_name)
            print(f"   ✅ {law_name}")
        except KeyError:
            print(f"   ❌ {law_name}")
        except Exception as e:
            print(f"   ❓ {law_name}: {e}")
    
    print(f"\n📊 总结:")
    print(f"   可用的本构模型: {len(available_laws)}")
    if available_laws:
        print(f"   推荐使用: {available_laws[0]}")
    
    # 创建使用可用本构模型的材料配置
    if available_laws:
        print(f"\n🔧 创建使用 {available_laws[0]} 的材料配置...")
        
        import json
        
        simple_material = {
            "properties": [{
                "model_part_name": "Structure.MAT_2",
                "properties_id": 2,
                "Material": {
                    "constitutive_law": {
                        "name": available_laws[0]
                    },
                    "Variables": {
                        "YOUNG_MODULUS": 15000000.0,
                        "POISSON_RATIO": 0.3,
                        "DENSITY": 2039.43,
                        "VOLUME_ACCELERATION": [0.0, 0.0, -9.81]
                    }
                }
            }]
        }
        
        with open("test_material.json", 'w') as f:
            json.dump(simple_material, f, indent=2)
        
        print(f"   ✅ 测试材料配置已保存: test_material.json")
    
except Exception as e:
    print(f"❌ 检查失败: {e}")
    import traceback
    traceback.print_exc()
