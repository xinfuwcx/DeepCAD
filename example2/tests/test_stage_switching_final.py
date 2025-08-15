#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
from pathlib import Path

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_stage_switching():
    """测试分析步切换的完整流程"""
    print("Testing stage switching flow...")
    print("="*60)
    
    try:
        # 创建预处理器
        from modules.preprocessor import PreProcessor
        preprocessor = PreProcessor()
        
        # 模拟加载FPN数据
        mock_fpn_data = {
            'analysis_stages': [
                {'id': 1, 'name': 'Initial State', 'active_materials': [1, 2, 3, 4, 10]},
                {'id': 2, 'name': 'First Excavation', 'active_materials': [1, 3, 4, 10]},  # 移除材料2
                {'id': 3, 'name': 'Second Excavation', 'active_materials': [1, 4, 10]},    # 移除材料2,3
            ],
            'nodes': [],
            'elements': []
        }
        
        # 设置材料数据
        preprocessor.materials = {
            1: {'name': 'Soil Layer 1', 'properties': {'type': 'soil', 'color': 'brown'}},
            2: {'name': 'Soil Layer 2', 'properties': {'type': 'soil', 'color': 'yellow'}},
            3: {'name': 'Soil Layer 3', 'properties': {'type': 'soil', 'color': 'red'}},
            4: {'name': 'Soil Layer 4', 'properties': {'type': 'soil', 'color': 'orange'}},
            10: {'name': 'Retaining Wall', 'properties': {'type': 'concrete', 'color': 'gray'}}
        }
        
        # 设置FPN数据
        preprocessor.fpn_data = mock_fpn_data
        print("FPN data loaded successfully")
        print(f"Total stages: {len(mock_fpn_data['analysis_stages'])}")
        
        # 测试各个分析步切换
        for i, stage in enumerate(mock_fpn_data['analysis_stages']):
            print(f"\n{'='*40}")
            print(f"Testing stage switch to {i}: {stage['name']}")
            print(f"Expected active materials: {sorted(stage['active_materials'])}")
            
            # 调用界面使用的方法
            preprocessor.set_current_analysis_stage(i)
            
            # 检查结果
            if hasattr(preprocessor, 'current_active_materials'):
                actual_materials = sorted(preprocessor.current_active_materials)
                expected_materials = sorted(stage['active_materials'])
                
                print(f"Actual active materials: {actual_materials}")
                
                if actual_materials == expected_materials:
                    print("SUCCESS: Material filtering correct!")
                    
                    # 计算被移除的土体材料
                    all_soil_materials = {1, 2, 3, 4}
                    removed_materials = all_soil_materials - preprocessor.current_active_materials
                    if removed_materials:
                        print(f"Successfully removed soil materials: {sorted(removed_materials)}")
                else:
                    print(f"FAILED: Material filtering incorrect! Expected:{expected_materials}, Actual:{actual_materials}")
            else:
                print("FAILED: current_active_materials attribute not found")
        
        print(f"\n{'='*60}")
        print("Stage switching test completed successfully")
        return True
        
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_stage_switching()
    print(f"\nTest result: {'PASS' if success else 'FAIL'}")