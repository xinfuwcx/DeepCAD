#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import os
from datetime import datetime

def create_materials_from_image_data():
    """基于图片中的材料数据创建材料对象"""
    
    # 图片中的材料数据
    materials_data = [
        {"name": "杂填土1-0-0", "elastic_modulus": 5.32, "poisson_ratio": 0.3, "density": 18, "cohesion": 0, "friction_angle": 15, "model": "莫尔-库伦模型"},
        {"name": "细砂2-0-0", "elastic_modulus": 15, "poisson_ratio": 0.3, "density": 20, "cohesion": 0, "friction_angle": 20, "model": "莫尔-库伦模型"},
        {"name": "粉质粘土3-0-0", "elastic_modulus": 5, "poisson_ratio": 0.3, "density": 19.5, "cohesion": 26, "friction_angle": 9, "model": "莫尔-库伦模型"},
        {"name": "粉质粘土4-0-0", "elastic_modulus": 5, "poisson_ratio": 0.3, "density": 19.1, "cohesion": 24, "friction_angle": 10, "model": "莫尔-库伦模型"},
        {"name": "粉质粘土5-0-0", "elastic_modulus": 5, "poisson_ratio": 0.3, "density": 20.8, "cohesion": 22, "friction_angle": 13, "model": "莫尔-库伦模型"},
        {"name": "卵石6-0-0", "elastic_modulus": 40, "poisson_ratio": 0.3, "density": 19.5, "cohesion": 0, "friction_angle": 21, "model": "莫尔-库伦模型"},
        {"name": "粉质粘土7-0-0", "elastic_modulus": 8, "poisson_ratio": 0.3, "density": 20.8, "cohesion": 14, "friction_angle": 25, "model": "莫尔-库伦模型"},
        {"name": "粘土7-2-0", "elastic_modulus": 5, "poisson_ratio": 0.3, "density": 19.7, "cohesion": 36, "friction_angle": 9, "model": "莫尔-库伦模型"},
        {"name": "粉质粘土7-0-0", "elastic_modulus": 9, "poisson_ratio": 0.3, "density": 20.7, "cohesion": 20.5, "friction_angle": 16, "model": "莫尔-库伦模型"},
        {"name": "细砂8-0-0", "elastic_modulus": 22, "poisson_ratio": 0.3, "density": 19.5, "cohesion": 0, "friction_angle": 21, "model": "莫尔-库伦模型"},
        {"name": "重粉质粘土8-1-0", "elastic_modulus": 9, "poisson_ratio": 0.3, "density": 20.2, "cohesion": 23, "friction_angle": 14, "model": "莫尔-库伦模型"},
        {"name": "细砂9-0-0", "elastic_modulus": 22, "poisson_ratio": 0.3, "density": 19.5, "cohesion": 0, "friction_angle": 23, "model": "莫尔-库伦模型"},
        {"name": "卵石10-0-0", "elastic_modulus": 40, "poisson_ratio": 0.3, "density": 21, "cohesion": 0, "friction_angle": 35, "model": "莫尔-库伦模型"},
        {"name": "粉质粘土11-0-0", "elastic_modulus": 12, "poisson_ratio": 0.3, "density": 20.2, "cohesion": 24, "friction_angle": 17, "model": "莫尔-库伦模型"},
        {"name": "细砂12-0-0", "elastic_modulus": 20, "poisson_ratio": 0.3, "density": 20.3, "cohesion": 0, "friction_angle": 26, "model": "莫尔-库伦模型"},
        {"name": "C30", "elastic_modulus": 30000, "poisson_ratio": 0.2, "density": 25, "cohesion": None, "friction_angle": None, "model": "线弹性模型"},
        {"name": "锚杆", "elastic_modulus": 206000, "poisson_ratio": 0.3, "density": 78.5, "cohesion": None, "friction_angle": None, "model": "线弹性模型"}
    ]
    
    materials = []
    
    for data in materials_data:
        # 判断材料类型
        if "混凝土" in data["name"] or "C30" in data["name"]:
            material_type = "concrete"
            constitutive = "LINEAR_ELASTIC"
        elif "锚杆" in data["name"] or "钢" in data["name"]:
            material_type = "steel"
            constitutive = "LINEAR_ELASTIC"
        else:
            material_type = "soil"
            constitutive = "MOHR_COULOMB"
        
        # 构建材料对象，与材料库接口对应
        material = {
            "name": data["name"],
            "material_type": material_type,
            "constitutiveModel": constitutive,  # 与MaterialInterfaces.ts中的ConstitutiveModel对应
            "properties": {
                "elasticModulus": float(data["elastic_modulus"]) * 1e6,  # 转换为Pa，与BaseMaterialProperties对应
                "poissonRatio": float(data["poisson_ratio"]),  # 与BaseMaterialProperties对应
                "density": float(data["density"]) * 100,  # 转换为kg/m³，与BaseMaterialProperties对应
            },
            "description": f"从图片导入的{material_type}材料",
            "source": "材料参数图片",
            "standard": "工程地质勘察",
            "category": material_type,
            "tags": ["图片导入", material_type],
            "reliability": "empirical",  # 与MaterialInterfaces.ts中的reliability对应
            "validated": True,
            "version": "1.0"
        }
        
        # 添加土体特有属性，与SoilMaterialProperties对应
        if material_type == "soil" and data["cohesion"] is not None:
            material["properties"]["cohesion"] = float(data["cohesion"]) * 1000  # 转换为Pa
            material["properties"]["frictionAngle"] = float(data["friction_angle"])  # 度
            material["properties"]["permeability"] = 1e-7  # 默认渗透系数
        
        # 添加钢材特有属性，与SteelMaterialProperties对应
        if material_type == "steel":
            material["properties"]["yieldStrength"] = 355e6  # 默认屈服强度(Pa)
            material["properties"]["ultimateStrength"] = 490e6  # 默认极限强度(Pa)
        
        # 添加混凝土特有属性，与ConcreteMaterialProperties对应
        if material_type == "concrete":
            material["properties"]["compressiveStrength"] = float(data["elastic_modulus"]) * 1e6  # 抗压强度(Pa)
            material["properties"]["tensileStrength"] = float(data["elastic_modulus"]) * 1e6 * 0.1  # 抗拉强度(Pa)
        
        materials.append(material)
        print(f"创建材料: {data['name']} -> {material_type} -> {constitutive}")
    
    return materials

