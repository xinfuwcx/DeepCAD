#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分析复杂FPN文件：两阶段-全锚杆-摩尔库伦.fpn
详细解析摩尔-库伦模型、地应力平衡、预应力锚杆、加载步等
生成Kratos结构求解器映射方案
"""

import sys
import json
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Tuple

# 添加项目路径
sys.path.insert(0, '.')
sys.path.insert(0, '..')

try:
    from core.optimized_fpn_parser import OptimizedFPNParser
except ImportError:
    print("❌ 无法导入OptimizedFPNParser，请检查模块路径")
    sys.exit(1)

def analyze_mohr_coulomb_materials(fpn_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """分析摩尔-库伦材料参数"""
    print('\n' + '=' * 60)
    print('摩尔-库伦材料详细分析')
    print('=' * 60)

    materials = fpn_data.get('materials', [])
    mohr_coulomb_materials = []

    for mat in materials:
        if 'MNLMC' in str(mat) or mat.get('type') == 'MOHR_COULOMB':
            mohr_coulomb_materials.append(mat)

            print(f'材料ID {mat.get("id", "N/A")}: {mat.get("name", "未命名")}')
            print(f'  弹性模量: {mat.get("young_modulus", 0):.0f} kPa')
            print(f'  泊松比: {mat.get("poisson_ratio", 0):.3f}')
            print(f'  重度: {mat.get("density", 0):.1f} kN/m³')
            print(f'  粘聚力: {mat.get("cohesion", 0):.1f} kPa')
            print(f'  摩擦角: {mat.get("friction_angle", 0):.1f}°')

            # 计算K0系数
            phi = mat.get("friction_angle", 30)
            if phi > 0:
                K0 = 1 - np.sin(np.radians(phi))
                print(f'  K0系数: {K0:.3f} (Jaky公式)')

            # 计算剪胀角
            dilatancy = max(0, phi - 30) if phi > 30 else 0
            print(f'  建议剪胀角: {dilatancy:.1f}° (φ-30°)')
            print()

    return mohr_coulomb_materials

def analyze_analysis_stages(fpn_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """分析施工阶段"""
    print('\n' + '=' * 60)
    print('施工阶段详细分析')
    print('=' * 60)

    stages = fpn_data.get('analysis_stages', [])

    for i, stage in enumerate(stages):
        print(f'阶段{i+1}: {stage.get("name", "未命名")}')
        print(f'  阶段ID: {stage.get("id", "N/A")}')
        print(f'  分析类型: {stage.get("type", "静力分析")}')

        # 分析组命令
        commands = stage.get('group_commands', [])
        print(f'  组命令数: {len(commands)}')

        madd_count = sum(1 for cmd in commands if cmd.get('command') == 'MADD')
        mdel_count = sum(1 for cmd in commands if cmd.get('command') == 'MDEL')
        ladd_count = sum(1 for cmd in commands if cmd.get('command') == 'LADD')
        badd_count = sum(1 for cmd in commands if cmd.get('command') == 'BADD')

        print(f'    材料激活(MADD): {madd_count}')
        print(f'    材料删除(MDEL): {mdel_count}')
        print(f'    荷载激活(LADD): {ladd_count}')
        print(f'    边界激活(BADD): {badd_count}')

        # 详细命令分析
        for cmd in commands:
            cmd_type = cmd.get('command', 'UNKNOWN')
            group_ids = cmd.get('group_ids', [])
            if cmd_type in ['MADD', 'MDEL']:
                print(f'    {cmd_type}: 材料组 {group_ids}')
            elif cmd_type in ['LADD']:
                print(f'    {cmd_type}: 荷载组 {group_ids}')
            elif cmd_type in ['BADD']:
                print(f'    {cmd_type}: 边界组 {group_ids}')
        print()

    return stages

def analyze_anchor_system(fpn_data: Dict[str, Any]) -> Dict[str, Any]:
    """分析锚杆系统"""
    print('\n' + '=' * 60)
    print('锚杆系统分析')
    print('=' * 60)

    # 查找锚杆材料（钢材）
    materials = fpn_data.get('materials', [])
    anchor_materials = []

    for mat in materials:
        name = mat.get('name', '').lower()
        young_modulus = mat.get('young_modulus', 0)

        # 识别钢材（弹性模量>100GPa）
        if young_modulus > 100000000 or 'steel' in name or '钢' in name or 'anchor' in name:
            anchor_materials.append(mat)
            print(f'锚杆材料: {mat.get("name", "未命名")}')
            print(f'  弹性模量: {young_modulus/1e9:.0f} GPa')
            print(f'  密度: {mat.get("density", 0):.1f} kN/m³')

    # 分析锚杆单元
    elements = fpn_data.get('elements', [])
    anchor_elements = []

    for elem in elements:
        elem_type = elem.get('type', '')
        if elem_type in ['TRUSS', 'CABLE', 'BEAM']:  # 锚杆单元类型
            anchor_elements.append(elem)

    print(f'\n锚杆材料数量: {len(anchor_materials)}')
    print(f'潜在锚杆单元数量: {len(anchor_elements)}')

    return {
        'anchor_materials': anchor_materials,
        'anchor_elements': anchor_elements
    }

def generate_kratos_mapping_scheme(fpn_data: Dict[str, Any]) -> Dict[str, Any]:
    """生成Kratos映射方案"""
    print('\n' + '=' * 80)
    print('生成Kratos结构求解器映射方案')
    print('=' * 80)

    # 基本信息
    nodes = fpn_data.get('nodes', [])
    elements = fpn_data.get('elements', [])
    materials = fpn_data.get('materials', [])
    stages = fpn_data.get('analysis_stages', [])

    mapping_scheme = {
        'project_info': {
            'name': '两阶段-全锚杆-摩尔库伦基坑工程',
            'type': 'EXCAVATION_ANALYSIS',
            'stages': len(stages),
            'nodes': len(nodes),
            'elements': len(elements),
            'materials': len(materials)
        },
        'geometry': {
            'coordinate_system': 'CARTESIAN_3D',
            'units': {
                'length': 'm',
                'force': 'N',
                'stress': 'Pa',
                'density': 'kg/m³'
            }
        },
        'materials': [],
        'analysis_stages': [],
        'boundary_conditions': {},
        'loads': {},
        'solver_settings': {}
    }

    return mapping_scheme

def analyze_complex_fpn():
    """主分析函数"""
    print('=' * 80)
    print('分析复杂FPN文件：两阶段-全锚杆-摩尔库伦.fpn')
    print('=' * 80)

    fpn_file = 'data/两阶段-全锚杆-摩尔库伦.fpn'

    def progress_callback(progress):
        if progress.processed_lines % 20000 == 0:
            print(f'解析进度: {progress.progress_percent:.1f}% ({progress.processed_lines}/{progress.total_lines})')
            print(f'  当前节: {progress.current_section}')
            print(f'  节点: {progress.nodes_count}, 单元: {progress.elements_count}')

    try:
        parser = OptimizedFPNParser(progress_callback=progress_callback)
        fpn_data = parser.parse_file_streaming(fpn_file)

        print('\n' + '=' * 60)
        print('解析结果统计')
        print('=' * 60)
        print(f'节点数量: {len(fpn_data.get("nodes", []))}')
        print(f'单元数量: {len(fpn_data.get("elements", []))}')
        print(f'材料组数: {len(fpn_data.get("material_groups", {}))}')
        print(f'荷载组数: {len(fpn_data.get("load_groups", {}))}')
        print(f'边界组数: {len(fpn_data.get("boundary_groups", {}))}')
        print(f'分析步数: {len(fpn_data.get("analysis_stages", []))}')

        # 详细分析
        mohr_coulomb_materials = analyze_mohr_coulomb_materials(fpn_data)
        stages = analyze_analysis_stages(fpn_data)
        anchor_system = analyze_anchor_system(fpn_data)
        mapping_scheme = generate_kratos_mapping_scheme(fpn_data)

        print('\n✅ 复杂FPN文件分析完成!')
        return fpn_data, mapping_scheme

    except Exception as e:
        print(f'❌ 分析失败: {e}')
        import traceback
        traceback.print_exc()
        return None, None

if __name__ == '__main__':
    analyze_complex_fpn()
