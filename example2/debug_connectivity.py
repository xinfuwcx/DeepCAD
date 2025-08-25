#!/usr/bin/env python3
"""调试连通分量算法"""

import sys
import os
from pathlib import Path

# 添加路径
sys.path.append('.')

from core.optimized_fpn_parser import OptimizedFPNParser
from core.kratos_interface import KratosInterface

def debug_connectivity():
    """调试连通分量分析"""
    print("=== 连通分量调试 ===")
    
    # 快速加载数据
    fpn_path = 'data/两阶段-全锚杆-摩尔库伦.fpn'
    parser = OptimizedFPNParser()
    fpn_data = parser.parse_file_streaming(fpn_path)

    ki = KratosInterface()
    ki.source_fpn_data = fpn_data
    kratos_data = ki._convert_fpn_to_kratos(fpn_data)
    ki.model_data = kratos_data
    
    # 手动执行端点识别部分
    md = ki.model_data or {}
    all_nodes = md.get('nodes') or []
    all_elements = md.get('elements') or []
    nodes_list = list(all_nodes.values()) if isinstance(all_nodes, dict) else list(all_nodes)
    
    # 节点坐标映射
    node_xyz = {}
    for n in nodes_list:
        try:
            node_xyz[int(n['id'])] = tuple(map(float, n['coordinates']))
        except Exception:
            continue
    
    print(f"总节点数: {len(node_xyz)}")
    
    # 构建锚杆拓扑图
    anchor_edges = []
    anchor_nodes_all = set()
    
    for el in all_elements:
        if el.get('type') == 'TrussElement3D2N' and int(el.get('material_id', 0)) == 13:
            nids = el.get('nodes') or []
            if len(nids) == 2:
                n1, n2 = int(nids[0]), int(nids[1])
                if n1 != n2:
                    anchor_edges.append((n1, n2))
                    anchor_nodes_all.add(n1)
                    anchor_nodes_all.add(n2)
    
    print(f"锚杆边数: {len(anchor_edges)}")
    print(f"锚杆节点数: {len(anchor_nodes_all)}")
    
    # 构建邻接图
    from collections import defaultdict
    anchor_adj = defaultdict(set)
    for a, b in anchor_edges:
        anchor_adj[a].add(b)
        anchor_adj[b].add(a)
    
    # 识别端点
    anchor_endpoints_all = {n for n in anchor_adj.keys() if len(anchor_adj[n]) == 1}
    print(f"端点数: {len(anchor_endpoints_all)}")
    print(f"预期锚杆根数: {len(anchor_endpoints_all) // 2}")
    
    # 测试连通分量分析
    print("\n=== 连通分量分析测试 ===")
    visited_endpoints = set()
    anchor_chains = []
    
    for endpoint in list(anchor_endpoints_all)[:10]:  # 只测试前10个端点
        if endpoint in visited_endpoints:
            continue
            
        print(f"\n处理端点: {endpoint}")
        
        # BFS遍历找到这根锚杆的所有节点
        chain_nodes = []
        queue = [endpoint]
        chain_visited = set()
        
        while queue:
            current = queue.pop(0)
            if current in chain_visited:
                continue
            chain_visited.add(current)
            chain_nodes.append(current)
            
            # 添加邻居节点
            neighbors = anchor_adj[current]
            print(f"  节点{current}的邻居: {list(neighbors)}")
            
            for neighbor in neighbors:
                if neighbor not in chain_visited:
                    queue.append(neighbor)
        
        # 提取这条链的端点
        chain_endpoints = [n for n in chain_nodes if len(anchor_adj[n]) == 1]
        print(f"  链节点数: {len(chain_nodes)}")
        print(f"  链端点: {chain_endpoints}")
        
        if len(chain_endpoints) >= 1:
            anchor_chains.append(chain_endpoints)
            visited_endpoints.update(chain_endpoints)
    
    print(f"\n测试结果: 识别到{len(anchor_chains)}个连通分量")
    for i, chain in enumerate(anchor_chains):
        print(f"  分量{i}: {len(chain)}个端点 - {chain}")
    
    # 检查地连墙节点
    print("\n=== 地连墙节点检查 ===")
    shell_nodes = set()
    for el in all_elements:
        et = el.get('type')
        nids = el.get('nodes') or []
        if et in ('Triangle2D3N', 'Quadrilateral2D4N', 'ShellThinElementCorotational3D3N', 
                 'TriangleElement2D3N', 'ShellThickElement3D3N', 'ShellElement3D3N'):
            shell_nodes.update(int(x) for x in nids if x is not None)
    
    print(f"地连墙节点数: {len(shell_nodes)}")
    
    # 检查距离
    if len(anchor_chains) > 0 and len(shell_nodes) > 0:
        print(f"\n=== 距离检查 ===")
        shell_list = list(shell_nodes)
        
        import math
        def k_nearest(candidates, pt, k):
            items = []
            px, py, pz = pt
            for cid in candidates:
                c = node_xyz.get(cid)
                if not c:
                    continue
                dx = c[0]-px; dy = c[1]-py; dz = c[2]-pz
                d = math.sqrt(dx*dx+dy*dy+dz*dz)
                items.append((cid, d))
            items.sort(key=lambda x: x[1])
            return items[:max(1, k)]
        
        # 测试前3个链的距离
        for i, chain_endpoints in enumerate(anchor_chains[:3]):
            if len(chain_endpoints) == 0:
                continue
                
            best_distance = float('inf')
            best_endpoint = None
            
            for endpoint in chain_endpoints:
                p = node_xyz.get(endpoint)
                if not p:
                    continue
                    
                neighs = k_nearest(shell_list, p, 1)
                if neighs:
                    min_dist = neighs[0][1]
                    if min_dist < best_distance:
                        best_distance = min_dist
                        best_endpoint = endpoint
            
            print(f"  分量{i}: 最佳端点{best_endpoint}, 距离={best_distance:.2f}m")

if __name__ == "__main__":
    debug_connectivity()