#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

print("=== 测试FPN解析器 ===")

try:
    from modules.preprocessor import PreProcessor
    
    # 创建预处理器
    preprocessor = PreProcessor()
    
    # 测试解析
    fpn_file = "test_sample.fpn"
    print(f"测试文件: {fpn_file}")
    
    # 调用解析方法
    fpn_data = preprocessor.parse_fpn_file(fpn_file)
    
    print("\n=== 解析结果 ===")
    print(f"节点数量: {len(fpn_data.get('nodes', []))}")
    print(f"单元数量: {len(fpn_data.get('elements', []))}")
    print(f"材料数量: {len(fpn_data.get('materials', []))}")
    print(f"约束数量: {len(fpn_data.get('constraints', []))}")
    print(f"荷载数量: {len(fpn_data.get('loads', []))}")
    
    print("\n✅ FPN解析测试完成!")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()