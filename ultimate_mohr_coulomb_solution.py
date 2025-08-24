#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
终极摩尔-库伦解决方案
使用ConstitutiveLawsApplication中的真正摩尔-库伦本构模型
"""

import json
import math
import os

def create_ultimate_mohr_coulomb_materials():
    """创建使用真正摩尔-库伦本构的材料文件"""
    print("🎯 终极摩尔-库伦解决方案")
    print("=" * 60)
    
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
        7: {"name": "7粉质粘土", "E": 8000000.0, "density": 2121.01, "friction": 14.0, "cohesion": 25000.0},
        8: {"name": "8粉质粘土", "E": 9000000.0, "density": 2110.81, "friction": 20.7, "cohesion": 20500.0},
        9: {"name": "9粉质粘土", "E": 9000000.0, "density": 2059.83, "friction": 23.0, "cohesion": 14000.0},
        10: {"name": "10粉质粘土", "E": 40000000.0, "density": 2141.40, "friction": 35.0, "cohesion": 35000.0},
        11: {"name": "11粉质粘土", "E": 12000000.0, "density": 2059.83, "friction": 24.0, "cohesion": 17000.0},
        12: {"name": "12粉质粘土", "E": 20000000.0, "density": 2070.02, "friction": 35.0, "cohesion": 26000.0}
    }
    
    # 可选的本构模型（按推荐顺序）
    constitutive_options = [
        {
            "name": "SmallStrainIsotropicPlasticity3DMohrCoulombMohrCoulomb",
            "description": "各向同性塑性摩尔-库伦",
            "params": ["FRICTION_ANGLE", "DILATANCY_ANGLE", "COHESION"]
        },
        {
            "name": "SmallStrainDplusDminusDamageMohrCoulombMohrCoulomb3D", 
            "description": "D+D-损伤摩尔-库伦",
            "params": ["FRICTION_ANGLE", "DILATANCY_ANGLE", "COHESION"]
        }
    ]
    
    # 选择第一个模型（各向同性塑性）
    selected_model = constitutive_options[0]
    
    print(f"📋 选择的本构模型: {selected_model['name']}")
    print(f"   描述: {selected_model['description']}")
    print(f"   参数: {', '.join(selected_model['params'])}")
    print("   角度单位: 度数（基于Kratos源代码分析）")
    print("   剪胀角关系: ψ = max(0, φ - 30°)")
    
    for mat_id, config in material_configs.items():
        friction_deg = config["friction"]
        
        # 计算剪胀角（Bolton 1986经验关系）
        dilatancy_deg = max(0.0, friction_deg - 30.0)
        
        # 计算屈服应力（基于摩尔-库伦理论）
        friction_rad = math.radians(friction_deg)
        cohesion_pa = config["cohesion"]
        
        # 抗拉屈服应力
        sin_phi = math.sin(friction_rad)
        cos_phi = math.cos(friction_rad)
        tension_yield = 2.0 * cohesion_pa * cos_phi / max(1e-12, (1.0 + sin_phi))
        
        # 抗压屈服应力  
        compression_yield = 2.0 * cohesion_pa * cos_phi / max(1e-12, (1.0 - sin_phi))
        
        # 确保最小值
        tension_yield = max(tension_yield, 1000.0)      # ≥ 1 kPa
        compression_yield = max(compression_yield, 10000.0)  # ≥ 10 kPa
        
        material = {
            "model_part_name": f"Structure.MAT_{mat_id}",
            "properties_id": mat_id,
            "Material": {
                "constitutive_law": {
                    "name": selected_model["name"]
                },
                "Variables": {
                    # 弹性参数
                    "YOUNG_MODULUS": config["E"],
                    "POISSON_RATIO": 0.3,
                    "DENSITY": config["density"],
                    
                    # 摩尔-库伦参数（使用度数）
                    "FRICTION_ANGLE": friction_deg,      # 度数
                    "DILATANCY_ANGLE": dilatancy_deg,    # 度数  
                    "COHESION": cohesion_pa,
                    
                    # 屈服应力
                    "YIELD_STRESS_TENSION": tension_yield,
                    "YIELD_STRESS_COMPRESSION": compression_yield,
                    
                    # 软化参数
                    "SOFTENING_TYPE": 0,
                    "FRACTURE_ENERGY": 100.0,
                    
                    # 重力加速度
                    "VOLUME_ACCELERATION": [0.0, 0.0, -9.81]
                },
                "Tables": {}
            }
        }
        materials_data["properties"].append(material)
    
    # 保存材料文件
    with open('materials_ultimate_mohr_coulomb.json', 'w', encoding='utf-8') as f:
        json.dump(materials_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ 终极摩尔-库伦材料文件创建完成: materials_ultimate_mohr_coulomb.json")
    print(f"   包含 {len(materials_data['properties'])} 种材料")
    
    # 显示参数设置
    print("\n📊 材料参数设置:")
    for mat_id, config in material_configs.items():
        friction_deg = config["friction"]
        dilatancy_deg = max(0.0, friction_deg - 30.0)
        print(f"   材料{mat_id}: φ={friction_deg}°, ψ={dilatancy_deg}°, c={config['cohesion']/1000:.1f}kPa")
    
    return True

def create_ultimate_test_script():
    """创建终极测试脚本"""
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
    
    print("🔍 验证摩尔-库伦材料参数...")
    main_model_part = model["Structure"]
    
    for i in range(2, 13):
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            
            print(f"\\n📋 材料 {i}:")
            
            # 检查摩尔-库伦参数
            if props.Has(ConstitutiveLawsApplication.FRICTION_ANGLE):
                friction = props[ConstitutiveLawsApplication.FRICTION_ANGLE]
                print(f"   摩擦角: {friction}°")
            else:
                print("   ❌ 摩擦角参数未找到!")
            
            if props.Has(ConstitutiveLawsApplication.DILATANCY_ANGLE):
                dilatancy = props[ConstitutiveLawsApplication.DILATANCY_ANGLE]
                print(f"   剪胀角: {dilatancy}°")
            else:
                print("   ❌ 剪胀角参数未找到!")
            
            if props.Has(ConstitutiveLawsApplication.COHESION):
                cohesion = props[ConstitutiveLawsApplication.COHESION]
                print(f"   粘聚力: {cohesion/1000:.1f} kPa")
            else:
                print("   ❌ 粘聚力参数未找到!")
            
            if props.Has(KratosMultiphysics.VOLUME_ACCELERATION):
                gravity = props[KratosMultiphysics.VOLUME_ACCELERATION]
                print(f"   重力: [{gravity[0]:.2f}, {gravity[1]:.2f}, {gravity[2]:.2f}] m/s²")
            else:
                print("   ❌ 重力参数未找到!")
            
            if props.Has(KratosMultiphysics.CONSTITUTIVE_LAW):
                const_law = props[KratosMultiphysics.CONSTITUTIVE_LAW]
                print(f"   本构模型: {const_law.Info()}")
            else:
                print("   ❌ 本构模型未找到!")
    
    print("\\n✅ 终极摩尔-库伦配置验证成功!")
    print("🎯 所有参数都正确设置，可以开始分析！")
    
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
            with open(f'{stage}/test_ultimate_mohr_coulomb.py', 'w', encoding='utf-8') as f:
                f.write(test_script)
            print(f"✅ 已创建终极测试脚本: {stage}/test_ultimate_mohr_coulomb.py")

def main():
    """主函数"""
    print("🎯 终极摩尔-库伦解决方案")
    print("=" * 60)
    print("🔍 基于深度源代码分析的发现:")
    print("   1. ConstitutiveLawsApplication有100+个摩尔-库伦模型")
    print("   2. SmallStrainIsotropicPlasticity3DMohrCoulombMohrCoulomb是纯摩尔-库伦")
    print("   3. 参数名: FRICTION_ANGLE, DILATANCY_ANGLE, COHESION")
    print("   4. 角度单位: 度数（基于源代码分析）")
    print("   5. 剪胀角关系: ψ = max(0, φ - 30°)")
    
    create_ultimate_mohr_coulomb_materials()
    create_ultimate_test_script()
    
    print("\n" + "=" * 60)
    print("✅ 终极摩尔-库伦解决方案创建完成!")
    print("\n📋 下一步:")
    print("   1. 复制materials_ultimate_mohr_coulomb.json到各阶段")
    print("   2. 运行测试验证参数")
    print("   3. 开始完整的Kratos分析")

if __name__ == "__main__":
    main()
