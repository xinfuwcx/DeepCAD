#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分析步和物理组测试脚本
用于验证分析步导入和物理组显示修复
"""

import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from example2.modules.preprocessor import PreProcessor

def test_analysis_stages():
    """测试分析步和物理组功能"""
    print("=" * 60)
    print("分析步和物理组测试")
    print("=" * 60)
    
    # 创建前处理器
    preprocessor = PreProcessor()
    
    # 查找项目中的FPN文件
    fpn_files = list(Path("E:\\DeepCAD").rglob("*.fpn"))
    
    if fpn_files:
        fpn_file = fpn_files[0]
        print(f"测试文件: {fpn_file}")
        
        try:
            # 解析FPN文件
            print("\n1. 解析FPN文件...")
            fpn_data = preprocessor.parse_fpn_file(str(fpn_file))
            
            # 检查分析步解析结果
            analysis_stages = fpn_data.get('analysis_stages', [])
            print(f"\n2. 分析步解析结果:")
            print(f"   找到 {len(analysis_stages)} 个分析步")
            
            for i, stage in enumerate(analysis_stages):
                print(f"   步骤{i+1}: ID={stage.get('id')}, 名称='{stage.get('name')}', 类型={stage.get('type')}, 激活={stage.get('active')}")
                if 'groups' in stage:
                    print(f"           关联组: {len(stage['groups'])}个")
                    for group in stage['groups']:
                        print(f"             - 组ID={group.get('group_id')}, 类型={group.get('group_type')}, 激活={group.get('active')}")
            
            # 检查物理组信息
            print(f"\n3. 物理组信息:")
            material_groups = fpn_data.get('material_groups', {})
            load_groups = fpn_data.get('load_groups', {})
            boundary_groups = fpn_data.get('boundary_groups', {})
            
            print(f"   材料组: {len(material_groups)}个 - {list(material_groups.keys())}")
            print(f"   荷载组: {len(load_groups)}个 - {list(load_groups.keys())}")
            print(f"   边界组: {len(boundary_groups)}个 - {list(boundary_groups.keys())}")
            
            # 测试分析步切换和物理组激活
            print(f"\n4. 测试分析步切换:")
            if analysis_stages:
                for stage in analysis_stages[:3]:  # 测试前3个分析步
                    stage_id = stage.get('id')
                    stage_name = stage.get('name')
                    
                    print(f"\n   切换到分析步{stage_id}: {stage_name}")
                    preprocessor.set_current_analysis_stage(stage_id)
                    
                    # 获取当前分析步
                    current_stage = preprocessor.get_current_analysis_stage()
                    if current_stage:
                        print(f"   当前分析步: {current_stage.get('name')}")
                        
                        # 确定激活的物理组
                        active_groups = preprocessor.determine_active_groups_for_stage(current_stage)
                        print(f"   激活的物理组: {active_groups}")
                        
                        # 应用物理组过滤（如果有网格）
                        if preprocessor.mesh:
                            preprocessor.filter_display_by_groups(active_groups)
                        else:
                            print("   (无网格数据，跳过过滤显示)")
            else:
                print("   没有找到分析步，测试默认分析步...")
                
                # 测试默认分析步
                default_stages = preprocessor.create_default_analysis_stages()
                print(f"   创建了{len(default_stages)}个默认分析步:")
                for stage in default_stages:
                    print(f"     - {stage['name']}: {stage['description']}")
            
            # 测试获取可用分析步
            print(f"\n5. 获取可用分析步:")
            available_stages = preprocessor.get_available_analysis_stages()
            print(f"   可用分析步: {available_stages}")
            
            print(f"\n测试完成!")
            
        except Exception as e:
            print(f"测试失败: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("未找到FPN文件，测试默认分析步功能...")
        
        # 测试默认功能
        default_stages = preprocessor.create_default_analysis_stages()
        print(f"默认分析步: {len(default_stages)}个")
        for stage in default_stages:
            print(f"  - {stage['name']}: {stage['description']}")

if __name__ == "__main__":
    test_analysis_stages()