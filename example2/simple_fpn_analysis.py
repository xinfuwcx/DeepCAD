#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
from pathlib import Path

# 设置环境
os.environ['QT_OPENGL'] = 'software'

# 添加路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

# 强制输出到文件
log_file = project_root / "fpn_analysis_output.log"

def log_print(*args, **kwargs):
    """同时输出到控制台和文件"""
    message = " ".join(str(arg) for arg in args)
    print(message, **kwargs)
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(message + '\n')

# 清空日志文件
with open(log_file, 'w', encoding='utf-8') as f:
    f.write("=== FPN结构分析开始 ===\n")

try:
    log_print("1. 加载FPN数据...")
    from PyQt6.QtWidgets import QApplication
    app = QApplication([])
    
    from optimized_fpn_parser import OptimizedFPNParser
    parser = OptimizedFPNParser()
    
    fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
    fpn_data = parser.parse_file_streaming(str(fpn_file))
    
    if not fpn_data:
        log_print("❌ FPN数据加载失败")
        exit(1)
        
    log_print("✅ FPN数据加载成功")
    
    # 2. 分析材料定义
    log_print("\n📋 材料定义分析:")
    materials = fpn_data.get('materials', {})
    log_print(f"材料总数: {len(materials)}")

    # 如果是字典，按ID排序显示
    if isinstance(materials, dict):
        for mat_id in sorted(materials.keys())[:12]:
            material = materials[mat_id]
            if isinstance(material, dict):
                name = material.get('name', f'材料{mat_id}')
                mat_type = material.get('type', 'unknown')
                density = material.get('density', 0)
                young = material.get('young_modulus', 0)
                log_print(f"  材料{mat_id}: {name} (类型:{mat_type}, 密度:{density:.1f}, 弹模:{young:.0f})")
    else:
        # 如果是列表
        for i, material in enumerate(materials[:12], 1):
            if isinstance(material, dict):
                name = material.get('name', f'材料{i}')
                mat_type = material.get('type', 'unknown')
                density = material.get('density', 0)
                young = material.get('young_modulus', 0)
                log_print(f"  材料{i}: {name} (类型:{mat_type}, 密度:{density:.1f}, 弹模:{young:.0f})")
    
    # 3. 分析板单元（地连墙和隧道衬砌）
    log_print("\n🏗️ 板单元分析（地连墙和隧道衬砌）:")
    plate_elements = fpn_data.get('plate_elements', [])
    plate_materials = {}
    
    for plate in plate_elements:
        if isinstance(plate, dict):
            mat_id = plate.get('material_id', 0)
            plate_materials[mat_id] = plate_materials.get(mat_id, 0) + 1
    
    log_print(f"板单元材料分布:")
    for mat_id, count in sorted(plate_materials.items()):
        if mat_id in materials:
            mat_name = materials[mat_id].get('name', f'材料{mat_id}')
            log_print(f"  材料{mat_id} ({mat_name}): {count} 个板单元")
    
    # 4. 分析线单元（锚杆）
    log_print("\n⚓ 线单元分析（锚杆）:")
    line_elements = fpn_data.get('line_elements', [])
    line_materials = {}
    
    for line in line_elements:
        if isinstance(line, dict):
            mat_id = line.get('material_id', 0)
            line_materials[mat_id] = line_materials.get(mat_id, 0) + 1
    
    log_print(f"线单元材料分布:")
    for mat_id, count in sorted(line_materials.items()):
        if mat_id in materials:
            mat_name = materials[mat_id].get('name', f'材料{mat_id}')
            log_print(f"  材料{mat_id} ({mat_name}): {count} 个线单元")
    
    # 5. 分析体单元（土体）
    log_print("\n🌍 体单元分析（土体）:")
    elements = fpn_data.get('elements', [])
    soil_materials = {}
    
    for element in elements:
        if isinstance(element, dict):
            mat_id = element.get('material_id', 0)
            soil_materials[mat_id] = soil_materials.get(mat_id, 0) + 1
    
    log_print(f"体单元材料分布:")
    for mat_id, count in sorted(soil_materials.items()):
        if mat_id in materials:
            mat_name = materials[mat_id].get('name', f'材料{mat_id}')
            log_print(f"  材料{mat_id} ({mat_name}): {count} 个体单元")
    
    # 6. 分析边界条件
    log_print("\n🔒 边界条件分析:")
    boundary_groups = fpn_data.get('boundary_groups', [])
    log_print(f"边界组总数: {len(boundary_groups)}")
    
    for i, boundary in enumerate(boundary_groups, 1):
        if isinstance(boundary, dict):
            name = boundary.get('name', f'边界{i}')
            nodes = boundary.get('nodes', [])
            constraints = boundary.get('constraints', [])
            log_print(f"  边界{i}: {name} ({len(nodes)} 个节点, 约束: {constraints})")
    
    # 7. 检查节点坐标范围
    log_print("\n📐 节点坐标范围分析:")
    nodes = fpn_data.get('nodes', [])
    if nodes:
        x_coords = [node.get('x', 0) for node in nodes if isinstance(node, dict)]
        y_coords = [node.get('y', 0) for node in nodes if isinstance(node, dict)]
        z_coords = [node.get('z', 0) for node in nodes if isinstance(node, dict)]
        
        if x_coords and y_coords and z_coords:
            log_print(f"X坐标范围: {min(x_coords):.2f} ~ {max(x_coords):.2f}")
            log_print(f"Y坐标范围: {min(y_coords):.2f} ~ {max(y_coords):.2f}")
            log_print(f"Z坐标范围: {min(z_coords):.2f} ~ {max(z_coords):.2f}")
    
    log_print("\n=== 分析完成 ===")
    
except Exception as e:
    log_print(f"❌ 分析失败: {e}")
    import traceback
    with open(log_file, 'a', encoding='utf-8') as f:
        traceback.print_exc(file=f)

log_print(f"详细日志请查看: {log_file}")
