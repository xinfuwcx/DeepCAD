#!/usr/bin/env python3
"""检查网格质量"""

import numpy as np
from pathlib import Path

def read_mdpa_nodes(mdpa_file):
    """读取MDPA文件中的节点"""
    nodes = {}
    
    with open(mdpa_file, 'r') as f:
        lines = f.readlines()
    
    reading_nodes = False
    for line in lines:
        line = line.strip()
        
        if line.startswith('Begin Nodes'):
            reading_nodes = True
            continue
        elif line.startswith('End Nodes'):
            reading_nodes = False
            continue
            
        if reading_nodes and line:
            parts = line.split()
            if len(parts) >= 4:
                node_id = int(parts[0])
                x, y, z = float(parts[1]), float(parts[2]), float(parts[3])
                nodes[node_id] = np.array([x, y, z])
    
    return nodes

def read_mdpa_elements(mdpa_file):
    """读取MDPA文件中的单元"""
    elements = []
    
    with open(mdpa_file, 'r') as f:
        lines = f.readlines()
    
    reading_elements = False
    for line in lines:
        line = line.strip()
        
        if 'Begin Elements SmallDisplacementElement3D4N' in line:
            reading_elements = True
            continue
        elif line.startswith('End Elements'):
            reading_elements = False
            continue
            
        if reading_elements and line:
            parts = line.split()
            if len(parts) >= 6:  # element_id prop_id node1 node2 node3 node4
                element_id = int(parts[0])
                prop_id = int(parts[1])
                nodes = [int(parts[i]) for i in range(2, 6)]
                elements.append({
                    'id': element_id,
                    'property': prop_id,
                    'nodes': nodes
                })
    
    return elements

def calculate_tetrahedron_volume(p1, p2, p3, p4):
    """计算四面体体积"""
    # V = |det(p2-p1, p3-p1, p4-p1)| / 6
    v1 = p2 - p1
    v2 = p3 - p1  
    v3 = p4 - p1
    
    # 计算行列式
    det = np.linalg.det(np.column_stack([v1, v2, v3]))
    volume = abs(det) / 6.0
    
    return volume

def calculate_aspect_ratio(p1, p2, p3, p4):
    """计算四面体长宽比"""
    # 计算所有边长
    edges = [
        np.linalg.norm(p2 - p1),
        np.linalg.norm(p3 - p1),
        np.linalg.norm(p4 - p1),
        np.linalg.norm(p3 - p2),
        np.linalg.norm(p4 - p2),
        np.linalg.norm(p4 - p3)
    ]
    
    max_edge = max(edges)
    min_edge = min(edges)
    
    return max_edge / min_edge if min_edge > 1e-12 else float('inf')

def check_mesh_quality():
    """检查网格质量"""
    
    mdpa_file = Path('temp_kratos_analysis/model.mdpa')
    if not mdpa_file.exists():
        print("❌ MDPA文件不存在")
        return False
    
    print("🔍 开始网格质量检查...")
    
    # 读取节点和单元
    print("📖 读取节点...")
    nodes = read_mdpa_nodes(mdpa_file)
    print(f"   节点数: {len(nodes)}")
    
    print("📖 读取单元...")
    elements = read_mdpa_elements(mdpa_file)
    print(f"   四面体单元数: {len(elements)}")
    
    if len(elements) == 0:
        print("❌ 未找到四面体单元")
        return False
    
    # 分析网格质量
    print("🔬 分析网格质量...")
    
    volumes = []
    aspect_ratios = []
    degenerate_elements = []
    
    for i, elem in enumerate(elements[:1000]):  # 检查前1000个单元
        if i % 200 == 0:
            print(f"   处理进度: {i}/{min(1000, len(elements))}")
            
        try:
            node_ids = elem['nodes']
            if all(nid in nodes for nid in node_ids):
                p1, p2, p3, p4 = [nodes[nid] for nid in node_ids]
                
                # 计算体积
                volume = calculate_tetrahedron_volume(p1, p2, p3, p4)
                volumes.append(volume)
                
                # 计算长宽比
                aspect_ratio = calculate_aspect_ratio(p1, p2, p3, p4)
                aspect_ratios.append(aspect_ratio)
                
                # 检查退化单元
                if volume < 1e-12:
                    degenerate_elements.append(elem['id'])
                    
        except Exception as e:
            print(f"   警告: 单元{elem['id']}处理失败: {e}")
    
    # 统计结果
    print("\n📊 网格质量统计:")
    print(f"   检查单元数: {len(volumes)}")
    
    if volumes:
        print(f"   最小体积: {min(volumes):.2e}")
        print(f"   最大体积: {max(volumes):.2e}")
        print(f"   平均体积: {np.mean(volumes):.2e}")
        
        small_volume_count = sum(1 for v in volumes if v < 1e-6)
        print(f"   小体积单元(<1e-6): {small_volume_count} ({small_volume_count/len(volumes)*100:.1f}%)")
    
    if aspect_ratios:
        finite_ratios = [r for r in aspect_ratios if r != float('inf')]
        if finite_ratios:
            print(f"   最小长宽比: {min(finite_ratios):.2f}")
            print(f"   最大长宽比: {max(finite_ratios):.2f}")
            print(f"   平均长宽比: {np.mean(finite_ratios):.2f}")
            
            bad_ratio_count = sum(1 for r in finite_ratios if r > 100)
            print(f"   高长宽比单元(>100): {bad_ratio_count} ({bad_ratio_count/len(finite_ratios)*100:.1f}%)")
    
    print(f"   退化单元数: {len(degenerate_elements)}")
    
    # 坐标范围检查
    if nodes:
        coords = np.array(list(nodes.values()))
        print(f"\n📐 坐标范围:")
        print(f"   X: [{coords[:, 0].min():.2f}, {coords[:, 0].max():.2f}]")
        print(f"   Y: [{coords[:, 1].min():.2f}, {coords[:, 1].max():.2f}]") 
        print(f"   Z: [{coords[:, 2].min():.2f}, {coords[:, 2].max():.2f}]")
        
        # 检查大坐标值
        max_coord = np.abs(coords).max()
        print(f"   最大坐标绝对值: {max_coord:.2e}")
        if max_coord > 1e6:
            print("   ⚠️  坐标值过大，可能导致数值精度问题")
    
    # 质量评估
    print(f"\n🎯 质量评估:")
    
    issues = []
    if degenerate_elements:
        issues.append(f"发现{len(degenerate_elements)}个退化单元")
    
    if volumes and min(volumes) < 1e-12:
        issues.append("存在极小体积单元")
        
    if finite_ratios and max(finite_ratios) > 1000:
        issues.append("存在极高长宽比单元")
        
    if max_coord > 1e6:
        issues.append("坐标值过大")
    
    if issues:
        print("   ❌ 发现问题:")
        for issue in issues:
            print(f"      - {issue}")
        return False
    else:
        print("   ✅ 网格质量良好")
        return True

if __name__ == "__main__":
    success = check_mesh_quality()
    print(f"\n🎯 网格质量检查: {'通过' if success else '失败'}")
