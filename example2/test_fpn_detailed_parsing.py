#!/usr/bin/env python3
"""
测试FPN文件中约束、荷载、边界条件、分析步、物理组等信息的解析情况
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.optimized_fpn_parser import OptimizedFPNParser

def test_fpn_detailed_parsing():
    """测试FPN文件的详细解析"""
    
    fpn_file = "data/两阶段-全锚杆-摩尔库伦.fpn"
    
    if not os.path.exists(fpn_file):
        print(f"❌ FPN文件不存在: {fpn_file}")
        return
    
    print("=== 开始详细解析FPN文件 ===")
    
    # 创建解析器
    parser = OptimizedFPNParser()
    
    # 解析文件
    try:
        fpn_data = parser.parse_file_streaming(fpn_file)
        print(f"✅ FPN文件解析完成")
    except Exception as e:
        print(f"❌ FPN文件解析失败: {e}")
        return
    
    # 1. 检查分析步
    print("\n=== 分析步信息 ===")
    stages = fpn_data.get('analysis_stages', [])
    print(f"分析步数量: {len(stages)}")
    
    for i, stage in enumerate(stages):
        print(f"  分析步{i+1}: ID={stage.get('id')}, 名称='{stage.get('name')}', 类型={stage.get('type')}")
        
        # 检查分析步中的物理组命令
        group_commands = stage.get('group_commands', [])
        if group_commands:
            print(f"    物理组命令数量: {len(group_commands)}")
            for cmd in group_commands[:3]:  # 只显示前3个
                print(f"      {cmd.get('command')}: 组ID={cmd.get('group_ids', [])[:5]}...")
        
        # 检查激活的荷载和边界
        active_loads = stage.get('active_loads', [])
        active_boundaries = stage.get('active_boundaries', [])
        if active_loads:
            print(f"    激活荷载组: {active_loads[:5]}...")
        if active_boundaries:
            print(f"    激活边界组: {active_boundaries[:5]}...")
    
    # 2. 检查物理组（网格集合）
    print("\n=== 物理组（网格集合）信息 ===")
    mesh_sets = fpn_data.get('mesh_sets', {})
    print(f"网格集合数量: {len(mesh_sets)}")
    
    for i, (set_id, set_data) in enumerate(list(mesh_sets.items())[:5]):  # 只显示前5个
        print(f"  集合{i+1}: ID={set_id}, 名称='{set_data.get('name')}', 类型={set_data.get('type')}")
        elements = set_data.get('elements', [])
        nodes = set_data.get('nodes', [])
        if elements:
            print(f"    包含单元: {len(elements)}个 (前5个: {elements[:5]})")
        if nodes:
            print(f"    包含节点: {len(nodes)}个 (前5个: {nodes[:5]})")
    
    # 3. 检查荷载组
    print("\n=== 荷载组信息 ===")
    load_groups = fpn_data.get('load_groups', {})
    print(f"荷载组数量: {len(load_groups)}")
    
    for i, (load_id, load_data) in enumerate(list(load_groups.items())[:5]):  # 只显示前5个
        print(f"  荷载组{i+1}: ID={load_id}, 名称='{load_data.get('name')}', 类型={load_data.get('type')}")
        
        # 检查重力荷载
        gravity = load_data.get('gravity')
        if gravity:
            print(f"    重力荷载: gx={gravity[0]}, gy={gravity[1]}, gz={gravity[2]}")
        
        # 检查包含的节点和单元
        elements = load_data.get('elements', [])
        nodes = load_data.get('nodes', [])
        if elements:
            print(f"    包含单元: {len(elements)}个")
        if nodes:
            print(f"    包含节点: {len(nodes)}个")
    
    # 4. 检查边界组和约束
    print("\n=== 边界组和约束信息 ===")
    boundary_groups = fpn_data.get('boundary_groups', {})
    print(f"边界组数量: {len(boundary_groups)}")
    
    for i, (boundary_id, boundary_data) in enumerate(list(boundary_groups.items())[:5]):  # 只显示前5个
        print(f"  边界组{i+1}: ID={boundary_id}, 名称='{boundary_data.get('name')}', 类型={boundary_data.get('type')}")
        
        # 检查约束
        constraints = boundary_data.get('constraints', [])
        if constraints:
            print(f"    约束数量: {len(constraints)}")
            for j, constraint in enumerate(constraints[:3]):  # 只显示前3个约束
                node = constraint.get('node')
                dof_code = constraint.get('dof_code')
                dof_bools = constraint.get('dof_bools', [])
                dof_names = ['X', 'Y', 'Z', 'RX', 'RY', 'RZ']
                constrained_dofs = [dof_names[k] for k, is_constrained in enumerate(dof_bools) if is_constrained]
                print(f"      约束{j+1}: 节点{node}, DOF代码={dof_code}, 约束自由度={constrained_dofs}")
        
        # 检查包含的节点和单元
        elements = boundary_data.get('elements', [])
        nodes = boundary_data.get('nodes', [])
        if elements:
            print(f"    包含单元: {len(elements)}个")
        if nodes:
            print(f"    包含节点: {len(nodes)}个")
    
    # 5. 检查预应力荷载
    print("\n=== 预应力荷载信息 ===")
    prestress_loads = fpn_data.get('prestress_loads', [])
    print(f"预应力荷载数量: {len(prestress_loads)}")
    
    for i, prestress in enumerate(prestress_loads[:5]):  # 只显示前5个
        print(f"  预应力{i+1}: 组={prestress.get('group')}, 单元ID={prestress.get('element_id')}, 力={prestress.get('force')}N")
    
    # 6. 检查桁架截面属性
    print("\n=== 桁架截面属性信息 ===")
    truss_sections = fpn_data.get('truss_sections', {})
    print(f"桁架截面数量: {len(truss_sections)}")
    
    for i, (prop_id, prop_data) in enumerate(list(truss_sections.items())[:3]):  # 只显示前3个
        print(f"  截面{i+1}: ID={prop_id}, 名称='{prop_data.get('name')}', 面积={prop_data.get('area')}, 直径={prop_data.get('diameter')}")
    
    # 7. 检查板壳属性
    print("\n=== 板壳属性信息 ===")
    shell_properties = fpn_data.get('shell_properties', {})
    print(f"板壳属性数量: {len(shell_properties)}")
    
    for i, (prop_id, prop_data) in enumerate(list(shell_properties.items())[:3]):  # 只显示前3个
        print(f"  板壳{i+1}: ID={prop_id}, 名称='{prop_data.get('name')}', 厚度={prop_data.get('thickness')}")
    
    print("\n=== 详细解析完成 ===")

if __name__ == "__main__":
    test_fpn_detailed_parsing()
