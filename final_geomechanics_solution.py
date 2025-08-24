#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用GeoMechanicsApplication的最终解决方案
基于Kratos源代码分析的正确摩尔-库伦本构配置
"""

import json
import math
import os

def create_geomechanics_materials():
    """创建使用GeoMechanicsApplication的材料文件"""
    print("🎯 使用GeoMechanicsApplication创建摩尔-库伦材料")
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
    
    print("📋 使用GeoMechanicsApplication的摩尔-库伦本构:")
    print("   - 本构模型: GeoMohrCoulombWithTensionCutOff3D")
    print("   - 参数名称: GEO_FRICTION_ANGLE, GEO_DILATANCY_ANGLE, GEO_COHESION")
    print("   - 角度单位: 度数（源代码中自动转换为弧度）")
    print("   - 剪胀角关系: ψ = max(0, φ - 30°)")
    
    for mat_id, config in material_configs.items():
        friction_deg = config["friction"]
        
        # 计算剪胀角（Bolton 1986经验关系）
        dilatancy_deg = max(0.0, friction_deg - 30.0)
        
        # 计算抗拉强度（基于粘聚力和摩擦角）
        friction_rad = math.radians(friction_deg)
        cohesion_pa = config["cohesion"]
        tensile_strength = 2.0 * cohesion_pa * math.cos(friction_rad) / (1.0 + math.sin(friction_rad))
        tensile_strength = max(tensile_strength, 1000.0)  # 最小1kPa
        
        material = {
            "model_part_name": f"Structure.MAT_{mat_id}",
            "properties_id": mat_id,
            "Material": {
                "constitutive_law": {
                    "name": "GeoMohrCoulombWithTensionCutOff3D"  # 使用岩土模块的本构
                },
                "Variables": {
                    # 弹性参数
                    "YOUNG_MODULUS": config["E"],
                    "POISSON_RATIO": 0.3,
                    "DENSITY": config["density"],
                    
                    # 岩土模块的摩尔-库伦参数（使用度数）
                    "GEO_COHESION": cohesion_pa,
                    "GEO_FRICTION_ANGLE": friction_deg,      # 度数！
                    "GEO_DILATANCY_ANGLE": dilatancy_deg,    # 度数！
                    "GEO_TENSILE_STRENGTH": tensile_strength,
                    
                    # 重力加速度
                    "VOLUME_ACCELERATION": [0.0, 0.0, -9.81]
                },
                "Tables": {}
            }
        }
        materials_data["properties"].append(material)
    
    # 保存材料文件
    with open('materials_geomechanics.json', 'w', encoding='utf-8') as f:
        json.dump(materials_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ GeoMechanics材料文件创建完成: materials_geomechanics.json")
    print(f"   包含 {len(materials_data['properties'])} 种材料")
    
    # 显示参数设置
    print("\n📊 材料参数设置:")
    for mat_id, config in material_configs.items():
        friction_deg = config["friction"]
        dilatancy_deg = max(0.0, friction_deg - 30.0)
        print(f"   材料{mat_id}: φ={friction_deg}°, ψ={dilatancy_deg}°, c={config['cohesion']/1000:.1f}kPa")
    
    return True

def update_project_parameters_for_geomechanics():
    """更新ProjectParameters以使用GeoMechanicsApplication"""
    print("\n🔧 更新ProjectParameters以使用GeoMechanicsApplication")
    
    stages = [
        "multi_stage_kratos_conversion/stage_1",
        "multi_stage_kratos_conversion/stage_2"
    ]
    
    for stage in stages:
        params_file = f"{stage}/ProjectParameters.json"
        
        try:
            with open(params_file, 'r', encoding='utf-8') as f:
                params = json.load(f)
            
            # 添加GeoMechanicsApplication到导入列表
            if "import_modules" not in params:
                params["import_modules"] = {}
            
            if "applications" not in params["import_modules"]:
                params["import_modules"]["applications"] = []
            
            # 确保包含必要的应用
            required_apps = [
                "KratosMultiphysics.StructuralMechanicsApplication",
                "KratosMultiphysics.GeoMechanicsApplication"
            ]
            
            for app in required_apps:
                if app not in params["import_modules"]["applications"]:
                    params["import_modules"]["applications"].append(app)
            
            # 更新求解器类型（如果需要）
            if "solver_settings" in params:
                # 保持原有的求解器设置，只是确保能加载GeoMechanics材料
                pass
            
            # 确保loads_process_list为空（重力通过材料Properties设置）
            if "processes" in params:
                params["processes"]["loads_process_list"] = []
            
            with open(params_file, 'w', encoding='utf-8') as f:
                json.dump(params, f, indent=2, ensure_ascii=False)
            
            print(f"✅ 已更新 {params_file}")
            
        except Exception as e:
            print(f"❌ 处理 {params_file} 失败: {e}")

def create_test_script():
    """创建测试脚本验证GeoMechanics配置"""
    test_script = '''#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("🔧 导入Kratos和GeoMechanicsApplication...")
    import KratosMultiphysics
    from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
    from KratosMultiphysics import GeoMechanicsApplication
    
    print("📖 读取参数...")
    with open('ProjectParameters.json', 'r', encoding='utf-8') as f:
        params_text = f.read()
    
    print("🏗️ 创建模型...")
    model = KratosMultiphysics.Model()
    parameters = KratosMultiphysics.Parameters(params_text)
    
    print("⚙️ 初始化分析...")
    analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(model, parameters)
    analysis.Initialize()
    
    print("🔍 验证GeoMechanics材料参数...")
    main_model_part = model["Structure"]
    
    for i in range(2, 13):
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            
            print(f"\\n📋 材料 {i}:")
            
            # 检查GeoMechanics参数
            if props.Has(GeoMechanicsApplication.GEO_FRICTION_ANGLE):
                friction = props[GeoMechanicsApplication.GEO_FRICTION_ANGLE]
                print(f"   摩擦角: {friction}°")
            
            if props.Has(GeoMechanicsApplication.GEO_DILATANCY_ANGLE):
                dilatancy = props[GeoMechanicsApplication.GEO_DILATANCY_ANGLE]
                print(f"   剪胀角: {dilatancy}°")
            
            if props.Has(GeoMechanicsApplication.GEO_COHESION):
                cohesion = props[GeoMechanicsApplication.GEO_COHESION]
                print(f"   粘聚力: {cohesion/1000:.1f} kPa")
            
            if props.Has(KratosMultiphysics.CONSTITUTIVE_LAW):
                const_law = props[KratosMultiphysics.CONSTITUTIVE_LAW]
                print(f"   本构模型: {const_law.Info()}")
    
    print("\\n✅ GeoMechanics配置验证成功!")
    
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
            with open(f'{stage}/test_geomechanics.py', 'w', encoding='utf-8') as f:
                f.write(test_script)
            print(f"✅ 已创建测试脚本: {stage}/test_geomechanics.py")

def main():
    """主函数"""
    print("🎯 基于GeoMechanicsApplication的最终解决方案")
    print("=" * 60)
    print("🔍 关键发现:")
    print("   1. StructuralMechanicsApplication的D+D-损伤模型显示为ElasticIsotropic3D")
    print("   2. GeoMechanicsApplication有专门的摩尔-库伦本构: GeoMohrCoulombWithTensionCutOff3D")
    print("   3. 正确的参数名: GEO_FRICTION_ANGLE, GEO_DILATANCY_ANGLE (度数)")
    print("   4. 剪胀角经验关系: ψ = max(0, φ - 30°)")
    
    create_geomechanics_materials()
    update_project_parameters_for_geomechanics()
    create_test_script()
    
    print("\n" + "=" * 60)
    print("✅ GeoMechanics解决方案创建完成!")
    print("\n📋 下一步:")
    print("   1. 复制materials_geomechanics.json到各阶段作为StructuralMaterials.json")
    print("   2. 运行测试: cd stage_1 && python test_geomechanics.py")
    print("   3. 如果成功，运行完整分析")

if __name__ == "__main__":
    main()
