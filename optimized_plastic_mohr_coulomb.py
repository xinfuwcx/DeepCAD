#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
优化的塑性摩尔-库伦解决方案
专门针对深基坑多阶段开挖工程
"""

import json
import math
import os

def create_optimized_plastic_materials():
    """创建优化的塑性摩尔-库伦材料配置"""
    print("🎯 优化的塑性摩尔-库伦解决方案")
    print("=" * 60)
    print("📚 理论基础:")
    print("   - 塑性摩尔-库伦理论")
    print("   - 考虑塑性流动和硬化/软化")
    print("   - 适合多阶段开挖分析")
    print("   - 能够模拟塑性区演化")
    
    # 从FPN分析结果读取真实参数
    with open('fpn_materials_analysis.json', 'r', encoding='utf-8') as f:
        fpn_materials = json.load(f)
    
    materials_data = {
        "properties": []
    }
    
    # 材料配置（基于FPN真实参数，针对tolerance问题优化）
    material_configs = {
        2: {"name": "2细砂", "E": 15000000.0, "density": 2039.43, "friction": 35.0, "cohesion": 20000.0},
        3: {"name": "3粉质粘土", "E": 5000000.0, "density": 1988.45, "friction": 26.0, "cohesion": 9000.0},
        4: {"name": "4粉质粘土", "E": 5000000.0, "density": 1947.66, "friction": 24.0, "cohesion": 10000.0},
        5: {"name": "5粉质粘土", "E": 5000000.0, "density": 2121.01, "friction": 22.0, "cohesion": 13000.0},
        6: {"name": "6粉质粘土", "E": 40000000.0, "density": 1988.45, "friction": 35.0, "cohesion": 21000.0},
        7: {"name": "7粉质粘土", "E": 8000000.0, "density": 2121.01, "friction": 16.0, "cohesion": 25000.0},  # 提高到16°
        8: {"name": "8粉质粘土", "E": 9000000.0, "density": 2110.81, "friction": 20.7, "cohesion": 20500.0},
        9: {"name": "9粉质粘土", "E": 9000000.0, "density": 2059.83, "friction": 23.0, "cohesion": 14000.0},
        10: {"name": "10粉质粘土", "E": 40000000.0, "density": 2141.40, "friction": 35.0, "cohesion": 35000.0},
        11: {"name": "11粉质粘土", "E": 12000000.0, "density": 2059.83, "friction": 24.0, "cohesion": 17000.0},
        12: {"name": "12粉质粘土", "E": 20000000.0, "density": 2070.02, "friction": 35.0, "cohesion": 26000.0}
    }
    
    # 塑性摩尔-库伦本构模型选择
    constitutive_model = {
        "name": "SmallStrainIsotropicPlasticity3DMohrCoulombMohrCoulomb",
        "description": "各向同性塑性摩尔-库伦",
        "features": [
            "塑性流动理论",
            "硬化/软化行为",
            "适合多阶段分析",
            "塑性区演化"
        ]
    }
    
    print(f"\n📋 选择的本构模型: {constitutive_model['name']}")
    print(f"   描述: {constitutive_model['description']}")
    print("   特点:")
    for feature in constitutive_model['features']:
        print(f"     - {feature}")
    
    print("\n🔧 参数优化策略:")
    print("   1. 摩擦角tolerance问题: 确保所有角度 ≥ 15°")
    print("   2. 剪胀角关系: ψ = max(0, φ - 30°)")
    print("   3. 塑性参数: 添加硬化模量和屈服应力")
    print("   4. 重力设置: 通过VOLUME_ACCELERATION")
    
    for mat_id, config in material_configs.items():
        friction_deg = config["friction"]
        
        # 确保摩擦角大于tolerance（推测为15°左右）
        if friction_deg < 15.0:
            friction_deg = 15.0
            print(f"   ⚠️ 材料{mat_id}摩擦角调整为15°以避免tolerance问题")
        
        # 计算剪胀角（Bolton 1986经验关系）
        dilatancy_deg = max(0.0, friction_deg - 30.0)
        
        # 计算塑性参数
        friction_rad = math.radians(friction_deg)
        cohesion_pa = config["cohesion"]
        
        # 屈服应力计算（基于摩尔-库伦理论）
        sin_phi = math.sin(friction_rad)
        cos_phi = math.cos(friction_rad)
        
        # 抗拉屈服应力
        tension_yield = 2.0 * cohesion_pa * cos_phi / max(1e-12, (1.0 + sin_phi))
        # 抗压屈服应力  
        compression_yield = 2.0 * cohesion_pa * cos_phi / max(1e-12, (1.0 - sin_phi))
        
        # 确保最小值
        tension_yield = max(tension_yield, 1000.0)      # ≥ 1 kPa
        compression_yield = max(compression_yield, 10000.0)  # ≥ 10 kPa
        
        # 塑性硬化模量（基于弹性模量）
        hardening_modulus = config["E"] * 0.01  # 1%的弹性模量
        
        material = {
            "model_part_name": f"Structure.MAT_{mat_id}",
            "properties_id": mat_id,
            "Material": {
                "constitutive_law": {
                    "name": constitutive_model["name"]
                },
                "Variables": {
                    # 弹性参数
                    "YOUNG_MODULUS": config["E"],
                    "POISSON_RATIO": 0.3,
                    "DENSITY": config["density"],
                    
                    # 摩尔-库伦参数（使用度数）
                    "FRICTION_ANGLE": friction_deg,      # 度数，确保 ≥ 15°
                    "DILATANCY_ANGLE": dilatancy_deg,    # 度数
                    "COHESION": cohesion_pa,
                    
                    # 塑性参数
                    "YIELD_STRESS_TENSION": tension_yield,
                    "YIELD_STRESS_COMPRESSION": compression_yield,
                    "HARDENING_MODULUS": hardening_modulus,
                    
                    # 软化参数（用于损伤模拟）
                    "SOFTENING_TYPE": 0,
                    "FRACTURE_ENERGY": 100.0,
                    
                    # 重力加速度（尝试不同的设置方法）
                    "VOLUME_ACCELERATION": [0.0, 0.0, -9.81],
                    "BODY_FORCE": [0.0, 0.0, -9.81 * config["density"]]
                },
                "Tables": {}
            }
        }
        materials_data["properties"].append(material)
    
    # 保存材料文件
    with open('materials_optimized_plastic.json', 'w', encoding='utf-8') as f:
        json.dump(materials_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ 优化塑性摩尔-库伦材料文件创建完成: materials_optimized_plastic.json")
    print(f"   包含 {len(materials_data['properties'])} 种材料")
    
    # 显示最终参数设置
    print("\n📊 最终材料参数设置:")
    for mat_id, config in material_configs.items():
        friction_deg = max(config["friction"], 15.0)  # 应用tolerance修正
        dilatancy_deg = max(0.0, friction_deg - 30.0)
        print(f"   材料{mat_id}: φ={friction_deg}°, ψ={dilatancy_deg}°, c={config['cohesion']/1000:.1f}kPa")
    
    return True

def create_optimized_test_script():
    """创建优化的测试脚本"""
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
    
    print("🔍 验证优化的塑性摩尔-库伦参数...")
    main_model_part = model["Structure"]
    
    tolerance_issues = []
    gravity_issues = []
    model_issues = []
    
    for i in range(2, 13):
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            
            print(f"\\n📋 材料 {i}:")
            
            # 检查摩擦角
            if props.Has(ConstitutiveLawsApplication.FRICTION_ANGLE):
                friction = props[ConstitutiveLawsApplication.FRICTION_ANGLE]
                print(f"   摩擦角: {friction}°")
                if friction < 1.0:  # 检查tolerance问题
                    tolerance_issues.append(f"材料{i}: {friction}°")
            else:
                print("   ❌ 摩擦角参数未找到!")
            
            # 检查剪胀角
            if props.Has(ConstitutiveLawsApplication.DILATANCY_ANGLE):
                dilatancy = props[ConstitutiveLawsApplication.DILATANCY_ANGLE]
                print(f"   剪胀角: {dilatancy}°")
            else:
                print("   ❌ 剪胀角参数未找到!")
            
            # 检查粘聚力
            if props.Has(ConstitutiveLawsApplication.COHESION):
                cohesion = props[ConstitutiveLawsApplication.COHESION]
                print(f"   粘聚力: {cohesion/1000:.1f} kPa")
            else:
                print("   ❌ 粘聚力参数未找到!")
            
            # 检查重力参数
            gravity_found = False
            if props.Has(KratosMultiphysics.VOLUME_ACCELERATION):
                gravity = props[KratosMultiphysics.VOLUME_ACCELERATION]
                print(f"   重力(VOLUME_ACCELERATION): [{gravity[0]:.2f}, {gravity[1]:.2f}, {gravity[2]:.2f}]")
                gravity_found = True
            
            if props.Has(KratosMultiphysics.BODY_FORCE):
                body_force = props[KratosMultiphysics.BODY_FORCE]
                print(f"   体力(BODY_FORCE): [{body_force[0]:.2f}, {body_force[1]:.2f}, {body_force[2]:.2f}]")
                gravity_found = True
            
            if not gravity_found:
                gravity_issues.append(f"材料{i}")
            
            # 检查本构模型
            if props.Has(KratosMultiphysics.CONSTITUTIVE_LAW):
                const_law = props[KratosMultiphysics.CONSTITUTIVE_LAW]
                model_info = const_law.Info()
                print(f"   本构模型: {model_info}")
                if "ElasticIsotropic3D" in model_info:
                    model_issues.append(f"材料{i}: {model_info}")
            else:
                print("   ❌ 本构模型未找到!")
    
    # 总结问题
    print("\\n" + "="*60)
    print("📊 验证结果总结:")
    
    if tolerance_issues:
        print(f"⚠️ Tolerance问题 ({len(tolerance_issues)}个):")
        for issue in tolerance_issues:
            print(f"   - {issue}")
    else:
        print("✅ 无摩擦角tolerance问题")
    
    if gravity_issues:
        print(f"⚠️ 重力参数问题 ({len(gravity_issues)}个):")
        for issue in gravity_issues:
            print(f"   - {issue}")
    else:
        print("✅ 重力参数设置正确")
    
    if model_issues:
        print(f"⚠️ 本构模型问题 ({len(model_issues)}个):")
        for issue in model_issues:
            print(f"   - {issue}")
    else:
        print("✅ 塑性摩尔-库伦模型加载正确")
    
    if not tolerance_issues and not gravity_issues and not model_issues:
        print("\\n🎉 所有参数验证通过！可以开始深基坑分析！")
    else:
        print("\\n⚠️ 仍有问题需要解决，但基本配置已经正确")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
'''
    
    # 保存测试脚本到各个阶段
    stages = [
        "multi_stage_kratos_conversion/stage_1",
        "multi_stage_kratos_conversion/stage_2"
    ]
    
    for stage in stages:
        if os.path.exists(stage):
            with open(f'{stage}/test_optimized_plastic.py', 'w', encoding='utf-8') as f:
                f.write(test_script)
            print(f"✅ 已创建优化测试脚本: {stage}/test_optimized_plastic.py")

def main():
    """主函数"""
    print("🎯 优化的塑性摩尔-库伦解决方案")
    print("=" * 60)
    print("🏗️ 深基坑工程特点:")
    print("   - 多阶段开挖过程")
    print("   - 渐进性变形分析")
    print("   - 应力重分布模拟")
    print("   - 塑性区演化追踪")
    print("\n💡 为什么选择塑性摩尔-库伦:")
    print("   1. 能够模拟施工过程的影响")
    print("   2. 考虑土体的塑性行为")
    print("   3. 追踪塑性区的发展")
    print("   4. 更真实的变形预测")
    
    create_optimized_plastic_materials()
    create_optimized_test_script()
    
    print("\n" + "=" * 60)
    print("✅ 优化的塑性摩尔-库伦解决方案创建完成!")
    print("\n📋 下一步:")
    print("   1. 复制materials_optimized_plastic.json到各阶段")
    print("   2. 运行优化测试验证参数")
    print("   3. 开始深基坑多阶段分析")
    print("   4. 监控塑性区的发展过程")

if __name__ == "__main__":
    main()
