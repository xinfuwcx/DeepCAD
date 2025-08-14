#!/usr/bin/env python3
"""
将Excel材料数据导入到材料库
"""
import pandas as pd
import json
import time
import math
from datetime import datetime

def convert_constitutive_model(chinese_model):
    """转换本构模型名称"""
    if "莫尔-库伦" in chinese_model or "Mohr" in chinese_model:
        return "MOHR_COULOMB"
    elif "线弹性" in chinese_model or "弹性" in chinese_model:
        return "LINEAR_ELASTIC"
    else:
        return "MOHR_COULOMB"  # 默认

def determine_material_type(name, constitutive_model):
    """根据材料名称和本构模型判断材料类型"""
    name_lower = name.lower()
    
    # 混凝土材料
    if 'c30' in name_lower or 'c25' in name_lower or 'c35' in name_lower or '混凝土' in name:
        return "concrete"
    
    # 钢材
    if '锚杆' in name or '钢' in name or 'steel' in name_lower:
        return "steel"
    
    # 默认为土体材料
    return "soil"

def create_material_properties(row, material_type):
    """根据材料类型创建材料属性"""
    elastic_modulus = float(row['主要参数'])
    poisson_ratio = float(row['Unnamed: 4'])
    unit_weight = float(row['Unnamed: 5'])  # 容重 KN/m3
    
    # 容重转换为密度 (密度 = 容重 / 9.8)
    density = unit_weight * 1000 / 9.8  # kg/m3
    
    if material_type == "soil":
        cohesion = row['Unnamed: 6']
        friction_angle = row['Unnamed: 7']
        
        # 处理NaN值
        if math.isnan(cohesion):
            cohesion = 0
        if math.isnan(friction_angle):
            friction_angle = 0
            
        return {
            "elasticModulus": elastic_modulus * 1e6,  # MPa 转 Pa
            "poissonRatio": poisson_ratio,
            "density": density,
            "cohesion": float(cohesion) * 1000 if cohesion else 0,  # kPa 转 Pa
            "frictionAngle": float(friction_angle) if friction_angle else 0,
            "permeability": 1e-7  # 默认渗透系数
        }
    
    elif material_type == "concrete":
        # 混凝土特性
        compressive_strength = elastic_modulus * 1e6  # 使用弹性模量作为抗压强度的近似
        tensile_strength = compressive_strength * 0.1  # 抗拉强度约为抗压强度的10%
        
        return {
            "elasticModulus": elastic_modulus * 1e6,  # MPa 转 Pa
            "poissonRatio": poisson_ratio,
            "density": density,
            "compressiveStrength": compressive_strength,
            "tensileStrength": tensile_strength
        }
    
    elif material_type == "steel":
        # 钢材特性
        yield_strength = 355e6  # 355 MPa 屈服强度
        ultimate_strength = 490e6  # 490 MPa 抗拉强度
        
        return {
            "elasticModulus": elastic_modulus * 1e6,  # MPa 转 Pa
            "poissonRatio": poisson_ratio,
            "density": density,
            "yieldStrength": yield_strength,
            "ultimateStrength": ultimate_strength
        }
    
    return {}

def import_excel_to_material_library():
    """导入Excel数据到材料库"""
    try:
        # 读取Excel文件
        excel_file = "材料参数1-系统输入.xls"
        df = pd.read_excel(excel_file, sheet_name='Sheet1')
        
        # 跳过第一行（表头）
        materials_data = []
        
        for index, row in df.iterrows():
            if index == 0:  # 跳过表头行
                continue
                
            material_name = row['材料名称']
            
            # 跳过空行或无效行
            if pd.isna(material_name) or material_name == '':
                continue
            
            constitutive_model_chinese = row['本构模型']
            if pd.isna(constitutive_model_chinese):
                constitutive_model_chinese = "莫尔-库伦模型"
            
            # 转换模型名称
            constitutive_model = convert_constitutive_model(constitutive_model_chinese)
            
            # 确定材料类型
            material_type = determine_material_type(material_name, constitutive_model)
            
            # 创建材料属性
            properties = create_material_properties(row, material_type)
            
            # 生成唯一ID
            timestamp = int(time.time() * 1000)
            material_id = f"material_{index}_{timestamp}"
            
            # 创建材料对象
            material = {
                "name": material_name,
                "material_type": material_type,
                "constitutive_model": constitutive_model,
                "properties": properties,
                "description": f"从Excel导入的{material_type}材料",
                "source": "材料参数1-系统输入.xls",
                "category": material_type,
                "tags": ["excel导入", material_type],
                "reliability": "empirical",
                "id": material_id,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            materials_data.append(material)
            print(f"已导入材料: {material_name} ({material_type})")
        
        # 保存到materials_storage.json
        with open('materials_storage.json', 'w', encoding='utf-8') as f:
            json.dump(materials_data, f, ensure_ascii=False, indent=2, default=str)
        
        print(f"\n成功导入 {len(materials_data)} 个材料到材料库")
        print(f"材料库文件: materials_storage.json")
        
        # 显示导入统计
        soil_count = len([m for m in materials_data if m['material_type'] == 'soil'])
        concrete_count = len([m for m in materials_data if m['material_type'] == 'concrete'])
        steel_count = len([m for m in materials_data if m['material_type'] == 'steel'])
        
        print(f"\n导入统计:")
        print(f"土体材料: {soil_count} 个")
        print(f"混凝土材料: {concrete_count} 个")
        print(f"钢材: {steel_count} 个")
        
        return materials_data
        
    except Exception as e:
        print(f"导入材料时出错: {e}")
        return None

if __name__ == "__main__":
    materials = import_excel_to_material_library()