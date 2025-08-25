#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
调试锚杆分类问题
"""

import sys
import os
from pathlib import Path

# 设置环境
os.environ['QT_OPENGL'] = 'software'
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def debug_truss_classification():
    """调试锚杆分类问题"""
    print("🔍 调试锚杆分类问题")
    print("=" * 50)
    
    try:
        from PyQt6.QtWidgets import QApplication
        app = QApplication([])
        
        from optimized_fpn_parser import OptimizedFPNParser
        from kratos_interface import KratosInterface
        
        print("📋 加载数据...")
        parser = OptimizedFPNParser()
        fpn_data = parser.parse_file_streaming('data/两阶段-全锚杆-摩尔库伦.fpn')
        
        ki = KratosInterface()
        ki.setup_model(fpn_data)
        
        # 检查模型数据
        md = ki.model_data or {}
        all_elements = md.get('elements') or []
        
        print(f"✅ 总元素数: {len(all_elements)}")
        
        # 分析锚杆元素
        truss_elements = []
        material_counts = {}
        
        for el in all_elements:
            et = el.get('type')
            mat_id = el.get('material_id')
            
            if mat_id not in material_counts:
                material_counts[mat_id] = 0
            material_counts[mat_id] += 1
            
            if et in ('TrussElement3D2N', 'TrussElement3D3N'):
                truss_elements.append(el)
        
        print(f"\n📊 材料分布:")
        for mat_id, count in sorted(material_counts.items()):
            print(f"  材料{mat_id}: {count:,} 个元素")
        
        print(f"\n🔗 锚杆元素分析:")
        print(f"  锚杆元素总数: {len(truss_elements)}")
        
        if truss_elements:
            # 分析锚杆元素的材料分布
            truss_materials = {}
            for el in truss_elements:
                mat_id = el.get('material_id')
                if mat_id not in truss_materials:
                    truss_materials[mat_id] = 0
                truss_materials[mat_id] += 1
            
            print(f"  锚杆材料分布:")
            for mat_id, count in sorted(truss_materials.items()):
                print(f"    材料{mat_id}: {count:,} 个锚杆元素")
            
            # 检查前几个锚杆元素
            print(f"\n🔍 前5个锚杆元素详情:")
            for i, el in enumerate(truss_elements[:5]):
                print(f"    元素{el.get('id')}: 类型={el.get('type')}, 材料={el.get('material_id')}, 节点={el.get('nodes')}")
        
        else:
            print(f"  ❌ 未找到锚杆元素!")
            print(f"  检查元素类型分布:")
            type_counts = {}
            for el in all_elements:
                et = el.get('type')
                if et not in type_counts:
                    type_counts[et] = 0
                type_counts[et] += 1
            
            for et, count in sorted(type_counts.items()):
                print(f"    {et}: {count:,} 个")
        
        return len(truss_elements) > 0
        
    except Exception as e:
        print(f"❌ 调试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = debug_truss_classification()
    if success:
        print(f"\n✅ 锚杆分类调试完成!")
    else:
        print(f"\n❌ 锚杆分类有问题!")
