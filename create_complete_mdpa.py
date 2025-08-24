#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建包含所有材料的完整MDPA文件
"""

import sys
import json
from pathlib import Path

def analyze_fpn_elements():
    """分析FPN文件中的单元分布"""
    print("🔍 分析FPN文件中的单元分布...")
    
    sys.path.insert(0, 'example2')
    from core.optimized_fpn_parser import OptimizedFPNParser
    
    fpn_file = Path('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    parser = OptimizedFPNParser()
    fpn_data = parser.parse_file_streaming(str(fpn_file))
    
    elements = fpn_data.get('elements', {})
    print(f"总单元数: {len(elements):,}")

    # 统计每种材料的单元数量
    material_counts = {}
    material_elements = {}

    # 处理不同的数据结构
    if isinstance(elements, dict):
        # 字典格式
        for elem_id, elem_data in elements.items():
            mat_id = elem_data.get('material_id', 0)
            if mat_id not in material_counts:
                material_counts[mat_id] = 0
                material_elements[mat_id] = []
            material_counts[mat_id] += 1
            material_elements[mat_id].append(elem_id)
    elif isinstance(elements, list):
        # 列表格式
        for i, elem_data in enumerate(elements):
            elem_id = elem_data.get('id', i+1)
            mat_id = elem_data.get('material_id', 0)
            if mat_id not in material_counts:
                material_counts[mat_id] = 0
                material_elements[mat_id] = []
            material_counts[mat_id] += 1
            material_elements[mat_id].append(elem_id)
    
    print("\n📊 材料单元分布:")
    materials = fpn_data.get('materials', {})
    for mat_id in sorted(material_counts.keys()):
        count = material_counts[mat_id]
        mat_name = materials.get(mat_id, {}).get('name', f'Material_{mat_id}')
        print(f"  材料{mat_id} ({mat_name}): {count:,}个单元")
        
        # 显示前几个单元ID
        sample_elements = material_elements[mat_id][:5]
        print(f"    示例单元: {sample_elements}")
    
    return fpn_data, material_elements

def create_complete_mdpa_file():
    """创建包含所有材料的完整MDPA文件"""
    print("\n🔧 创建完整MDPA文件...")
    
    # 1. 分析FPN数据
    fpn_data, material_elements = analyze_fpn_elements()
    
    # 2. 读取现有MDPA文件作为基础
    source_mdpa = Path("multi_stage_kratos_conversion/stage_1/stage_1_analysis.mdpa")
    if not source_mdpa.exists():
        print("❌ 源MDPA文件不存在")
        return False
    
    print(f"📖 读取源MDPA文件: {source_mdpa}")
    with open(source_mdpa, 'r', encoding='utf-8') as f:
        mdpa_content = f.read()
    
    # 3. 分析现有MDPA文件结构
    lines = mdpa_content.split('\n')
    
    # 找到Elements部分的结束位置
    elements_end_idx = -1
    for i, line in enumerate(lines):
        if line.strip() == "End Elements":
            elements_end_idx = i
            break
    
    if elements_end_idx == -1:
        print("❌ 未找到Elements结束标记")
        return False
    
    # 4. 创建新的MDPA内容
    new_lines = lines[:elements_end_idx + 1]  # 保留到Elements结束
    
    # 5. 添加缺失的材料子模型部分
    missing_materials = [1, 13]  # C30混凝土和锚杆
    
    elements = fpn_data.get('elements', {})
    nodes = fpn_data.get('nodes', {})
    
    for mat_id in missing_materials:
        if mat_id not in material_elements:
            print(f"⚠️ 材料{mat_id}在FPN中没有对应单元")
            continue
            
        mat_elements = material_elements[mat_id]
        print(f"📝 添加材料{mat_id}子模型部分，包含{len(mat_elements)}个单元")
        
        # 添加子模型部分头部
        new_lines.append("")
        new_lines.append(f"Begin SubModelPart MAT_{mat_id}")
        new_lines.append("  Begin SubModelPartNodes")
        
        # 收集该材料所有单元的节点
        mat_nodes = set()
        for elem_id in mat_elements:
            if isinstance(elements, dict):
                elem_data = elements.get(elem_id, {})
            else:
                # 列表格式，需要找到对应的元素
                elem_data = {}
                for elem in elements:
                    if elem.get('id', 0) == elem_id:
                        elem_data = elem
                        break
            elem_nodes = elem_data.get('nodes', [])
            mat_nodes.update(elem_nodes)
        
        # 添加节点（每行8个）
        mat_nodes_list = sorted(mat_nodes)
        for i in range(0, len(mat_nodes_list), 8):
            batch = mat_nodes_list[i:i+8]
            new_lines.append("    " + " ".join(map(str, batch)))
        
        new_lines.append("  End SubModelPartNodes")
        new_lines.append("  Begin SubModelPartElements")
        
        # 添加单元（每行8个）
        for i in range(0, len(mat_elements), 8):
            batch = mat_elements[i:i+8]
            new_lines.append("    " + " ".join(map(str, batch)))
        
        new_lines.append("  End SubModelPartElements")
        new_lines.append("End SubModelPart")
    
    # 6. 添加剩余的原始内容（从第一个SubModelPart开始）
    submodel_start_idx = -1
    for i, line in enumerate(lines):
        if line.strip().startswith("Begin SubModelPart"):
            submodel_start_idx = i
            break
    
    if submodel_start_idx != -1:
        new_lines.extend(lines[submodel_start_idx:])
    
    # 7. 保存新的MDPA文件
    output_file = Path("complete_fpn_model_with_all_materials.mdpa")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines))
    
    print(f"✅ 完整MDPA文件已创建: {output_file}")
    print(f"   总行数: {len(new_lines):,}")
    
    return True

if __name__ == "__main__":
    success = create_complete_mdpa_file()
    if success:
        print("\n🎯 完整MDPA文件创建成功！")
    else:
        print("\n❌ 完整MDPA文件创建失败！")
