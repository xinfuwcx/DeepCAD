"""
清理材料存储数据，移除material_type字段
"""
import json
import os

def cleanup_materials_storage():
    """清理materials_storage.json中的material_type字段"""
    materials_file = "materials_storage.json"
    
    if not os.path.exists(materials_file):
        print("材料存储文件不存在")
        return
    
    # 读取现有材料
    with open(materials_file, 'r', encoding='utf-8') as f:
        materials = json.load(f)
    
    print(f"找到 {len(materials)} 个材料")
    
    # 移除material_type字段
    cleaned_materials = []
    for material in materials:
        cleaned_material = material.copy()
        
        # 移除material_type字段
        if 'material_type' in cleaned_material:
            del cleaned_material['material_type']
            print(f"从材料 '{cleaned_material['name']}' 中移除了material_type字段")
        
        cleaned_materials.append(cleaned_material)
    
    # 保存清理后的数据
    with open(materials_file, 'w', encoding='utf-8') as f:
        json.dump(cleaned_materials, f, indent=2, ensure_ascii=False)
    
    print(f"清理完成，共处理 {len(cleaned_materials)} 个材料")

if __name__ == "__main__":
    cleanup_materials_storage()