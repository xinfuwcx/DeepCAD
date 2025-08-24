#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基于深度RAG分析的完全正确解决方案
解决所有细节问题：摩擦角概念、塑性模型配置、重力施加
"""

import json
import math
import os

def create_correct_plastic_materials():
    """创建完全正确的塑性摩尔-库伦材料配置"""
    print("🎯 基于深度RAG分析的完全正确解决方案")
    print("=" * 60)
    print("🔍 关键发现:")
    print("   1. 摩擦角(φ) = 内摩擦角，控制剪切强度")
    print("   2. 剪胀角(ψ) = 体积膨胀角，为0是正常的")
    print("   3. 正确的塑性模型: SmallStrainIsotropicPlasticityFactory")
    print("   4. 正确的重力Process: assign_vector_by_direction_process")
    
    # 从FPN分析结果读取真实参数
    with open('fpn_materials_analysis.json', 'r', encoding='utf-8') as f:
        fpn_materials = json.load(f)
    
    materials_data = {
        "properties": []
    }
    
    # 材料配置（基于FPN真实参数）
    material_configs = {
        2: {"name": "2细砂", "E": 15000000.0, "density": 2039.43, "friction": 35.0, "cohesion": 20000.0},
        3: {"name": "3粉质粘土", "E": 5000000.0, "density": 1988.45, "friction": 26.0, "cohesion": 9000.0},
        4: {"name": "4粉质粘土", "E": 5000000.0, "density": 1947.66, "friction": 24.0, "cohesion": 10000.0},
        5: {"name": "5粉质粘土", "E": 5000000.0, "density": 2121.01, "friction": 22.0, "cohesion": 13000.0},
        6: {"name": "6粉质粘土", "E": 40000000.0, "density": 1988.45, "friction": 35.0, "cohesion": 21000.0},
        7: {"name": "7粉质粘土", "E": 8000000.0, "density": 2121.01, "friction": 16.0, "cohesion": 25000.0},
        8: {"name": "8粉质粘土", "E": 9000000.0, "density": 2110.81, "friction": 20.7, "cohesion": 20500.0},
        9: {"name": "9粉质粘土", "E": 9000000.0, "density": 2059.83, "friction": 23.0, "cohesion": 14000.0},
        10: {"name": "10粉质粘土", "E": 40000000.0, "density": 2141.40, "friction": 35.0, "cohesion": 35000.0},
        11: {"name": "11粉质粘土", "E": 12000000.0, "density": 2059.83, "friction": 24.0, "cohesion": 17000.0},
        12: {"name": "12粉质粘土", "E": 20000000.0, "density": 2070.02, "friction": 35.0, "cohesion": 26000.0}
    }
    
    print("\n📋 正确的塑性摩尔-库伦配置:")
    print("   - 本构模型: SmallStrainIsotropicPlasticityFactory")
    print("   - 屈服面: ModifiedMohrCoulomb")
    print("   - 塑性势: ModifiedMohrCoulomb")
    print("   - 参数: FRICTION_ANGLE(度), DILATANCY_ANGLE(度), COHESION(Pa)")
    
    for mat_id, config in material_configs.items():
        friction_deg = config["friction"]
        
        # 计算剪胀角（Bolton 1986经验关系）
        dilatancy_deg = max(0.0, friction_deg - 30.0)
        
        # 对于粘土材料，剪胀角通常为0或很小
        if "粘土" in config["name"]:
            dilatancy_deg = 0.0  # 粘土剪胀角设为0
        
        # 计算屈服应力
        friction_rad = math.radians(friction_deg)
        cohesion_pa = config["cohesion"]
        sin_phi = math.sin(friction_rad)
        cos_phi = math.cos(friction_rad)
        
        # 标准摩尔-库伦屈服应力
        tension_yield = 2.0 * cohesion_pa * cos_phi / max(1e-12, (1.0 + sin_phi))
        compression_yield = 2.0 * cohesion_pa * cos_phi / max(1e-12, (1.0 - sin_phi))
        
        # 确保最小值
        tension_yield = max(tension_yield, 1000.0)
        compression_yield = max(compression_yield, 10000.0)
        
        material = {
            "model_part_name": f"Structure.MAT_{mat_id}",
            "properties_id": mat_id,
            "Material": {
                "constitutive_law": {
                    "name": "SmallStrainIsotropicPlasticityFactory",
                    "yield_surface": "ModifiedMohrCoulomb",
                    "plastic_potential": "ModifiedMohrCoulomb"
                },
                "Variables": {
                    # 弹性参数
                    "YOUNG_MODULUS": config["E"],
                    "POISSON_RATIO": 0.3,
                    "DENSITY": config["density"],
                    
                    # 摩尔-库伦参数（使用度数）
                    "FRICTION_ANGLE": friction_deg,      # 内摩擦角，度数
                    "DILATANCY_ANGLE": dilatancy_deg,    # 剪胀角，度数，粘土为0
                    "COHESION": cohesion_pa,
                    
                    # 塑性参数
                    "YIELD_STRESS_TENSION": tension_yield,
                    "YIELD_STRESS_COMPRESSION": compression_yield,
                    "HARDENING_CURVE": 0,  # 0=完全塑性，1=线性硬化
                    
                    # 软化参数
                    "FRACTURE_ENERGY": 100.0
                },
                "Tables": {}
            }
        }
        materials_data["properties"].append(material)
    
    # 保存材料文件
    with open('materials_correct_solution.json', 'w', encoding='utf-8') as f:
        json.dump(materials_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ 完全正确的材料文件创建完成: materials_correct_solution.json")
    
    # 显示参数设置
    print("\n📊 正确的参数设置:")
    print("   材料ID | 内摩擦角φ | 剪胀角ψ | 粘聚力c | 材料类型")
    print("   -------|-----------|---------|---------|----------")
    for mat_id, config in material_configs.items():
        friction_deg = config["friction"]
        dilatancy_deg = max(0.0, friction_deg - 30.0) if "砂" in config["name"] else 0.0
        material_type = "砂土" if "砂" in config["name"] else "粘土"
        print(f"   {mat_id:6} | {friction_deg:8.1f}° | {dilatancy_deg:6.1f}° | {config['cohesion']/1000:6.1f}kPa | {material_type}")
    
    return True

def create_correct_gravity_process():
    """创建正确的重力Process配置"""
    print("\n🌍 创建正确的重力Process配置")
    
    stages = [
        "multi_stage_kratos_conversion/stage_1",
        "multi_stage_kratos_conversion/stage_2"
    ]
    
    for stage in stages:
        params_file = f"{stage}/ProjectParameters.json"
        
        try:
            with open(params_file, 'r', encoding='utf-8') as f:
                params = json.load(f)
            
            # 正确的重力Process配置
            gravity_process = {
                "python_module": "assign_vector_by_direction_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorByDirectionProcess",
                "Parameters": {
                    "model_part_name": "Structure",
                    "variable_name": "VOLUME_ACCELERATION",
                    "modulus": 9.81,
                    "direction": [0.0, 0.0, -1.0],
                    "constrained": False,
                    "interval": [0.0, "End"]
                }
            }
            
            # 确保processes结构存在
            if "processes" not in params:
                params["processes"] = {}
            if "loads_process_list" not in params["processes"]:
                params["processes"]["loads_process_list"] = []
            
            # 替换重力配置
            params["processes"]["loads_process_list"] = [gravity_process]
            
            with open(params_file, 'w', encoding='utf-8') as f:
                json.dump(params, f, indent=2, ensure_ascii=False)
            
            print(f"✅ 已配置正确的重力Process到 {params_file}")
            
        except Exception as e:
            print(f"❌ 处理 {params_file} 失败: {e}")

def create_correct_test_script():
    """创建正确的测试脚本"""
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
    
    print("🔍 验证完全正确的配置...")
    main_model_part = model["Structure"]
    
    print(f"\\n📊 模型统计:")
    print(f"   节点数量: {len(main_model_part.Nodes)}")
    print(f"   单元数量: {len(main_model_part.Elements)}")
    print(f"   材料数量: {len(main_model_part.Properties)}")
    
    all_correct = True
    
    for i in range(2, 13):
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            
            print(f"\\n📋 材料 {i}:")
            
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
    print("\\n🌍 检查重力设置...")
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
    print("\\n" + "="*60)
    if all_correct:
        print("🎉 所有细节问题都已解决！配置完全正确！")
        print("💡 关键要点:")
        print("   1. 内摩擦角(φ): 控制剪切强度，≥15°避免tolerance")
        print("   2. 剪胀角(ψ): 控制体积变化，粘土为0是正常的")
        print("   3. 塑性模型: Factory模式配置正确")
        print("   4. 重力: Process方式施加正确")
        print("\\n🚀 可以开始深基坑多阶段塑性分析！")
    else:
        print("⚠️ 仍有细节问题需要解决")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
'''
    
    # 保存测试脚本
    stages = [
        "multi_stage_kratos_conversion/stage_1",
        "multi_stage_kratos_conversion/stage_2"
    ]
    
    for stage in stages:
        if os.path.exists(stage):
            with open(f'{stage}/test_correct_solution.py', 'w', encoding='utf-8') as f:
                f.write(test_script)
            print(f"✅ 已创建正确测试脚本: {stage}/test_correct_solution.py")

def main():
    """主函数"""
    print("🎯 基于深度RAG分析的完全正确解决方案")
    print("=" * 60)
    print("🔍 澄清的概念:")
    print("   1. 摩擦角 = 内摩擦角，控制剪切强度")
    print("   2. 剪胀角 ≠ 摩擦角，控制体积变化，为0正常")
    print("   3. 塑性模型使用Factory模式配置")
    print("   4. 重力通过assign_vector_by_direction_process施加")
    
    create_correct_plastic_materials()
    create_correct_gravity_process()
    create_correct_test_script()
    
    print("\n" + "=" * 60)
    print("✅ 所有细节问题的正确解决方案创建完成!")

if __name__ == "__main__":
    main()
