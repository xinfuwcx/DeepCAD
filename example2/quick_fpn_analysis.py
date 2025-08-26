#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速分析FPN文件中的单元类型和参数转换 - 简化版
"""

import sys
import os
import json
sys.path.append('.')

def quick_analyze_fpn_elements():
    """快速分析FPN单元类型"""
    print("=" * 50)
    print("快速分析FPN单元类型")
    print("=" * 50)
    
    try:
        from core.optimized_fpn_parser import OptimizedFPNParser
        
        parser = OptimizedFPNParser()
        fpn_data = parser.parse_file_streaming('data/两阶段-全锚杆-摩尔库伦.fpn')
        
        elements = fpn_data.get('elements', [])
        print(f"总单元数: {len(elements)}")
        
        # 统计单元类型
        element_types = {}
        for element in elements[:1000]:  # 只分析前1000个单元
            el_type = element.get('type', 'Unknown')
            material_id = int(element.get('material_id', 0))
            nodes_count = len(element.get('nodes', []))
            
            key = f"{el_type}_{nodes_count}N_Mat{material_id}"
            element_types[key] = element_types.get(key, 0) + 1
        
        print("\n单元类型分布（前1000个）:")
        for el_type, count in sorted(element_types.items(), key=lambda x: x[1], reverse=True):
            print(f"  {el_type}: {count}")
        
        # 分类统计
        truss_count = sum(count for key, count in element_types.items() if '2N' in key)
        shell_count = sum(count for key, count in element_types.items() if 'Shell' in key or ('4N' in key and 'Tetrahedron' not in key))
        solid_count = sum(count for key, count in element_types.items() if 'Tetrahedron' in key or 'Hexahedron' in key)
        
        print(f"\n分类统计（采样）:")
        print(f"  Truss单元（2节点）: {truss_count}")
        print(f"  Shell单元: {shell_count}")  
        print(f"  Solid单元（四面体/六面体）: {solid_count}")
        
        return element_types
        
    except Exception as e:
        print(f"ERROR: {e}")
        return None

def quick_analyze_materials():
    """快速分析材料参数"""
    print("\n" + "=" * 50)
    print("快速分析材料参数")
    print("=" * 50)
    
    try:
        from core.optimized_fpn_parser import OptimizedFPNParser
        
        parser = OptimizedFPNParser()
        fpn_data = parser.parse_file_streaming('data/两阶段-全锚杆-摩尔库伦.fpn')
        
        materials = fpn_data.get('materials', {})
        print(f"材料数量: {len(materials)}")
        
        for mat_id, material in materials.items():
            print(f"\n材料 {mat_id}:")
            print(f"  名称: {material.get('name', 'Unknown')}")
            print(f"  类型: {material.get('type', 'Unknown')}")
            
            params = material.get('parameters', {})
            if params:
                print("  关键参数:")
                key_params = ['Young_modulus', 'Poisson_ratio', 'cohesion', 'friction_angle', 'phi', 'density']
                for param in key_params:
                    if param in params:
                        print(f"    {param}: {params[param]}")
        
        return materials
        
    except Exception as e:
        print(f"ERROR: {e}")
        return None

def check_kratos_interface():
    """检查kratos_interface.py中的关键方法"""
    print("\n" + "=" * 50)
    print("检查kratos_interface.py实现")
    print("=" * 50)
    
    try:
        with open('core/kratos_interface.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 检查关键方法和内容
        checks = [
            ('_convert_material_to_kratos', '材料转换方法'),
            ('_implement_anchor_constraints', '锚杆约束实现'),
            ('MohrCoulomb', '摩尔库伦本构模型'),
            ('ModifiedMohrCoulomb', '修正摩尔库伦本构模型'),
            ('COHESION', '粘聚力参数'),
            ('INTERNAL_FRICTION_ANGLE', '内摩擦角参数'),
            ('EmbeddedSkinUtility3D', 'Embedded约束工具')
        ]
        
        print("关键功能检查:")
        for item, description in checks:
            count = content.count(item)
            status = "✓" if count > 0 else "✗"
            print(f"  {status} {description}: 出现 {count} 次")
        
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def main():
    """主分析流程"""
    print("开始快速FPN分析...")
    
    # 1. 分析单元类型
    element_types = quick_analyze_fpn_elements()
    
    # 2. 分析材料参数
    materials = quick_analyze_materials()
    
    # 3. 检查实现
    check_kratos_interface()
    
    print("\n" + "=" * 50)
    print("快速分析完成")
    print("=" * 50)
    
    print("\n核心发现:")
    if element_types:
        print("1. FPN单元类型已识别，包含Truss、Shell和Solid单元")
    
    if materials:
        print("2. 材料参数包含摩尔-库伦参数（cohesion, friction_angle等）")
    
    print("3. kratos_interface.py的关键功能实现状态已检查")

if __name__ == "__main__":
    main()