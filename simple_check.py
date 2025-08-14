"""
简单检查材料
"""
import json
import os

if os.path.exists("materials_storage.json"):
    with open("materials_storage.json", 'r', encoding='utf-8') as f:
        materials = json.load(f)
    
    print(f"材料数量: {len(materials)}")
    
    for i, mat in enumerate(materials[:5], 1):  # 只显示前5个
        props = mat.get('properties', {})
        print(f"{i}. {mat['name']}: E={props.get('YOUNG_MODULUS')}MPa, c={props.get('COHESION')}kPa")
    
    if len(materials) > 5:
        print(f"... 还有 {len(materials) - 5} 个材料")
else:
    print("没有找到材料文件")