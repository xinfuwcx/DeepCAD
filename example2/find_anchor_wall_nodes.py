#!/usr/bin/env python3
# 识别锚杆靠近地连墙一侧的节点组

import sys
import math
from pathlib import Path

# 设置环境
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def analyze_anchor_wall_geometry():
    """分析锚杆与地连墙的几何关系，找出锚头节点"""
    print("=== 锚杆-地连墙几何分析 ===")
    
    try:
        # 1. 加载FPN数据
        from optimized_fpn_parser import OptimizedFPNParser
        parser = OptimizedFPNParser()
        
        fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        print(f"加载FPN文件: {fpn_file}")
        fpn_data = parser.parse_file_streaming(str(fpn_file))
        print("FPN数据加载成功")
        
        # 2. 提取节点坐标
        nodes = fpn_data.get('nodes', [])
        node_coords = {}
        for node in nodes:
            try:
                node_id = int(node['id'])
                coords = [float(c) for c in node['coordinates']]
                node_coords[node_id] = coords
            except:
                continue
        
        print(f"节点总数: {len(node_coords):,}")
        
        # 3. 提取锚杆元素 (LINE + 属性ID 15)
        elements = fpn_data.get('elements', [])
        
        anchor_elements = []
        anchor_nodes = set()
        
        for el in elements:
            if el.get('element_type') == 'LINE' and el.get('attribute_id') == 15:
                anchor_elements.append(el)
                nodes_list = el.get('nodes', [])
                anchor_nodes.update(nodes_list)
        
        print(f"锚杆元素数量: {len(anchor_elements):,}")
        print(f"锚杆节点数量: {len(anchor_nodes):,}")
        
        # 4. 提取地连墙元素 (TRIA + 属性ID 13)
        wall_elements = []
        wall_nodes = set()
        
        for el in elements:
            if el.get('element_type') == 'TRIA' and el.get('attribute_id') == 13:
                wall_elements.append(el)
                nodes_list = el.get('nodes', [])
                wall_nodes.update(nodes_list)
        
        print(f"地连墙元素数量: {len(wall_elements):,}")
        print(f"地连墙节点数量: {len(wall_nodes):,}")
        
        # 5. 分析锚杆几何特征
        print(f"\n=== 锚杆几何分析 ===")
        
        # 按锚杆分组 - 找出每根锚杆的起点和终点
        anchor_chains = []  # 每根锚杆的节点链
        processed_elements = set()
        
        for start_el in anchor_elements:
            if start_el['id'] in processed_elements:
                continue
            
            # 构建这根锚杆的节点链
            chain = []
            current_nodes = start_el.get('nodes', [])
            if len(current_nodes) >= 2:
                chain.extend(current_nodes)
                processed_elements.add(start_el['id'])
                
                # 继续寻找连接的元素
                last_node = current_nodes[-1]
                found = True
                
                while found:
                    found = False
                    for el in anchor_elements:
                        if el['id'] in processed_elements:
                            continue
                        el_nodes = el.get('nodes', [])
                        if len(el_nodes) >= 2:
                            if el_nodes[0] == last_node:
                                chain.append(el_nodes[1])
                                last_node = el_nodes[1]
                                processed_elements.add(el['id'])
                                found = True
                                break
                            elif el_nodes[1] == last_node:
                                chain.append(el_nodes[0])
                                last_node = el_nodes[0]
                                processed_elements.add(el['id'])
                                found = True
                                break
                
                if len(chain) > 2:  # 只保留有效的锚杆链
                    anchor_chains.append(chain)
        
        print(f"识别到锚杆根数: {len(anchor_chains)}")
        
        # 6. 分析每根锚杆的端点
        anchor_endpoints = []
        
        for i, chain in enumerate(anchor_chains[:5]):  # 只分析前5根作为示例
            start_node = chain[0]
            end_node = chain[-1]
            
            start_coords = node_coords.get(start_node, [0, 0, 0])
            end_coords = node_coords.get(end_node, [0, 0, 0])
            
            # 判断哪个是锚头 (通常Z坐标较大的是锚头，靠近地表)
            if start_coords[2] > end_coords[2]:  # Z坐标较大
                anchor_head = start_node
                anchor_tail = end_node
                head_coords = start_coords
                tail_coords = end_coords
            else:
                anchor_head = end_node
                anchor_tail = start_node
                head_coords = end_coords
                tail_coords = start_coords
            
            anchor_endpoints.append({
                'chain_id': i,
                'length': len(chain),
                'anchor_head': anchor_head,
                'anchor_tail': anchor_tail,
                'head_coords': head_coords,
                'tail_coords': tail_coords
            })
            
            print(f"锚杆 {i+1}:")
            print(f"  节点数: {len(chain)}")
            print(f"  锚头: 节点{anchor_head} -> ({head_coords[0]:.1f}, {head_coords[1]:.1f}, {head_coords[2]:.1f})")
            print(f"  锚尾: 节点{anchor_tail} -> ({tail_coords[0]:.1f}, {tail_coords[1]:.1f}, {tail_coords[2]:.1f})")
        
        # 7. 查找锚头附近的地连墙节点
        print(f"\n=== 锚头-地连墙距离分析 ===")
        
        anchor_head_nodes = [ep['anchor_head'] for ep in anchor_endpoints]
        
        for i, endpoint in enumerate(anchor_endpoints):
            anchor_head = endpoint['anchor_head']
            head_coords = endpoint['head_coords']
            
            # 计算到所有地连墙节点的距离
            min_distance = float('inf')
            closest_wall_node = None
            close_wall_nodes = []
            
            for wall_node in list(wall_nodes)[:1000]:  # 只检查部分节点避免太慢
                if wall_node not in node_coords:
                    continue
                
                wall_coords = node_coords[wall_node]
                distance = math.sqrt(sum((h - w) ** 2 for h, w in zip(head_coords, wall_coords)))
                
                if distance < min_distance:
                    min_distance = distance
                    closest_wall_node = wall_node
                
                if distance <= 5.0:  # 5米内的地连墙节点
                    close_wall_nodes.append((wall_node, distance))
            
            close_wall_nodes.sort(key=lambda x: x[1])  # 按距离排序
            
            print(f"锚杆 {i+1} (节点{anchor_head}):")
            print(f"  最近地连墙节点: {closest_wall_node}, 距离: {min_distance:.3f}m")
            print(f"  5m内地连墙节点: {len(close_wall_nodes)} 个")
            
            if len(close_wall_nodes) > 0:
                print(f"  最近3个地连墙节点:")
                for wall_node, dist in close_wall_nodes[:3]:
                    wall_coords = node_coords[wall_node]
                    print(f"    节点{wall_node}: 距离{dist:.3f}m, 坐标({wall_coords[0]:.1f}, {wall_coords[1]:.1f}, {wall_coords[2]:.1f})")
        
        # 8. 生成锚头节点组
        print(f"\n=== 锚头节点组识别结果 ===")
        
        all_anchor_heads = [ep['anchor_head'] for ep in anchor_endpoints]
        print(f"识别到的锚头节点: {all_anchor_heads}")
        
        # 保存结果
        result = {
            'anchor_chains': len(anchor_chains),
            'anchor_head_nodes': all_anchor_heads,
            'sample_analysis': anchor_endpoints
        }
        
        import json
        with open('anchor_head_analysis.json', 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"分析结果已保存到: anchor_head_analysis.json")
        
        return all_anchor_heads
        
    except Exception as e:
        print(f"分析失败: {e}")
        import traceback
        traceback.print_exc()
        return []

if __name__ == "__main__":
    anchor_heads = analyze_anchor_wall_geometry()
    
    print(f"\n=== 最终结果 ===")
    print(f"锚头节点组: {anchor_heads}")
    print(f"节点数量: {len(anchor_heads)}")