#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("🔧 导入Kratos和StructuralMechanicsApplication...")
    import KratosMultiphysics
    from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
    from KratosMultiphysics import StructuralMechanicsApplication
    
    print("📖 读取参数...")
    with open('ProjectParameters.json', 'r', encoding='utf-8') as f:
        params_text = f.read()
    
    print("🏗️ 创建模型...")
    model = KratosMultiphysics.Model()
    parameters = KratosMultiphysics.Parameters(params_text)
    
    print("⚙️ 初始化分析...")
    analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(model, parameters)
    analysis.Initialize()
    
    print("\n🌍 验证ApplyGravityOnBodiesProcess的效果...")
    main_model_part = model["Structure"]
    
    print(f"📊 模型统计:")
    print(f"   节点数量: {len(main_model_part.Nodes)}")
    print(f"   单元数量: {len(main_model_part.Elements)}")
    
    # 检查节点解步变量列表
    variables_list = [var.Name() for var in main_model_part.GetNodalSolutionStepVariablesList()]
    print(f"\n📋 节点解步变量: {variables_list}")
    
    if "VOLUME_ACCELERATION" in variables_list:
        print("✅ VOLUME_ACCELERATION变量已添加到节点")
    else:
        print("❌ VOLUME_ACCELERATION变量未添加到节点")
    
    # 检查前5个节点的重力设置
    sample_nodes = list(main_model_part.Nodes)[:5]
    gravity_success = 0
    
    print("\n🔍 检查节点重力设置:")
    for node in sample_nodes:
        node_id = node.Id
        try:
            if node.Has(KratosMultiphysics.VOLUME_ACCELERATION):
                gravity = node.GetSolutionStepValue(KratosMultiphysics.VOLUME_ACCELERATION)
                print(f"   节点{node_id}: [{gravity[0]:.3f}, {gravity[1]:.3f}, {gravity[2]:.3f}] m/s²")
                
                if abs(gravity[2] + 9.81) < 0.1:
                    print(f"     ✅ 重力设置正确")
                    gravity_success += 1
                else:
                    print(f"     ❌ 重力值错误: {gravity[2]}")
            else:
                print(f"   节点{node_id}: ❌ 没有VOLUME_ACCELERATION变量")
        except Exception as e:
            print(f"   节点{node_id}: ❌ 读取失败: {e}")
    
    # 检查Process是否正确执行
    print("\n🔍 检查Process执行情况:")
    processes_params = parameters["processes"]
    if processes_params.Has("loads_process_list"):
        loads_list = processes_params["loads_process_list"]
        print(f"   配置的荷载Process数量: {loads_list.size()}")
        for i in range(loads_list.size()):
            process = loads_list[i]
            print(f"   Process {i+1}:")
            print(f"     模块: {process['python_module'].GetString()}")
            print(f"     Kratos模块: {process['kratos_module'].GetString()}")
            print(f"     Process名: {process['process_name'].GetString()}")
            if process['Parameters'].Has('gravity_vector'):
                gravity_vec = process['Parameters']['gravity_vector']
                print(f"     重力向量: [{gravity_vec[0].GetDouble():.3f}, {gravity_vec[1].GetDouble():.3f}, {gravity_vec[2].GetDouble():.3f}]")
    
    # 总结结果
    print("\n" + "="*60)
    print("🎯 重力验证结果:")
    print(f"   成功设置重力的节点: {gravity_success}/5")
    
    if gravity_success >= 3:
        print("\n🎉 重力设置成功！ApplyGravityOnBodiesProcess工作正常！")
        print("✅ 可以开始深基坑分析了！")
    else:
        print(f"\n❌ 重力设置仍有问题，成功率: {gravity_success/5*100:.1f}%")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
