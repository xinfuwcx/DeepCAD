#!/usr/bin/env python3
"""
调试第380个自由度对应的节点和约束状态
"""
from pathlib import Path

def analyze_dof_380():
    """分析第380个自由度对应的节点"""
    mdpa_path = Path('two_stage_analysis/two_stage.mdpa')
    text = mdpa_path.read_text(encoding='utf-8', errors='ignore').splitlines()
    
    # 收集节点信息
    nodes = {}  # node_id -> (x, y, z)
    mode = None
    
    for ln in text:
        if ln.startswith('Begin Nodes'):
            mode = 'nodes'
            continue
        if ln.startswith('End Nodes') and mode == 'nodes':
            mode = None
            continue
            
        if mode == 'nodes':
            parts = ln.split()
            if len(parts) >= 4 and parts[0].isdigit():
                try:
                    node_id = int(parts[0])
                    x, y, z = float(parts[1]), float(parts[2]), float(parts[3])
                    nodes[node_id] = (x, y, z)
                except:
                    pass
    
    # 每个节点有3个自由度 (x, y, z)
    # 第380个自由度对应：380 = (node_id-1)*3 + local_dof
    # 所以 node_id = (380-1)//3 + 1 = 126 + 1 = 127
    # local_dof = (380-1)%3 + 1 = 2%3 + 1 = 3 (Z方向)
    target_node_id = (380-1)//3 + 1
    target_dof_local = (380-1)%3 + 1
    
    dof_names = {1: 'X', 2: 'Y', 3: 'Z'}
    
    print(f"第380个自由度分析:")
    print(f"对应节点ID: {target_node_id}")
    print(f"自由度方向: {dof_names[target_dof_local]}")
    
    if target_node_id in nodes:
        x, y, z = nodes[target_node_id]
        print(f"节点坐标: ({x:.3f}, {y:.3f}, {z:.3f})")
    else:
        print("节点不存在！")
        return
    
    # 检查该节点是否在约束子模型中
    submodel_nodes = {}
    current_smp = None
    mode = None
    
    for ln in text:
        if ln.startswith('Begin SubModelPart '):
            current_smp = ln.split()[2]
            submodel_nodes[current_smp] = set()
            mode = None
            continue
        if ln.startswith('End SubModelPart'):
            current_smp = None
            continue
        if ln.strip() == 'Begin SubModelPartNodes':
            mode = 'smp_nodes'
            continue
        if ln.strip() == 'End SubModelPartNodes':
            mode = None
            continue
            
        if mode == 'smp_nodes' and current_smp:
            parts = ln.split()
            for p in parts:
                if p.isdigit():
                    submodel_nodes[current_smp].add(int(p))
    
    print(f"\n节点 {target_node_id} 所属子模型:")
    for smp_name, node_set in submodel_nodes.items():
        if target_node_id in node_set:
            print(f"  - {smp_name}")
    
    # 检查该节点是否被单元引用
    element_nodes = set()
    mode = None
    
    for ln in text:
        if ln.startswith('Begin Elements'):
            mode = 'elements'
            continue
        if ln.startswith('End Elements') and mode == 'elements':
            mode = None
            continue
            
        if mode == 'elements':
            parts = ln.split()
            if len(parts) >= 4 and parts[0].isdigit():
                try:
                    # 单元行格式: id prop n1 n2 [n3 n4]
                    node_ids = list(map(int, parts[2:]))
                    element_nodes.update(node_ids)
                except:
                    pass
    
    if target_node_id in element_nodes:
        print(f"节点 {target_node_id} 被单元引用: 是")
    else:
        print(f"节点 {target_node_id} 被单元引用: 否 (可能是孤立节点)")
    
    # 分析周围节点的详细信息
    print(f"\n节点 {target_node_id} 周围节点详细信息:")
    print("NodeID | X坐标 | Y坐标 | Z坐标 | 被单元引用 | 约束子模型")
    print("-" * 70)
    
    for nid in range(max(1, target_node_id-5), target_node_id+6):
        if nid in nodes:
            x, y, z = nodes[nid]
            in_elements = "是" if nid in element_nodes else "否"
            
            constraints = []
            for smp_name, node_set in submodel_nodes.items():
                if nid in node_set and ('SUPPORT' in smp_name or 'ANCHOR_ENDS' in smp_name or 'BOUNDARY' in smp_name):
                    constraints.append(smp_name)
            
            constraint_str = ", ".join(constraints) if constraints else "无"
            marker = " <<<" if nid == target_node_id else ""
            print(f"{nid:6d} | {x:5.1f} | {y:5.1f} | {z:5.1f} | {in_elements:8s} | {constraint_str}{marker}")
        else:
            marker = " <<<" if nid == target_node_id else ""
            print(f"{nid:6d} | 不存在{marker}")

if __name__ == "__main__":
    analyze_dof_380()
