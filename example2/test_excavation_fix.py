#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试开挖土体移除修复
"""

import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from core.optimized_fpn_parser import OptimizedFPNParser
from modules.preprocessor import PreProcessor

def test_excavation_fix():
    """测试开挖土体移除修复"""
    print("测试开挖土体移除修复")
    print("=" * 60)
    
    # 1. 解析FPN文件获取分析步
    parser = OptimizedFPNParser()
    fpn_file = project_root / "data" / "基坑两阶段1fpn.fpn"
    
    if not fpn_file.exists():
        print(f"FPN文件不存在: {fpn_file}")
        return False
    
    print(f"解析文件: {fpn_file.name}")
    
    try:
        result = parser.parse_file_streaming(str(fpn_file))
        analysis_stages = result.get('analysis_stages', [])
        
        print(f"解析完成，发现 {len(analysis_stages)} 个分析步")
        
        # 2. 创建前处理器
        preprocessor = PreProcessor()
        
        # 模拟设置材料数据
        preprocessor.materials = {
            1: {'name': '粘土层1', 'properties': {'type': 'soil', 'color': 'brown'}},
            2: {'name': '砂土层1', 'properties': {'type': 'soil', 'color': 'yellow'}}, 
            3: {'name': '粘土层2', 'properties': {'type': 'soil', 'color': 'red'}},
            4: {'name': '砂土层2', 'properties': {'type': 'soil', 'color': 'orange'}},
            10: {'name': '围护墙', 'properties': {'type': 'concrete', 'color': 'gray'}},
            11: {'name': '支撑结构', 'properties': {'type': 'concrete', 'color': 'lightgray'}}
        }
        
        # 3. 测试不同分析步
        test_stages = []
        for stage in analysis_stages:
            stage_name = stage.get('name', '').lower()
            if any(keyword in stage_name for keyword in ['初始', '开挖', '支护']):
                test_stages.append(stage)
                if len(test_stages) >= 3:  # 只测试前3个相关步骤
                    break
        
        print(f"\n测试以下分析步:")
        for i, stage in enumerate(test_stages):
            print(f"  {i+1}. {stage.get('name', 'N/A')} (ID: {stage.get('id', 'N/A')})")
        
        # 4. 逐个测试分析步的材料处理
        for i, stage in enumerate(test_stages):
            print(f"\n测试分析步 {i+1}: {stage.get('name', 'N/A')}")
            print("-" * 40)
            
            # 保存分析步数据
            preprocessor.current_stage_data = stage
            
            # 调用智能材料选择
            stage_name = stage.get('name', '')
            preprocessor.intelligent_material_selection(stage_name)
            
            print(f"  当前激活材料: {sorted(preprocessor.current_active_materials) if hasattr(preprocessor, 'current_active_materials') else '无'}")
            
            # 检查是否为开挖阶段
            if '开挖' in stage_name.lower():
                # 检查激活材料信息
                active_materials = stage.get('active_materials', [])
                print(f"  分析步中的激活材料: {sorted(active_materials)}")
                
                # 计算被移除的材料
                all_soil_materials = {mat_id for mat_id, mat_info in preprocessor.materials.items() 
                                    if mat_info['properties']['type'] == 'soil'}
                if active_materials:
                    removed_materials = all_soil_materials - set(active_materials)
                    print(f"  应移除的土体材料: {sorted(removed_materials)}")
                    
                    if removed_materials:
                        print(f"  开挖逻辑正确：移除了 {len(removed_materials)} 种土体材料")
                    else:
                        print(f"  开挖逻辑可能有问题：没有材料被移除")
                else:
                    print(f"  分析步数据中未找到active_materials信息")
        
        print(f"\n测试完成")
        return True
        
    except Exception as e:
        print(f"测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_excavation_fix()
    print(f"\n{'='*60}")
    print(f"测试结果: {'通过' if success else '失败'}")
    sys.exit(0 if success else 1)