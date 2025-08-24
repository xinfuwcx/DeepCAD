#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建包含边界条件的完整MDPA文件
"""

from pathlib import Path

def parse_fpn_boundary_nodes():
    """解析FPN文件中的边界条件节点"""
    print("🔍 解析FPN文件中的边界条件节点...")
    
    fpn_file = Path('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    
    boundaries = {}
    current_bset = None
    
    with open(fpn_file, 'r', encoding='gb18030') as f:
        lines = f.readlines()
    
    for line in lines:
        line = line.strip()
        if line.startswith('BSET'):
            # 边界条件集合
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 2:
                current_bset = parts[1]
                boundaries[current_bset] = {
                    'name': parts[2] if len(parts) > 2 else f'Boundary_{current_bset}',
                    'constraints': []
                }
        
        elif line.startswith('CONST') and current_bset:
            # 约束条件
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 4:
                bset_id = parts[1]
                node_id = parts[2]
                constraint_code = parts[3]
                
                if bset_id == current_bset:
                    boundaries[current_bset]['constraints'].append({
                        'node': int(node_id),
                        'code': constraint_code
                    })
    
    print(f"✅ 解析完成: {len(boundaries)}个边界条件集")
    
    # 按约束代码分组节点
    boundary_groups = {}
    for bset_id, bset_data in boundaries.items():
        for constraint in bset_data['constraints']:
            code = constraint['code']
            group_name = f"BOUNDARY_{bset_id}_{code}"
            if group_name not in boundary_groups:
                boundary_groups[group_name] = []
            boundary_groups[group_name].append(constraint['node'])
    
    for group_name, nodes in boundary_groups.items():
        print(f"  {group_name}: {len(nodes)}个节点")
    
    return boundary_groups

def create_mdpa_with_boundaries():
    """创建包含边界条件的MDPA文件"""
    print("\n🔧 创建包含边界条件的MDPA文件...")
    
    # 1. 解析边界条件节点
    boundary_groups = parse_fpn_boundary_nodes()
    
    # 2. 读取现有MDPA文件
    source_mdpa = Path("complete_fpn_model_with_all_materials.mdpa")
    if not source_mdpa.exists():
        print("❌ 源MDPA文件不存在")
        return False
    
    print(f"📖 读取源MDPA文件: {source_mdpa}")
    with open(source_mdpa, 'r', encoding='utf-8') as f:
        mdpa_content = f.read()
    
    # 3. 在MDPA文件末尾添加边界条件子模型部分
    new_content = mdpa_content
    
    for group_name, nodes in boundary_groups.items():
        print(f"📝 添加边界条件组: {group_name} ({len(nodes)}个节点)")
        
        # 添加子模型部分
        new_content += f"\n\nBegin SubModelPart {group_name}\n"
        new_content += "  Begin SubModelPartNodes\n"
        
        # 添加节点（每行8个）
        for i in range(0, len(nodes), 8):
            batch = nodes[i:i+8]
            new_content += "    " + " ".join(map(str, batch)) + "\n"
        
        new_content += "  End SubModelPartNodes\n"
        new_content += "  Begin SubModelPartElements\n"
        new_content += "  End SubModelPartElements\n"
        new_content += f"End SubModelPart\n"
    
    # 4. 保存新的MDPA文件
    output_file = Path("complete_fpn_model_with_boundaries.mdpa")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"✅ 包含边界条件的MDPA文件已创建: {output_file}")
    
    # 5. 统计信息
    lines = new_content.split('\n')
    print(f"   总行数: {len(lines):,}")
    print(f"   边界条件组数: {len(boundary_groups)}")
    
    return True

if __name__ == "__main__":
    success = create_mdpa_with_boundaries()
    if success:
        print("\n🎯 包含边界条件的MDPA文件创建成功！")
    else:
        print("\n❌ MDPA文件创建失败！")
