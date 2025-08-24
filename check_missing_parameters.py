#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查修正摩尔-库伦模型缺少的参数
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("🔧 检查修正摩尔-库伦模型缺少的参数")
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

    print("🔧 执行Initialize...")
    analysis.Initialize()

    # 在Initialize之后检查
    print("\n🔍 Initialize之后的状态:")
    main_model_part = model["Structure"]
    
    # 手动创建本构法则并检查
    print("\n🧪 手动测试本构法则创建:")
    
    # 获取材料2的Properties
    if main_model_part.HasProperties(2):
        props = main_model_part.GetProperties(2)
        print(f"   材料2 Properties存在")
        
        # 尝试手动创建本构法则
        try:
            const_law = ConstitutiveLawsApplication.SmallStrainIsotropicPlasticity3DModifiedMohrCoulombModifiedMohrCoulomb()
            print(f"   ✅ 本构法则创建成功: {const_law}")
            
            # 尝试Check
            dummy_geometry = KratosMultiphysics.Tetrahedra3D4()
            dummy_process_info = KratosMultiphysics.ProcessInfo()
            
            print("   🔍 执行Check函数...")
            check_result = const_law.Check(props, dummy_geometry, dummy_process_info)
            print(f"   ✅ Check通过: {check_result}")
            
        except Exception as e:
            print(f"   ❌ 本构法则创建或Check失败: {e}")
            print(f"   错误类型: {type(e)}")
            
            # 检查具体缺少什么参数
            print("\n🔍 检查必需参数:")
            required_params = [
                (KratosMultiphysics.YOUNG_MODULUS, "YOUNG_MODULUS"),
                (KratosMultiphysics.POISSON_RATIO, "POISSON_RATIO"),
                (KratosMultiphysics.DENSITY, "DENSITY"),
                (ConstitutiveLawsApplication.FRICTION_ANGLE, "FRICTION_ANGLE"),
                (ConstitutiveLawsApplication.DILATANCY_ANGLE, "DILATANCY_ANGLE"),
                (ConstitutiveLawsApplication.COHESION, "COHESION"),
                (ConstitutiveLawsApplication.YIELD_STRESS_TENSION, "YIELD_STRESS_TENSION"),
                (ConstitutiveLawsApplication.YIELD_STRESS_COMPRESSION, "YIELD_STRESS_COMPRESSION"),
                (ConstitutiveLawsApplication.FRACTURE_ENERGY, "FRACTURE_ENERGY")
            ]
            
            for var, name in required_params:
                if props.Has(var):
                    value = props[var]
                    print(f"     ✅ {name}: {value}")
                else:
                    print(f"     ❌ 缺少 {name}")
    
    print("\n" + "="*60)
    print("🎯 诊断总结:")
    print("   如果Check失败，说明还缺少某些必需参数")
    print("   如果Check通过但仍回退到弹性，可能是InitializeMaterial失败")
    
except Exception as e:
    print(f"❌ 检查失败: {e}")
    import traceback
    traceback.print_exc()
