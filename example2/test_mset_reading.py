#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试MSET读取
"""

import sys
import os
from pathlib import Path

# 设置环境
os.environ['QT_OPENGL'] = 'software'
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def test_mset_reading():
    """测试MSET读取"""
    print("🔍 测试MSET读取")
    print("=" * 50)
    
    try:
        from PyQt6.QtWidgets import QApplication
        app = QApplication([])
        
        from optimized_fpn_parser import OptimizedFPNParser
        
        print("📋 加载FPN数据...")
        parser = OptimizedFPNParser()
        fpn_data = parser.parse_file_streaming('data/两阶段-全锚杆-摩尔库伦.fpn')
        
        # 检查mesh_sets
        mesh_sets = fpn_data.get('mesh_sets', {})
        print(f"✅ 读取到MSET: {len(mesh_sets)} 个")
        
        # 查找锚杆相关MSET
        anchor_msets = {}
        bonded_msets = {}
        
        for mset_id, mset_data in mesh_sets.items():
            name = mset_data.get('name', '')
            elements = mset_data.get('elements', [])
            nodes = mset_data.get('nodes', [])
            
            # 锚固段MSET
            if int(mset_id) in {1710, 1711, 1712}:
                bonded_msets[mset_id] = {
                    'name': name,
                    'elements': len(elements),
                    'nodes': len(nodes)
                }
                print(f"🔒 锚固段MSET {mset_id}: {name} ({len(elements)}个单元, {len(nodes)}个节点)")
            
            # 自由段MSET (ê开头)
            elif name.startswith('ê'):
                anchor_msets[mset_id] = {
                    'name': name,
                    'elements': len(elements),
                    'nodes': len(nodes)
                }
                print(f"🆓 自由段MSET {mset_id}: {name} ({len(elements)}个单元, {len(nodes)}个节点)")
        
        print(f"\n📊 MSET统计:")
        print(f"  锚固段MSET: {len(bonded_msets)} 个")
        print(f"  自由段MSET: {len(anchor_msets)} 个")
        
        # 统计节点数量
        total_bonded_nodes = 0
        total_free_nodes = 0
        
        for mset_id, data in bonded_msets.items():
            total_bonded_nodes += data['nodes']
        
        for mset_id, data in anchor_msets.items():
            total_free_nodes += data['nodes']
        
        print(f"\n🔗 节点统计:")
        print(f"  锚固段节点总数: {total_bonded_nodes:,} 个")
        print(f"  自由段节点总数: {total_free_nodes:,} 个")
        print(f"  锚杆节点总数: {total_bonded_nodes + total_free_nodes:,} 个")
        
        # 验证数据完整性
        if total_bonded_nodes > 0 and total_free_nodes > 0:
            print(f"\n✅ MSET数据读取成功!")
            print(f"  可以基于这些分组设置正确的约束")
            return True
        else:
            print(f"\n❌ MSET数据不完整")
            return False
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_mset_reading()
    if success:
        print(f"\n🎉 MSET读取测试成功!")
    else:
        print(f"\n❌ MSET读取测试失败!")
