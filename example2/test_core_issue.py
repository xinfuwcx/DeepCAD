#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试核心问题：分析步物理组激活逻辑
"""

import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from modules.preprocessor import PreProcessor

def test_core_issue():
    """测试核心问题"""
    print("=" * 60)
    print("测试分析步物理组激活逻辑")
    print("=" * 60)
    
    # 创建预处理器
    preprocessor = PreProcessor()
    
    # 加载FPN文件
    fpn_file = project_root / "data" / "基坑两阶段1fpn.fpn"
    
    if not fpn_file.exists():
        print(f"❌ FPN文件不存在: {fpn_file}")
        return False
    
    try:
        print(f"📄 解析FPN文件: {fpn_file.name}")
        fpn_data = preprocessor.parse_fpn_file(str(fpn_file))
        
        # 检查分析步
        analysis_stages = fpn_data.get('analysis_stages', [])
        print(f"\n🔍 找到 {len(analysis_stages)} 个分析步:")
        
        for i, stage in enumerate(analysis_stages, 1):
            print(f"\n分析步 {i}: {stage}")
            
            # 测试物理组激活逻辑
            active_groups = preprocessor.determine_active_groups_for_stage(stage)
            print(f"分析步 {i}: {active_groups}")
        
        # 验证两个分析步的物理组是否不同
        if len(analysis_stages) >= 2:
            stage1_groups = preprocessor.determine_active_groups_for_stage(analysis_stages[0])
            stage2_groups = preprocessor.determine_active_groups_for_stage(analysis_stages[1])
            
            print(f"\n🔧 验证结果:")
            print(f"分析步1材料组: {stage1_groups['materials']}")
            print(f"分析步2材料组: {stage2_groups['materials']}")
            
            if stage1_groups['materials'] == stage2_groups['materials']:
                print("❌ 问题确认：两个分析步的材料组完全相同！")
                print("   这说明MDEL命令没有被正确处理")
                return False
            else:
                print("✅ 分析步物理组正确区分")
                return True
        else:
            print("⚠️ 需要至少2个分析步来验证")
            return False
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_core_issue()
    sys.exit(0 if success else 1)