#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试分析步解析功能
"""

import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from core.optimized_fpn_parser import OptimizedFPNParser

def test_analysis_stages():
    """测试分析步解析"""
    print("🧪 测试分析步解析功能")
    print("=" * 50)
    
    # 创建解析器
    parser = OptimizedFPNParser()
    
    # 解析FPN文件
    fpn_file = project_root / "data" / "基坑两阶段1fpn.fpn"
    
    if not fpn_file.exists():
        print(f"❌ FPN文件不存在: {fpn_file}")
        return
    
    print(f"📄 解析文件: {fpn_file.name}")
    
    try:
        result = parser.parse_file_streaming(str(fpn_file))
        
        print(f"✅ 解析完成!")
        print(f"  节点数: {len(result['nodes'])}")
        print(f"  单元数: {len(result['elements'])}")
        print(f"  网格集合数: {len(result.get('mesh_sets', {}))}")
        
        # 检查分析步
        analysis_stages = result.get('analysis_stages', [])
        print(f"\n🔍 分析步信息:")
        print(f"  发现 {len(analysis_stages)} 个分析步")
        
        for i, stage in enumerate(analysis_stages):
            print(f"\n  分析步 {i+1}:")
            print(f"    ID: {stage.get('id', 'N/A')}")
            print(f"    名称: {stage.get('name', 'N/A')}")
            print(f"    类型: {stage.get('type', 'N/A')}")
            print(f"    激活材料: {stage.get('active_materials', [])}")
            print(f"    激活荷载: {stage.get('active_loads', [])}")
            print(f"    激活边界: {stage.get('active_boundaries', [])}")
        
        # 检查网格集合
        mesh_sets = result.get('mesh_sets', {})
        if mesh_sets:
            print(f"\n🔍 网格集合信息:")
            print(f"  发现 {len(mesh_sets)} 个网格集合")
            for mesh_id, mesh_info in list(mesh_sets.items())[:10]:  # 只显示前10个
                print(f"    ID {mesh_id}: {mesh_info.get('name', 'N/A')}")
            if len(mesh_sets) > 10:
                print(f"    ... 还有 {len(mesh_sets) - 10} 个")
        
        return True
        
    except Exception as e:
        print(f"❌ 解析失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_analysis_stages()
    sys.exit(0 if success else 1)
