#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
sys.path.append('.')
sys.path.append(os.getcwd())

# 直接导入
import core.optimized_fpn_parser as fpn_parser
from core.kratos_interface import KratosInterface
from pathlib import Path
import tempfile
import json

# 解析FPN文件
print('=== 解析FPN文件 ===')
parser = fpn_parser.OptimizedFPNParser()
fpn_data = parser.parse_file_streaming('data/两阶段-全锚杆-摩尔库伦.fpn')
print(f'FPN解析完成: {len(fpn_data.get("nodes", []))} 节点, {len(fpn_data.get("elements", []))} 单元')

# 检查FPN数据中的材料信息
print('\n=== 检查FPN原始数据中的材料 ===')
materials_in_fpn = fpn_data.get('materials', {})
print(f'FPN中的材料数量: {len(materials_in_fpn)}')
for mat_id, mat_data in materials_in_fpn.items():
    print(f'  材料{mat_id}: {mat_data}')

# 检查材料集合
material_sets = fpn_data.get('material_sets', {})
print(f'FPN中的材料集合数量: {len(material_sets)}')
for set_id, set_data in material_sets.items():
    print(f'  材料集合{set_id}: {set_data}')

# 创建Kratos接口并设置模型
ki = KratosInterface()
success = ki.setup_model(fpn_data)
if not success:
    print('❌ 模型设置失败')
    exit(1)

print('=== 检查材料配置 ===')
print(f'加载的材料数量: {len(ki.materials)}')
for mat_id, mat in ki.materials.items():
    print(f'  材料{mat_id}: {mat.name} (密度={mat.density}, E={mat.young_modulus/1e6}MPa)')

# 检查模型数据中的材料ID
print('\n=== 检查模型中使用的材料ID ===')
used_material_ids = set()
for el in ki.model_data.get('elements', []):
    mat_id = el.get('material_id')
    if mat_id:
        used_material_ids.add(mat_id)

print(f'模型中使用的材料ID: {sorted(used_material_ids)}')
print(f'定义的材料ID: {sorted(ki.materials.keys())}')

# 找出缺失的材料
missing_materials = used_material_ids - set(ki.materials.keys())
if missing_materials:
    print(f'❌ 缺失的材料ID: {sorted(missing_materials)}')
    # 为缺失的材料创建默认配置
    for mat_id in missing_materials:
        print(f'⚠️  为材料ID {mat_id}创建默认配置')
        default_material = MaterialProperties(
            id=mat_id,
            name=f'DefaultMaterial_{mat_id}',
            density=2000.0,
            young_modulus=25e6,
            poisson_ratio=0.3,
            cohesion=35000.0,
            friction_angle=28.0,
            dilatancy_angle=max(0.0, 28.0 - 30.0)  # 使用Bolton经验关系：ψ = φ - 30°
        )
        ki.materials[mat_id] = default_material
else:
    print('✅ 所有材料ID都有定义')

# 生成材料文件
with tempfile.TemporaryDirectory() as tmpdir:
    materials_file = Path(tmpdir) / 'materials.json'
    ki._write_materials_file(materials_file)
    
    with open(materials_file, 'r', encoding='utf-8') as f:
        config = json.load(f)

print(f'\n生成的材料配置数量: {len(config["properties"])}')
for i, prop in enumerate(config['properties']):
    law_name = prop['Material']['constitutive_law']['name']
    prop_id = prop['properties_id']
    model_part = prop['model_part_name']
    print(f'  属性{prop_id}: {law_name} -> {model_part}')
