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
    
    print("🔍 验证修正后的配置...")
    main_model_part = model["Structure"]
    
    print(f"\n📊 模型统计:")
    print(f"   节点数量: {len(main_model_part.Nodes)}")
    print(f"   单元数量: {len(main_model_part.Elements)}")
    print(f"   材料数量: {len(main_model_part.Properties)}")
    
    friction_ok = 0
    dilatancy_ok = 0
    gravity_ok = 0
    model_ok = 0
    
    for i in range(2, 13):
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            
            print(f"\n📋 材料 {i}:")
            
            # 检查摩擦角
            if props.Has(ConstitutiveLawsApplication.FRICTION_ANGLE):
                friction = props[ConstitutiveLawsApplication.FRICTION_ANGLE]
                print(f"   摩擦角(φ): {friction}°")
                if friction >= 15.0:
                    friction_ok += 1
            
            # 检查剪胀角
            if props.Has(ConstitutiveLawsApplication.DILATANCY_ANGLE):
                dilatancy = props[ConstitutiveLawsApplication.DILATANCY_ANGLE]
                print(f"   剪胀角(ψ): {dilatancy}° {'✅ 正常' if dilatancy >= 0 else '❌'}")
                if dilatancy >= 0:
                    dilatancy_ok += 1
            
            # 检查粘聚力
            if props.Has(ConstitutiveLawsApplication.COHESION):
                cohesion = props[ConstitutiveLawsApplication.COHESION]
                print(f"   粘聚力(c): {cohesion/1000:.1f} kPa")
            
            # 检查重力参数（通过Properties）
            if props.Has(KratosMultiphysics.VOLUME_ACCELERATION):
                gravity = props[KratosMultiphysics.VOLUME_ACCELERATION]
                print(f"   重力: [{gravity[0]:.2f}, {gravity[1]:.2f}, {gravity[2]:.2f}] m/s²")
                if abs(gravity[2] + 9.81) < 0.1:  # 检查Z方向重力
                    gravity_ok += 1
            
            # 检查本构模型
            if props.Has(KratosMultiphysics.CONSTITUTIVE_LAW):
                const_law = props[KratosMultiphysics.CONSTITUTIVE_LAW]
                model_info = const_law.Info()
                print(f"   本构模型: {model_info}")
                if "Plastic" in model_info or "MohrCoulomb" in model_info:
                    model_ok += 1
    
    # 总结结果
    print("\n" + "="*60)
    print("📊 修正后验证结果:")
    print(f"✅ 摩擦角正确: {friction_ok}/11 个材料")
    print(f"✅ 剪胀角正确: {dilatancy_ok}/11 个材料")
    print(f"✅ 重力设置正确: {gravity_ok}/11 个材料")
    print(f"✅ 本构模型: {model_ok}/11 个材料")
    
    total_score = friction_ok + dilatancy_ok + gravity_ok + model_ok
    max_score = 44  # 11材料 × 4项
    
    print(f"\n🎯 总体评分: {total_score}/{max_score} ({total_score/max_score*100:.1f}%)")
    
    if total_score >= max_score * 0.8:  # 80%以上
        print("\n🎉 配置基本正确！可以开始深基坑分析！")
        print("💡 关键要点:")
        print("   - 摩擦角(φ): 控制剪切强度")
        print("   - 剪胀角(ψ): 控制体积变化，粘土为0是正常的")
        print("   - 重力: 通过材料Properties的VOLUME_ACCELERATION设置")
        print("   - 塑性摩尔-库伦: 适合多阶段开挖分析")
    else:
        print(f"\n⚠️ 仍有问题需要解决，当前得分: {total_score/max_score*100:.1f}%")
    
    print("\n🚀 下一步: 运行完整的Kratos分析")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
