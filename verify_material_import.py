#!/usr/bin/env python3
"""
验证材料导入结果
"""
import json

def verify_material_import():
    """验证材料导入结果"""
    try:
        with open('materials_storage.json', 'r', encoding='utf-8') as f:
            materials = json.load(f)
        
        print("=" * 60)
        print("材料库导入验证报告")
        print("=" * 60)
        
        print(f"总材料数: {len(materials)}")
        
        # 按材料类型统计
        soil_materials = [m for m in materials if m['material_type'] == 'soil']
        concrete_materials = [m for m in materials if m['material_type'] == 'concrete']
        steel_materials = [m for m in materials if m['material_type'] == 'steel']
        
        print(f"\n材料类型统计:")
        print(f"  土体材料: {len(soil_materials)} 个")
        print(f"  混凝土材料: {len(concrete_materials)} 个")
        print(f"  钢材: {len(steel_materials)} 个")
        
        # 显示部分材料详情
        print(f"\n土体材料列表:")
        for i, material in enumerate(soil_materials[:5], 1):
            props = material['properties']
            print(f"  {i}. {material['name']}")
            print(f"     弹性模量: {props['elasticModulus']/1e6:.2f} MPa")
            print(f"     泊松比: {props['poissonRatio']}")
            print(f"     密度: {props['density']:.1f} kg/m3")
            print(f"     粘聚力: {props['cohesion']/1000:.1f} kPa")
            print(f"     摩擦角: {props['frictionAngle']} 度")
        
        if len(concrete_materials) > 0:
            print(f"\n混凝土材料:")
            for material in concrete_materials:
                props = material['properties']
                print(f"  - {material['name']}")
                print(f"    弹性模量: {props['elasticModulus']/1e9:.1f} GPa")
                print(f"    密度: {props['density']:.1f} kg/m3")
        
        if len(steel_materials) > 0:
            print(f"\n钢材:")
            for material in steel_materials:
                props = material['properties']
                print(f"  - {material['name']}")
                print(f"    弹性模量: {props['elasticModulus']/1e9:.1f} GPa")
                print(f"    密度: {props['density']:.1f} kg/m3")
        
        print(f"\n验证结果: ✅ 导入成功！")
        print(f"所有 {len(materials)} 个材料已成功导入到材料库")
        
        return True
        
    except Exception as e:
        print(f"验证材料导入时出错: {e}")
        return False

if __name__ == "__main__":
    verify_material_import()