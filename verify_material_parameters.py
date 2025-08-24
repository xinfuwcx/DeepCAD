#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
验证材料参数是否正确读取
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("🔧 导入Kratos...")
    import KratosMultiphysics
    from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
    
    print("📖 读取参数...")
    with open('ProjectParameters.json', 'r', encoding='utf-8') as f:
        params_text = f.read()
    
    print("🏗️ 创建模型...")
    model = KratosMultiphysics.Model()
    parameters = KratosMultiphysics.Parameters(params_text)
    
    print("⚙️ 初始化分析...")
    analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(model, parameters)
    analysis.Initialize()
    
    print("\n🔍 验证材料参数:")
    print("=" * 60)
    
    # 获取模型部分
    main_model_part = model["Structure"]
    
    # 检查每个材料的参数
    for i in range(2, 13):  # 材料ID从2到12
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            
            print(f"\n📋 材料 {i}:")
            
            # 检查基本参数
            if props.Has(KratosMultiphysics.YOUNG_MODULUS):
                E = props[KratosMultiphysics.YOUNG_MODULUS]
                print(f"   弹性模量: {E/1e6:.1f} MPa")
            
            if props.Has(KratosMultiphysics.DENSITY):
                density = props[KratosMultiphysics.DENSITY]
                print(f"   密度: {density:.2f} kg/m³")
            
            # 检查摩擦角参数
            if props.Has(KratosMultiphysics.ConstitutiveLawsApplication.FRICTION_ANGLE):
                friction_angle = props[KratosMultiphysics.ConstitutiveLawsApplication.FRICTION_ANGLE]
                print(f"   摩擦角: {friction_angle:.1f}°")
            else:
                print("   ❌ 摩擦角参数未找到!")
            
            # 检查粘聚力
            if props.Has(KratosMultiphysics.ConstitutiveLawsApplication.COHESION):
                cohesion = props[KratosMultiphysics.ConstitutiveLawsApplication.COHESION]
                print(f"   粘聚力: {cohesion/1000:.1f} kPa")
            
            # 检查重力参数
            if props.Has(KratosMultiphysics.VOLUME_ACCELERATION):
                gravity = props[KratosMultiphysics.VOLUME_ACCELERATION]
                print(f"   重力加速度: [{gravity[0]:.2f}, {gravity[1]:.2f}, {gravity[2]:.2f}] m/s²")
            else:
                print("   ❌ 重力参数未找到!")
            
            # 检查本构模型
            if props.Has(KratosMultiphysics.CONSTITUTIVE_LAW):
                const_law = props[KratosMultiphysics.CONSTITUTIVE_LAW]
                print(f"   本构模型: {const_law.Info()}")
        else:
            print(f"\n❌ 材料 {i} 未找到!")
    
    print("\n" + "=" * 60)
    print("✅ 材料参数验证完成!")
    
except Exception as e:
    print(f"❌ 验证失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
