#!/usr/bin/env python3
"""
测试物理组激活逻辑的脚本
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'example2'))

# 避免导入PyQt6的GUI组件
import importlib.util
spec = importlib.util.spec_from_file_location("preprocessor", "example2/modules/preprocessor.py")
preprocessor_module = importlib.util.module_from_spec(spec)

# 临时设置PyQt6为不可用以避免GUI依赖
import sys
sys.modules['PyQt6'] = None
sys.modules['PyQt6.QtWidgets'] = None
sys.modules['PyQt6.QtCore'] = None

spec.loader.exec_module(preprocessor_module)

def test_physics_groups():
    """测试物理组激活逻辑"""
    print("=== 测试物理组激活逻辑 ===")
    
    # 创建预处理器实例
    preprocessor = preprocessor_module.PreProcessor()
    
    # 使用示例数据
    fpn_data = preprocessor.create_sample_fpn_data()
    
    # 添加默认分析步
    fpn_data['analysis_stages'] = preprocessor.create_default_analysis_stages()
    
    # 设置数据
    preprocessor.fpn_data = fpn_data
    
    print(f"\n总共有 {len(fpn_data['analysis_stages'])} 个分析步")
    
    # 测试每个分析步的物理组激活情况
    for stage in fpn_data['analysis_stages']:
        print(f"\n--- 测试阶段 {stage['id']}: {stage['name']} ---")
        
        # 测试物理组激活逻辑
        active_groups = preprocessor.determine_active_groups_for_stage(stage)
        
        print(f"✅ 最终结果: {active_groups}")
        print(f"   材料组: {active_groups['materials']}")
        print(f"   荷载组: {active_groups['loads']}")
        print(f"   边界组: {active_groups['boundaries']}")

if __name__ == "__main__":
    test_physics_groups()
