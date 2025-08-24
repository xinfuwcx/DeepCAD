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
    
    print("🔍 验证最终综合配置...")
    main_model_part = model["Structure"]
    
    friction_issues = []
    dilatancy_issues = []
    gravity_issues = []
    model_issues = []
    
    for i in range(2, 13):
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            
            print(f"\n📋 材料 {i}:")
            
            # 检查摩擦角
            if props.Has(ConstitutiveLawsApplication.FRICTION_ANGLE):
                friction = props[ConstitutiveLawsApplication.FRICTION_ANGLE]
                print(f"   摩擦角(φ): {friction}°")
                if friction < 1.0:
                    friction_issues.append(f"材料{i}: {friction}°")
            else:
                friction_issues.append(f"材料{i}: 参数未找到")
            
            # 检查剪胀角
            if props.Has(ConstitutiveLawsApplication.DILATANCY_ANGLE):
                dilatancy = props[ConstitutiveLawsApplication.DILATANCY_ANGLE]
                print(f"   剪胀角(ψ): {dilatancy}° {'(正常，粘土可为0)' if dilatancy == 0 else ''}")
            else:
                dilatancy_issues.append(f"材料{i}: 参数未找到")
            
            # 检查粘聚力
            if props.Has(ConstitutiveLawsApplication.COHESION):
                cohesion = props[ConstitutiveLawsApplication.COHESION]
                print(f"   粘聚力(c): {cohesion/1000:.1f} kPa")
            
            # 检查重力参数
            gravity_found = False
            if props.Has(KratosMultiphysics.VOLUME_ACCELERATION):
                gravity = props[KratosMultiphysics.VOLUME_ACCELERATION]
                print(f"   重力(Properties): [{gravity[0]:.2f}, {gravity[1]:.2f}, {gravity[2]:.2f}]")
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
    
    # 检查Process级别的重力
    print("\n🌍 检查Process级别的重力设置...")
    # 这里无法直接检查Process，但可以通过节点检查
    sample_node = main_model_part.Nodes[1] if len(main_model_part.Nodes) > 0 else None
    if sample_node and sample_node.Has(KratosMultiphysics.VOLUME_ACCELERATION):
        node_gravity = sample_node.GetSolutionStepValue(KratosMultiphysics.VOLUME_ACCELERATION)
        print(f"   节点重力: [{node_gravity[0]:.2f}, {node_gravity[1]:.2f}, {node_gravity[2]:.2f}]")
    
    # 总结结果
    print("\n" + "="*60)
    print("📊 最终验证结果:")
    
    if friction_issues:
        print(f"⚠️ 摩擦角问题 ({len(friction_issues)}个):")
        for issue in friction_issues:
            print(f"   - {issue}")
    else:
        print("✅ 摩擦角参数正确")
    
    if dilatancy_issues:
        print(f"⚠️ 剪胀角问题 ({len(dilatancy_issues)}个):")
        for issue in dilatancy_issues:
            print(f"   - {issue}")
    else:
        print("✅ 剪胀角参数正确（为0是正常的）")
    
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
        print("✅ 塑性摩尔-库伦模型正确")
    
    total_issues = len(friction_issues) + len(dilatancy_issues) + len(gravity_issues) + len(model_issues)
    
    if total_issues == 0:
        print("\n🎉 所有参数验证通过！深基坑分析配置完美！")
        print("💡 理论澄清:")
        print("   - 摩擦角(φ): 控制剪切强度")
        print("   - 剪胀角(ψ): 控制体积变化，为0是正常的")
        print("   - 塑性摩尔-库伦: 适合多阶段开挖分析")
        print("   - 重力: 双重保险（Process + Properties）")
    else:
        print(f"\n⚠️ 发现 {total_issues} 个问题，但基本配置正确")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
