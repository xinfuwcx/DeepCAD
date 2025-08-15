#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试GUI中的分析步切换功能
模拟用户在界面中切换到开挖分析步
"""

import sys
import os
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

def test_stage_switching():
    """测试分析步切换"""
    print("=" * 60)
    print("测试GUI分析步切换功能")
    print("=" * 60)
    
    try:
        from modules.preprocessor import PreProcessor
        
        # 创建预处理器
        preprocessor = PreProcessor()
        
        # 加载FPN文件
        fpn_file = Path(__file__).parent / "data" / "基坑两阶段1fpn.fpn"
        if fpn_file.exists():
            print(f"\\n加载FPN文件: {fpn_file.name}")
            preprocessor.load_fpn_file(str(fpn_file))
            
            # 检查分析步数据
            if hasattr(preprocessor, 'fpn_data') and preprocessor.fpn_data:
                analysis_stages = preprocessor.fpn_data.get('analysis_stages', [])
                print(f"\\n发现 {len(analysis_stages)} 个分析步:")
                for i, stage in enumerate(analysis_stages):
                    print(f"  [{i}] {stage['name']} (ID: {stage.get('id')})")
                
                # 测试切换到开挖分析步（索引1，对应"地连墙+开挖"）
                if len(analysis_stages) > 1:
                    print(f"\\n测试切换到开挖分析步...")
                    excavation_stage_index = 1
                    
                    print(f"调用: set_current_analysis_stage({excavation_stage_index})")
                    preprocessor.set_current_analysis_stage(excavation_stage_index)
                    
                    # 检查材料过滤状态
                    if hasattr(preprocessor, 'current_active_materials'):
                        print(f"\\n当前激活材料: {sorted(preprocessor.current_active_materials)}")
                        
                        # 检查是否有土体材料被移除（模拟开挖效果）
                        all_materials = set(preprocessor.materials.keys()) if hasattr(preprocessor, 'materials') else set()
                        soil_materials = set()
                        if hasattr(preprocessor, 'materials'):
                            for mat_id, mat_info in preprocessor.materials.items():
                                if 'soil' in mat_info.get('properties', {}).get('type', '').lower():
                                    soil_materials.add(mat_id)
                        
                        active_soil = preprocessor.current_active_materials & soil_materials
                        removed_soil = soil_materials - active_soil
                        
                        print(f"所有土体材料: {sorted(soil_materials)}")
                        print(f"激活土体材料: {sorted(active_soil)}")
                        print(f"移除土体材料: {sorted(removed_soil)}")
                        
                        if removed_soil:
                            print(f"\\n✅ 开挖效果验证成功: {len(removed_soil)}种土体材料被移除")
                        else:
                            print(f"\\n❌ 开挖效果验证失败: 没有土体材料被移除")
                            
                    else:
                        print("\\n❌ 未找到current_active_materials属性")
                        
                else:
                    print("\\n❌ 没有足够的分析步进行测试")
                    
            else:
                print("\\n❌ FPN数据加载失败")
                
        else:
            print(f"\\n❌ FPN文件不存在: {fpn_file}")
            
    except Exception as e:
        print(f"\\n❌ 测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_stage_switching()