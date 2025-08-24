#!/usr/bin/env python3
"""检查FPN中的embedded约束信息"""

import sys
sys.path.append('.')

from example2.core.optimized_fpn_parser import OptimizedFPNParser

def main():
    print('=== 检查FPN中的embedded约束信息 ===')
    
    parser = OptimizedFPNParser()
    fpn_data = parser.parse_file_streaming('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    
    print('\n1. 材料集合信息:')
    mesh_sets = fpn_data.get('mesh_sets', {})
    for mset_id, mset_data in list(mesh_sets.items())[:10]:
        name = mset_data.get('name', '未知')
        elem_count = len(mset_data.get('elements', []))
        node_count = len(mset_data.get('nodes', []))
        print(f'  MSET {mset_id}: {name} - {elem_count}个单元, {node_count}个节点')
    
    print('\n2. 边界条件组:')
    boundary_groups = fpn_data.get('boundary_groups', {})
    for bg_id, bg_data in list(boundary_groups.items())[:5]:
        constraints = bg_data.get('constraints', [])
        node_count = len(bg_data.get('nodes', []))
        constraint_count = len(constraints)
        print(f'  边界组{bg_id}: {node_count}个节点, {constraint_count}个约束')
        if constraints:
            print(f'    示例约束: {constraints[0]}')
    
    print('\n3. 线单元信息:')
    line_elements = fpn_data.get('line_elements', {})
    print(f'  总计{len(line_elements)}个线单元')
    if line_elements:
        sample_lines = list(line_elements.items())[:3]
        for eid, elem in sample_lines:
            prop_id = elem.get('prop_id')
            n1 = elem.get('n1')
            n2 = elem.get('n2')
            print(f'    线单元{eid}: 属性{prop_id} - 节点[{n1}, {n2}]')
    
    print('\n4. 检查特定的embedded相关信息:')
    # 检查是否有embedded相关的材料集合
    embedded_sets = []
    for mset_id, mset_data in mesh_sets.items():
        name = mset_data.get('name', '').lower()
        if 'embedded' in name or 'anchor' in name or 'line' in name:
            embedded_sets.append((mset_id, mset_data))
    
    if embedded_sets:
        print(f'  找到{len(embedded_sets)}个可能的embedded相关集合:')
        for mset_id, mset_data in embedded_sets:
            name = mset_data.get('name')
            print(f'    MSET {mset_id}: {name}')
    else:
        print('  未找到明确的embedded相关集合')
    
    print('\n5. 分析阶段信息:')
    stages = fpn_data.get('analysis_stages', [])
    print(f'  总计{len(stages)}个分析阶段')
    for stage in stages[:3]:
        stage_id = stage.get('id')
        name = stage.get('name', '未知')
        print(f'    阶段{stage_id}: {name}')

if __name__ == '__main__':
    main()
