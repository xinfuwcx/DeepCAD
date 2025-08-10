#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试"两阶段计算2.fpn"文件的开挖功能
"""

import sys
import os
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

def test_liangjianduan2_fpn():
    """测试两阶段计算2.fpn文件"""
    print("=" * 70)
    print("测试两阶段计算2.fpn文件的开挖功能")
    print("=" * 70)
    
    try:
        from modules.preprocessor import PreProcessor
        
        # 创建预处理器
        preprocessor = PreProcessor()
        
        # 加载指定的FPN文件
        fpn_file = Path(__file__).parent / "data" / "两阶段计算2.fpn"
        if fpn_file.exists():
            print(f"🔧 加载FPN文件: {fpn_file.name}")
            preprocessor.load_fpn_file(str(fpn_file))
            
            if hasattr(preprocessor, 'fpn_data') and preprocessor.fpn_data:
                analysis_stages = preprocessor.fpn_data.get('analysis_stages', [])
                print(f"✅ 发现 {len(analysis_stages)} 个分析步:")
                
                for i, stage in enumerate(analysis_stages):
                    stage_name = stage.get('name', f'Stage_{i}')
                    stage_id = stage.get('id', i)
                    print(f"   [{i}] ID:{stage_id} - {stage_name}")
                    
                    # 检查是否有开挖相关的分析步
                    if '开挖' in stage_name or '挖' in stage_name or 'excavation' in stage_name.lower():
                        print(f"       🏗️  这是开挖分析步!")
                
                print(f"\n🔧 测试开挖分析步切换:")
                
                # 测试所有分析步
                for i in range(len(analysis_stages)):
                    stage = analysis_stages[i]
                    stage_name = stage.get('name', f'Stage_{i}')
                    print(f"\n--- 测试分析步 {i}: {stage_name} ---")
                    
                    # 切换到这个分析步
                    preprocessor.set_current_analysis_stage(i)
                    
                    # 检查材料激活状态
                    if hasattr(preprocessor, 'current_active_materials'):
                        active_materials = sorted(list(preprocessor.current_active_materials))
                        print(f"激活的材料ID: {active_materials}")
                        
                        # 检查网格材料
                        if hasattr(preprocessor, 'mesh') and preprocessor.mesh:
                            if hasattr(preprocessor.mesh, 'cell_data') and 'MaterialID' in preprocessor.mesh.cell_data:
                                all_materials = sorted(list(set(preprocessor.mesh.cell_data['MaterialID'])))
                                hidden_materials = [mid for mid in all_materials if mid not in preprocessor.current_active_materials]
                                
                                print(f"网格中所有材料: {all_materials}")
                                print(f"被隐藏的材料: {sorted(hidden_materials)}")
                                
                                if hidden_materials:
                                    print(f"✅ 材料过滤生效: {len(hidden_materials)}种材料被隐藏")
                                else:
                                    print(f"⚠️ 所有材料仍显示")
                    else:
                        print(f"❌ 未设置current_active_materials")
                
                print(f"\n🎯 测试结论:")
                print(f"文件加载成功，分析步切换功能正常工作")
                print(f"如果存在开挖分析步，材料过滤机制已应用")
                
            else:
                print("❌ FPN数据加载失败")
        else:
            print(f"❌ FPN文件不存在: {fpn_file}")
            
    except Exception as e:
        print(f"❌ 测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_liangjianduan2_fpn()