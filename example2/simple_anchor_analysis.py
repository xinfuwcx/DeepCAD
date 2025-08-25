#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化的锚杆材料分析脚本
"""

import sys
import os
from pathlib import Path

# 设置环境
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def simple_anchor_analysis():
    """简化的锚杆材料分析"""
    print("简化锚杆材料分析")
    print("=" * 40)
    
    try:
        # 1. 加载FPN数据
        print("1. 加载FPN数据...")
        from optimized_fpn_parser import OptimizedFPNParser
        parser = OptimizedFPNParser()
        
        fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        
        # 禁用调试输出
        import logging
        logging.disable(logging.CRITICAL)
        
        fpn_data = parser.parse_file_streaming(str(fpn_file))
        
        # 重新启用日志
        logging.disable(logging.NOTSET)
        
        # 2. 分析PETRUSS属性
        print("\n2. PETRUSS属性分析:")
        truss_sections = fpn_data.get('truss_sections', {})
        print(f"   发现 {len(truss_sections)} 个PETRUSS属性")
        
        for prop_id, section in truss_sections.items():
            name = section.get('name', 'Unknown')
            print(f"   属性{prop_id}: {name}")
        
        # 3. 分析LINE元素
        print("\n3. LINE元素分析:")
        line_elements = fpn_data.get('line_elements', {})
        print(f"   发现 {len(line_elements)} 个LINE元素")
        
        # 统计属性使用情况
        prop_usage = {}
        for eid, elem in line_elements.items():
            prop_id = elem.get('prop_id')
            prop_usage[prop_id] = prop_usage.get(prop_id, 0) + 1
        
        print("   属性使用分布:")
        for prop_id, count in sorted(prop_usage.items()):
            print(f"     属性{prop_id}: {count} 个元素")
        
        # 4. 分析材料定义
        print("\n4. 材料定义分析:")
        materials = fpn_data.get('materials', {})
        print(f"   发现 {len(materials)} 种材料")
        
        # 查找可能的锚杆材料
        anchor_material_candidates = []
        for mat_id, material in materials.items():
            name = material.get('name', '')
            props = material.get('properties', {})
            density = props.get('DENSITY', 0)
            E = props.get('E', 0)
            
            # 钢材特征：高密度(>7000)，高弹性模量(>100GPa)
            if density > 7000 and E > 100e9:
                anchor_material_candidates.append({
                    'id': mat_id,
                    'name': name,
                    'density': density,
                    'E': E
                })
        
        print("   可能的锚杆材料:")
        for candidate in anchor_material_candidates:
            print(f"     材料{candidate['id']}: {candidate['name']} "
                  f"(密度: {candidate['density']:.0f}, 弹性模量: {candidate['E']/1e9:.0f}GPa)")
        
        # 5. 当前代码问题分析
        print("\n5. 问题分析:")
        current_hardcoded_id = 13  # kratos_interface.py中的硬编码值
        
        if current_hardcoded_id in materials:
            current_material = materials[current_hardcoded_id]
            current_name = current_material.get('name', 'Unknown')
            print(f"   当前硬编码材料ID {current_hardcoded_id}: {current_name}")
            
            # 检查是否确实是锚杆材料
            current_props = current_material.get('properties', {})
            current_density = current_props.get('DENSITY', 0)
            current_E = current_props.get('E', 0)
            
            if current_density > 7000 and current_E > 100e9:
                print("     -> 确实是锚杆材料(钢材特征)")
            else:
                print("     -> 不是锚杆材料(缺乏钢材特征)")
                print(f"        密度: {current_density:.0f}, 弹性模量: {current_E/1e9:.1f}GPa")
        else:
            print(f"   当前硬编码材料ID {current_hardcoded_id}: 不存在！")
        
        # 6. 修复建议
        print("\n6. 修复建议:")
        
        if anchor_material_candidates:
            # 最可能的锚杆材料
            best_candidate = max(anchor_material_candidates, 
                                key=lambda x: x['E'])  # 选择弹性模量最高的
            
            print(f"   建议使用材料ID {best_candidate['id']}: {best_candidate['name']}")
            
            if best_candidate['id'] != current_hardcoded_id:
                print(f"   需要修改kratos_interface.py中的anchor_material_id")
                print(f"   将 anchor_material_id = {current_hardcoded_id} 改为 {best_candidate['id']}")
        else:
            print("   未找到明显的锚杆材料，可能需要检查解析逻辑")
        
        # 7. 元素材料映射分析
        print("\n7. 元素-材料映射分析:")
        
        # LINE元素使用的是prop_id，不是material_id
        actual_prop_ids = list(prop_usage.keys())
        print(f"   LINE元素使用的属性ID: {actual_prop_ids}")
        
        # 检查这些属性ID是否也有对应的材料定义
        print("   属性ID与材料ID的对应关系:")
        for prop_id in actual_prop_ids:
            if prop_id in materials:
                mat_name = materials[prop_id].get('name', 'Unknown')
                print(f"     属性{prop_id} -> 材料{prop_id}: {mat_name}")
            else:
                print(f"     属性{prop_id} -> 无对应材料定义")
        
        return {
            'truss_sections': len(truss_sections),
            'line_elements': len(line_elements),
            'materials': len(materials),
            'prop_usage': prop_usage,
            'anchor_candidates': anchor_material_candidates,
            'current_hardcoded_id': current_hardcoded_id,
            'actual_prop_ids': actual_prop_ids
        }
        
    except Exception as e:
        print(f"ERROR: 分析失败: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    result = simple_anchor_analysis()
    if result:
        print("\nSUCCESS: 分析完成")
    else:
        print("\nERROR: 分析失败")