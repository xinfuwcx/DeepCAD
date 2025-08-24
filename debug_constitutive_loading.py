#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深度调试本构模型加载问题
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("🔧 深度调试本构模型加载问题")
    print("=" * 60)
    
    import KratosMultiphysics
    from KratosMultiphysics import ConstitutiveLawsApplication
    from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
    
    print("📖 读取材料文件...")
    with open('StructuralMaterials.json', 'r', encoding='utf-8') as f:
        materials_text = f.read()
    
    print("🔍 检查材料文件内容:")
    import json
    materials_data = json.loads(materials_text)
    
    for prop in materials_data["properties"][:2]:  # 只检查前2个材料
        print(f"\n材料 {prop['properties_id']}:")
        const_law = prop["Material"]["constitutive_law"]
        print(f"   本构法则名称: {const_law['name']}")
        
        # 检查是否存在这个本构法则
        if hasattr(ConstitutiveLawsApplication, const_law['name']):
            print(f"   ✅ 本构法则存在")
            law_class = getattr(ConstitutiveLawsApplication, const_law['name'])
            print(f"   类型: {law_class}")
        else:
            print(f"   ❌ 本构法则不存在")
        
        # 检查关键参数
        variables = prop["Material"]["Variables"]
        required_params = ["FRICTION_ANGLE", "COHESION", "DILATANCY_ANGLE", 
                          "YIELD_STRESS_TENSION", "YIELD_STRESS_COMPRESSION"]
        
        print("   参数检查:")
        for param in required_params:
            if param in variables:
                print(f"     ✅ {param}: {variables[param]}")
            else:
                print(f"     ❌ 缺少 {param}")
    
    print("\n📖 读取项目参数...")
    with open('ProjectParameters.json', 'r', encoding='utf-8') as f:
        params_text = f.read()
    
    print("🏗️ 创建模型...")
    model = KratosMultiphysics.Model()
    parameters = KratosMultiphysics.Parameters(params_text)
    
    print("⚙️ 初始化分析...")
    analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(model, parameters)
    
    # 在Initialize之前检查
    print("\n🔍 Initialize之前的状态:")
    main_model_part = model["Structure"]
    print(f"   模型部件存在: {main_model_part is not None}")
    
    analysis.Initialize()
    
    print("\n🔍 Initialize之后详细检查:")
    
    # 检查前3个材料的详细信息
    for i in range(2, 5):
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            print(f"\n材料 {i} 详细信息:")
            
            # 检查本构法则
            if props.Has(KratosMultiphysics.CONSTITUTIVE_LAW):
                const_law = props[KratosMultiphysics.CONSTITUTIVE_LAW]
                print(f"   实际本构法则: {const_law.Info()}")
                
                # 尝试获取本构法则的详细信息
                try:
                    print(f"   本构法则类型: {type(const_law)}")
                    print(f"   本构法则名称: {const_law.__class__.__name__}")
                except:
                    pass
            else:
                print(f"   ❌ 没有本构法则")
            
            # 检查所有变量
            print("   Properties中的变量:")
            try:
                # 检查关键变量是否存在
                key_vars = [
                    (KratosMultiphysics.YOUNG_MODULUS, "YOUNG_MODULUS"),
                    (KratosMultiphysics.POISSON_RATIO, "POISSON_RATIO"),
                    (KratosMultiphysics.DENSITY, "DENSITY")
                ]
                
                for var, name in key_vars:
                    if props.Has(var):
                        value = props[var]
                        print(f"     ✅ {name}: {value}")
                    else:
                        print(f"     ❌ 缺少 {name}")
                
                # 检查塑性参数
                plastic_vars = [
                    (ConstitutiveLawsApplication.FRICTION_ANGLE, "FRICTION_ANGLE"),
                    (ConstitutiveLawsApplication.COHESION, "COHESION"),
                    (ConstitutiveLawsApplication.DILATANCY_ANGLE, "DILATANCY_ANGLE")
                ]
                
                for var, name in plastic_vars:
                    if props.Has(var):
                        value = props[var]
                        print(f"     ✅ {name}: {value}")
                    else:
                        print(f"     ❌ 缺少 {name}")
                        
            except Exception as e:
                print(f"     检查变量时出错: {e}")
    
    print("\n" + "="*60)
    print("🎯 调试总结:")
    print("   如果本构法则显示为ElasticIsotropic3D，可能的原因:")
    print("   1. 本构法则初始化失败，回退到默认弹性模型")
    print("   2. 缺少必需的塑性参数")
    print("   3. 参数值不合理，导致本构法则拒绝初始化")
    print("   4. 单元类型与本构法则不兼容")
    
except Exception as e:
    print(f"❌ 调试失败: {e}")
    import traceback
    traceback.print_exc()
