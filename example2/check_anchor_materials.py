#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查锚杆材料分组
"""

import sys
import os
from pathlib import Path

# 设置环境
os.environ['QT_OPENGL'] = 'software'
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def check_anchor_materials():
    """检查锚杆材料分组"""
    print("🔍 检查锚杆材料分组")
    print("=" * 50)
    
    try:
        # 1. 创建QApplication
        from PyQt6.QtWidgets import QApplication
        app = QApplication([])
        
        # 2. 加载FPN数据
        print("📋 加载FPN数据...")
        from optimized_fpn_parser import OptimizedFPNParser
        parser = OptimizedFPNParser()
        
        fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        fpn_data = parser.parse_file_streaming(str(fpn_file))
        
        # 3. 检查线单元和材料
        line_elements = fpn_data.get('line_elements', {})
        materials = fpn_data.get('materials', {})
        truss_sections = fpn_data.get('truss_sections', {})
        
        print(f"✅ 线单元数量: {len(line_elements):,}")
        print(f"✅ 材料数量: {len(materials):,}")
        print(f"✅ 桁架截面数量: {len(truss_sections):,}")
        
        # 4. 分析线单元的属性分布
        prop_distribution = {}
        for eid, elem in line_elements.items():
            prop_id = elem.get('prop_id')
            if prop_id not in prop_distribution:
                prop_distribution[prop_id] = 0
            prop_distribution[prop_id] += 1
        
        print(f"\n📊 线单元属性分布:")
        for prop_id, count in sorted(prop_distribution.items()):
            print(f"  属性{prop_id}: {count:,} 个线单元")
        
        # 5. 检查桁架截面属性
        print(f"\n🔗 桁架截面属性:")
        for prop_id, section in truss_sections.items():
            name = section.get('name', '')
            material_id = section.get('material_id')
            print(f"  属性{prop_id}: {name} (材料{material_id})")
        
        # 6. 检查材料信息
        print(f"\n📋 材料信息:")
        anchor_materials = {}
        for mat_id, material in materials.items():
            name = material.get('name', '').lower()
            if any(keyword in name for keyword in ['anchor', 'truss', '锚', '杆', 'cable']):
                anchor_materials[mat_id] = material
                print(f"  材料{mat_id}: {material.get('name', '')} (锚杆相关)")
        
        # 7. 基于材料名称推断锚固段
        bonded_materials = set()
        free_materials = set()
        
        for mat_id, material in anchor_materials.items():
            name = material.get('name', '').lower()
            if any(keyword in name for keyword in ['bond', '锚固', 'grouted', 'fixed']):
                bonded_materials.add(mat_id)
                print(f"  🔒 锚固段材料: {mat_id} - {material.get('name', '')}")
            elif any(keyword in name for keyword in ['free', '自由', 'unbonded']):
                free_materials.add(mat_id)
                print(f"  🆓 自由段材料: {mat_id} - {material.get('name', '')}")
        
        # 8. 如果没有明确的材料分类，基于属性ID推断
        if not bonded_materials and not free_materials:
            print(f"\n💡 基于属性ID推断锚杆分段:")
            
            # 检查桁架截面的材料分布
            prop_materials = {}
            for prop_id, section in truss_sections.items():
                mat_id = section.get('material_id')
                if mat_id:
                    prop_materials[prop_id] = mat_id
            
            # 统计每个材料对应的线单元数量
            material_element_count = {}
            for eid, elem in line_elements.items():
                prop_id = elem.get('prop_id')
                mat_id = prop_materials.get(prop_id)
                if mat_id:
                    if mat_id not in material_element_count:
                        material_element_count[mat_id] = 0
                    material_element_count[mat_id] += 1
            
            print(f"  材料-单元分布:")
            for mat_id, count in sorted(material_element_count.items()):
                mat_name = materials.get(mat_id, {}).get('name', '未知')
                print(f"    材料{mat_id} ({mat_name}): {count:,} 个线单元")
        
        # 9. 总结建议
        print(f"\n💡 约束设置建议:")
        
        if bonded_materials:
            print(f"  ✅ 发现锚固段材料: {sorted(bonded_materials)}")
            print(f"  建议: 对这些材料的线单元节点设置土体embedded约束")
        
        if free_materials:
            print(f"  ✅ 发现自由段材料: {sorted(free_materials)}")
            print(f"  建议: 对这些材料的线单元端部节点设置地连墙MPC约束")
        
        if not bonded_materials and not free_materials:
            print(f"  ⚠️ 未发现明确的材料分类")
            print(f"  建议: 基于几何位置或单元数量推断分段")
        
        return {
            'line_elements': len(line_elements),
            'prop_distribution': prop_distribution,
            'anchor_materials': anchor_materials,
            'bonded_materials': bonded_materials,
            'free_materials': free_materials,
            'prop_materials': prop_materials if 'prop_materials' in locals() else {}
        }
        
    except Exception as e:
        print(f"❌ 检查失败: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    result = check_anchor_materials()
    if result:
        print(f"\n🎉 锚杆材料分组检查完成！")
    else:
        print(f"\n❌ 锚杆材料分组检查失败！")
