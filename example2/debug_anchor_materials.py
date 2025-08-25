#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
调试锚杆材料ID识别问题
"""

import sys
import os
from pathlib import Path

# 设置环境
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def debug_anchor_materials():
    """分析FPN文件中锚杆材料映射问题"""
    print("调试锚杆材料ID识别问题")
    print("=" * 60)
    
    try:
        # 1. 加载FPN数据
        print("加载FPN数据...")
        from optimized_fpn_parser import OptimizedFPNParser
        parser = OptimizedFPNParser()
        
        fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        fpn_data = parser.parse_file_streaming(str(fpn_file))
        
        # 2. 分析PETRUSS属性定义
        print("\nPETRUSS属性定义:")
        truss_sections = fpn_data.get('truss_sections', {})
        for prop_id, section in truss_sections.items():
            name = section.get('name', 'Unknown')
            area = section.get('area', 'Unknown')
            print(f"  属性{prop_id}: {name} (面积: {area})")
        
        # 3. 分析LINE元素使用的属性ID
        print("\nLINE元素属性分布:")
        line_elements = fpn_data.get('line_elements', {})
        prop_distribution = {}
        
        for eid, elem in line_elements.items():
            prop_id = elem.get('prop_id')
            prop_distribution[prop_id] = prop_distribution.get(prop_id, 0) + 1
        
        for prop_id, count in sorted(prop_distribution.items()):
            print(f"  属性{prop_id}: {count:,} 个LINE元素")
            if prop_id in truss_sections:
                section_name = truss_sections[prop_id].get('name', 'Unknown')
                print(f"    -> 对应PETRUSS: {section_name}")
        
        # 4. 分析材料定义
        print("\n材料定义:")
        materials = fpn_data.get('materials', {})
        for mat_id, material in materials.items():
            name = material.get('name', 'Unknown')
            props = material.get('properties', {})
            density = props.get('DENSITY', 'Unknown')
            E = props.get('E', 'Unknown')
            print(f"  材料{mat_id}: {name} (密度: {density}, 弹性模量: {E})")
        
        # 5. 创建Kratos接口并分析元素转换
        print("\nKratos接口元素转换分析:")
        from kratos_interface import KratosInterface
        kratos_interface = KratosInterface()
        
        # 设置数据但不完全初始化
        kratos_interface.source_fpn_data = fpn_data
        
        # 分析转换后的元素
        kratos_data = {"elements": [], "nodes": {}}
        
        # 转换LINE元素为TrussElement
        for eid, elem in line_elements.items():
            kratos_element = {
                "id": int(eid),
                "type": "TrussElement3D2N",
                "nodes": [elem.get('n1'), elem.get('n2')],
                "material_id": elem.get('prop_id') or 1,  # 属性ID作为材料ID
            }
            kratos_data["elements"].append(kratos_element)
        
        # 统计转换后的材料ID分布
        print("\n转换后TrussElement材料ID分布:")
        truss_material_distribution = {}
        for el in kratos_data["elements"]:
            if el.get("type") == "TrussElement3D2N":
                mat_id = el.get("material_id")
                truss_material_distribution[mat_id] = truss_material_distribution.get(mat_id, 0) + 1
        
        for mat_id, count in sorted(truss_material_distribution.items()):
            print(f"  材料ID {mat_id}: {count:,} 个TrussElement")
            # 检查是否有对应的材料定义
            if mat_id in materials:
                mat_name = materials[mat_id].get('name', 'Unknown')
                print(f"    -> 对应材料: {mat_name}")
            elif mat_id in truss_sections:
                section_name = truss_sections[mat_id].get('name', 'Unknown')  
                print(f"    -> 对应PETRUSS属性: {section_name}")
            else:
                print(f"    -> WARNING: 未找到对应的材料或属性定义")
        
        # 6. 分析当前MPC约束代码中的问题
        print("\n当前代码问题分析:")
        current_anchor_material_id = 13  # 当前硬编码值
        
        print(f"  当前硬编码锚杆材料ID: {current_anchor_material_id}")
        
        if current_anchor_material_id in materials:
            mat_name = materials[current_anchor_material_id].get('name', 'Unknown')
            print(f"  材料{current_anchor_material_id}存在: {mat_name}")
        else:
            print(f"  ERROR: 材料{current_anchor_material_id}不存在！")
        
        # 检查实际的锚杆材料ID
        actual_anchor_material_ids = list(truss_material_distribution.keys())
        print(f"  实际锚杆使用的材料ID: {actual_anchor_material_ids}")
        
        # 7. 提供修复建议
        print("\n修复建议:")
        
        if truss_material_distribution:
            # 找出最常用的锚杆材料ID
            most_common_id = max(truss_material_distribution.items(), key=lambda x: x[1])[0]
            print(f"  1. 将anchor_material_id改为 {most_common_id} （最常用）")
            print(f"  2. 或者修改逻辑，识别所有TrussElement的材料ID")
            
            # 检查属性vs材料的映射逻辑
            if most_common_id in truss_sections and most_common_id not in materials:
                print(f"  3. 注意：ID {most_common_id}是属性ID而非材料ID，需要建立正确映射")
        
        return {
            'truss_sections': truss_sections,
            'line_elements_count': len(line_elements),
            'prop_distribution': prop_distribution,
            'materials': materials,
            'truss_material_distribution': truss_material_distribution,
            'current_hardcoded_id': current_anchor_material_id,
            'actual_ids': actual_anchor_material_ids
        }
        
    except Exception as e:
        print(f"ERROR: 分析失败: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    result = debug_anchor_materials()
    if result:
        print("\nSUCCESS: 锚杆材料ID分析完成")
        print("现在可以根据分析结果修复MPC约束生成代码")
    else:
        print("\nERROR: 锚杆材料ID分析失败")