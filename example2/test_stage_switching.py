#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试分析步切换功能
"""

import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from modules.preprocessor import PreProcessor

def test_stage_switching():
    """测试分析步切换功能"""
    print("测试分析步切换功能")
    print("=" * 60)
    
    preprocessor = PreProcessor()
    fpn_file = "data/基坑两阶段1fpn.fpn"
    
    try:
        # 解析FPN文件
        print("1. 解析FPN文件...")
        fpn_data = preprocessor.parse_fpn_file(fpn_file)
        analysis_stages = fpn_data.get('analysis_stages', [])
        
        print(f"   找到 {len(analysis_stages)} 个分析步:")
        for stage in analysis_stages:
            print(f"   - 分析步 {stage['id']}: {stage['name']}")
        
        # 测试每个分析步的物理组关联
        print("\n2. 测试分析步切换...")
        for stage in analysis_stages:
            print(f"\n切换到分析步 {stage['id']}: {stage['name']}")
            
            # 获取该分析步的激活物理组
            active_groups = preprocessor.determine_active_groups_for_stage(stage)
            
            print(f"   激活的材料组: {active_groups['materials']}")
            print(f"   激活的荷载组: {active_groups['loads']}")  
            print(f"   激活的边界组: {active_groups['boundaries']}")
            
            # 检查物理组命令
            if 'group_commands' in stage:
                print(f"   物理组命令数量: {len(stage['group_commands'])}")
                for cmd in stage['group_commands']:
                    print(f"     - {cmd['command']}: 组{cmd['group_ids']}")
            else:
                print("   无物理组命令")
        
        print("\n3. 验证结果...")
        if len(analysis_stages) >= 2:
            stage1 = analysis_stages[0]
            stage2 = analysis_stages[1]
            
            groups1 = preprocessor.determine_active_groups_for_stage(stage1)
            groups2 = preprocessor.determine_active_groups_for_stage(stage2)
            
            # 验证两个分析步的物理组是否不同
            materials_different = set(groups1['materials']) != set(groups2['materials'])
            loads_different = set(groups1['loads']) != set(groups2['loads'])
            boundaries_different = set(groups1['boundaries']) != set(groups2['boundaries'])
            
            print(f"   材料组切换正确: {materials_different}")
            print(f"   荷载组切换正确: {loads_different}")
            print(f"   边界组切换正确: {boundaries_different}")
            
            if materials_different or loads_different or boundaries_different:
                print("   ✅ 分析步切换功能正常工作！")
            else:
                print("   ⚠️ 分析步切换可能存在问题，所有组都相同")
        else:
            print("   ⚠️ 需要至少2个分析步来验证切换功能")
            
    except Exception as e:
        print(f"测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_stage_switching()