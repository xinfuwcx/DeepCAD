#!/usr/bin/env python3
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
    
    print("\n🌍 最终重力验证...")
    main_model_part = model["Structure"]
    
    # 检查节点解步变量
    variables_list = [var.Name() for var in main_model_part.GetNodalSolutionStepVariablesList()]
    print(f"📋 节点变量: {variables_list}")
    
    if "VOLUME_ACCELERATION" in variables_list:
        print("✅ VOLUME_ACCELERATION变量存在")
        
        # 检查前3个节点
        sample_nodes = list(main_model_part.Nodes)[:3]
        gravity_success = 0
        
        for node in sample_nodes:
            node_id = node.Id
            try:
                gravity = node.GetSolutionStepValue(KratosMultiphysics.VOLUME_ACCELERATION)
                print(f"   节点{node_id}: [{gravity[0]:.3f}, {gravity[1]:.3f}, {gravity[2]:.3f}]")
                
                if abs(gravity[2] + 9.81) < 0.1:
                    print(f"     ✅ 重力正确")
                    gravity_success += 1
                elif abs(gravity[2]) < 0.1:
                    print(f"     ⚠️ 重力为0，可能Process未执行")
                else:
                    print(f"     ❌ 重力值错误")
                    
            except Exception as e:
                print(f"   节点{node_id}: ❌ 读取失败: {e}")
        
        print(f"\n📊 重力设置成功率: {gravity_success}/3 ({gravity_success/3*100:.1f}%)")
        
        if gravity_success >= 2:
            print("\n🎉 重力设置基本成功！")
        else:
            print("\n❌ 重力设置仍有问题")
            
    else:
        print("❌ VOLUME_ACCELERATION变量不存在")
    
    print("\n" + "="*60)
    print("🎯 最终重力测试完成")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
