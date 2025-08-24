#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查原始FPN文件中的材料定义
"""

import sys
sys.path.append('.')
from example2.core.optimized_fpn_parser import OptimizedFPNParser
import json

def main():
    print('=== 解析原始FPN文件材料信息 ===')
    parser = OptimizedFPNParser()
    fpn_data = parser.parse_file_streaming('example2/data/两阶段-全锚杆-摩尔库伦.fpn')

    materials = fpn_data.get('materials', {})
    print(f'FPN文件中的材料数量: {len(materials)}')
    print(f'材料ID列表: {list(materials.keys())}')

    print('\n=== 详细材料信息 ===')
    for mat_id, mat_data in materials.items():
        print(f'材料{mat_id}:')
        print(f'  名称: {mat_data.get("name", "未知")}')
        props = mat_data.get('properties', {})
        print(f'  弹性模量: {props.get("E", "未设置")}')
        print(f'  泊松比: {props.get("NU", "未设置")}')
        print(f'  密度: {props.get("DENSITY", "未设置")}')
        print(f'  摩擦角: {props.get("FRICTION_ANGLE", "未设置")}')
        print(f'  粘聚力: {props.get("COHESION", "未设置")}')
        print(f'  类型: {props.get("type", "未设置")}')
        print()

    # 保存材料信息到文件
    with open('fpn_materials_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(materials, f, indent=2, ensure_ascii=False)
    
    print(f'材料信息已保存到 fpn_materials_analysis.json')

if __name__ == "__main__":
    main()
