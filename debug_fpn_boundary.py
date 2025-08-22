#!/usr/bin/env python3
"""调试FPN边界条件解析"""

from example2.core.optimized_fpn_parser import OptimizedFPNParser

def debug_fpn_boundary_conditions():
    """调试FPN边界条件解析"""
    
    print("🔍 开始调试FPN边界条件解析...")
    
    parser = OptimizedFPNParser()
    result = parser.parse_file_streaming('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    
    print("\n=== FPN边界条件解析结果 ===")
    
    # 1. 边界组信息
    boundary_groups = result.get('boundary_groups', {})
    print(f"\n📋 边界组数量: {len(boundary_groups)}")
    
    for gid, group in boundary_groups.items():
        nodes = group.get('nodes', [])
        constraints = group.get('constraints', [])
        print(f"\n  🔸 组{gid}:")
        print(f"     节点数: {len(nodes)}")
        print(f"     约束数: {len(constraints)}")
        
        if nodes:
            print(f"     节点范围: {min(nodes)} - {max(nodes)}")
            
        if constraints:
            # 分析DOF码
            dof_codes = [c.get('dof_code', '') for c in constraints]
            unique_codes = list(set(dof_codes))
            print(f"     DOF码类型: {unique_codes}")
            
            # 显示前几个约束详情
            for i, c in enumerate(constraints[:3]):
                node = c.get('node') or c.get('node_id')
                dof_code = c.get('dof_code', '')
                dof_bools = c.get('dof_bools', [])
                print(f"       约束{i+1}: 节点{node}, DOF码={dof_code}, 布尔={dof_bools}")
    
    # 2. 分析阶段信息
    analysis_stages = result.get('analysis_stages', [])
    print(f"\n📋 分析阶段数量: {len(analysis_stages)}")
    
    for i, stage in enumerate(analysis_stages):
        print(f"\n  🔸 阶段{i+1}:")
        group_commands = stage.get('group_commands', [])
        print(f"     组命令数: {len(group_commands)}")
        
        badd_commands = [cmd for cmd in group_commands if cmd.get('command') == 'BADD']
        if badd_commands:
            print(f"     BADD命令数: {len(badd_commands)}")
            for cmd in badd_commands:
                group_ids = cmd.get('group_ids', [])
                boundaries = cmd.get('boundaries', [])
                print(f"       BADD: 组ID={group_ids}, 边界={boundaries}")
    
    # 3. 检查边界组与BADD的对应关系
    print(f"\n📋 边界组与BADD对应关系检查:")
    
    # 从第一阶段获取BADD组
    if analysis_stages:
        stage1 = analysis_stages[0]
        badd_groups = set()
        for cmd in stage1.get('group_commands', []):
            if cmd.get('command') == 'BADD':
                badd_groups.update(cmd.get('group_ids', []))
        
        print(f"   阶段1 BADD组: {sorted(badd_groups)}")
        print(f"   实际边界组: {sorted(boundary_groups.keys())}")
        
        # 检查映射
        existing_ids = set(boundary_groups.keys())
        matched = badd_groups & existing_ids
        unmatched_badd = badd_groups - existing_ids
        unmatched_boundary = existing_ids - badd_groups
        
        print(f"   匹配的组: {sorted(matched)}")
        if unmatched_badd:
            print(f"   ⚠️  BADD中但边界组中不存在: {sorted(unmatched_badd)}")
        if unmatched_boundary:
            print(f"   ⚠️  边界组中但BADD中不存在: {sorted(unmatched_boundary)}")
    
    # 4. 检查约束类型分布
    print(f"\n📋 约束类型分布:")
    
    all_dof_codes = []
    for group in boundary_groups.values():
        for c in group.get('constraints', []):
            all_dof_codes.append(c.get('dof_code', ''))
    
    if all_dof_codes:
        from collections import Counter
        code_counts = Counter(all_dof_codes)
        print(f"   DOF码统计:")
        for code, count in code_counts.most_common():
            # 解析DOF码含义
            if len(code) >= 6:
                x = '✓' if code[0] == '1' else '✗'
                y = '✓' if code[1] == '1' else '✗'
                z = '✓' if code[2] == '1' else '✗'
                rx = '✓' if code[3] == '1' else '✗'
                ry = '✓' if code[4] == '1' else '✗'
                rz = '✓' if code[5] == '1' else '✗'
                print(f"     {code}: {count}个 (X:{x} Y:{y} Z:{z} RX:{rx} RY:{ry} RZ:{rz})")
            else:
                print(f"     {code}: {count}个 (格式异常)")
    
    return result

if __name__ == "__main__":
    result = debug_fpn_boundary_conditions()
    print(f"\n🎯 调试完成")
