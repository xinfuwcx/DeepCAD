#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
详细分析FPN文件的两阶段逻辑、边界条件和载荷
"""

import sys
from pathlib import Path

def analyze_fpn_stages_and_boundaries():
    """详细分析FPN文件的阶段、边界条件和载荷"""
    print("🔍 详细分析FPN文件的两阶段逻辑")
    print("=" * 80)
    
    sys.path.insert(0, 'example2')
    from core.optimized_fpn_parser import OptimizedFPNParser
    
    fpn_file = Path('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    parser = OptimizedFPNParser()
    fpn_data = parser.parse_file_streaming(str(fpn_file))
    
    print(f"📊 基本信息:")
    print(f"   节点数量: {len(fpn_data.get('nodes', {})):,}")
    print(f"   单元数量: {len(fpn_data.get('elements', {})):,}")
    print(f"   材料数量: {len(fpn_data.get('materials', {}))}")
    print(f"   载荷数量: {len(fpn_data.get('loads', {}))}")
    print(f"   边界条件数量: {len(fpn_data.get('boundary_conditions', {}))}")
    print(f"   分析阶段数量: {len(fpn_data.get('analysis_stages', []))}")
    
    # 分析材料
    print(f"\n🔧 材料详细分析:")
    materials = fpn_data.get('materials', {})
    for mat_id in sorted(materials.keys()):
        mat_data = materials[mat_id]
        name = mat_data.get('name', f'Material_{mat_id}')
        properties = mat_data.get('properties', {})
        E = properties.get('E', 0)
        
        print(f"   材料{mat_id}: {name}")
        if E > 100e9:
            print(f"     -> 钢材 (E={E/1e9:.0f}GPa) - 可能是锚杆")
        elif E > 20e9:
            print(f"     -> 混凝土 (E={E/1e9:.0f}GPa) - 可能是地连墙/隧道内衬")
        else:
            print(f"     -> 土层 (E={E/1e6:.0f}MPa)")
    
    # 分析载荷
    print(f"\n📐 载荷详细分析:")
    loads = fpn_data.get('loads', {})
    if loads:
        for load_id, load_data in loads.items():
            print(f"   载荷{load_id}: {load_data}")
    else:
        print("   无载荷定义")
    
    # 分析边界条件
    print(f"\n🔒 边界条件详细分析:")
    boundaries = fpn_data.get('boundary_conditions', {})
    if boundaries:
        for bc_id, bc_data in boundaries.items():
            print(f"   边界条件{bc_id}: {bc_data}")
    else:
        print("   无边界条件定义")
    
    # 详细分析每个阶段
    print(f"\n🎯 阶段详细分析:")
    stages = fpn_data.get('analysis_stages', [])
    
    for i, stage in enumerate(stages, 1):
        stage_name = stage.get('name', f'Stage_{i}')
        stage_id = stage.get('id', i)
        stage_type = stage.get('type', 0)
        
        print(f"\n--- 阶段{i}: {stage_name} (ID={stage_id}, Type={stage_type}) ---")
        
        # 分析阶段命令
        commands = stage.get('commands', [])
        print(f"   命令数量: {len(commands)}")
        
        # 统计不同类型的命令
        command_stats = {}
        material_operations = {'MADD': [], 'MDEL': []}
        load_operations = {'LADD': [], 'LDEL': []}
        boundary_operations = {'BADD': [], 'BDEL': []}
        
        for cmd in commands:
            cmd_type = cmd.get('type', 'UNKNOWN')
            if cmd_type not in command_stats:
                command_stats[cmd_type] = 0
            command_stats[cmd_type] += 1
            
            # 收集具体操作
            if cmd_type in ['MADD', 'MDEL']:
                groups = cmd.get('groups', [])
                material_operations[cmd_type].extend(groups)
            elif cmd_type in ['LADD', 'LDEL']:
                groups = cmd.get('groups', [])
                load_operations[cmd_type].extend(groups)
            elif cmd_type in ['BADD', 'BDEL']:
                groups = cmd.get('groups', [])
                boundary_operations[cmd_type].extend(groups)
        
        print(f"   命令统计: {command_stats}")
        
        # 分析材料操作
        if material_operations['MADD'] or material_operations['MDEL']:
            print(f"   材料操作:")
            if material_operations['MADD']:
                print(f"     激活材料组: {material_operations['MADD']}")
            if material_operations['MDEL']:
                print(f"     失活材料组: {material_operations['MDEL']}")
        
        # 分析载荷操作
        if load_operations['LADD'] or load_operations['LDEL']:
            print(f"   载荷操作:")
            if load_operations['LADD']:
                print(f"     激活载荷组: {load_operations['LADD']}")
            if load_operations['LDEL']:
                print(f"     失活载荷组: {load_operations['LDEL']}")
        
        # 分析边界操作
        if boundary_operations['BADD'] or boundary_operations['BDEL']:
            print(f"   边界操作:")
            if boundary_operations['BADD']:
                print(f"     激活边界组: {boundary_operations['BADD']}")
            if boundary_operations['BDEL']:
                print(f"     失活边界组: {boundary_operations['BDEL']}")
    
    # 分析工程逻辑
    print(f"\n🏗️ 工程逻辑分析:")
    if len(stages) == 2:
        stage1 = stages[0]
        stage2 = stages[1]
        
        print(f"   阶段1 ({stage1.get('name', 'Stage_1')}):")
        print(f"     -> 这应该是初始地应力平衡分析")
        print(f"     -> 只激活土层材料，建立初始应力状态")
        
        print(f"   阶段2 ({stage2.get('name', 'Stage_2')}):")
        print(f"     -> 这应该是开挖和支护结构分析")
        print(f"     -> 开挖部分土体，激活地连墙和锚杆")
    
    return fpn_data

def analyze_element_groups():
    """分析单元组分布"""
    print(f"\n📊 单元组分布分析:")
    
    sys.path.insert(0, 'example2')
    from core.optimized_fpn_parser import OptimizedFPNParser
    
    fpn_file = Path('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    parser = OptimizedFPNParser()
    fpn_data = parser.parse_file_streaming(str(fpn_file))
    
    # 检查是否有element_groups信息
    element_groups = fpn_data.get('element_groups', {})
    if element_groups:
        print(f"   发现{len(element_groups)}个单元组:")
        for group_id, group_data in element_groups.items():
            elements = group_data.get('elements', [])
            print(f"     组{group_id}: {len(elements)}个单元")
    else:
        print("   未找到单元组信息")
    
    # 检查node_groups
    node_groups = fpn_data.get('node_groups', {})
    if node_groups:
        print(f"   发现{len(node_groups)}个节点组:")
        for group_id, group_data in node_groups.items():
            nodes = group_data.get('nodes', [])
            print(f"     组{group_id}: {len(nodes)}个节点")
    else:
        print("   未找到节点组信息")

if __name__ == "__main__":
    fpn_data = analyze_fpn_stages_and_boundaries()
    analyze_element_groups()
    
    print(f"\n🎯 结论:")
    print(f"   1. 这确实是一个两阶段分析")
    print(f"   2. 阶段1: 初始地应力平衡 (只有土层)")
    print(f"   3. 阶段2: 开挖+支护结构 (土层+地连墙+锚杆)")
    print(f"   4. 需要正确解析FPN中的载荷和边界条件")
    print(f"   5. 需要按阶段正确激活/失活材料组")
