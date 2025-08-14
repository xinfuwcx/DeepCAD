#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import pandas as pd
import json
import os
from datetime import datetime

def create_column_mapping():
    """创建Excel列名与材料库字段的对应关系"""
    
    # Excel文件结构分析:
    # 第0行: [nan, nan, '材料名称', '主要参数', nan, nan, nan, nan, '本构模型'] 
    # 第1行: [nan, nan, nan, '弹性模量(mpa)', '泊松比', '密度(KN/m3)', '粘聚力(kpa)', '摩擦角(°)', nan]
    # 实际数据从第2行开始
    
    column_mapping = {
        # Excel列索引 -> (字段名称, 材料库字段, 转换函数, 描述)
        2: ('材料名称', 'name', str, '材料名称'),
        3: ('弹性模量(mpa)', 'elasticModulus', lambda x: float(x) * 1e6 if pd.notna(x) and x != 0 else 0, '弹性模量转换为Pa'),
        4: ('泊松比', 'poissonRatio', lambda x: float(x) if pd.notna(x) else 0.3, '泊松比'),
        5: ('密度(KN/m3)', 'density', lambda x: float(x) * 100 if pd.notna(x) and x != 0 else 2000, '密度转换为kg/m³'),
        6: ('粘聚力(kpa)', 'cohesion', lambda x: float(x) * 1000 if pd.notna(x) and x != 0 else 0, '粘聚力转换为Pa'),
        7: ('摩擦角(°)', 'frictionAngle', lambda x: float(x) if pd.notna(x) and x != 0 else 0, '摩擦角'),
        8: ('本构模型', 'constitutiveModel', lambda x: map_constitutive_model(str(x)) if pd.notna(x) else 'MOHR_COULOMB', '本构模型映射')
    }
    
    return column_mapping

def map_constitutive_model(model_name):
    """映射本构模型名称到材料库枚举"""
    model_mapping = {
        '摩尔-库伦模型': 'MOHR_COULOMB',
        '线弹性模型': 'LINEAR_ELASTIC',
        '弹塑性模型': 'ELASTOPLASTIC',
        '德鲁克-普拉格': 'DRUCKER_PRAGER',
        '剑桥模型': 'CAM_CLAY',
        '硬化土模型': 'HARDENING_SOIL'
    }
    
    # 模糊匹配
    for key, value in model_mapping.items():
        if key in model_name:
            return value
    
    # 默认返回摩尔-库伦
    return 'MOHR_COULOMB'

def determine_material_type(material_name, constitutive_model):
    """根据材料名称和本构模型确定材料类型"""
    name_lower = material_name.lower()
    
    if any(keyword in name_lower for keyword in ['混凝土', 'concrete', 'c30', 'c40', 'c50']):
        return 'concrete'
    elif any(keyword in name_lower for keyword in ['钢', 'steel', '锚杆', '钢筋', '型钢']):
        return 'steel'
    elif any(keyword in name_lower for keyword in ['岩石', 'rock', '花岗岩', '石灰岩']):
        return 'rock'
    else:
        # 默认为土体材料
        return 'soil'