def add_materials_to_library(materials):
    """将材料添加到材料库，与MaterialLibrary接口对应"""
    try:
        materials_file = "materials_storage.json"
        
        # 读取现有材料
        existing_materials = []
        if os.path.exists(materials_file):
            with open(materials_file, 'r', encoding='utf-8') as f:
                existing_materials = json.load(f)
        
        # 检查重复材料
        existing_names = set(m["name"] for m in existing_materials)
        new_materials = []
        
        for material in materials:
            if material["name"] not in existing_names:
                # 添加MaterialDefinition接口要求的字段
                material['id'] = f"material_{len(existing_materials) + len(new_materials) + 1}_{int(datetime.now().timestamp())}"
                material['created'] = datetime.now().isoformat()
                material['modified'] = datetime.now().isoformat()
                material['usageCount'] = 0
                
                new_materials.append(material)
                existing_materials.append(material)
                print(f"新增材料: {material['name']}")
            else:
                print(f"跳过重复材料: {material['name']}")
        
        # 保存到文件
        with open(materials_file, 'w', encoding='utf-8') as f:
            json.dump(existing_materials, f, indent=2, ensure_ascii=False)
        
        print(f"\n成功添加 {len(new_materials)} 个新材料到材料库")
        print(f"材料库总数量: {len(existing_materials)}")
        
        return len(new_materials)
        
    except Exception as e:
        print(f"添加材料到库时出错: {e}")
        return 0

if __name__ == "__main__":
    print("开始从图片数据创建材料...")
    
    # 创建材料对象
    materials = create_materials_from_image_data()
    
    print(f"\n成功创建 {len(materials)} 个材料")
    
    # 添加到材料库
    print("\n添加材料到库...")
    new_count = add_materials_to_library(materials)
    
    if new_count > 0:
        print(f"\n✅ 成功导入 {new_count} 个新材料!")
    else:
        print("\n ℹ️  没有新材料需要导入（可能已存在）")