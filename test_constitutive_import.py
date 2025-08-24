#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试ConstitutiveLawsApplication的正确导入方式
"""

import sys
import os

try:
    print("🔧 测试ConstitutiveLawsApplication导入")
    print("=" * 50)
    
    # 方法1: 直接导入
    print("1. 尝试直接导入...")
    try:
        import KratosMultiphysics
        from KratosMultiphysics import ConstitutiveLawsApplication
        print("   ✅ 直接导入成功")
    except ImportError as e:
        print(f"   ❌ 直接导入失败: {e}")
    
    # 方法2: 通过StructuralMechanicsApplication导入
    print("2. 尝试通过StructuralMechanicsApplication导入...")
    try:
        import KratosMultiphysics
        from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
        # 检查是否自动导入了ConstitutiveLawsApplication
        if hasattr(KratosMultiphysics, 'ConstitutiveLawsApplication'):
            print("   ✅ 通过StructuralMechanicsApplication自动导入成功")
        else:
            print("   ❌ 未自动导入ConstitutiveLawsApplication")
    except ImportError as e:
        print(f"   ❌ 导入失败: {e}")
    
    # 方法3: 检查可用的应用程序
    print("3. 检查可用的应用程序...")
    try:
        import KratosMultiphysics
        print("   可用的应用程序:")
        for attr in dir(KratosMultiphysics):
            if 'Application' in attr:
                print(f"      - {attr}")
    except Exception as e:
        print(f"   ❌ 检查失败: {e}")
    
    # 方法4: 检查COHESION变量
    print("4. 检查COHESION变量...")
    try:
        import KratosMultiphysics
        from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
        
        # 尝试访问COHESION变量
        if hasattr(KratosMultiphysics, 'COHESION'):
            print("   ✅ COHESION在KratosMultiphysics中找到")
        else:
            print("   ❌ COHESION在KratosMultiphysics中未找到")
            
        # 检查ConstitutiveLawsApplication
        try:
            from KratosMultiphysics import ConstitutiveLawsApplication
            if hasattr(ConstitutiveLawsApplication, 'COHESION'):
                print("   ✅ COHESION在ConstitutiveLawsApplication中找到")
            else:
                print("   ❌ COHESION在ConstitutiveLawsApplication中未找到")
        except ImportError:
            print("   ❌ ConstitutiveLawsApplication导入失败")
            
    except Exception as e:
        print(f"   ❌ 检查失败: {e}")
    
    # 方法5: 测试材料读取
    print("5. 测试简单材料读取...")
    try:
        import KratosMultiphysics
        from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
        
        # 创建简单的材料配置
        simple_material = {
            "properties": [{
                "model_part_name": "Structure.Test",
                "properties_id": 1,
                "Material": {
                    "constitutive_law": {
                        "name": "ElasticIsotropic3D"
                    },
                    "Variables": {
                        "YOUNG_MODULUS": 210e9,
                        "POISSON_RATIO": 0.3,
                        "DENSITY": 7850.0
                    }
                }
            }]
        }
        
        model = KratosMultiphysics.Model()
        model_part = model.CreateModelPart("Structure")
        model_part.CreateSubModelPart("Test")
        
        # 尝试读取材料
        material_settings = KratosMultiphysics.Parameters()
        material_settings.AddValue("properties", KratosMultiphysics.Parameters(str(simple_material["properties"]).replace("'", '"')))
        
        KratosMultiphysics.ReadMaterialsUtility(material_settings, model)
        print("   ✅ 简单材料读取成功")
        
    except Exception as e:
        print(f"   ❌ 材料读取失败: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 结论: 需要找到正确的ConstitutiveLawsApplication导入方式")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
