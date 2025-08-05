#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试修复后的STAGE解析
"""

import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from modules.preprocessor import PreProcessor

def test_stage_parsing():
    """测试STAGE解析修复结果"""
    print("测试修复后的STAGE解析")
    print("=" * 50)
    
    preprocessor = PreProcessor()
    fpn_file = "data/基坑两阶段1fpn.fpn"
    
    try:
        fpn_data = preprocessor.parse_fpn_file(fpn_file)
        
        print(f"\n解析结果:")
        print(f"分析步数量: {len(fpn_data.get('analysis_stages', []))}")
        
        for i, stage in enumerate(fpn_data.get('analysis_stages', [])):
            print(f"\n分析步 {i+1}:")
            print(f"  ID: {stage['id']}")
            print(f"  名称: {stage['name']}")
            print(f"  类型: {stage['type']}")
            print(f"  激活: {stage['active']}")
            print(f"  描述: {stage['description']}")
            
        # 检查是否找到了2个分析步
        if len(fpn_data.get('analysis_stages', [])) == 2:
            print("\n✅ 成功！找到了2个分析步")
        else:
            print(f"\n❌ 失败！只找到了{len(fpn_data.get('analysis_stages', []))}个分析步")
            
    except Exception as e:
        print(f"测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_stage_parsing()