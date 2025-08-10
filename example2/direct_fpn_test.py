#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接测试两阶段计算2.fpn文件 - 避免相对导入问题
"""
import sys
import os
from pathlib import Path

# 设置工作目录
current_dir = Path(__file__).parent
os.chdir(current_dir)
sys.path.insert(0, str(current_dir))

def test_fpn_direct():
    """直接测试FPN文件加载和分析步"""
    print("=" * 60)
    print("直接测试两阶段计算2.fpn文件")
    print("=" * 60)
    
    try:
        # 直接导入，避免相对导入
        from modules.preprocessor import PreProcessor
        
        # 创建预处理器
        preprocessor = PreProcessor()
        
        # 检查FPN文件
        fpn_file = current_dir / "data" / "两阶段计算2.fpn"
        print(f"FPN文件路径: {fpn_file}")
        print(f"文件存在: {fpn_file.exists()}")
        
        if fpn_file.exists():
            print(f"\n🔧 开始加载FPN文件...")
            preprocessor.load_fpn_file(str(fpn_file))
            
            if hasattr(preprocessor, 'fpn_data') and preprocessor.fpn_data:
                analysis_stages = preprocessor.fpn_data.get('analysis_stages', [])
                print(f"✅ 成功加载! 发现 {len(analysis_stages)} 个分析步:")
                
                # 显示所有分析步
                for i, stage in enumerate(analysis_stages):
                    stage_name = stage.get('name', f'阶段{i}')
                    stage_id = stage.get('id', i)
                    print(f"   [{i}] ID:{stage_id} - {stage_name}")
                    
                    # 标记开挖相关分析步
                    if any(keyword in stage_name for keyword in ['开挖', '挖', '土方', 'excavation']):
                        print(f"       🏗️  >>> 开挖相关分析步 <<<")
                
                print(f"\n🎯 测试分析步切换和材料过滤...")
                
                # 记录初始状态
                initial_materials = None
                
                # 测试每个分析步
                for i in range(len(analysis_stages)):
                    stage = analysis_stages[i]
                    stage_name = stage.get('name', f'阶段{i}')
                    
                    print(f"\n--- 分析步 {i}: {stage_name} ---")
                    
                    try:
                        # 切换分析步
                        preprocessor.set_current_analysis_stage(i)
                        
                        # 获取当前激活材料
                        if hasattr(preprocessor, 'current_active_materials') and preprocessor.current_active_materials:
                            current_materials = sorted(list(preprocessor.current_active_materials))
                            print(f"激活材料: {current_materials}")
                            
                            # 记录第一个分析步作为基准
                            if initial_materials is None:
                                initial_materials = set(current_materials)
                                print(f"基准材料集合: {sorted(initial_materials)}")
                            else:
                                # 比较材料变化
                                current_set = set(current_materials)
                                added = current_set - initial_materials
                                removed = initial_materials - current_set
                                
                                if removed:
                                    print(f"🗑️  移除材料: {sorted(removed)} (可能是开挖效果)")
                                if added:
                                    print(f"➕ 新增材料: {sorted(added)}")
                                if not removed and not added:
                                    print(f"📋 材料无变化")
                                
                                # 检查是否是开挖效果
                                is_excavation = any(keyword in stage_name for keyword in ['开挖', '挖', '土方'])
                                if is_excavation and removed:
                                    print(f"✅ 开挖效果确认: {len(removed)}种材料被移除")
                                elif is_excavation and not removed:
                                    print(f"⚠️  开挖分析步但无材料移除")
                        else:
                            print(f"❌ 未找到激活材料信息")
                            
                    except Exception as e:
                        print(f"❌ 分析步切换失败: {e}")
                
                print(f"\n🏁 测试完成!")
                print(f"开挖材料过滤修复验证: 查看上述输出中的'移除材料'信息")
                
            else:
                print("❌ FPN数据解析失败")
        else:
            print("❌ FPN文件不存在")
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_fpn_direct()
    input("\n按回车键退出...")  # 防止窗口立即关闭