#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
详细分析FPN文件中的材料、载荷和边界条件
"""

import sys
sys.path.insert(0, 'example2')
from core.optimized_fpn_parser import OptimizedFPNParser
from pathlib import Path

def analyze_fpn_details():
    """详细分析FPN文件"""
    fpn_file = Path('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    parser = OptimizedFPNParser()
    fpn_data = parser.parse_file_streaming(str(fpn_file))
    
    print("=" * 80)
    print("详细FPN数据分析")
    print("=" * 80)
    
    # 1. 材料分析
    print("\n🔧 === 材料详细分析 ===")
    materials = fpn_data.get('materials', {})
    print(f"材料总数: {len(materials)}")
    
    for mat_id, mat_data in materials.items():
        print(f"\n材料 {mat_id}:")
        for key, value in mat_data.items():
            print(f"  {key}: {value}")
    
    # 2. 载荷分析
    print("\n🔧 === 载荷详细分析 ===")
    loads = fpn_data.get('loads', [])
    print(f"载荷总数: {len(loads)}")
    
    for i, load in enumerate(loads):
        print(f"\n载荷 {i+1}:")
        for key, value in load.items():
            print(f"  {key}: {value}")
    
    # 3. 边界条件分析
    print("\n🔧 === 边界条件详细分析 ===")
    boundaries = fpn_data.get('boundaries', [])
    print(f"边界条件总数: {len(boundaries)}")
    
    for i, boundary in enumerate(boundaries):
        print(f"\n边界条件 {i+1}:")
        for key, value in boundary.items():
            print(f"  {key}: {value}")
    
    # 4. 阶段命令分析
    print("\n🔧 === 阶段命令详细分析 ===")
    stages = fpn_data.get('analysis_stages', [])
    
    for stage in stages:
        print(f"\n阶段: {stage.get('name', 'Unknown')}")
        print(f"  ID: {stage.get('id')}")
        print(f"  类型: {stage.get('type')}")
        print(f"  激活材料: {stage.get('active_materials', [])}")
        print(f"  激活载荷: {stage.get('active_loads', [])}")
        print(f"  激活边界: {stage.get('active_boundaries', [])}")
        
        commands = stage.get('group_commands', [])
        print(f"  命令数量: {len(commands)}")
        
        for cmd in commands:
            cmd_type = cmd.get('command', 'Unknown')
            group_ids = cmd.get('group_ids', [])
            stage_id = cmd.get('stage_id', 'Unknown')
            
            if cmd_type in ['MADD', 'MDEL']:
                print(f"    {cmd_type} (阶段{stage_id}): 材料组 {group_ids}")
            elif cmd_type in ['LADD', 'LDEL']:
                print(f"    {cmd_type} (阶段{stage_id}): 载荷组 {group_ids}")
            elif cmd_type in ['BADD', 'BDEL']:
                print(f"    {cmd_type} (阶段{stage_id}): 边界组 {group_ids}")
    
    # 5. 节点和单元统计
    print("\n🔧 === 几何统计 ===")
    nodes = fpn_data.get('nodes', {})
    elements = fpn_data.get('elements', {})
    print(f"节点数量: {len(nodes):,}")
    print(f"单元数量: {len(elements):,}")
    
    return fpn_data

if __name__ == "__main__":
    fpn_data = analyze_fpn_details()
