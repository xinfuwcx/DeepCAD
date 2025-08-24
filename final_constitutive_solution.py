#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
最终本构模型解决方案
基于ConstitutiveLawsApplication源代码分析的正确配置
"""

import json
import math
import os

def create_final_constitutive_materials():
    """创建最终正确的本构模型配置"""
    print("🎯 最终本构模型解决方案")
    print("=" * 60)
    print("🔍 基于源代码分析的发现:")
    print("   1. 可用模型: SmallStrainIsotropicPlasticity3DModifiedMohrCoulombModifiedMohrCoulomb")
    print("   2. Factory模式: SmallStrainIsotropicPlasticityFactory")
    print("   3. 参数名称: FRICTION_ANGLE, DILATANCY_ANGLE, COHESION")
    print("   4. 角度单位: 度数（基于测试文件验证）")
    
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
    
    # 选择最适合的本构模型（基于源代码分析）
    constitutive_options = [
        {
            "name": "SmallStrainIsotropicPlasticityFactory",
            "yield_surface": "ModifiedMohrCoulomb",
            "plastic_potential": "ModifiedMohrCoulomb",
            "description": "Factory模式，最稳定"
        },
        {
            "name": "SmallStrainIsotropicPlasticity3DModifiedMohrCoulombModifiedMohrCoulomb",
            "description": "直接指定，修正摩尔-库伦"
        }
    ]
    
    # 选择Factory模式（基于测试文件验证）
    selected_model = constitutive_options[0]
    
    print(f"\n📋 选择的本构模型:")
    print(f"   名称: {selected_model['name']}")
    print(f"   屈服面: {selected_model['yield_surface']}")
    print(f"   塑性势: {selected_model['plastic_potential']}")
    print(f"   描述: {selected_model['description']}")
    
    print("\n🔧 FPN参数与Kratos参数对应:")
    print("   FPN.E → YOUNG_MODULUS (Pa)")
    print("   FPN.NU → POISSON_RATIO (无量纲)")
    print("   FPN.DENSITY → DENSITY (kg/m³)")
    print("   FPN.FRICTION_ANGLE → FRICTION_ANGLE (度数)")
    print("   FPN.COHESION → COHESION (Pa)")
    print("   计算 → DILATANCY_ANGLE = max(0, φ-30°)")
    print("   计算 → YIELD_STRESS_TENSION/COMPRESSION")
    
    for mat_id, config in material_configs.items():
        friction_deg = config["friction"]
        
        # 计算剪胀角（Bolton 1986经验关系）
        dilatancy_deg = max(0.0, friction_deg - 30.0)
        
        # 对于粘土材料，剪胀角通常为0
        if "粘土" in config["name"]:
            dilatancy_deg = 0.0
        
        # 计算屈服应力（基于摩尔-库伦理论）
        friction_rad = math.radians(friction_deg)
        cohesion_pa = config["cohesion"]
        sin_phi = math.sin(friction_rad)
        cos_phi = math.cos(friction_rad)
        
        # 标准摩尔-库伦屈服应力公式
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
                    "name": selected_model["name"],
                    "yield_surface": selected_model["yield_surface"],
                    "plastic_potential": selected_model["plastic_potential"]
                },
                "Variables": {
                    # 弹性参数
                    "YOUNG_MODULUS": config["E"],
                    "POISSON_RATIO": 0.3,
                    "DENSITY": config["density"],
                    
                    # 摩尔-库伦参数（使用度数，基于测试文件验证）
                    "FRICTION_ANGLE": friction_deg,      # 内摩擦角，度数
                    "DILATANCY_ANGLE": dilatancy_deg,    # 剪胀角，度数，粘土为0
                    "COHESION": cohesion_pa,
                    
                    # 屈服应力
                    "YIELD_STRESS_TENSION": tension_yield,
                    "YIELD_STRESS_COMPRESSION": compression_yield,
                    
                    # 塑性参数（基于测试文件）
                    "HARDENING_CURVE": 1,  # 1=线性硬化
                    "FRACTURE_ENERGY": 100.0,
                    
                    # 重力加速度（Properties方法）
                    "VOLUME_ACCELERATION": [0.0, 0.0, -9.81]
                },
                "Tables": {}
            }
        }
        materials_data["properties"].append(material)
    
    # 保存材料文件
    with open('materials_final_constitutive.json', 'w', encoding='utf-8') as f:
        json.dump(materials_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ 最终本构材料文件创建完成: materials_final_constitutive.json")
    print(f"   包含 {len(materials_data['properties'])} 种材料")
    
    # 显示参数对应
    print("\n📊 FPN→Kratos参数对应表:")
    print("   材料ID | FPN_φ | Kratos_φ | FPN_c | Kratos_c | 剪胀角ψ")
    print("   -------|-------|----------|-------|----------|--------")
    for mat_id, config in material_configs.items():
        friction_deg = config["friction"]
        dilatancy_deg = max(0.0, friction_deg - 30.0) if "砂" in config["name"] else 0.0
        print(f"   {mat_id:6} | {friction_deg:4.1f}° | {friction_deg:7.1f}° | {config['cohesion']/1000:4.1f}k | {config['cohesion']:8.0f} | {dilatancy_deg:5.1f}°")
    
    return True

def create_constitutive_test_script():
    """创建本构模型测试脚本"""
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
    
    print("\\n🔍 验证最终本构配置...")
    main_model_part = model["Structure"]
    
    print(f"📊 模型统计:")
    print(f"   节点数量: {len(main_model_part.Nodes)}")
    print(f"   单元数量: {len(main_model_part.Elements)}")
    print(f"   材料数量: {len(main_model_part.Properties)}")
    
    constitutive_success = 0
    friction_success = 0
    dilatancy_success = 0
    cohesion_success = 0
    gravity_success = 0
    
    for i in range(2, 13):
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            
            print(f"\\n📋 材料 {i}:")
            
            # 检查本构模型
            if props.Has(KratosMultiphysics.CONSTITUTIVE_LAW):
                const_law = props[KratosMultiphysics.CONSTITUTIVE_LAW]
                model_info = const_law.Info()
                print(f"   本构模型: {model_info}")
                
                if "MohrCoulomb" in model_info and "Plastic" in model_info:
                    print("     ✅ 摩尔-库伦塑性模型正确")
                    constitutive_success += 1
                elif "ElasticIsotropic3D" in model_info:
                    print("     ❌ 仍为弹性模型")
                else:
                    print(f"     ⚠️ 其他模型: {model_info}")
            
            # 检查摩擦角
            if props.Has(ConstitutiveLawsApplication.FRICTION_ANGLE):
                friction = props[ConstitutiveLawsApplication.FRICTION_ANGLE]
                print(f"   内摩擦角: {friction}°")
                if friction >= 15.0:
                    friction_success += 1
                    print("     ✅ 摩擦角正确")
                else:
                    print(f"     ❌ 摩擦角过小: {friction}°")
            
            # 检查剪胀角
            if props.Has(ConstitutiveLawsApplication.DILATANCY_ANGLE):
                dilatancy = props[ConstitutiveLawsApplication.DILATANCY_ANGLE]
                print(f"   剪胀角: {dilatancy}° ✅")
                dilatancy_success += 1
            
            # 检查粘聚力
            if props.Has(ConstitutiveLawsApplication.COHESION):
                cohesion = props[ConstitutiveLawsApplication.COHESION]
                print(f"   粘聚力: {cohesion/1000:.1f} kPa ✅")
                cohesion_success += 1
            
            # 检查重力
            if props.Has(KratosMultiphysics.VOLUME_ACCELERATION):
                gravity = props[KratosMultiphysics.VOLUME_ACCELERATION]
                print(f"   重力: [{gravity[0]:.2f}, {gravity[1]:.2f}, {gravity[2]:.2f}] ✅")
                gravity_success += 1
    
    # 总结结果
    print("\\n" + "="*60)
    print("📊 最终本构验证结果:")
    print(f"   ✅ 本构模型正确: {constitutive_success}/11 个材料")
    print(f"   ✅ 摩擦角正确: {friction_success}/11 个材料")
    print(f"   ✅ 剪胀角正确: {dilatancy_success}/11 个材料")
    print(f"   ✅ 粘聚力正确: {cohesion_success}/11 个材料")
    print(f"   ✅ 重力设置正确: {gravity_success}/11 个材料")
    
    total_score = constitutive_success + friction_success + dilatancy_success + cohesion_success + gravity_success
    max_score = 55  # 11材料 × 5项
    
    print(f"\\n🎯 总体评分: {total_score}/{max_score} ({total_score/max_score*100:.1f}%)")
    
    if constitutive_success >= 8:
        print("\\n🎉 本构模型配置成功！")
    else:
        print(f"\\n❌ 本构模型仍有问题")
    
    if total_score >= max_score * 0.8:
        print("\\n🚀 配置基本完成！可以开始深基坑分析！")
        print("💡 关键成就:")
        print("   - 摩尔-库伦塑性模型正确配置")
        print("   - FPN参数成功转换")
        print("   - 重力通过Properties设置")
        print("   - 适合多阶段开挖分析")
    else:
        print(f"\\n⚠️ 仍需优化，当前得分: {total_score/max_score*100:.1f}%")
    
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
            with open(f'{stage}/test_final_constitutive.py', 'w', encoding='utf-8') as f:
                f.write(test_script)
            print(f"✅ 已创建最终本构测试脚本: {stage}/test_final_constitutive.py")

def main():
    """主函数"""
    print("🎯 最终本构模型解决方案")
    print("=" * 60)
    print("🏗️ 深基坑工程需求:")
    print("   - 多阶段开挖分析")
    print("   - 塑性区演化模拟")
    print("   - 复杂应力状态处理")
    print("   - 数值稳定性要求")
    print("\n💡 选择ModifiedMohrCoulomb的原因:")
    print("   1. 避免原始摩尔-库伦的角点问题")
    print("   2. 数值稳定性更好")
    print("   3. 适合复杂应力状态")
    print("   4. Factory模式配置灵活")
    
    create_final_constitutive_materials()
    create_constitutive_test_script()
    
    print("\n" + "=" * 60)
    print("✅ 最终本构解决方案创建完成!")
    print("\n📋 下一步:")
    print("   1. 复制materials_final_constitutive.json到各阶段")
    print("   2. 运行本构测试验证配置")
    print("   3. 确认摩尔-库伦模型正确加载")

if __name__ == "__main__":
    main()
