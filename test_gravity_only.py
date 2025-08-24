#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
专门测试重力设置的脚本
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
    
    # 在Initialize之前检查Process配置
    print("\n🔍 检查Process配置...")
    processes_params = parameters["processes"]
    if processes_params.Has("loads_process_list"):
        loads_list = processes_params["loads_process_list"]
        print(f"   发现 {loads_list.size()} 个荷载Process")
        for i in range(loads_list.size()):
            process = loads_list[i]
            print(f"   Process {i+1}:")
            print(f"     模块: {process['python_module'].GetString()}")
            print(f"     变量: {process['Parameters']['variable_name'].GetString()}")
            print(f"     模型部分: {process['Parameters']['model_part_name'].GetString()}")
    else:
        print("   ❌ 没有找到loads_process_list!")
    
    analysis.Initialize()
    
    print("\n🌍 检查重力设置结果...")
    main_model_part = model["Structure"]
    
    # 检查节点上的VOLUME_ACCELERATION
    sample_nodes = list(main_model_part.Nodes)[:5]  # 检查前5个节点
    
    for node in sample_nodes:
        node_id = node.Id
        print(f"\n📋 节点 {node_id}:")
        
        # 检查节点是否有VOLUME_ACCELERATION变量
        if node.Has(KratosMultiphysics.VOLUME_ACCELERATION):
            gravity = node.GetSolutionStepValue(KratosMultiphysics.VOLUME_ACCELERATION)
            print(f"   VOLUME_ACCELERATION: [{gravity[0]:.3f}, {gravity[1]:.3f}, {gravity[2]:.3f}]")
            
            if abs(gravity[2] + 9.81) < 0.1:
                print("   ✅ 重力设置正确")
            else:
                print(f"   ❌ 重力值错误: {gravity[2]}")
        else:
            print("   ❌ 节点没有VOLUME_ACCELERATION变量")
        
        # 检查节点是否有VOLUME_ACCELERATION的DOF
        if node.HasDofFor(KratosMultiphysics.VOLUME_ACCELERATION_X):
            print("   ✅ 节点有VOLUME_ACCELERATION_X DOF")
        else:
            print("   ❌ 节点没有VOLUME_ACCELERATION_X DOF")
    
    # 检查Properties中的重力设置
    print("\n🔍 检查Properties中的重力设置...")
    for i in range(2, 13):
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            if props.Has(KratosMultiphysics.VOLUME_ACCELERATION):
                gravity = props[KratosMultiphysics.VOLUME_ACCELERATION]
                print(f"   材料{i}: VOLUME_ACCELERATION = [{gravity[0]:.3f}, {gravity[1]:.3f}, {gravity[2]:.3f}]")
            else:
                print(f"   材料{i}: 没有VOLUME_ACCELERATION")
    
    # 检查模型部分的变量
    print("\n🔍 检查模型部分的变量...")
    print(f"   节点解步变量: {[var.Name() for var in main_model_part.GetNodalSolutionStepVariablesList()]}")
    
    # 尝试手动设置重力到一个节点
    print("\n🧪 手动测试重力设置...")
    test_node = sample_nodes[0]
    try:
        # 尝试设置VOLUME_ACCELERATION
        gravity_vector = KratosMultiphysics.Vector(3)
        gravity_vector[0] = 0.0
        gravity_vector[1] = 0.0
        gravity_vector[2] = -9.81
        test_node.SetSolutionStepValue(KratosMultiphysics.VOLUME_ACCELERATION, gravity_vector)
        
        # 验证设置
        set_gravity = test_node.GetSolutionStepValue(KratosMultiphysics.VOLUME_ACCELERATION)
        print(f"   手动设置结果: [{set_gravity[0]:.3f}, {set_gravity[1]:.3f}, {set_gravity[2]:.3f}]")
        print("   ✅ 手动设置成功")
        
    except Exception as e:
        print(f"   ❌ 手动设置失败: {e}")
    
    print("\n" + "="*60)
    print("🎯 重力测试总结:")
    print("   1. Process配置已检查")
    print("   2. 节点重力状态已检查")
    print("   3. Properties重力状态已检查")
    print("   4. 手动设置测试已完成")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
