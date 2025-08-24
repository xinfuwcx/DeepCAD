#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复重力设置问题
VOLUME_ACCELERATION不是节点DOF，不能通过Process设置
"""

import json
import os

def fix_gravity_process_config():
    """修复重力Process配置"""
    print("🔧 修复重力Process配置")
    print("=" * 50)
    print("🚨 问题分析:")
    print("   - VOLUME_ACCELERATION不是节点DOF变量")
    print("   - 不能通过assign_vector_variable_process设置")
    print("   - 应该只通过材料Properties设置")
    
    stages = [
        "multi_stage_kratos_conversion/stage_1",
        "multi_stage_kratos_conversion/stage_2"
    ]
    
    for stage in stages:
        params_file = f"{stage}/ProjectParameters.json"
        
        try:
            with open(params_file, 'r', encoding='utf-8') as f:
                params = json.load(f)
            
            # 清空loads_process_list，重力只通过材料Properties设置
            if "processes" not in params:
                params["processes"] = {}
            
            params["processes"]["loads_process_list"] = []
            
            print(f"✅ 已清空 {params_file} 的loads_process_list")
            print("   重力将只通过材料Properties的VOLUME_ACCELERATION设置")
            
            with open(params_file, 'w', encoding='utf-8') as f:
                json.dump(params, f, indent=2, ensure_ascii=False)
            
        except Exception as e:
            print(f"❌ 处理 {params_file} 失败: {e}")

def create_corrected_test_script():
    """创建修正的测试脚本"""
    test_script = '''#!/usr/bin/env python3
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
    
    print(f"\\n📊 模型统计:")
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
            
            print(f"\\n📋 材料 {i}:")
            
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
    print("\\n" + "="*60)
    print("📊 修正后验证结果:")
    print(f"✅ 摩擦角正确: {friction_ok}/11 个材料")
    print(f"✅ 剪胀角正确: {dilatancy_ok}/11 个材料")
    print(f"✅ 重力设置正确: {gravity_ok}/11 个材料")
    print(f"✅ 本构模型: {model_ok}/11 个材料")
    
    total_score = friction_ok + dilatancy_ok + gravity_ok + model_ok
    max_score = 44  # 11材料 × 4项
    
    print(f"\\n🎯 总体评分: {total_score}/{max_score} ({total_score/max_score*100:.1f}%)")
    
    if total_score >= max_score * 0.8:  # 80%以上
        print("\\n🎉 配置基本正确！可以开始深基坑分析！")
        print("💡 关键要点:")
        print("   - 摩擦角(φ): 控制剪切强度")
        print("   - 剪胀角(ψ): 控制体积变化，粘土为0是正常的")
        print("   - 重力: 通过材料Properties的VOLUME_ACCELERATION设置")
        print("   - 塑性摩尔-库伦: 适合多阶段开挖分析")
    else:
        print(f"\\n⚠️ 仍有问题需要解决，当前得分: {total_score/max_score*100:.1f}%")
    
    print("\\n🚀 下一步: 运行完整的Kratos分析")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
'''
    
    # 保存修正的测试脚本
    stages = [
        "multi_stage_kratos_conversion/stage_1",
        "multi_stage_kratos_conversion/stage_2"
    ]
    
    for stage in stages:
        if os.path.exists(stage):
            with open(f'{stage}/test_corrected.py', 'w', encoding='utf-8') as f:
                f.write(test_script)
            print(f"✅ 已创建修正测试脚本: {stage}/test_corrected.py")

def main():
    """主函数"""
    print("🔧 修复重力设置问题")
    print("=" * 50)
    print("🚨 问题:")
    print("   VOLUME_ACCELERATION不是节点DOF变量")
    print("   不能通过assign_vector_variable_process设置")
    print("🔧 解决方案:")
    print("   1. 清空loads_process_list")
    print("   2. 只通过材料Properties设置VOLUME_ACCELERATION")
    print("   3. 重新测试验证")
    
    fix_gravity_process_config()
    create_corrected_test_script()
    
    print("\n" + "=" * 50)
    print("✅ 重力问题修复完成!")
    print("\n📋 下一步:")
    print("   cd multi_stage_kratos_conversion/stage_1")
    print("   python test_corrected.py")

if __name__ == "__main__":
    main()
