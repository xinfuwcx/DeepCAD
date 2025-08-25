#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分析MDPA文件中的元素类型和数量
"""

import re
from pathlib import Path

def analyze_elements():
    """分析元素类型"""
    print("🔍 分析Kratos MDPA文件中的元素类型")
    print("=" * 60)
    
    mdpa_file = Path("kratos_analysis_run/model.mdpa")
    
    if not mdpa_file.exists():
        print("❌ MDPA文件不存在")
        return
    
    element_types = {}
    current_element_type = None
    element_count = 0
    
    with open(mdpa_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            
            # 检测元素块开始
            if line.startswith("Begin Elements"):
                parts = line.split()
                if len(parts) >= 3:
                    current_element_type = parts[2]
                    element_count = 0
                    print(f"📋 发现元素类型: {current_element_type}")
            
            # 检测元素块结束
            elif line.startswith("End Elements"):
                if current_element_type:
                    element_types[current_element_type] = element_count
                    print(f"  ✅ {current_element_type}: {element_count} 个元素")
                current_element_type = None
                element_count = 0
            
            # 计算元素数量（跳过注释和空行）
            elif current_element_type and line and not line.startswith("//"):
                # 检查是否是元素定义行（以数字开头）
                if re.match(r'^\d+', line):
                    element_count += 1
    
    print("\n📊 元素类型汇总:")
    print("-" * 60)
    
    total_elements = 0
    for elem_type, count in element_types.items():
        total_elements += count
        print(f"{elem_type:40} {count:>10,} 个")
    
    print("-" * 60)
    print(f"{'总计':40} {total_elements:>10,} 个")
    
    print("\n🎯 元素类型功能分析:")
    print("-" * 60)
    
    for elem_type, count in element_types.items():
        percentage = (count / total_elements * 100) if total_elements > 0 else 0
        
        if "SmallDisplacementElement3D4N" in elem_type:
            print(f"🌍 {elem_type}")
            print(f"   作用: 四面体土体单元 (3D固体力学)")
            print(f"   用途: 模拟土体变形、应力分布")
            print(f"   重要性: ⭐⭐⭐⭐⭐ (核心土体分析)")
            print(f"   数量: {count:,} 个 ({percentage:.1f}%)")
            
        elif "TrussElement3D2N" in elem_type:
            print(f"⚓ {elem_type}")
            print(f"   作用: 二节点桁架单元 (1D拉压)")
            print(f"   用途: 模拟锚杆、钢筋等线性构件")
            print(f"   重要性: ⭐⭐⭐⭐⭐ (关键支护结构)")
            print(f"   数量: {count:,} 个 ({percentage:.1f}%)")
            
        elif "ShellThinElementCorotational3D3N" in elem_type:
            print(f"🏗️ {elem_type}")
            print(f"   作用: 三角形薄壳单元 (2D板壳)")
            print(f"   用途: 模拟地连墙、隧道衬砌等板状结构")
            print(f"   重要性: ⭐⭐⭐⭐⭐ (主要支护结构)")
            print(f"   数量: {count:,} 个 ({percentage:.1f}%)")
            
        else:
            print(f"❓ {elem_type}")
            print(f"   作用: 未知元素类型")
            print(f"   数量: {count:,} 个 ({percentage:.1f}%)")
        
        print()
    
    print("🔧 Kratos注册需求:")
    print("-" * 60)
    
    required_apps = []
    
    if any("SmallDisplacementElement" in et for et in element_types.keys()):
        required_apps.append("StructuralMechanicsApplication")
        print("✅ 需要: KratosMultiphysics.StructuralMechanicsApplication")
        print("   原因: SmallDisplacementElement3D4N (土体单元)")
    
    if any("TrussElement" in et for et in element_types.keys()):
        if "StructuralMechanicsApplication" not in required_apps:
            required_apps.append("StructuralMechanicsApplication")
        print("✅ 需要: KratosMultiphysics.StructuralMechanicsApplication")
        print("   原因: TrussElement3D2N (锚杆单元)")
    
    if any("Shell" in et for et in element_types.keys()):
        if "StructuralMechanicsApplication" not in required_apps:
            required_apps.append("StructuralMechanicsApplication")
        print("✅ 需要: KratosMultiphysics.StructuralMechanicsApplication")
        print("   原因: ShellThinElementCorotational3D3N (地连墙单元)")
    
    print(f"\n📋 总结: 需要导入 {len(required_apps)} 个Kratos应用程序")
    
    print("\n💡 修复建议:")
    print("-" * 60)
    print("在Kratos脚本开头添加:")
    print("import KratosMultiphysics.StructuralMechanicsApplication as StructuralMechanicsApplication")
    print("\n这将注册所有必需的元素类型，使分析能够正常运行。")

if __name__ == "__main__":
    analyze_elements()
