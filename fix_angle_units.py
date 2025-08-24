#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复角度单位问题 - 将度数转换为弧度
"""

import json
import math

def fix_angle_units():
    """将摩擦角和剪胀角从度数转换为弧度"""
    print("🔧 修复角度单位问题")
    print("=" * 50)
    print("🔍 发现问题:")
    print("   FRICTION_ANGLE从35.0°变成了0.0")
    print("   说明Kratos期望弧度，不是度数！")
    
    # 读取当前材料文件
    with open('materials_direct_model.json', 'r', encoding='utf-8') as f:
        materials_data = json.load(f)
    
    print("\n🔧 转换角度单位:")
    for prop in materials_data["properties"]:
        mat_id = prop["properties_id"]
        variables = prop["Material"]["Variables"]
        
        # 转换摩擦角
        if "FRICTION_ANGLE" in variables:
            friction_deg = variables["FRICTION_ANGLE"]
            friction_rad = math.radians(friction_deg)
            variables["FRICTION_ANGLE"] = friction_rad
            print(f"   材料{mat_id}: 摩擦角 {friction_deg}° → {friction_rad:.6f} rad")
        
        # 转换剪胀角
        if "DILATANCY_ANGLE" in variables:
            dilatancy_deg = variables["DILATANCY_ANGLE"]
            dilatancy_rad = math.radians(dilatancy_deg)
            variables["DILATANCY_ANGLE"] = dilatancy_rad
            if dilatancy_deg > 0:
                print(f"   材料{mat_id}: 剪胀角 {dilatancy_deg}° → {dilatancy_rad:.6f} rad")
    
    # 保存修复后的文件
    with open('materials_radians_fixed.json', 'w', encoding='utf-8') as f:
        json.dump(materials_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ 角度单位修复完成: materials_radians_fixed.json")
    return True

if __name__ == "__main__":
    fix_angle_units()
