#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为修正摩尔-库伦材料添加HARDENING_CURVE参数
"""

import json

def add_hardening_curve():
    """为所有材料添加HARDENING_CURVE参数"""
    print("🔧 为修正摩尔-库伦材料添加HARDENING_CURVE参数")
    print("=" * 60)
    
    # 读取现有材料文件
    input_files = [
        "multi_stage_kratos_conversion/stage_1/modified_mohr_coulomb_materials.json",
        "multi_stage_kratos_conversion/stage_2/modified_mohr_coulomb_materials.json"
    ]
    
    for input_file in input_files:
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                materials_data = json.load(f)
            
            print(f"\n📝 处理文件: {input_file}")
            
            # 为每个材料添加HARDENING_CURVE参数
            for material in materials_data["properties"]:
                variables = material["Material"]["Variables"]
                
                # 添加硬化曲线参数
                variables["HARDENING_CURVE"] = 1  # 1 = 线性硬化
                variables["HARDENING_MODULUS"] = 0.0  # 0 = 理想塑性（无硬化）
                
                print(f"   ✅ 材料 {material['properties_id']}: 添加 HARDENING_CURVE=1, HARDENING_MODULUS=0.0")
            
            # 保存更新的文件
            with open(input_file, 'w', encoding='utf-8') as f:
                json.dump(materials_data, f, indent=2, ensure_ascii=False)
            
            print(f"   💾 已更新: {input_file}")
            
        except FileNotFoundError:
            print(f"   ❌ 文件未找到: {input_file}")
        except Exception as e:
            print(f"   ❌ 处理失败: {input_file}, 错误: {e}")
    
    print(f"\n🎯 总结:")
    print(f"   - HARDENING_CURVE = 1 (线性硬化)")
    print(f"   - HARDENING_MODULUS = 0.0 (理想塑性，无硬化)")
    print(f"   - 这样配置适合土体材料的理想塑性行为")

if __name__ == "__main__":
    add_hardening_curve()
