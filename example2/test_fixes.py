#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试修复结果
"""

import sys
from pathlib import Path

# 设置编码
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

print("=== 测试修复结果 ===")

try:
    from modules.preprocessor import PreProcessor
    
    print("1. 测试分析步扩展...")
    preprocessor = PreProcessor()
    preprocessor.load_fpn_file('data/基坑fpn.fpn')
    
    # 检查分析步数量
    analysis_stages = preprocessor.fpn_data.get('analysis_stages', [])
    print(f"   分析步数量: {len(analysis_stages)}")
    
    for i, stage in enumerate(analysis_stages[:5]):  # 只显示前5个
        print(f"   {i+1}. {stage['name']} (ID: {stage['id']})")
    
    print("\n2. 测试智能物理组选择...")
    for stage in analysis_stages[:3]:  # 测试前3个分析步
        preprocessor.set_current_analysis_stage(stage['id'])
        active_groups = preprocessor.determine_active_groups_for_stage(stage)
        print(f"   分析步 '{stage['name']}': 激活组 {active_groups}")
    
    print("\n3. 测试材料颜色映射...")
    if hasattr(preprocessor.mesh, 'cell_data') and 'MaterialID' in preprocessor.mesh.cell_data:
        import numpy as np
        material_ids = np.unique(preprocessor.mesh.cell_data['MaterialID'])
        print(f"   发现材料ID: {sorted(list(material_ids))}")
        print(f"   网格包含 {len(material_ids)} 种不同材料")
    else:
        print("   材料ID信息未找到")
    
    print("\n✅ 所有修复测试完成！")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()