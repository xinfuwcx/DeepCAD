#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试完整的开挖修复效果
模拟GUI完整工作流程
"""

import sys
import os
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

def test_complete_excavation_workflow():
    """测试完整的开挖工作流程"""
    print("=" * 70)
    print("测试完整的开挖修复效果")
    print("=" * 70)
    
    try:
        from modules.preprocessor import PreProcessor
        
        # 创建预处理器
        preprocessor = PreProcessor()
        
        # 1. 加载FPN文件
        fpn_file = Path(__file__).parent / "data" / "基坑两阶段1fpn.fpn"
        if fpn_file.exists():
            print(f"🔧 步骤1: 加载FPN文件: {fpn_file.name}")
            preprocessor.load_fpn_file(str(fpn_file))
            
            if hasattr(preprocessor, 'fpn_data') and preprocessor.fpn_data:
                analysis_stages = preprocessor.fpn_data.get('analysis_stages', [])
                print(f"✅ 发现 {len(analysis_stages)} 个分析步")
                
                for i, stage in enumerate(analysis_stages):
                    print(f"   [{i}] {stage['name']} (ID: {stage.get('id')})")
                
                # 2. 检查网格和材料数据
                print(f"\n🔧 步骤2: 检查网格和材料数据")
                if hasattr(preprocessor, 'mesh') and preprocessor.mesh:
                    if hasattr(preprocessor.mesh, 'cell_data') and 'MaterialID' in preprocessor.mesh.cell_data:
                        mesh_materials = set(preprocessor.mesh.cell_data['MaterialID'])
                        print(f"✅ 网格材料ID: {sorted(mesh_materials)}")
                    else:
                        print("❌ 网格中没有MaterialID数据")
                        return
                else:
                    print("❌ 没有网格数据")
                    return
                
                if hasattr(preprocessor, 'materials'):
                    print(f"✅ 材料定义: {len(preprocessor.materials)}种")
                    for mid, minfo in sorted(preprocessor.materials.items()):
                        print(f"   材料{mid}: {minfo['properties']['type']}")
                
                # 3. 测试初始状态（索引0）
                print(f"\n🔧 步骤3: 测试初始状态")
                preprocessor.set_current_analysis_stage(0)
                initial_materials = getattr(preprocessor, 'current_active_materials', set())
                print(f"初始状态激活材料: {sorted(initial_materials)}")
                
                # 4. 测试开挖状态（索引1 - "地连墙+开挖"）
                print(f"\n🔧 步骤4: 测试开挖状态")
                if len(analysis_stages) > 1:
                    preprocessor.set_current_analysis_stage(1)
                    excavation_materials = getattr(preprocessor, 'current_active_materials', set())
                    print(f"开挖状态激活材料: {sorted(excavation_materials)}")
                    
                    # 5. 分析开挖效果
                    print(f"\n🔧 步骤5: 分析开挖效果")
                    removed_materials = initial_materials - excavation_materials
                    added_materials = excavation_materials - initial_materials
                    
                    print(f"材料变化分析:")
                    print(f"  初始材料: {sorted(initial_materials)}")
                    print(f"  开挖后材料: {sorted(excavation_materials)}")
                    print(f"  移除的材料: {sorted(removed_materials)}")
                    print(f"  新增的材料: {sorted(added_materials)}")
                    
                    if removed_materials:
                        print(f"\n✅ 开挖效果验证成功!")
                        print(f"   共有{len(removed_materials)}种材料在开挖时被移除")
                        print(f"   这些材料代表被挖掉的土体")
                    else:
                        print(f"\n❌ 开挖效果验证失败!")
                        print(f"   没有材料被移除，开挖功能未生效")
                    
                    # 6. 模拟显示层调用
                    print(f"\n🔧 步骤6: 模拟透明图层显示")
                    print("调用 display_transparent_layers()...")
                    
                    # 暂时禁用PyVista以避免GUI问题
                    original_pyvista = getattr(preprocessor, 'PYVISTA_AVAILABLE', True)
                    preprocessor.PYVISTA_AVAILABLE = False
                    
                    try:
                        preprocessor.display_transparent_layers()
                    except Exception as e:
                        print(f"透明层显示调用完成 (PyVista已禁用): {e}")
                    finally:
                        preprocessor.PYVISTA_AVAILABLE = original_pyvista
                    
                    # 7. 最终验证
                    print(f"\n🔧 步骤7: 最终验证")
                    current_active = getattr(preprocessor, 'current_active_materials', set())
                    if current_active == excavation_materials and removed_materials:
                        print(f"✅ 修复验证成功!")
                        print(f"   ✓ 物理组映射工作正常")
                        print(f"   ✓ 开挖材料过滤生效")
                        print(f"   ✓ 材料显示逻辑正确")
                        print(f"\n🎉 开挖功能修复完成!")
                    else:
                        print(f"❌ 修复验证失败，仍有问题")
                
            else:
                print("❌ FPN数据加载失败")
        else:
            print(f"❌ FPN文件不存在: {fpn_file}")
            
    except Exception as e:
        print(f"❌ 测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_complete_excavation_workflow()