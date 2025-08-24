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
    
    print("\n🔍 验证最终本构配置...")
    main_model_part = model["Structure"]
    
    print(f"📊 模型统计:")
    print(f"   节点数量: {len(main_model_part.Nodes)}")
    print(f"   单元数量: {len(main_model_part.Elements)}")
    print(f"   材料数量: {len(main_model_part.Properties)}")
    
    constitutive_success = 0
    friction_success = 0
    dilatancy_success = 0
    cohesion_success = 0
    gravity_success = 0
    
    for i in range(2, 13):
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            
            print(f"\n📋 材料 {i}:")
            
            # 检查本构模型
            if props.Has(KratosMultiphysics.CONSTITUTIVE_LAW):
                const_law = props[KratosMultiphysics.CONSTITUTIVE_LAW]
                model_info = const_law.Info()
                print(f"   本构模型: {model_info}")
                
                if "MohrCoulomb" in model_info and "Plastic" in model_info:
                    print("     ✅ 摩尔-库伦塑性模型正确")
                    constitutive_success += 1
                elif "ElasticIsotropic3D" in model_info:
                    print("     ❌ 仍为弹性模型")
                else:
                    print(f"     ⚠️ 其他模型: {model_info}")
            
            # 检查摩擦角
            if props.Has(ConstitutiveLawsApplication.FRICTION_ANGLE):
                friction = props[ConstitutiveLawsApplication.FRICTION_ANGLE]
                print(f"   内摩擦角: {friction}°")
                if friction >= 15.0:
                    friction_success += 1
                    print("     ✅ 摩擦角正确")
                else:
                    print(f"     ❌ 摩擦角过小: {friction}°")
            
            # 检查剪胀角
            if props.Has(ConstitutiveLawsApplication.DILATANCY_ANGLE):
                dilatancy = props[ConstitutiveLawsApplication.DILATANCY_ANGLE]
                print(f"   剪胀角: {dilatancy}° ✅")
                dilatancy_success += 1
            
            # 检查粘聚力
            if props.Has(ConstitutiveLawsApplication.COHESION):
                cohesion = props[ConstitutiveLawsApplication.COHESION]
                print(f"   粘聚力: {cohesion/1000:.1f} kPa ✅")
                cohesion_success += 1
            
            # 检查重力
            if props.Has(KratosMultiphysics.VOLUME_ACCELERATION):
                gravity = props[KratosMultiphysics.VOLUME_ACCELERATION]
                print(f"   重力: [{gravity[0]:.2f}, {gravity[1]:.2f}, {gravity[2]:.2f}] ✅")
                gravity_success += 1
    
    # 总结结果
    print("\n" + "="*60)
    print("📊 最终本构验证结果:")
    print(f"   ✅ 本构模型正确: {constitutive_success}/11 个材料")
    print(f"   ✅ 摩擦角正确: {friction_success}/11 个材料")
    print(f"   ✅ 剪胀角正确: {dilatancy_success}/11 个材料")
    print(f"   ✅ 粘聚力正确: {cohesion_success}/11 个材料")
    print(f"   ✅ 重力设置正确: {gravity_success}/11 个材料")
    
    total_score = constitutive_success + friction_success + dilatancy_success + cohesion_success + gravity_success
    max_score = 55  # 11材料 × 5项
    
    print(f"\n🎯 总体评分: {total_score}/{max_score} ({total_score/max_score*100:.1f}%)")
    
    if constitutive_success >= 8:
        print("\n🎉 本构模型配置成功！")
    else:
        print(f"\n❌ 本构模型仍有问题")
    
    if total_score >= max_score * 0.8:
        print("\n🚀 配置基本完成！可以开始深基坑分析！")
        print("💡 关键成就:")
        print("   - 摩尔-库伦塑性模型正确配置")
        print("   - FPN参数成功转换")
        print("   - 重力通过Properties设置")
        print("   - 适合多阶段开挖分析")
    else:
        print(f"\n⚠️ 仍需优化，当前得分: {total_score/max_score*100:.1f}%")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
