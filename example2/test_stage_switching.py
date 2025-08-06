#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试分析步切换功能
"""

import sys
from pathlib import Path
from PyQt6.QtWidgets import QApplication

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from core.optimized_fpn_parser import OptimizedFPNParser
from modules.preprocessor import PreProcessor

def test_stage_switching():
    """测试分析步切换功能"""
    print("🧪 测试分析步切换功能")
    print("=" * 50)

    # 创建QApplication
    app = QApplication(sys.argv)

    # 创建预处理器
    preprocessor = PreProcessor()
    
    # 解析FPN文件
    fpn_file = project_root / "data" / "基坑两阶段1fpn.fpn"
    
    if not fpn_file.exists():
        print(f"❌ FPN文件不存在: {fpn_file}")
        return False
    
    print(f"📄 加载FPN文件: {fpn_file.name}")
    
    try:
        # 加载FPN文件
        preprocessor.load_fpn_file(str(fpn_file))
        
        print(f"✅ FPN文件加载完成!")
        
        # 检查分析步
        analysis_stages = preprocessor.get_analysis_stages()
        print(f"\n🔍 分析步信息:")
        print(f"  发现 {len(analysis_stages)} 个分析步")
        
        for i, stage in enumerate(analysis_stages):
            print(f"\n  分析步 {i+1}:")
            print(f"    ID: {stage.get('id', 'N/A')}")
            print(f"    名称: {stage.get('name', 'N/A')}")
            print(f"    激活材料: {stage.get('active_materials', [])}")
        
        # 测试分析步切换
        print(f"\n🔄 测试分析步切换:")
        
        for i in range(len(analysis_stages)):
            print(f"\n  切换到分析步 {i+1}: {analysis_stages[i]['name']}")
            preprocessor.set_current_analysis_stage(i)
            
            # 检查当前激活的材料
            if hasattr(preprocessor, 'current_active_materials'):
                print(f"    当前激活材料: {preprocessor.current_active_materials}")
            else:
                print(f"    未设置激活材料")
        
        return True
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_stage_switching()
    sys.exit(0 if success else 1)
