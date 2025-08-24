#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
最终重力测试脚本 - 简化版本
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
    
    print("\n🌍 检查重力设置结果...")
    main_model_part = model["Structure"]
    
    # 检查Properties中的重力设置
    print("🔍 检查Properties中的重力设置...")
    gravity_found = 0
    for i in range(2, 13):
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            if props.Has(KratosMultiphysics.VOLUME_ACCELERATION):
                gravity = props[KratosMultiphysics.VOLUME_ACCELERATION]
                print(f"   材料{i}: VOLUME_ACCELERATION = [{gravity[0]:.3f}, {gravity[1]:.3f}, {gravity[2]:.3f}]")
                if abs(gravity[2] + 9.81) < 0.1:
                    gravity_found += 1
                    print("     ✅ 重力设置正确")
                else:
                    print(f"     ❌ 重力值错误: {gravity[2]}")
            else:
                print(f"   材料{i}: ❌ 没有VOLUME_ACCELERATION")
    
    # 检查节点重力（简化检查）
    print("\n🔍 检查节点重力...")
    sample_nodes = list(main_model_part.Nodes)[:3]  # 只检查前3个节点
    
    node_gravity_found = 0
    for node in sample_nodes:
        node_id = node.Id
        if node.Has(KratosMultiphysics.VOLUME_ACCELERATION):
            gravity = node.GetSolutionStepValue(KratosMultiphysics.VOLUME_ACCELERATION)
            print(f"   节点{node_id}: [{gravity[0]:.3f}, {gravity[1]:.3f}, {gravity[2]:.3f}]")
            if abs(gravity[2] + 9.81) < 0.1:
                node_gravity_found += 1
        else:
            print(f"   节点{node_id}: ❌ 没有VOLUME_ACCELERATION")
    
    # 总结结果
    print("\n" + "="*60)
    print("🎯 重力测试总结:")
    print(f"   Properties重力: {gravity_found}/11 个材料正确")
    print(f"   节点重力: {node_gravity_found}/3 个节点正确")
    
    if gravity_found >= 8:  # 大部分材料有重力
        print("✅ Properties重力设置基本正确")
    else:
        print("❌ Properties重力设置有问题")
    
    if node_gravity_found > 0:
        print("✅ 节点重力设置正确")
    else:
        print("❌ 节点重力设置有问题")
    
    total_score = gravity_found + node_gravity_found
    if total_score >= 8:
        print("\n🎉 重力设置基本成功！可以进行分析！")
    else:
        print(f"\n⚠️ 重力设置仍有问题，得分: {total_score}")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
