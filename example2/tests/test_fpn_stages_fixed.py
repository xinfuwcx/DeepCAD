#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试修复后的FPN分析步读取功能
"""

import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from example2.modules.preprocessor import PreProcessor
from example2.modules.analyzer import Analyzer

def test_fpn_stages():
    """测试FPN分析步功能"""
    print("=" * 60)
    print("测试修复后的FPN分析步读取")
    print("=" * 60)
    
    # 创建模块
    preprocessor = PreProcessor()
    analyzer = Analyzer()
    
    # 测试实际的FPN文件
    fpn_file = Path("E:/DeepCAD/example2/data/基坑两阶段1fpn.fpn")
    
    if fpn_file.exists():
        print(f"测试文件: {fpn_file}")
        
        try:
            # 解析FPN文件
            print("\n1. 解析FPN文件...")
            fpn_data = preprocessor.parse_fpn_file(str(fpn_file))
            
            # 检查分析步解析结果
            analysis_stages = fpn_data.get('analysis_stages', [])
            analysis_control = fpn_data.get('analysis_control', {})
            
            print(f"\n2. 分析步解析结果:")
            print(f"   找到 {len(analysis_stages)} 个分析步")
            
            for stage in analysis_stages:
                print(f"   步骤{stage.get('id')}: '{stage.get('name')}' (类型: {stage.get('type')}, 激活: {stage.get('active')})")
            
            if analysis_control:
                print(f"\n3. 分析控制信息:")
                print(f"   控制ID: {analysis_control.get('id')}")
                print(f"   控制名称: {analysis_control.get('name')}")
                print(f"   包含阶段: {analysis_control.get('stage_ids', [])}")
            
            # 测试分析器加载
            print(f"\n4. 测试分析器加载FPN数据:")
            analyzer.load_fpn_analysis_steps(fpn_data)
            
            print(f"   分析器中的分析步数量: {len(analyzer.analysis_steps)}")
            for i, step in enumerate(analyzer.analysis_steps):
                print(f"   步骤{i+1}: {step.name} (类型: {step.step_type})")
                fpn_stage_id = step.parameters.get('fpn_stage_id')
                if fpn_stage_id:
                    print(f"           对应FPN步骤ID: {fpn_stage_id}")
            
            # 显示分析摘要
            print(f"\n5. 分析摘要:")
            summary = analyzer.get_fpn_analysis_summary()
            print(summary)
            
            print(f"\n测试成功! 成功解析了基坑两阶段FPN文件")
            
        except Exception as e:
            print(f"测试失败: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"找不到测试文件: {fpn_file}")

if __name__ == "__main__":
    test_fpn_stages()