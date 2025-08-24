#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
最终重力修复方案
使用assign_vector_variable_process，但不设置constrained
"""

import json
import os

def final_gravity_fix():
    """最终重力修复方案"""
    print("🎯 最终重力修复方案")
    print("=" * 60)
    print("🔍 发现:")
    print("   1. apply_gravity_on_bodies_process不存在")
    print("   2. StructuralMechanicsApplication没有专门的重力Process")
    print("   3. 回到基础方法: assign_vector_variable_process")
    print("   4. 关键: 不设置constrained，让重力自由作用")
    
    stages = [
        "multi_stage_kratos_conversion/stage_1",
        "multi_stage_kratos_conversion/stage_2"
    ]
    
    for stage in stages:
        params_file = f"{stage}/ProjectParameters.json"
        
        try:
            with open(params_file, 'r', encoding='utf-8') as f:
                params = json.load(f)
            
            # 最终的重力Process配置
            final_gravity_process = {
                "python_module": "assign_vector_variable_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorVariableProcess",
                "Parameters": {
                    "model_part_name": "Structure",
                    "variable_name": "VOLUME_ACCELERATION",
                    "value": [0.0, 0.0, -9.81],
                    "interval": [0.0, "End"]
                    # 注意: 不设置constrained，让重力自由作用
                }
            }
            
            # 确保processes结构存在
            if "processes" not in params:
                params["processes"] = {}
            if "loads_process_list" not in params["processes"]:
                params["processes"]["loads_process_list"] = []
            
            # 替换为最终的重力Process
            params["processes"]["loads_process_list"] = [final_gravity_process]
            
            with open(params_file, 'w', encoding='utf-8') as f:
                json.dump(params, f, indent=2, ensure_ascii=False)
            
            print(f"✅ 已配置最终重力Process到 {params_file}")
            
        except Exception as e:
            print(f"❌ 处理 {params_file} 失败: {e}")

def create_final_gravity_test():
    """创建最终重力测试脚本"""
    test_script = '''#!/usr/bin/env python3
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
    
    print("\\n🌍 最终重力验证...")
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
        
        print(f"\\n📊 重力设置成功率: {gravity_success}/3 ({gravity_success/3*100:.1f}%)")
        
        if gravity_success >= 2:
            print("\\n🎉 重力设置基本成功！")
        else:
            print("\\n❌ 重力设置仍有问题")
            
    else:
        print("❌ VOLUME_ACCELERATION变量不存在")
    
    print("\\n" + "="*60)
    print("🎯 最终重力测试完成")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
'''
    
    # 保存最终测试脚本
    stages = [
        "multi_stage_kratos_conversion/stage_1",
        "multi_stage_kratos_conversion/stage_2"
    ]
    
    for stage in stages:
        if os.path.exists(stage):
            with open(f'{stage}/test_final_gravity.py', 'w', encoding='utf-8') as f:
                f.write(test_script)
            print(f"✅ 已创建最终重力测试脚本: {stage}/test_final_gravity.py")

def main():
    """主函数"""
    print("🎯 最终重力修复方案")
    print("=" * 60)
    print("🚨 发现:")
    print("   apply_gravity_on_bodies_process在StructuralMechanicsApplication中不存在")
    print("🔧 解决方案:")
    print("   使用assign_vector_variable_process，不设置constrained")
    print("   让VOLUME_ACCELERATION自由作用在所有节点上")
    
    final_gravity_fix()
    create_final_gravity_test()
    
    print("\n" + "=" * 60)
    print("✅ 最终重力修复完成!")
    print("📋 下一步: 测试最终重力配置")

if __name__ == "__main__":
    main()
