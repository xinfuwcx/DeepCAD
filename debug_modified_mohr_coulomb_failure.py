#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深度调试修正摩尔-库伦模型失败原因
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("🔧 深度调试修正摩尔-库伦模型失败原因")
    print("=" * 60)
    
    import KratosMultiphysics
    from KratosMultiphysics import ConstitutiveLawsApplication
    from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
    
    print("📖 读取材料文件...")
    with open('StructuralMaterials.json', 'r', encoding='utf-8') as f:
        materials_text = f.read()
    
    print("📖 读取项目参数...")
    with open('ProjectParameters.json', 'r', encoding='utf-8') as f:
        params_text = f.read()
    
    print("🏗️ 创建模型...")
    model = KratosMultiphysics.Model()
    parameters = KratosMultiphysics.Parameters(params_text)
    
    print("⚙️ 初始化分析...")
    analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(model, parameters)
    analysis.Initialize()
    
    print("\n🔍 详细检查材料2的参数:")
    main_model_part = model["Structure"]
    
    if main_model_part.HasProperties(2):
        props = main_model_part.GetProperties(2)
        print(f"   材料2 Properties存在")
        
        # 检查所有可能需要的参数
        all_params = [
            (KratosMultiphysics.YOUNG_MODULUS, "YOUNG_MODULUS"),
            (KratosMultiphysics.POISSON_RATIO, "POISSON_RATIO"),
            (KratosMultiphysics.DENSITY, "DENSITY"),
            (ConstitutiveLawsApplication.FRICTION_ANGLE, "FRICTION_ANGLE"),
            (ConstitutiveLawsApplication.DILATANCY_ANGLE, "DILATANCY_ANGLE"),
            (ConstitutiveLawsApplication.COHESION, "COHESION"),
            (ConstitutiveLawsApplication.YIELD_STRESS_TENSION, "YIELD_STRESS_TENSION"),
            (ConstitutiveLawsApplication.YIELD_STRESS_COMPRESSION, "YIELD_STRESS_COMPRESSION"),
            (KratosMultiphysics.FRACTURE_ENERGY, "FRACTURE_ENERGY"),
            (ConstitutiveLawsApplication.SOFTENING_TYPE, "SOFTENING_TYPE")
        ]
        
        print("   参数检查:")
        missing_params = []
        for var, name in all_params:
            try:
                if props.Has(var):
                    value = props[var]
                    print(f"     ✅ {name}: {value}")
                else:
                    print(f"     ❌ 缺少 {name}")
                    missing_params.append(name)
            except Exception as e:
                print(f"     ❓ {name}: 检查失败 - {e}")
                missing_params.append(name)
        
        # 尝试手动创建本构法则
        print("\n🧪 手动测试本构法则:")
        try:
            const_law = ConstitutiveLawsApplication.SmallStrainIsotropicPlasticity3DModifiedMohrCoulombModifiedMohrCoulomb()
            print(f"   ✅ 本构法则创建成功")
            
            # 尝试Check
            dummy_geometry = KratosMultiphysics.Tetrahedra3D4()
            dummy_process_info = KratosMultiphysics.ProcessInfo()
            
            print("   🔍 执行Check函数...")
            check_result = const_law.Check(props, dummy_geometry, dummy_process_info)
            print(f"   ✅ Check通过: {check_result}")
            
        except Exception as e:
            print(f"   ❌ 本构法则Check失败: {e}")
            print(f"   错误类型: {type(e)}")
            
            # 如果Check失败，可能是参数问题
            if missing_params:
                print(f"   可能原因: 缺少参数 {missing_params}")
        
        # 检查本构法则是否被正确设置
        if props.Has(KratosMultiphysics.CONSTITUTIVE_LAW):
            actual_law = props[KratosMultiphysics.CONSTITUTIVE_LAW]
            print(f"\n   实际本构法则: {actual_law.Info()}")
            print(f"   本构法则类型: {type(actual_law)}")
        else:
            print(f"\n   ❌ 没有设置本构法则")
    
    print("\n" + "="*60)
    print("🎯 诊断结论:")
    print("   如果Check失败，说明参数不满足要求")
    print("   如果Check通过但仍回退，说明InitializeMaterial失败")
    print("   修正摩尔-库伦模型对参数要求很严格")
    
except Exception as e:
    print(f"❌ 调试失败: {e}")
    import traceback
    traceback.print_exc()
