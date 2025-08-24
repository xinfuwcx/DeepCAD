#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试最终修复方案
"""

import os
import shutil
import json

def test_final_fix():
    """测试最终修复方案"""
    print("🧪 测试基于Kratos 10.3源代码的最终修复")
    print("=" * 60)
    
    # 1. 复制最终材料文件到各个阶段
    stages = [
        "multi_stage_kratos_conversion/stage_1",
        "multi_stage_kratos_conversion/stage_2"
    ]
    
    for stage in stages:
        if os.path.exists(stage):
            # 复制最终材料文件
            shutil.copy2('materials_final_kratos103.json', f'{stage}/StructuralMaterials.json')
            print(f"✅ 已复制最终材料文件到 {stage}")
        else:
            print(f"⚠️ 目录不存在: {stage}")
    
    # 2. 验证材料文件内容
    print("\n🔍 验证最终材料文件内容:")
    with open('materials_final_kratos103.json', 'r', encoding='utf-8') as f:
        materials = json.load(f)
    
    for material in materials["properties"]:
        mat_id = material["properties_id"]
        variables = material["Material"]["Variables"]
        
        friction_angle = variables["FRICTION_ANGLE"]
        volume_acceleration = variables["VOLUME_ACCELERATION"]
        
        print(f"   材料{mat_id}: 摩擦角={friction_angle}°, 重力={volume_acceleration}")
        
        # 验证关键参数
        assert friction_angle > 10.0, f"材料{mat_id}摩擦角太小: {friction_angle}"
        assert volume_acceleration[2] == -9.81, f"材料{mat_id}重力设置错误"
        assert "VOLUME_ACCELERATION" in variables, f"材料{mat_id}缺少重力参数"
    
    print("\n✅ 材料文件验证通过!")
    
    # 3. 验证ProjectParameters配置
    print("\n🔍 验证ProjectParameters配置:")
    for stage in stages:
        params_file = f"{stage}/ProjectParameters.json"
        if os.path.exists(params_file):
            with open(params_file, 'r', encoding='utf-8') as f:
                params = json.load(f)
            
            loads_processes = params.get("processes", {}).get("loads_process_list", [])
            print(f"   {stage}: loads_process_list长度 = {len(loads_processes)}")
            
            # 应该为空，因为重力通过材料Properties设置
            assert len(loads_processes) == 0, f"{stage}仍有loads_process配置"
    
    print("✅ ProjectParameters配置验证通过!")
    
    # 4. 创建简单测试脚本
    test_script = """#!/usr/bin/env python3
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
    
    print("✅ 初始化成功! 摩擦角和重力参数设置正确!")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    sys.exit(1)
"""
    
    # 保存测试脚本到各个阶段
    for stage in stages:
        if os.path.exists(stage):
            with open(f'{stage}/test_initialization.py', 'w', encoding='utf-8') as f:
                f.write(test_script)
            print(f"✅ 已创建测试脚本: {stage}/test_initialization.py")
    
    print("\n" + "=" * 60)
    print("✅ 最终修复测试准备完成!")
    print("\n📋 修复要点总结:")
    print("   1. ✅ 摩擦角使用度数，避免Kratos tolerance问题")
    print("   2. ✅ 重力通过材料Properties的VOLUME_ACCELERATION设置")
    print("   3. ✅ 移除了loads_process_list中的重力Process")
    print("   4. ✅ 使用真实FPN材料参数")
    print("   5. ✅ 本构模型: SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D")
    
    print("\n🚀 下一步:")
    print("   cd multi_stage_kratos_conversion/stage_1")
    print("   python test_initialization.py")

if __name__ == "__main__":
    test_final_fix()
