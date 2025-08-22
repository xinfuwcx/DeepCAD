#!/usr/bin/env python3
"""调试FPN边界条件解析"""

from example2.core.optimized_fpn_parser import OptimizedFPNParser

def debug_boundary_conditions():
    parser = OptimizedFPNParser()
    result = parser.parse_file_streaming('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    
    print("=== FPN边界条件解析结果 ===")
    
    # 边界组
    boundary_groups = result.get('boundary_groups', {})
    print(f"\n📋 边界组数量: {len(boundary_groups)}")
    for gid, group in boundary_groups.items():
        nodes = group.get('nodes', [])
        constraints = group.get('constraints', [])
        print(f"  组{gid}: {len(nodes)}个节点, {len(constraints)}个约束")
        if constraints:
            # 显示前几个约束的DOF码
            sample_dofs = [c.get('dof_code', '') for c in constraints[:3]]
            print(f"    样本DOF码: {sample_dofs}")
    
    # 分析阶段
    stages = result.get('analysis_stages', [])
    print(f"\n🎯 分析阶段数量: {len(stages)}")
    for i, stage in enumerate(stages):
        stage_id = stage.get('id', i+1)
        active_boundaries = stage.get('active_boundaries', [])
        print(f"  阶段{stage_id}: active_boundaries={active_boundaries}")
        
        # 组命令
        for cmd in stage.get('group_commands', []):
            if cmd.get('command') == 'BADD':
                group_ids = cmd.get('group_ids', [])
                print(f"    BADD命令: group_ids={group_ids}")

if __name__ == "__main__":
    debug_boundary_conditions()
