#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
from pathlib import Path

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

try:
    # 测试前处理器的智能材料选择逻辑
    from modules.preprocessor import PreProcessor
    
    print("测试开挖土体移除逻辑...")
    
    # 创建前处理器实例
    preprocessor = PreProcessor()
    
    # 设置测试材料数据
    preprocessor.materials = {
        1: {'name': '土体1', 'properties': {'type': 'soil', 'color': 'brown'}},
        2: {'name': '土体2', 'properties': {'type': 'soil', 'color': 'yellow'}}, 
        3: {'name': '土体3', 'properties': {'type': 'soil', 'color': 'red'}},
        10: {'name': '围护墙', 'properties': {'type': 'concrete', 'color': 'gray'}}
    }
    
    # 模拟开挖阶段数据
    excavation_stage = {
        'id': 2,
        'name': '第一次开挖(-5m)',
        'type': 1,
        'active_materials': [1, 3, 10]  # 只保留材料1,3,10，移除材料2
    }
    
    print(f"模拟开挖阶段: {excavation_stage['name']}")
    print(f"原始材料: {list(preprocessor.materials.keys())}")
    print(f"开挖后激活材料: {excavation_stage['active_materials']}")
    
    # 设置当前分析步数据
    preprocessor.current_stage_data = excavation_stage
    
    # 调用智能材料选择
    preprocessor.intelligent_material_selection(excavation_stage['name'])
    
    # 检查结果
    if hasattr(preprocessor, 'current_active_materials'):
        print(f"实际激活材料: {sorted(preprocessor.current_active_materials)}")
        
        # 计算被移除的土体材料
        all_soil_materials = {mat_id for mat_id, mat_info in preprocessor.materials.items() 
                            if mat_info['properties']['type'] == 'soil'}
        active_soil_materials = preprocessor.current_active_materials & all_soil_materials
        removed_soil_materials = all_soil_materials - active_soil_materials
        
        print(f"全部土体材料: {sorted(all_soil_materials)}")
        print(f"仍激活土体材料: {sorted(active_soil_materials)}")
        print(f"被移除土体材料: {sorted(removed_soil_materials)}")
        
        if removed_soil_materials:
            print("测试通过: 成功移除了开挖区域的土体材料")
            expected_removed = {2}  # 预期移除材料2
            if removed_soil_materials == expected_removed:
                print("测试完全通过: 移除的材料符合预期")
            else:
                print(f"测试部分通过: 预期移除 {expected_removed}, 实际移除 {removed_soil_materials}")
        else:
            print("测试失败: 没有移除任何土体材料")
    else:
        print("测试失败: 未找到current_active_materials属性")
    
    print("测试完成")

except Exception as e:
    print(f"测试出错: {e}")
    import traceback
    traceback.print_exc()