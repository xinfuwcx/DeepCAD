#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复材料文件中缺失的VOLUME_ACCELERATION
"""

import json

def fix_gravity_in_materials():
    """在材料文件中添加VOLUME_ACCELERATION"""
    print("🔧 修复材料文件中的重力设置")
    print("=" * 50)
    
    # 读取当前材料文件
    with open('materials_correct_solution.json', 'r', encoding='utf-8') as f:
        materials_data = json.load(f)
    
    # 为每个材料添加VOLUME_ACCELERATION
    for material in materials_data["properties"]:
        material_id = material["properties_id"]
        
        # 添加重力加速度到Variables
        if "VOLUME_ACCELERATION" not in material["Material"]["Variables"]:
            material["Material"]["Variables"]["VOLUME_ACCELERATION"] = [0.0, 0.0, -9.81]
            print(f"✅ 已为材料{material_id}添加VOLUME_ACCELERATION")
        else:
            print(f"   材料{material_id}已有VOLUME_ACCELERATION")
    
    # 保存修复后的材料文件
    with open('materials_correct_with_gravity.json', 'w', encoding='utf-8') as f:
        json.dump(materials_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ 修复完成: materials_correct_with_gravity.json")
    
    # 复制到stage目录
    stages = [
        "multi_stage_kratos_conversion/stage_1",
        "multi_stage_kratos_conversion/stage_2"
    ]
    
    for stage in stages:
        try:
            import shutil
            shutil.copy('materials_correct_with_gravity.json', f'{stage}/StructuralMaterials.json')
            print(f"✅ 已复制到 {stage}/StructuralMaterials.json")
        except Exception as e:
            print(f"❌ 复制到 {stage} 失败: {e}")

def main():
    """主函数"""
    print("🔧 修复重力设置问题")
    print("=" * 50)
    print("🚨 发现问题: 材料文件中缺少VOLUME_ACCELERATION")
    print("🔧 解决方案: 在所有材料的Variables中添加VOLUME_ACCELERATION")
    
    fix_gravity_in_materials()
    
    print("\n" + "=" * 50)
    print("✅ 重力问题修复完成!")
    print("💡 现在材料Properties和Process都设置了重力")
    print("📋 下一步: 重新测试重力设置")

if __name__ == "__main__":
    main()
