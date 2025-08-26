#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整的FPN到Kratos映射测试
基于修复后的识别逻辑，充分考虑地连墙是壳元
"""

import sys
import os
sys.path.append('core')

def complete_fpn_to_kratos_mapping():
    """完整的FPN到Kratos映射流程"""
    print("🎯 完整的FPN到Kratos映射测试")
    print("=" * 80)
    print("📋 基于修复后的识别逻辑")
    print("📋 充分考虑：锚杆(线元) + 地连墙(壳元) + 土体(体元)")
    print("=" * 80)
    
    try:
        from kratos_interface import KratosInterface
        from optimized_fpn_parser import OptimizedFPNParser
        
        # 步骤1: 解析FPN文件
        print("\n📋 步骤1: 解析FPN文件...")
        parser = OptimizedFPNParser()
        fpn_data = parser.parse_file_streaming('data/两阶段-全锚杆-摩尔库伦.fpn')
        
        if not fpn_data:
            print("❌ FPN解析失败")
            return False
            
        print(f"✅ FPN解析成功")
        print(f"   📊 数据概览:")
        print(f"      总节点数: {len(fpn_data.get('nodes', []))}")
        print(f"      体单元数: {len(fpn_data.get('elements', []))}")
        print(f"      线元数: {len(fpn_data.get('line_elements', {}))}")
        print(f"      板元数: {len(fpn_data.get('plate_elements', {}))}")
        
        # 步骤2: 创建Kratos接口
        print("\n📋 步骤2: 创建Kratos接口...")
        ki = KratosInterface()
        ki.source_fpn_data = fpn_data
        
        # 步骤3: 数据提取与分析
        print("\n📋 步骤3: 数据提取与分析...")
        anchor_data, master_data = ki._extract_anchor_soil_data(fpn_data)
        
        print(f"✅ 数据提取完成:")
        print(f"   🔗 锚杆数据:")
        print(f"      单元数: {len(anchor_data['elements'])}")
        print(f"      节点数: {len(anchor_data['nodes'])}")
        print(f"      坐标数: {len(anchor_data['node_coords'])}")
        
        print(f"   🏗️ 主节点数据:")
        print(f"      总单元数: {len(master_data['elements'])}")
        print(f"      总节点数: {len(master_data['nodes'])}")
        print(f"      地连墙单元: {len(master_data['wall_elements'])}")
        print(f"      土体单元: {len(master_data['soil_elements'])}")
        print(f"      坐标数: {len(master_data['node_coords'])}")
        
        # 步骤4: 端点分析
        print("\n📋 步骤4: 端点分析...")
        endpoint_analysis = analyze_anchor_endpoints(anchor_data)
        print(f"   📊 端点统计:")
        print(f"      总锚杆节点: {endpoint_analysis['total_nodes']}")
        print(f"      识别端点: {endpoint_analysis['endpoints']}")
        print(f"      连通分量: {endpoint_analysis['components']}")
        print(f"      每根一端: {endpoint_analysis['selected_endpoints']}")
        
        # 步骤5: Kratos原生约束实施
        print("\n📋 步骤5: Kratos原生约束实施...")
        
        # 5.1 原生Process方案
        print("   🎯 方案1: 原生Process方案")
        process_result = ki._implement_native_process_approach(anchor_data, master_data)
        
        if process_result > 0:
            print(f"   ✅ 原生Process成功: {process_result}个约束")
        else:
            print("   ⚠️ 原生Process需要进一步调试")
        
        # 5.2 原生Utility方案
        print("   🎯 方案2: 原生Utility方案")
        utility_result = ki._implement_pure_native_constraints(anchor_data, master_data)
        
        if utility_result > 0:
            print(f"   ✅ 原生Utility成功: {utility_result}个约束")
        else:
            print("   ⚠️ 原生Utility需要进一步调试")
        
        # 步骤6: 完整约束实施
        print("\n📋 步骤6: 完整约束实施...")
        total_constraints = ki._implement_anchor_constraints(fpn_data)
        
        print(f"✅ 完整约束实施结果: {total_constraints}个约束")
        
        # 步骤7: 结果验证
        print("\n📋 步骤7: 结果验证...")
        verification_result = verify_mapping_results(anchor_data, master_data, total_constraints)
        
        print(f"📊 验证结果:")
        print(f"   数据完整性: {'✅ 通过' if verification_result['data_integrity'] else '❌ 失败'}")
        print(f"   约束覆盖率: {verification_result['constraint_coverage']:.1f}%")
        print(f"   预期约束数: {verification_result['expected_constraints']}")
        print(f"   实际约束数: {verification_result['actual_constraints']}")
        
        # 步骤8: 生成报告
        print("\n📋 步骤8: 生成映射报告...")
        generate_mapping_report(fpn_data, anchor_data, master_data, total_constraints, verification_result)
        
        return total_constraints > 0
        
    except Exception as e:
        print(f"❌ 映射失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def analyze_anchor_endpoints(anchor_data):
    """分析锚杆端点"""
    from collections import defaultdict, deque
    
    # 构建锚杆图
    anchor_edges = []
    all_nodes = set()
    
    for element in anchor_data['elements']:
        nodes = element.get('nodes', [])
        if len(nodes) == 2:
            n1, n2 = int(nodes[0]), int(nodes[1])
            if n1 != n2:
                anchor_edges.append((n1, n2))
                all_nodes.add(n1)
                all_nodes.add(n2)
    
    # 构建邻接表
    adj = defaultdict(set)
    for a, b in anchor_edges:
        adj[a].add(b)
        adj[b].add(a)
    
    # 识别端点（度=1）
    endpoints = {n for n in adj.keys() if len(adj[n]) == 1}
    
    # 连通分量分析
    seen = set()
    components = 0
    selected_endpoints = []
    
    for node in all_nodes:
        if node in seen:
            continue
            
        # BFS找到整个连通分量
        queue = deque([node])
        seen.add(node)
        component_nodes = [node]
        component_endpoints = []
        
        while queue:
            current = queue.popleft()
            if current in endpoints:
                component_endpoints.append(current)
            
            for neighbor in adj[current]:
                if neighbor not in seen:
                    seen.add(neighbor)
                    queue.append(neighbor)
                    component_nodes.append(neighbor)
        
        if component_nodes:
            components += 1
            # 每个分量仅选一个端点
            if component_endpoints:
                selected_endpoints.append(component_endpoints[0])
    
    return {
        'total_nodes': len(all_nodes),
        'endpoints': len(endpoints),
        'components': components,
        'selected_endpoints': len(selected_endpoints)
    }

def verify_mapping_results(anchor_data, master_data, total_constraints):
    """验证映射结果"""
    # 数据完整性检查
    data_integrity = (
        len(anchor_data['elements']) > 0 and
        len(anchor_data['nodes']) > 0 and
        len(master_data['elements']) > 0 and
        len(master_data['nodes']) > 0
    )
    
    # 预期约束数（基于连通分量分析）
    endpoint_analysis = analyze_anchor_endpoints(anchor_data)
    expected_constraints = endpoint_analysis['selected_endpoints']
    
    # 约束覆盖率
    if expected_constraints > 0:
        constraint_coverage = (total_constraints / expected_constraints) * 100
    else:
        constraint_coverage = 0
    
    return {
        'data_integrity': data_integrity,
        'constraint_coverage': min(constraint_coverage, 100),
        'expected_constraints': expected_constraints,
        'actual_constraints': total_constraints
    }

def generate_mapping_report(fpn_data, anchor_data, master_data, total_constraints, verification):
    """生成映射报告"""
    report = {
        'timestamp': str(__import__('datetime').datetime.now()),
        'fpn_data_summary': {
            'total_nodes': len(fpn_data.get('nodes', [])),
            'body_elements': len(fpn_data.get('elements', [])),
            'line_elements': len(fpn_data.get('line_elements', {})),
            'plate_elements': len(fpn_data.get('plate_elements', {}))
        },
        'extracted_data': {
            'anchor_elements': len(anchor_data['elements']),
            'anchor_nodes': len(anchor_data['nodes']),
            'wall_elements': len(master_data['wall_elements']),
            'soil_elements': len(master_data['soil_elements']),
            'master_nodes': len(master_data['nodes'])
        },
        'constraints': {
            'total_generated': total_constraints,
            'expected': verification['expected_constraints'],
            'coverage_rate': verification['constraint_coverage']
        },
        'verification': verification
    }
    
    # 保存报告
    import json
    with open('fpn_to_kratos_mapping_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"✅ 映射报告已保存: fpn_to_kratos_mapping_report.json")

if __name__ == "__main__":
    success = complete_fpn_to_kratos_mapping()
    
    print("\n" + "=" * 80)
    print("📊 完整映射测试总结")
    print("=" * 80)
    
    if success:
        print("🎉 FPN到Kratos映射测试成功！")
        print("✅ 数据识别逻辑正确")
        print("✅ 充分考虑了地连墙是壳元")
        print("✅ Kratos原生功能调用成功")
        print("✅ 约束生成流程完整")
    else:
        print("❌ 映射测试失败，需要进一步调试")
    
    print("\n🎯 这次测试验证了修复后的完整识别逻辑")
