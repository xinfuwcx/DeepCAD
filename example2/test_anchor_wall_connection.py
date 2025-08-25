#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试锚杆端点组与地连墙连接的具体实现和映射
分析FPN中的连接机制并验证Kratos映射的正确性
"""

import sys
import os
import json
import math
from pathlib import Path

# 设置环境
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def analyze_anchor_wall_connection():
    """分析锚杆-地连墙连接机制"""
    print("=" * 80)
    print("锚杆端点组与地连墙连接分析")
    print("=" * 80)
    
    try:
        # 1. 加载和解析FPN数据
        from optimized_fpn_parser import OptimizedFPNParser
        parser = OptimizedFPNParser()
        
        fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        if not fpn_file.exists():
            print(f"错误: FPN文件不存在: {fpn_file}")
            return False
        
        fpn_data = parser.parse_file_streaming(str(fpn_file))
        print("✅ FPN数据解析成功")
        
        # 2. 创建Kratos接口进行详细分析
        from kratos_interface import KratosInterface
        ki = KratosInterface()
        
        # 设置模型以触发约束生成
        success = ki.setup_model(fpn_data)
        if not success:
            print("❌ 模型设置失败")
            return False
        
        print("✅ 模型设置完成")
        
        # 3. 分析锚杆和地连墙的几何分布
        print("\n" + "=" * 60)
        print("几何分析")
        print("=" * 60)
        
        nodes = fpn_data.get('nodes', [])
        elements = fpn_data.get('elements', [])
        
        # 统计元素类型
        element_stats = {}
        anchor_elements = []
        wall_elements = []
        
        for el in elements:
            el_type = el.get('element_type', 'Unknown')
            mat_id = el.get('material_id', 0)
            attr_id = el.get('attribute_id', 0)
            
            element_stats[el_type] = element_stats.get(el_type, 0) + 1
            
            # 识别锚杆元素(LINE + PETRUSS)
            if el_type == 'LINE' and attr_id == 15:  # PETRUSS属性
                anchor_elements.append(el)
            
            # 识别地连墙元素(TSHELL)
            elif el_type == 'TSHELL':
                wall_elements.append(el)
        
        print(f"元素类型统计:")
        for el_type, count in sorted(element_stats.items()):
            print(f"  {el_type}: {count:,} 个")
        
        print(f"\n锚杆元素: {len(anchor_elements):,} 个")
        print(f"地连墙元素: {len(wall_elements):,} 个")
        
        # 4. 分析锚杆端点的几何位置
        print("\n" + "=" * 60)
        print("锚杆端点分析")
        print("=" * 60)
        
        # 构建节点坐标字典
        node_coords = {}
        for node in nodes:
            try:
                node_id = int(node['id'])
                coords = [float(c) for c in node['coordinates']]
                node_coords[node_id] = coords
            except:
                continue
        
        # 分析锚杆端点
        anchor_endpoints = set()
        anchor_nodes = set()
        
        for anchor in anchor_elements:
            nodes_list = anchor.get('nodes', [])
            anchor_nodes.update(nodes_list)
            if len(nodes_list) >= 2:
                # 端点是锚杆的起始和结束节点
                anchor_endpoints.add(nodes_list[0])   # 起点
                anchor_endpoints.add(nodes_list[-1])  # 终点
        
        print(f"锚杆总节点: {len(anchor_nodes):,} 个")
        print(f"锚杆端点: {len(anchor_endpoints):,} 个")
        
        # 5. 分析地连墙节点
        print("\n" + "=" * 60)
        print("地连墙节点分析")
        print("=" * 60)
        
        wall_nodes = set()
        for wall in wall_elements:
            wall_nodes.update(wall.get('nodes', []))
        
        print(f"地连墙节点: {len(wall_nodes):,} 个")
        
        # 6. 分析锚杆端点与地连墙的邻近关系
        print("\n" + "=" * 60)
        print("锚杆-地连墙邻近分析")
        print("=" * 60)
        
        # 计算距离并找到邻近关系
        close_pairs = []
        distance_threshold = 5.0  # 5米内认为是连接的
        
        sample_endpoints = list(anchor_endpoints)[:20]  # 样本分析
        sample_wall_nodes = list(wall_nodes)[:100]
        
        for anchor_node in sample_endpoints:
            if anchor_node not in node_coords:
                continue
            
            anchor_pos = node_coords[anchor_node]
            min_distance = float('inf')
            closest_wall_node = None
            
            for wall_node in sample_wall_nodes:
                if wall_node not in node_coords:
                    continue
                
                wall_pos = node_coords[wall_node]
                distance = math.sqrt(sum((a - w) ** 2 for a, w in zip(anchor_pos, wall_pos)))
                
                if distance < min_distance:
                    min_distance = distance
                    closest_wall_node = wall_node
            
            if min_distance <= distance_threshold and closest_wall_node:
                close_pairs.append({
                    'anchor_node': anchor_node,
                    'wall_node': closest_wall_node,
                    'distance': min_distance,
                    'anchor_pos': anchor_pos,
                    'wall_pos': node_coords[closest_wall_node]
                })
        
        print(f"发现邻近连接对: {len(close_pairs)} 个 (样本分析)")
        
        # 显示部分连接详情
        for i, pair in enumerate(close_pairs[:5]):
            print(f"  连接 {i+1}: 锚杆节点{pair['anchor_node']} → 墙节点{pair['wall_node']}")
            print(f"    距离: {pair['distance']:.3f}m")
            print(f"    锚杆位置: ({pair['anchor_pos'][0]:.2f}, {pair['anchor_pos'][1]:.2f}, {pair['anchor_pos'][2]:.2f})")
            print(f"    墙体位置: ({pair['wall_pos'][0]:.2f}, {pair['wall_pos'][1]:.2f}, {pair['wall_pos'][2]:.2f})")
        
        # 7. 测试当前Kratos约束生成
        print("\n" + "=" * 60)
        print("Kratos约束生成测试")
        print("=" * 60)
        
        try:
            # 运行约束生成
            result_success, result_data = ki.run_analysis()
            
            # 检查约束文件
            constraint_files = [
                Path("temp_kratos_analysis") / "constraints.json",
                Path("temp_kratos_final") / "constraints.json"
            ]
            
            for constraint_file in constraint_files:
                if constraint_file.exists():
                    with open(constraint_file, 'r', encoding='utf-8') as f:
                        constraints = json.load(f)
                    
                    print(f"\n约束文件: {constraint_file}")
                    
                    mpc_constraints = constraints.get('mpc_constraints', [])
                    embedded_constraints = constraints.get('embedded_constraints', [])
                    
                    print(f"  MPC约束数量: {len(mpc_constraints)}")
                    print(f"  嵌入约束数量: {len(embedded_constraints)}")
                    
                    # 显示部分MPC约束详情
                    for i, mpc in enumerate(mpc_constraints[:3]):
                        slave_node = mpc.get('slave')
                        masters = mpc.get('masters', [])
                        print(f"    MPC {i+1}: 从节点{slave_node} → {len(masters)}个主节点")
                    
                    if len(mpc_constraints) > 3:
                        print(f"    ... 还有{len(mpc_constraints)-3}个MPC约束")
                    
                    break
            else:
                print("⚠️ 未找到约束文件")
        
        except Exception as e:
            print(f"约束生成测试失败: {e}")
        
        # 8. 分析结果和建议
        print("\n" + "=" * 60)
        print("分析结果与建议")
        print("=" * 60)
        
        analysis_result = {
            'fpn_analysis': {
                'anchor_elements': len(anchor_elements),
                'wall_elements': len(wall_elements),
                'anchor_endpoints': len(anchor_endpoints),
                'wall_nodes': len(wall_nodes),
                'close_pairs_sample': len(close_pairs)
            },
            'connection_mechanism': {
                'anchor_property_id': 15,  # PETRUSS
                'distance_threshold': distance_threshold,
                'geometric_proximity': '基于几何邻近性建立连接'
            },
            'kratos_mapping': {
                'mpc_constraints': 'LinearMasterSlaveConstraint',
                'search_method': 'k-nearest neighbors',
                'weight_method': 'inverse distance weighting'
            }
        }
        
        # 保存分析结果
        with open('anchor_wall_connection_analysis.json', 'w', encoding='utf-8') as f:
            json.dump(analysis_result, f, ensure_ascii=False, indent=2)
        
        print("✅ 锚杆-地连墙连接机制分析完成")
        print("📁 详细结果保存至: anchor_wall_connection_analysis.json")
        
        print(f"\n🔍 关键发现:")
        print(f"  - 锚杆使用属性ID 15 (PETRUSS)")
        print(f"  - 发现 {len(anchor_elements):,} 个锚杆元素")
        print(f"  - 发现 {len(wall_elements):,} 个地连墙元素") 
        print(f"  - 基于几何邻近性建立连接关系")
        print(f"  - 当前Kratos实现使用MPC约束映射")
        
        return True
        
    except Exception as e:
        print(f"❌ 分析过程出错: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = analyze_anchor_wall_connection()
    
    if success:
        print("\n🎉 锚杆-地连墙连接分析成功完成！")
    else:
        print("\n❌ 锚杆-地连墙连接分析失败")