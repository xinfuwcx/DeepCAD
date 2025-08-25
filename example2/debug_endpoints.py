#!/usr/bin/env python3
"""调试脚本：分析锚杆端点和距离分布"""

import sys
import os
from pathlib import Path
import math

# 添加路径
sys.path.append('.')

from core.optimized_fpn_parser import OptimizedFPNParser
from core.kratos_interface import KratosInterface

def debug_endpoints():
    print("=== 锚杆端点调试 ===")
    
    # 1. 解析FPN文件
    print("1. 解析FPN文件...")
    fpn_path = 'data/两阶段-全锚杆-摩尔库伦.fpn'
    parser = OptimizedFPNParser()
    fpn_data = parser.parse_file_streaming(fpn_path)
    
    # 2. 创建接口并转换数据
    print("2. 转换数据...")
    ki = KratosInterface()
    ki.source_fpn_data = fpn_data
    kratos_data = ki._convert_fpn_to_kratos(fpn_data)
    ki.model_data = kratos_data
    
    # 3. 手动执行端点分析
    print("3. 分析锚杆端点...")
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
    
    # 构建锚杆拓扑图
    print("4. 构建锚杆拓扑...")
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
    
    # 计算节点度数
    from collections import defaultdict
    anchor_adj = defaultdict(set)
    for a, b in anchor_edges:
        anchor_adj[a].add(b)
        anchor_adj[b].add(a)
    
    anchor_endpoints_all = {n for n in anchor_adj.keys() if len(anchor_adj[n]) == 1}
    
    print(f"锚杆拓扑结果:")
    print(f"  边数: {len(anchor_edges)}")
    print(f"  节点总数: {len(anchor_nodes_all)}")
    print(f"  端点数: {len(anchor_endpoints_all)}")
    print(f"  预期锚杆根数: {len(anchor_endpoints_all) // 2}")
    
    # 5. 分析地连墙节点
    print("5. 识别地连墙节点...")
    shell_nodes = set()
    for el in all_elements:
        et = el.get('type')
        nids = el.get('nodes') or []
        if et in ('Triangle2D3N', 'Quadrilateral2D4N', 'ShellThinElementCorotational3D3N', 
                 'TriangleElement2D3N', 'ShellThickElement3D3N', 'ShellElement3D3N'):
            shell_nodes.update(int(x) for x in nids if x is not None)
    
    print(f"地连墙节点数: {len(shell_nodes)}")
    
    # 6. 距离分析
    print("6. 端点到地连墙距离分析...")
    shell_list = list(shell_nodes)
    
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
    
    # 距离统计
    distance_count = {
        "<=0.5m": 0, "<=1m": 0, "<=2m": 0, "<=5m": 0, "<=10m": 0, ">10m": 0
    }
    
    close_endpoints = []
    
    for tn in anchor_endpoints_all:
        p = node_xyz.get(tn)
        if not p or not shell_list:
            continue
        neighs = k_nearest(shell_list, p, 1)
        if not neighs:
            continue
            
        min_dist = neighs[0][1]
        if min_dist <= 0.5: 
            distance_count["<=0.5m"] += 1
            close_endpoints.append((tn, min_dist))
        elif min_dist <= 1: 
            distance_count["<=1m"] += 1
            close_endpoints.append((tn, min_dist))
        elif min_dist <= 2: 
            distance_count["<=2m"] += 1
        elif min_dist <= 5: 
            distance_count["<=5m"] += 1
        elif min_dist <= 10: 
            distance_count["<=10m"] += 1
        else: 
            distance_count[">10m"] += 1
    
    print(f"端点距离统计:")
    for range_name, count in distance_count.items():
        print(f"  {range_name}: {count} 个端点")
    
    print(f"前10个最近的端点:")
    close_endpoints.sort(key=lambda x: x[1])
    for i, (nid, dist) in enumerate(close_endpoints[:10]):
        coord = node_xyz.get(nid)
        print(f"  端点{nid}: 距离={dist:.2f}m, 坐标={coord}")
    
    return len(anchor_endpoints_all), distance_count

if __name__ == "__main__":
    debug_endpoints()