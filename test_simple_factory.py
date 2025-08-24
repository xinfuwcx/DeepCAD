#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试最简单的Factory配置
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("🔧 测试最简单的Factory配置")
    print("=" * 50)
    
    import KratosMultiphysics
    from KratosMultiphysics import ConstitutiveLawsApplication
    
    # 测试Factory创建
    print("🏗️ 测试Factory创建...")
    
    # 创建Factory参数
    factory_params = KratosMultiphysics.Parameters("""{
        "yield_surface": "ModifiedMohrCoulomb",
        "plastic_potential": "ModifiedMohrCoulomb"
    }""")
    
    # 创建Factory
    factory = ConstitutiveLawsApplication.SmallStrainIsotropicPlasticityFactory()
    
    # 尝试创建本构法则
    constitutive_law = factory.Create(factory_params)
    
    print(f"✅ Factory创建成功: {constitutive_law.Info()}")
    
    # 测试不同的参数组合
    test_configs = [
        {
            "name": "基本配置",
            "params": {
                "yield_surface": "ModifiedMohrCoulomb",
                "plastic_potential": "ModifiedMohrCoulomb"
            }
        },
        {
            "name": "带law_type",
            "params": {
                "law_type": "3D",
                "yield_surface": "ModifiedMohrCoulomb", 
                "plastic_potential": "ModifiedMohrCoulomb"
            }
        },
        {
            "name": "原始摩尔-库伦",
            "params": {
                "yield_surface": "MohrCoulomb",
                "plastic_potential": "MohrCoulomb"
            }
        }
    ]
    
    print("\n🔍 测试不同配置:")
    for config in test_configs:
        try:
            params = KratosMultiphysics.Parameters(str(config["params"]).replace("'", '"'))
            law = factory.Create(params)
            print(f"✅ {config['name']}: {law.Info()}")
        except Exception as e:
            print(f"❌ {config['name']}: {e}")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
