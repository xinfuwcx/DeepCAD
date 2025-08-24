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
    
    print("🔍 验证优化的塑性摩尔-库伦参数...")
    main_model_part = model["Structure"]
    
    tolerance_issues = []
    gravity_issues = []
    model_issues = []
    
    for i in range(2, 13):
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            
            print(f"\n📋 材料 {i}:")
            
            # 检查摩擦角
            if props.Has(ConstitutiveLawsApplication.FRICTION_ANGLE):
                friction = props[ConstitutiveLawsApplication.FRICTION_ANGLE]
                print(f"   摩擦角: {friction}°")
                if friction < 1.0:  # 检查tolerance问题
                    tolerance_issues.append(f"材料{i}: {friction}°")
            else:
                print("   ❌ 摩擦角参数未找到!")
            
            # 检查剪胀角
            if props.Has(ConstitutiveLawsApplication.DILATANCY_ANGLE):
                dilatancy = props[ConstitutiveLawsApplication.DILATANCY_ANGLE]
                print(f"   剪胀角: {dilatancy}°")
            else:
                print("   ❌ 剪胀角参数未找到!")
            
            # 检查粘聚力
            if props.Has(ConstitutiveLawsApplication.COHESION):
                cohesion = props[ConstitutiveLawsApplication.COHESION]
                print(f"   粘聚力: {cohesion/1000:.1f} kPa")
            else:
                print("   ❌ 粘聚力参数未找到!")
            
            # 检查重力参数
            gravity_found = False
            if props.Has(KratosMultiphysics.VOLUME_ACCELERATION):
                gravity = props[KratosMultiphysics.VOLUME_ACCELERATION]
                print(f"   重力(VOLUME_ACCELERATION): [{gravity[0]:.2f}, {gravity[1]:.2f}, {gravity[2]:.2f}]")
                gravity_found = True
            
            if props.Has(KratosMultiphysics.BODY_FORCE):
                body_force = props[KratosMultiphysics.BODY_FORCE]
                print(f"   体力(BODY_FORCE): [{body_force[0]:.2f}, {body_force[1]:.2f}, {body_force[2]:.2f}]")
                gravity_found = True
            
            if not gravity_found:
                gravity_issues.append(f"材料{i}")
            
            # 检查本构模型
            if props.Has(KratosMultiphysics.CONSTITUTIVE_LAW):
                const_law = props[KratosMultiphysics.CONSTITUTIVE_LAW]
                model_info = const_law.Info()
                print(f"   本构模型: {model_info}")
                if "ElasticIsotropic3D" in model_info:
                    model_issues.append(f"材料{i}: {model_info}")
            else:
                print("   ❌ 本构模型未找到!")
    
    # 总结问题
    print("\n" + "="*60)
    print("📊 验证结果总结:")
    
    if tolerance_issues:
        print(f"⚠️ Tolerance问题 ({len(tolerance_issues)}个):")
        for issue in tolerance_issues:
            print(f"   - {issue}")
    else:
        print("✅ 无摩擦角tolerance问题")
    
    if gravity_issues:
        print(f"⚠️ 重力参数问题 ({len(gravity_issues)}个):")
        for issue in gravity_issues:
            print(f"   - {issue}")
    else:
        print("✅ 重力参数设置正确")
    
    if model_issues:
        print(f"⚠️ 本构模型问题 ({len(model_issues)}个):")
        for issue in model_issues:
            print(f"   - {issue}")
    else:
        print("✅ 塑性摩尔-库伦模型加载正确")
    
    if not tolerance_issues and not gravity_issues and not model_issues:
        print("\n🎉 所有参数验证通过！可以开始深基坑分析！")
    else:
        print("\n⚠️ 仍有问题需要解决，但基本配置已经正确")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
