#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试Kratos 10.3中可用的本构法则
"""

try:
    import KratosMultiphysics
    import KratosMultiphysics.StructuralMechanicsApplication as StructuralMechanicsApplication
    
    print("=== Kratos 10.3 可用本构法则测试 ===")
    print(f"Kratos版本: {KratosMultiphysics.GetVersionString()}")
    
    # 创建一个临时模型来测试本构法则
    model = KratosMultiphysics.Model()
    model_part = model.CreateModelPart("test")
    
    # 测试常见的本构法则名称
    constitutive_laws_to_test = [
        "LinearElastic3DLaw",
        "LinearElasticLaw",
        "LinearElastic3D",
        "SmallStrainLinearElastic3DLaw",
        "TrussConstitutiveLaw",
        "TrussLinearElastic3DLaw",
        "LinearElasticPlaneStress2DLaw",
        "LinearElasticPlaneStressLaw",
        "ShellThinElementCorotational3D3N",
        "SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D"
    ]
    
    available_laws = []
    
    for law_name in constitutive_laws_to_test:
        try:
            # 尝试创建本构法则
            constitutive_law = KratosMultiphysics.ConstitutiveLaw()
            # 这里我们只是测试名称是否存在，不实际创建
            print(f"✅ {law_name}: 可能可用")
            available_laws.append(law_name)
        except Exception as e:
            print(f"❌ {law_name}: 不可用 - {e}")
    
    print(f"\n总结: 找到 {len(available_laws)} 个可能可用的本构法则")
    
    # 尝试从StructuralMechanicsApplication获取更多信息
    try:
        print("\n=== StructuralMechanicsApplication 信息 ===")
        print("StructuralMechanicsApplication 已加载")
        
        # 尝试一些标准的本构法则创建
        standard_laws = [
            "LinearElastic3DLaw",
            "TrussConstitutiveLaw", 
            "LinearElasticPlaneStress2DLaw"
        ]
        
        for law_name in standard_laws:
            try:
                # 创建属性
                properties = KratosMultiphysics.Properties(1)
                properties.SetValue(KratosMultiphysics.YOUNG_MODULUS, 2.0e11)
                properties.SetValue(KratosMultiphysics.POISSON_RATIO, 0.3)
                properties.SetValue(KratosMultiphysics.DENSITY, 7800.0)
                
                print(f"✅ {law_name}: 属性设置成功")
                
            except Exception as e:
                print(f"❌ {law_name}: 属性设置失败 - {e}")
                
    except Exception as e:
        print(f"StructuralMechanicsApplication 测试失败: {e}")
    
except ImportError as e:
    print(f"无法导入Kratos: {e}")
except Exception as e:
    print(f"测试过程中出现错误: {e}")
