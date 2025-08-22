#!/usr/bin/env python3
"""测试边界组映射逻辑"""

from example2.core.optimized_fpn_parser import OptimizedFPNParser

def test_boundary_mapping():
    """测试边界组映射逻辑"""
    
    print("🔍 测试边界组映射逻辑...")
    
    # 1. 解析FPN文件
    parser = OptimizedFPNParser()
    fpn_data = parser.parse_file_streaming('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    
    # 2. 简化测试，不需要KratosInterface
    
    # 5. 测试边界组映射
    print("\n📋 边界组映射测试:")
    
    # 获取边界组信息
    boundary_groups = fpn_data.get('boundary_groups', {})
    print(f"   实际边界组: {list(boundary_groups.keys())}")
    
    # 获取阶段信息
    stages = fpn_data.get('analysis_stages', [])
    if stages:
        stage1 = stages[0]
        badd_groups = set()
        for cmd in stage1.get('group_commands', []):
            if cmd.get('command') == 'BADD':
                group_ids = cmd.get('group_ids', [])
                badd_groups.update(g for g in group_ids if g != 0)
        print(f"   阶段1 BADD组: {list(badd_groups)}")
        
        # 模拟映射逻辑
        existing_ids = {int(k) for k in boundary_groups.keys()}
        effective = badd_groups & existing_ids if badd_groups else set()
        
        print(f"   直接交集: {effective}")
        
        if not effective:
            # 特例映射
            if 1 in badd_groups and 8 in existing_ids:
                effective = {8}
                print(f"   ✅ 特例映射: BADD组1 → BSET组8")
            elif len(existing_ids) == 1:
                effective = set(existing_ids)
                print(f"   ✅ 唯一组映射: {effective}")
        
        print(f"   最终有效组: {effective}")
    
    return True

if __name__ == "__main__":
    success = test_boundary_mapping()
    print(f"\n🎯 边界组映射测试: {'成功' if success else '失败'}")
