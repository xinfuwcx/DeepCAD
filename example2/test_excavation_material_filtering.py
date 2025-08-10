#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试开挖阶段材料过滤功能的修复
"""

import sys
from pathlib import Path

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# 禁用GUI以避免初始化问题
import os
os.environ['QT_QPA_PLATFORM_PLUGIN_PATH'] = ''

try:
    from modules.preprocessor import PreProcessor
    import numpy as np
    
    def test_excavation_material_filtering():
        """测试开挖阶段材料过滤功能"""
        print("=== 开挖阶段材料过滤功能测试 ===")
        
        # 创建预处理器实例
        preprocessor = PreProcessor()
        
        # 禁用GUI显示
        preprocessor.disable_gui = True
        
        # 模拟材料数据
        preprocessor.materials = {
            1: {'name': '浅层土', 'properties': {'type': 'soil', 'color': 'brown'}},
            2: {'name': '中层土1', 'properties': {'type': 'soil', 'color': 'yellow'}}, 
            3: {'name': '中层土2', 'properties': {'type': 'soil', 'color': 'orange'}},
            4: {'name': '深层土', 'properties': {'type': 'soil', 'color': 'red'}},
            10: {'name': '地连墙', 'properties': {'type': 'concrete', 'color': 'gray'}},
            11: {'name': '支撑梁', 'properties': {'type': 'concrete', 'color': 'silver'}},
            12: {'name': '锚杆', 'properties': {'type': 'steel', 'color': 'blue'}}
        }
        
        print("1. 初始化材料:")
        for mat_id, mat_info in preprocessor.materials.items():
            print(f"   材料{mat_id}: {mat_info['name']} ({mat_info['properties']['type']})")
        
        # 模拟开挖阶段数据
        excavation_stage = {
            'id': 2,
            'name': '第一层开挖',
            'type': 1,
            'active_materials': [2, 3, 4, 10, 11, 12]  # 移除了材料1（浅层土）
        }
        
        print(f"\n2. 模拟开挖阶段: {excavation_stage['name']}")
        print(f"   激活材料: {excavation_stage['active_materials']}")
        print(f"   移除材料: [1]")
        
        # 设置当前阶段数据
        preprocessor.current_stage_data = excavation_stage
        
        # 调用智能材料选择
        print("\n3. 执行智能材料选择...")
        preprocessor.intelligent_material_selection(excavation_stage['name'])
        
        # 验证结果
        print("\n4. 验证结果:")
        if hasattr(preprocessor, 'current_active_materials'):
            active_materials = preprocessor.current_active_materials
            print(f"   当前激活材料: {sorted(active_materials)}")
            
            # 计算应该被移除的材料
            all_soil_materials = {mat_id for mat_id, mat_info in preprocessor.materials.items() 
                                if mat_info['properties']['type'] == 'soil'}
            removed_materials = all_soil_materials - active_materials
            
            print(f"   所有土体材料: {sorted(all_soil_materials)}")
            print(f"   被移除的土体材料: {sorted(removed_materials)}")
            
            if removed_materials == {1}:
                print("   ✅ 测试通过：正确移除了浅层土(材料1)")
                return True
            else:
                print("   ❌ 测试失败：移除的材料不符合预期")
                return False
        else:
            print("   ❌ 测试失败：未找到current_active_materials属性")
            return False

    if __name__ == "__main__":
        print("开始测试开挖阶段材料过滤功能...")
        success = test_excavation_material_filtering()
        print(f"\n测试结果: {'✅ 通过' if success else '❌ 失败'}")
        sys.exit(0 if success else 1)
        
except Exception as e:
    print(f"测试过程中发生错误: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)