def read_materials_by_column_mapping(file_path):
    """按列名称对应关系读取材料数据"""
    try:
        # 读取Excel文件，不设置表头
        df = pd.read_excel(file_path, engine='xlrd', header=None)
        
        print("Excel文件结构:")
        print(f"形状: {df.shape}")
        print(f"前2行表头:")
        print(f"第0行: {df.iloc[0].tolist()}")
        print(f"第1行: {df.iloc[1].tolist()}")
        
        # 获取列映射
        column_mapping = create_column_mapping()
        
        materials = []
        
        # 从第2行开始读取实际数据
        for i in range(2, df.shape[0]):
            row_data = df.iloc[i].tolist()
            
            # 检查材料名称是否存在
            if pd.isna(row_data[2]) or row_data[2] == '':
                continue
            
            print(f"\n处理第{i}行: {row_data}")
            
            # 提取材料基础信息
            material_data = {}
            properties = {}
            
            # 按列映射提取数据
            for col_idx, (excel_name, field_name, converter, description) in column_mapping.items():
                if col_idx < len(row_data):
                    raw_value = row_data[col_idx]
                    try:
                        converted_value = converter(raw_value)
                        if field_name == 'name':
                            material_data[field_name] = converted_value
                        elif field_name == 'constitutiveModel':
                            material_data[field_name] = converted_value
                        else:
                            properties[field_name] = converted_value
                        print(f"  {excel_name}: {raw_value} -> {field_name}: {converted_value}")
                    except Exception as e:
                        print(f"  转换{excel_name}时出错: {e}")
                        continue
            
            # 确定材料类型
            material_type = determine_material_type(
                material_data.get('name', ''), 
                material_data.get('constitutiveModel', '')
            )
            
            # 构建完整的材料对象
            material = {
                'name': material_data.get('name'),
                'material_type': material_type,
                'constitutiveModel': material_data.get('constitutiveModel', 'MOHR_COULOMB'),
                'properties': properties.copy(),
                'description': f'从Excel按列映射导入的{material_type}材料',
                'source': '材料参数1-系统输入.xls',
                'standard': '工程地质勘察规范',
                'category': material_type,
                'tags': ['Excel导入', '列映射', material_type],
                'reliability': 'empirical',
                'validated': True,
                'version': '1.0'
            }
            
            # 根据材料类型添加特定属性
            if material_type == 'soil':
                # 土体材料默认属性
                if 'permeability' not in properties:
                    material['properties']['permeability'] = 1e-7
                if 'dilatancyAngle' not in properties:
                    material['properties']['dilatancyAngle'] = 0
            
            elif material_type == 'concrete':
                # 混凝土材料属性
                elastic_modulus = properties.get('elasticModulus', 30e9)
                material['properties']['compressiveStrength'] = elastic_modulus  # 简化假设
                material['properties']['tensileStrength'] = elastic_modulus * 0.1
                material['constitutiveModel'] = 'LINEAR_ELASTIC'
            
            elif material_type == 'steel':
                # 钢材属性
                material['properties']['yieldStrength'] = 355e6  # 默认Q355
                material['properties']['ultimateStrength'] = 490e6
                material['constitutiveModel'] = 'LINEAR_ELASTIC'
            
            materials.append(material)
            print(f"  创建材料: {material['name']} -> {material_type} -> {material['constitutiveModel']}")
        
        return materials
        
    except Exception as e:
        print(f"读取Excel文件时出错: {e}")
        return []

def add_materials_with_column_mapping(materials):
    """将按列映射读取的材料添加到材料库"""
    try:
        materials_file = "materials_storage.json"
        
        # 读取现有材料
        existing_materials = []
        if os.path.exists(materials_file):
            with open(materials_file, 'r', encoding='utf-8') as f:
                existing_materials = json.load(f)
        
        # 检查重复并添加新材料
        existing_names = set(m.get("name", "") for m in existing_materials)
        new_materials = []
        
        for material in materials:
            material_name = material.get('name', '')
            if material_name and material_name not in existing_names:
                # 添加材料库要求的元数据
                material['id'] = f"material_cm_{len(existing_materials) + len(new_materials) + 1}_{int(datetime.now().timestamp())}"
                material['created'] = datetime.now().isoformat()
                material['modified'] = datetime.now().isoformat() 
                material['usageCount'] = 0
                
                new_materials.append(material)
                existing_materials.append(material)
                print(f"新增材料: {material_name}")
            else:
                print(f"跳过重复或无效材料: {material_name}")
        
        # 保存更新的材料库
        with open(materials_file, 'w', encoding='utf-8') as f:
            json.dump(existing_materials, f, indent=2, ensure_ascii=False)
        
        print(f"\n✓ 成功添加 {len(new_materials)} 个新材料")
        print(f"✓ 材料库总数量: {len(existing_materials)}")
        
        return len(new_materials)
        
    except Exception as e:
        print(f"添加材料到库时出错: {e}")
        return 0

if __name__ == "__main__":
    print("按列名称对应关系导入材料...")
    
    # 读取材料
    materials = read_materials_by_column_mapping("材料参数1-系统输入.xls")
    
    print(f"\n成功解析 {len(materials)} 个材料")
    
    if materials:
        # 添加到材料库
        print("\n添加材料到库...")
        new_count = add_materials_with_column_mapping(materials)
        
        if new_count > 0:
            print(f"\n🎉 成功按列映射导入 {new_count} 个新材料!")
        else:
            print("\n📝 没有新材料需要导入")
    else:
        print("\n❌ 没有成功解析到材料数据")