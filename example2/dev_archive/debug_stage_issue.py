#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
调试分析步切换时的材料过滤问题
"""

import sys
import os
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

def debug_stage_switching_issue():
    """调试分析步切换问题"""
    print("=" * 80)
    print("调试分析步切换时的材料过滤问题")
    print("=" * 80)
    
    try:
        from modules.preprocessor import PreProcessor
        
        # 创建预处理器
        preprocessor = PreProcessor()
        
        # 加载FPN文件
        fpn_file = Path(__file__).parent / "data" / "基坑两阶段1fpn.fpn"
        if fpn_file.exists():
            print(f"\n1. 加载FPN文件: {fpn_file.name}")
            preprocessor.load_fpn_file(str(fpn_file))
            
            # 检查FPN数据是否加载成功
            if hasattr(preprocessor, 'fpn_data') and preprocessor.fpn_data:
                analysis_stages = preprocessor.fpn_data.get('analysis_stages', [])
                print(f"\n2. 分析步数据检查:")
                print(f"   发现 {len(analysis_stages)} 个分析步")
                
                for i, stage in enumerate(analysis_stages):
                    print(f"   [{i}] {stage['name']} (ID: {stage.get('id')})")
                    if 'active_materials' in stage:
                        print(f"       active_materials: {stage['active_materials']}")
                    else:
                        print(f"       无active_materials字段")
                
                # 检查材料数据
                print(f"\n3. 材料数据检查:")
                if hasattr(preprocessor, 'materials'):
                    print(f"   发现 {len(preprocessor.materials)} 种材料:")
                    for mat_id, mat_info in sorted(preprocessor.materials.items()):
                        print(f"   材料ID {mat_id}: {mat_info['properties']['type']}")
                else:
                    print("   未找到材料数据")
                
                # 模拟GUI分析步切换
                print(f"\n4. 模拟GUI分析步切换到'地连墙+开挖':")
                if len(analysis_stages) > 1:
                    # 选择开挖分析步（通常是索引1）
                    target_stage_index = 1
                    target_stage = analysis_stages[target_stage_index]
                    
                    print(f"   目标分析步: [{target_stage_index}] {target_stage['name']}")
                    print(f"   调用 set_current_analysis_stage({target_stage_index})")
                    
                    # 设置分析步
                    preprocessor.set_current_analysis_stage(target_stage_index)
                    
                    # 检查结果
                    print(f"\n5. 检查分析步切换结果:")
                    if hasattr(preprocessor, 'current_active_materials'):
                        print(f"   激活的材料ID: {sorted(preprocessor.current_active_materials)}")
                        
                        # 检查是否正确应用了材料过滤
                        if hasattr(preprocessor, 'materials'):
                            all_material_ids = set(preprocessor.materials.keys())
                            filtered_out_ids = all_material_ids - preprocessor.current_active_materials
                            
                            print(f"   所有材料ID: {sorted(all_material_ids)}")
                            print(f"   被过滤的材料ID: {sorted(filtered_out_ids)}")
                            
                            if filtered_out_ids:
                                print(f"   ✅ 材料过滤正常工作，{len(filtered_out_ids)}种材料被过滤")
                            else:
                                print(f"   ❌ 材料过滤未生效，所有材料仍然显示")
                    else:
                        print("   ❌ 未找到current_active_materials属性")
                    
                    # 检查显示状态
                    print(f"\n6. 检查网格显示状态:")
                    if hasattr(preprocessor, 'mesh') and preprocessor.mesh:
                        if hasattr(preprocessor.mesh, 'cell_data') and 'MaterialID' in preprocessor.mesh.cell_data:
                            mesh_material_ids = set(preprocessor.mesh.cell_data['MaterialID'])
                            print(f"   网格中的材料ID: {sorted(mesh_material_ids)}")
                            
                            if hasattr(preprocessor, 'current_active_materials'):
                                visible_materials = mesh_material_ids & preprocessor.current_active_materials
                                hidden_materials = mesh_material_ids - preprocessor.current_active_materials
                                print(f"   应该显示的材料ID: {sorted(visible_materials)}")
                                print(f"   应该隐藏的材料ID: {sorted(hidden_materials)}")
                                
                                if hidden_materials:
                                    print(f"   ✅ 预期有 {len(hidden_materials)} 种材料被隐藏")
                                else:
                                    print(f"   ❌ 问题确认：没有材料被隐藏！")
                        else:
                            print("   ❌ 网格中没有MaterialID数据")
                    else:
                        print("   ❌ 网格未加载")
                        
                else:
                    print("   ❌ 没有足够的分析步进行测试")
                    
            else:
                print("   ❌ FPN数据加载失败")
                
        else:
            print(f"   ❌ FPN文件不存在: {fpn_file}")
            
    except Exception as e:
        print(f"\n❌ 调试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_stage_switching_issue()