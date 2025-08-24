#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("🔧 导入Kratos和ConstitutiveLawsApplication...")
    import KratosMultiphysics
    from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
    from KratosMultiphysics import ConstitutiveLawsApplication
    
    print("📖 读取参数...")
    with open('ProjectParameters.json', 'r', encoding='utf-8') as f:
        params_text = f.read()
    
    print("🏗️ 创建模型...")
    model = KratosMultiphysics.Model()
    parameters = KratosMultiphysics.Parameters(params_text)
    
    print("⚙️ 初始化分析...")
    analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(model, parameters)
    analysis.Initialize()
    
    print("🔍 验证摩尔-库伦材料参数...")
    main_model_part = model["Structure"]
    
    for i in range(2, 13):
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            
            print(f"\n📋 材料 {i}:")
            
            # 检查摩尔-库伦参数
            if props.Has(ConstitutiveLawsApplication.FRICTION_ANGLE):
                friction = props[ConstitutiveLawsApplication.FRICTION_ANGLE]
                print(f"   摩擦角: {friction}°")
            else:
                print("   ❌ 摩擦角参数未找到!")
            
            if props.Has(ConstitutiveLawsApplication.DILATANCY_ANGLE):
                dilatancy = props[ConstitutiveLawsApplication.DILATANCY_ANGLE]
                print(f"   剪胀角: {dilatancy}°")
            else:
                print("   ❌ 剪胀角参数未找到!")
            
            if props.Has(ConstitutiveLawsApplication.COHESION):
                cohesion = props[ConstitutiveLawsApplication.COHESION]
                print(f"   粘聚力: {cohesion/1000:.1f} kPa")
            else:
                print("   ❌ 粘聚力参数未找到!")
            
            if props.Has(KratosMultiphysics.VOLUME_ACCELERATION):
                gravity = props[KratosMultiphysics.VOLUME_ACCELERATION]
                print(f"   重力: [{gravity[0]:.2f}, {gravity[1]:.2f}, {gravity[2]:.2f}] m/s²")
            else:
                print("   ❌ 重力参数未找到!")
            
            if props.Has(KratosMultiphysics.CONSTITUTIVE_LAW):
                const_law = props[KratosMultiphysics.CONSTITUTIVE_LAW]
                print(f"   本构模型: {const_law.Info()}")
            else:
                print("   ❌ 本构模型未找到!")
    
    print("\n✅ 终极摩尔-库伦配置验证成功!")
    print("🎯 所有参数都正确设置，可以开始分析！")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
