#!/usr/bin/env python3
"""
测试投影容差参数是否生效
"""

import sys
import os
os.environ['QT_OPENGL'] = 'software'
sys.path.append('core')

from kratos_interface import KratosInterface
from optimized_fpn_parser import OptimizedFPNParser
from pathlib import Path

def test_projection_tolerance():
    print("🔍 测试投影容差参数...")
    
    # 解析FPN文件
    parser = OptimizedFPNParser()
    fpn_data = parser.parse_file_streaming('data/两阶段-全锚杆-摩尔库伦.fpn')
    
    # 创建Kratos接口
    ki = KratosInterface()
    ki.setup_model(fpn_data)
    
    # 检查约束生成参数
    temp_dir = Path('kratos_with_constraints')
    temp_dir.mkdir(exist_ok=True)
    
    print("📋 开始生成MPC约束...")
    ki._write_interface_mappings(temp_dir,
                                projection_tolerance=10.0,  # 测试10.0m
                                search_radius=20.0,
                                nearest_k=8)
    
    # 检查约束文件
    constraint_file = temp_dir / 'mpc_constraints.json'
    if constraint_file.exists():
        import json
        with open(constraint_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        stats = data.get('stats', {})
        params = data.get('params', {})
        
        print(f"✅ 约束生成完成:")
        print(f"  锚头节点: {stats.get('anchor_head_nodes', 0)}")
        print(f"  shell_anchor约束: {stats.get('shell_anchor', 0)}")
        print(f"  参数: tolerance={params.get('projection_tolerance', 'N/A')}m, radius={params.get('search_radius', 'N/A')}m")
    else:
        print("❌ 约束文件未生成")

if __name__ == "__main__":
    test_projection_tolerance()
