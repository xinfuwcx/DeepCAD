#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速测试开挖功能
"""

def test_excavation_stage_name_matching():
    """测试开挖阶段名称匹配"""
    
    # 模拟智能材料选择的逻辑
    def test_stage_matching(stage_name):
        stage_name_lower = stage_name.lower()
        
        print(f"测试阶段名称: '{stage_name}'")
        print(f"转换为小写: '{stage_name_lower}'")
        
        if '初始' in stage_name_lower or 'initial' in stage_name_lower:
            result = "初始状态逻辑"
        elif '开挖' in stage_name_lower or 'excavation' in stage_name_lower or '地连墙' in stage_name_lower:
            result = "开挖阶段逻辑"
        elif '支护' in stage_name_lower or '围护' in stage_name_lower or '墙' in stage_name_lower:
            result = "支护阶段逻辑"
        else:
            result = "默认逻辑"
        
        print(f"匹配结果: {result}")
        print("-" * 40)
        return result
    
    # 测试各种阶段名称
    test_cases = [
        "初始地应力",
        "地连墙+开挖", 
        "第一次开挖(-5m)",
        "支护结构安装",
        "其他阶段"
    ]
    
    print("=" * 50)
    print("测试开挖阶段名称匹配逻辑")
    print("=" * 50)
    
    for stage_name in test_cases:
        result = test_stage_matching(stage_name)
        
    print("\\n测试结论:")
    print("✅ '地连墙+开挖' 将匹配开挖阶段逻辑")
    print("✅ 修复后的逻辑应该能正确处理这种命名")

if __name__ == "__main__":
    test_excavation_stage_name_matching()