#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
简化测试开挖阶段材料过滤功能
"""

class MockPreProcessor:
    def __init__(self):
        self.materials = {}
        self.current_active_materials = set()
        self.current_stage_data = None

    def intelligent_material_selection(self, stage_name: str):
        """简化版的材料选择逻辑"""
        stage_name_lower = stage_name.lower()
        
        # 首先尝试使用分析步中的active_materials
        stage_info = getattr(self, 'current_stage_data', None)
        if stage_info and 'active_materials' in stage_info and stage_info['active_materials']:
            active_materials_from_stage = set(stage_info['active_materials'])
            print(f"从分析步数据获取激活材料: {sorted(list(active_materials_from_stage))}")
            
            if active_materials_from_stage:
                self.current_active_materials = active_materials_from_stage
            else:
                # 智能推断：开挖阶段通常保留支护结构和部分土体
                print("未找到active_materials，智能推断开挖后激活材料")
                self.current_active_materials = set()
                
                for mat_id, mat_info in self.materials.items():
                    mat_type = mat_info['properties']['type']
                    
                    # 策略1：保留所有支护结构
                    if mat_type in ['concrete', 'steel']:
                        self.current_active_materials.add(mat_id)
                        continue
                    
                    # 策略2：对于土体，移除浅层材料（通常是被开挖的）
                    if mat_type == 'soil':
                        # 假设材料ID越小，深度越浅，越可能被开挖
                        # 移除前30%的土体材料作为开挖区域
                        soil_materials = [mid for mid, info in self.materials.items() 
                                        if info['properties']['type'] == 'soil']
                        soil_materials.sort()
                        
                        # 移除前30%的土体（或至少1个）
                        remove_count = max(1, len(soil_materials) // 3)
                        materials_to_remove = soil_materials[:remove_count]
                        
                        if mat_id not in materials_to_remove:
                            self.current_active_materials.add(mat_id)
                
                print(f"智能推断激活材料: {sorted(self.current_active_materials)}")
                
                # 计算智能推断移除的材料
                all_soil = {mid for mid, info in self.materials.items() 
                           if info['properties']['type'] == 'soil'}
                removed_soil = all_soil - self.current_active_materials
                if removed_soil:
                    print(f"💡 智能推断移除土体: {sorted(removed_soil)}")
            
            # 计算和报告被开挖移除的材料
            all_soil_materials = set()
            for mat_id, mat_info in self.materials.items():
                if mat_info['properties']['type'] == 'soil':
                    all_soil_materials.add(mat_id)
            
            removed_materials = all_soil_materials - self.current_active_materials
            if removed_materials:
                print(f"🗑️  开挖移除的土体材料: {sorted(removed_materials)}")
                print(f"✅ 开挖效果确认：{len(removed_materials)}种土体材料将被完全隐藏")
            else:
                print(f"⚠️  警告：没有土体材料被移除，可能开挖逻辑有问题")

        elif '支护' in stage_name_lower or '围护' in stage_name_lower or '墙' in stage_name_lower:
            # 支护分析：显示结构材料
            print("智能选择: 支护阶段 - 结构材料")
            self.current_active_materials = set()
            for mat_id, mat_info in self.materials.items():
                if mat_info['properties']['type'] == 'concrete':
                    self.current_active_materials.add(mat_id)

        else:
            # 默认显示所有材料
            print("智能选择: 默认 - 所有材料")
            self.current_active_materials = set(self.materials.keys())

        print(f"智能选择结果: {self.current_active_materials}")


def test_excavation_fix():
    """测试开挖修复逻辑"""
    print("测试开挖阶段材料过滤功能...")
    
    # 创建预处理器实例
    preprocessor = MockPreProcessor()
    
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
    success = test_excavation_fix()
    print(f"\n测试结果: {'✅ 通过' if success else '❌ 失败'}")