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
    
    print("🔍 验证完全正确的配置...")
    main_model_part = model["Structure"]
    
    print(f"\n📊 模型统计:")
    print(f"   节点数量: {len(main_model_part.Nodes)}")
    print(f"   单元数量: {len(main_model_part.Elements)}")
    print(f"   材料数量: {len(main_model_part.Properties)}")
    
    all_correct = True
    
    for i in range(2, 13):
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            
            print(f"\n📋 材料 {i}:")
            
            # 检查内摩擦角
            friction_ok = False
            if props.Has(ConstitutiveLawsApplication.FRICTION_ANGLE):
                friction = props[ConstitutiveLawsApplication.FRICTION_ANGLE]
                print(f"   内摩擦角(φ): {friction}°")
                if friction >= 15.0:
                    friction_ok = True
                    print("     ✅ 内摩擦角正确")
                else:
                    print(f"     ❌ 内摩擦角过小: {friction}°")
                    all_correct = False
            else:
                print("   ❌ 内摩擦角参数未找到!")
                all_correct = False
            
            # 检查剪胀角
            if props.Has(ConstitutiveLawsApplication.DILATANCY_ANGLE):
                dilatancy = props[ConstitutiveLawsApplication.DILATANCY_ANGLE]
                print(f"   剪胀角(ψ): {dilatancy}° ✅ {'(粘土为0正常)' if dilatancy == 0 else '(砂土可>0)'}")
            else:
                print("   ❌ 剪胀角参数未找到!")
                all_correct = False
            
            # 检查粘聚力
            if props.Has(ConstitutiveLawsApplication.COHESION):
                cohesion = props[ConstitutiveLawsApplication.COHESION]
                print(f"   粘聚力(c): {cohesion/1000:.1f} kPa ✅")
            else:
                print("   ❌ 粘聚力参数未找到!")
                all_correct = False
            
            # 检查本构模型
            if props.Has(KratosMultiphysics.CONSTITUTIVE_LAW):
                const_law = props[KratosMultiphysics.CONSTITUTIVE_LAW]
                model_info = const_law.Info()
                print(f"   本构模型: {model_info}")
                if "Plastic" in model_info and "MohrCoulomb" in model_info:
                    print("     ✅ 塑性摩尔-库伦模型正确")
                else:
                    print(f"     ❌ 本构模型不正确: {model_info}")
                    all_correct = False
            else:
                print("   ❌ 本构模型未找到!")
                all_correct = False
    
    # 检查重力设置
    print("\n🌍 检查重力设置...")
    sample_node = main_model_part.Nodes[1] if len(main_model_part.Nodes) > 0 else None
    if sample_node:
        if sample_node.Has(KratosMultiphysics.VOLUME_ACCELERATION):
            node_gravity = sample_node.GetSolutionStepValue(KratosMultiphysics.VOLUME_ACCELERATION)
            print(f"   节点重力: [{node_gravity[0]:.2f}, {node_gravity[1]:.2f}, {node_gravity[2]:.2f}] m/s²")
            if abs(node_gravity[2] + 9.81) < 0.1:
                print("     ✅ 重力设置正确")
            else:
                print(f"     ❌ 重力设置错误: {node_gravity[2]}")
                all_correct = False
        else:
            print("   ❌ 节点上没有VOLUME_ACCELERATION!")
            all_correct = False
    
    # 最终结果
    print("\n" + "="*60)
    if all_correct:
        print("🎉 所有细节问题都已解决！配置完全正确！")
        print("💡 关键要点:")
        print("   1. 内摩擦角(φ): 控制剪切强度，≥15°避免tolerance")
        print("   2. 剪胀角(ψ): 控制体积变化，粘土为0是正常的")
        print("   3. 塑性模型: Factory模式配置正确")
        print("   4. 重力: Process方式施加正确")
        print("\n🚀 可以开始深基坑多阶段塑性分析！")
    else:
        print("⚠️ 仍有细节问题需要解决")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
