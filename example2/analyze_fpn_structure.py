#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深度分析FPN数据结构：材料映射、连接关系、边界条件
"""

import sys
import os
from pathlib import Path
import json

# 设置环境
os.environ['QT_OPENGL'] = 'software'

# 添加路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def analyze_fpn_structure():
    """深度分析FPN数据结构"""
    print("=" * 80)
    print("深度分析FPN数据结构：材料映射、连接关系、边界条件")
    print("=" * 80)
    
    try:
        # 1. 加载FPN数据
        from PyQt6.QtWidgets import QApplication
        app = QApplication([])
        
        from optimized_fpn_parser import OptimizedFPNParser
        parser = OptimizedFPNParser()
        
        fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        fpn_data = parser.parse_file_streaming(str(fpn_file))
        
        if not fpn_data:
            print("❌ FPN数据加载失败")
            return
            
        print(f"✅ FPN数据加载成功")
        print(f"节点数: {len(fpn_data.get('nodes', []))}")
        print(f"体单元数: {len(fpn_data.get('elements', []))}")
        print(f"板单元数: {len(fpn_data.get('plate_elements', []))}")
        print(f"线单元数: {len(fpn_data.get('line_elements', []))}")
        
        # 2. 分析材料定义
        print("\n" + "="*60)
        print("📋 材料定义分析")
        print("="*60)
        
        materials = fpn_data.get('materials', [])
        print(f"材料总数: {len(materials)}")
        
        for i, material in enumerate(materials[:15], 1):  # 显示前15个材料
            if isinstance(material, dict):
                name = material.get('name', f'材料{i}')
                mat_type = material.get('type', 'unknown')
                density = material.get('density', 0)
                young = material.get('young_modulus', 0)
                print(f"  材料{i}: {name} (类型:{mat_type}, 密度:{density:.1f}, 弹模:{young:.0f})")
        
        # 3. 分析板单元（地连墙和隧道衬砌）
        print("\n" + "="*60)
        print("🏗️ 板单元分析（地连墙和隧道衬砌）")
        print("="*60)
        
        plate_elements = fpn_data.get('plate_elements', [])
        plate_materials = {}
        
        for plate in plate_elements:
            if isinstance(plate, dict):
                mat_id = plate.get('material_id', 0)
                plate_materials[mat_id] = plate_materials.get(mat_id, 0) + 1
        
        print(f"板单元材料分布:")
        for mat_id, count in sorted(plate_materials.items()):
            if mat_id <= len(materials):
                mat_name = materials[mat_id-1].get('name', f'材料{mat_id}') if mat_id > 0 else '未知'
                print(f"  材料{mat_id} ({mat_name}): {count} 个板单元")
        
        # 4. 分析线单元（锚杆）
        print("\n" + "="*60)
        print("⚓ 线单元分析（锚杆）")
        print("="*60)
        
        line_elements = fpn_data.get('line_elements', [])
        line_materials = {}
        
        for line in line_elements:
            if isinstance(line, dict):
                mat_id = line.get('material_id', 0)
                line_materials[mat_id] = line_materials.get(mat_id, 0) + 1
        
        print(f"线单元材料分布:")
        for mat_id, count in sorted(line_materials.items()):
            if mat_id <= len(materials):
                mat_name = materials[mat_id-1].get('name', f'材料{mat_id}') if mat_id > 0 else '未知'
                print(f"  材料{mat_id} ({mat_name}): {count} 个线单元")
        
        # 5. 分析体单元（土体）
        print("\n" + "="*60)
        print("🌍 体单元分析（土体）")
        print("="*60)
        
        elements = fpn_data.get('elements', [])
        soil_materials = {}
        
        for element in elements:
            if isinstance(element, dict):
                mat_id = element.get('material_id', 0)
                soil_materials[mat_id] = soil_materials.get(mat_id, 0) + 1
        
        print(f"体单元材料分布:")
        for mat_id, count in sorted(soil_materials.items()):
            if mat_id <= len(materials):
                mat_name = materials[mat_id-1].get('name', f'材料{mat_id}') if mat_id > 0 else '未知'
                print(f"  材料{mat_id} ({mat_name}): {count} 个体单元")
        
        # 6. 分析边界条件
        print("\n" + "="*60)
        print("🔒 边界条件分析")
        print("="*60)
        
        boundary_groups = fpn_data.get('boundary_groups', [])
        print(f"边界组总数: {len(boundary_groups)}")
        
        for i, boundary in enumerate(boundary_groups, 1):
            if isinstance(boundary, dict):
                name = boundary.get('name', f'边界{i}')
                nodes = boundary.get('nodes', [])
                constraints = boundary.get('constraints', [])
                print(f"  边界{i}: {name} ({len(nodes)} 个节点, 约束: {constraints})")
        
        # 7. 分析网格集合（连接关系）
        print("\n" + "="*60)
        print("🔗 网格集合分析（连接关系）")
        print("="*60)
        
        mesh_sets = fpn_data.get('mesh_sets', {})
        print(f"网格集合总数: {len(mesh_sets)}")
        
        for set_id, mesh_set in list(mesh_sets.items())[:10]:  # 显示前10个
            if isinstance(mesh_set, dict):
                name = mesh_set.get('name', f'集合{set_id}')
                elements = mesh_set.get('elements', [])
                nodes = mesh_set.get('nodes', [])
                print(f"  集合{set_id}: {name} ({len(elements)} 单元, {len(nodes)} 节点)")
        
        # 8. 分析分析步
        print("\n" + "="*60)
        print("📊 分析步分析")
        print("="*60)
        
        analysis_stages = fpn_data.get('analysis_stages', [])
        print(f"分析步总数: {len(analysis_stages)}")
        
        for i, stage in enumerate(analysis_stages, 1):
            if isinstance(stage, dict):
                name = stage.get('name', f'步骤{i}')
                stage_type = stage.get('type', 'unknown')
                print(f"  步骤{i}: {name} (类型: {stage_type})")
        
        # 9. 检查节点坐标范围（用于边界条件验证）
        print("\n" + "="*60)
        print("📐 节点坐标范围分析")
        print("="*60)
        
        nodes = fpn_data.get('nodes', [])
        if nodes:
            x_coords = [node.get('x', 0) for node in nodes if isinstance(node, dict)]
            y_coords = [node.get('y', 0) for node in nodes if isinstance(node, dict)]
            z_coords = [node.get('z', 0) for node in nodes if isinstance(node, dict)]
            
            if x_coords and y_coords and z_coords:
                print(f"X坐标范围: {min(x_coords):.2f} ~ {max(x_coords):.2f}")
                print(f"Y坐标范围: {min(y_coords):.2f} ~ {max(y_coords):.2f}")
                print(f"Z坐标范围: {min(z_coords):.2f} ~ {max(z_coords):.2f}")
                
                # 检查边界节点
                x_min, x_max = min(x_coords), max(x_coords)
                y_min, y_max = min(y_coords), max(y_coords)
                z_min, z_max = min(z_coords), max(z_coords)
                
                boundary_nodes = {
                    'x_min': [i for i, node in enumerate(nodes) if isinstance(node, dict) and abs(node.get('x', 0) - x_min) < 0.01],
                    'x_max': [i for i, node in enumerate(nodes) if isinstance(node, dict) and abs(node.get('x', 0) - x_max) < 0.01],
                    'y_min': [i for i, node in enumerate(nodes) if isinstance(node, dict) and abs(node.get('y', 0) - y_min) < 0.01],
                    'y_max': [i for i, node in enumerate(nodes) if isinstance(node, dict) and abs(node.get('y', 0) - y_max) < 0.01],
                    'z_min': [i for i, node in enumerate(nodes) if isinstance(node, dict) and abs(node.get('z', 0) - z_min) < 0.01],
                    'z_max': [i for i, node in enumerate(nodes) if isinstance(node, dict) and abs(node.get('z', 0) - z_max) < 0.01]
                }
                
                print(f"边界面节点统计:")
                for face, node_indices in boundary_nodes.items():
                    print(f"  {face}: {len(node_indices)} 个节点")
        
        # 10. 保存分析结果
        analysis_result = {
            'materials': {f'material_{i+1}': mat for i, mat in enumerate(materials)},
            'plate_materials': plate_materials,
            'line_materials': line_materials,
            'soil_materials': soil_materials,
            'boundary_groups': boundary_groups,
            'mesh_sets_count': len(mesh_sets),
            'analysis_stages_count': len(analysis_stages)
        }
        
        output_file = project_root / "fpn_structure_analysis.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(analysis_result, f, ensure_ascii=False, indent=2)
        
        print(f"\n✅ 分析结果已保存到: {output_file}")
        
    except Exception as e:
        print(f"❌ 分析失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    analyze_fpn_structure()
