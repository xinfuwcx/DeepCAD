"""
检查材料存储文件
"""
import json
import os

materials_file = "materials_storage.json"

if os.path.exists(materials_file):
    with open(materials_file, 'r', encoding='utf-8') as f:
        materials = json.load(f)
    
    print(f"找到 {len(materials)} 个材料:")
    print()
    
    for i, mat in enumerate(materials, 1):
        props = mat.get('properties', {})
        print(f"{i:2d}. {mat['name']}")
        print(f"     弹性模量: {props.get('YOUNG_MODULUS', 'N/A')} MPa")
        print(f"     密度: {props.get('DENSITY', 'N/A')} kg/m³")
        print(f"     粘聚力: {props.get('COHESION', 'N/A')} kPa")
        print(f"     内摩擦角: {props.get('FRICTION_ANGLE', 'N/A')}°")
        print()
else:
    print("材料存储文件不存在")