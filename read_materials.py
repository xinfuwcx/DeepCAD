#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import pandas as pd
import json
import os
import requests
from datetime import datetime

def read_material_excel(file_path):
    """读取材料Excel文件"""
    try:
        # 读取Excel文件
        df = pd.read_excel(file_path, engine='xlrd')
        
        print("Excel文件结构:")
        print(f"形状: {df.shape}")
        print(f"列名: {df.columns.tolist()}")
        print("\n原始数据:")
        
        # 显示所有数据
        for i, row in df.iterrows():
            print(f"行{i}: {row.tolist()}")
        
        return df
        
    except Exception as e:
        print(f"读取Excel文件时出错: {e}")
        return None

def convert_to_material_format(df):
    """将Excel数据转换为材料库格式"""
    materials = []
    
    # 跳过表头行(索引0)，处理实际数据
    for i, row in df.iterrows():
        if i == 0:  # 跳过表头
            continue
            
        row_data = row.tolist()
        material_name = row_data[2]  # 材料名称在第3列(索引2)
        
        if pd.isna(material_name) or material_name == '':
            continue
            
        # 提取数据
        elastic_modulus = row_data[3] if not pd.isna(row_data[3]) else 0  # 弹性模量(mpa)
        poisson_ratio = row_data[4] if not pd.isna(row_data[4]) else 0.3  # 泊松比
        density = row_data[5] if not pd.isna(row_data[5]) else 20  # 密度(KN/m3)
        cohesion = row_data[6] if not pd.isna(row_data[6]) else 0  # 粘聚力(kpa)
        friction_angle = row_data[7] if not pd.isna(row_data[7]) else 0  # 摩擦角(度)
        constitutive_model = row_data[8] if not pd.isna(row_data[8]) else "摩尔-库伦模型"  # 本构模型
        
        # 判断材料类型
        if "混凝土" in material_name or "C30" in material_name:
            material_type = "concrete"
            constitutive = "LINEAR_ELASTIC"
        elif "锚杆" in material_name or "钢" in material_name:
            material_type = "steel" 
            constitutive = "LINEAR_ELASTIC"
        else:
            material_type = "soil"
            constitutive = "MOHR_COULOMB"
        
        # 构建材料对象
        material = {
            "name": material_name,
            "material_type": material_type,
            "constitutive_model": constitutive,
            "properties": {
                "elasticModulus": float(elastic_modulus) * 1e6 if elastic_modulus > 0 else 0,  # 转换为Pa
                "poissonRatio": float(poisson_ratio),
                "density": float(density) * 100 if density > 0 else 2000,  # 转换为kg/m3(KN/m3 * 100 ≈ kg/m3)
            },
            "description": f"从Excel导入的{material_type}材料",
            "source": "材料参数1-系统输入.xls",
            "category": material_type,
            "tags": ["excel导入", material_type],
            "reliability": "empirical"
        }
        
        # 添加土体特有属性
        if material_type == "soil":
            material["properties"]["cohesion"] = float(cohesion) * 1000 if cohesion > 0 else 0  # 转换为Pa
            material["properties"]["frictionAngle"] = float(friction_angle) if friction_angle > 0 else 0
            material["properties"]["permeability"] = 1e-7  # 默认渗透系数
        
        # 添加钢材特有属性
        if material_type == "steel":
            material["properties"]["yieldStrength"] = 355e6  # 默认屈服强度
            material["properties"]["ultimateStrength"] = 490e6  # 默认极限强度
        
        # 添加混凝土特有属性
        if material_type == "concrete":
            material["properties"]["compressiveStrength"] = float(elastic_modulus) * 1e6 if elastic_modulus > 0 else 30e6
            material["properties"]["tensileStrength"] = float(elastic_modulus) * 1e6 * 0.1 if elastic_modulus > 0 else 3e6
        
        materials.append(material)
        print(f"转换材料: {material_name} -> {material_type}")
    
    return materials

def add_materials_to_library(materials):
    """将材料添加到材料库"""
    try:
        # 保存到本地JSON文件
        materials_file = "materials_storage.json"
        
        # 读取现有材料
        existing_materials = []
        if os.path.exists(materials_file):
            with open(materials_file, 'r', encoding='utf-8') as f:
                existing_materials = json.load(f)
        
        # 添加新材料
        for material in materials:
            # 添加ID和时间戳
            material['id'] = f"material_{len(existing_materials) + 1}_{int(datetime.now().timestamp())}"
            material['created_at'] = datetime.now().isoformat()
            material['updated_at'] = datetime.now().isoformat()
            
            existing_materials.append(material)
        
        # 保存到文件
        with open(materials_file, 'w', encoding='utf-8') as f:
            json.dump(existing_materials, f, indent=2, ensure_ascii=False)
        
        print(f"成功添加 {len(materials)} 个材料到材料库")
        print(f"总材料数量: {len(existing_materials)}")
        
        return True
        
    except Exception as e:
        print(f"添加材料到库时出错: {e}")
        return False

if __name__ == "__main__":
    print("开始处理材料Excel文件...")
    
    # 读取Excel文件
    df = read_material_excel("材料参数1-系统输入.xls")
    if df is None:
        print("读取Excel文件失败")
        exit(1)
    
    print("\n转换材料数据...")
    
    # 转换为材料格式
    materials = convert_to_material_format(df)
    
    print(f"\n成功转换 {len(materials)} 个材料")
    
    # 添加到材料库
    print("\n添加材料到库...")
    success = add_materials_to_library(materials)
    
    if success:
        print("\n✅ 材料导入完成!")
    else:
        print("\n❌ 材料导入失败!")