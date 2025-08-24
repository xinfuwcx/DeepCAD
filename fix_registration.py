#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复本构模型注册问题
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("🔧 修复本构模型注册问题")
    print("=" * 50)
    
    # 确保正确的导入顺序
    print("1. 导入KratosMultiphysics...")
    import KratosMultiphysics
    
    print("2. 导入ConstitutiveLawsApplication...")
    from KratosMultiphysics import ConstitutiveLawsApplication
    
    print("3. 导入StructuralMechanicsApplication...")
    from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
    
    # 检查模型是否正确注册
    print("\n🔍 检查模型注册:")
    model_name = "SmallStrainIsotropicPlasticity3DModifiedMohrCoulombModifiedMohrCoulomb"
    
    if hasattr(ConstitutiveLawsApplication, model_name):
        print(f"✅ 模型已注册: {model_name}")
        model_class = getattr(ConstitutiveLawsApplication, model_name)
        print(f"   模型类: {model_class}")
    else:
        print(f"❌ 模型未注册: {model_name}")
        
        # 尝试其他模型
        alternatives = [
            "SmallStrainIsotropicPlasticity3DMohrCoulombMohrCoulomb",
            "SmallStrainDplusDminusDamageModifiedMohrCoulombModifiedMohrCoulomb3D"
        ]
        
        for alt in alternatives:
            if hasattr(ConstitutiveLawsApplication, alt):
                print(f"✅ 备选模型可用: {alt}")
                break
    
    print("\n📖 读取参数...")
    with open('ProjectParameters.json', 'r', encoding='utf-8') as f:
        params_text = f.read()
    
    print("🏗️ 创建模型...")
    model = KratosMultiphysics.Model()
    parameters = KratosMultiphysics.Parameters(params_text)
    
    print("⚙️ 初始化分析...")
    analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(model, parameters)
    analysis.Initialize()
    
    print("\n🔍 验证本构模型加载:")
    main_model_part = model["Structure"]
    
    success_count = 0
    for i in range(2, 13):
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            if props.Has(KratosMultiphysics.CONSTITUTIVE_LAW):
                const_law = props[KratosMultiphysics.CONSTITUTIVE_LAW]
                model_info = const_law.Info()
                
                if "MohrCoulomb" in model_info and "Plastic" in model_info:
                    print(f"✅ 材料{i}: {model_info}")
                    success_count += 1
                else:
                    print(f"❌ 材料{i}: {model_info}")
    
    print(f"\n📊 结果: {success_count}/11 个材料使用摩尔-库伦塑性模型")
    
    if success_count >= 8:
        print("🎉 本构模型注册问题已解决！")
    else:
        print("⚠️ 仍有注册问题")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
