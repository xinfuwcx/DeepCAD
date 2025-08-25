#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查FPN文件中的锚杆分组信息
"""

import sys
import os
from pathlib import Path

# 设置环境
os.environ['QT_OPENGL'] = 'software'
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def check_anchor_groups():
    """检查锚杆分组"""
    print("🔍 检查FPN文件中的锚杆分组信息")
    print("=" * 60)
    
    try:
        # 1. 创建QApplication
        from PyQt6.QtWidgets import QApplication
        app = QApplication([])
        
        # 2. 加载FPN数据
        print("📋 加载FPN数据...")
        from optimized_fpn_parser import OptimizedFPNParser
        parser = OptimizedFPNParser()
        
        fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        fpn_data = parser.parse_file_streaming(str(fpn_file))
        
        print(f"✅ FPN数据加载成功")
        
        # 3. 检查mesh_sets（材料集合）
        print("\n📊 检查MSET（材料集合）信息:")
        mesh_sets = fpn_data.get('mesh_sets', {})
        print(f"  总计MSET数量: {len(mesh_sets)}")
        
        # 查找锚杆相关的MSET
        anchor_sets = {}
        line_element_sets = {}
        
        for mset_id, mset_data in mesh_sets.items():
            name = mset_data.get('name', '').lower()
            elements = mset_data.get('elements', [])
            nodes = mset_data.get('nodes', [])
            
            # 检查是否包含锚杆关键词
            if any(keyword in name for keyword in ['anchor', 'line', 'truss', '锚', '杆']):
                anchor_sets[mset_id] = {
                    'name': mset_data.get('name', ''),
                    'elements': len(elements),
                    'nodes': len(nodes)
                }
                print(f"  🔗 MSET {mset_id}: {mset_data.get('name', '')} ({len(elements)}个单元, {len(nodes)}个节点)")
            
            # 检查是否包含线单元
            if elements and len(elements) > 0:
                # 检查第一个单元的类型
                first_elem_id = elements[0] if elements else None
                if first_elem_id:
                    # 从line_elements中查找
                    line_elements = fpn_data.get('line_elements', [])
                    for line_elem in line_elements:
                        if line_elem.get('id') == first_elem_id:
                            line_element_sets[mset_id] = {
                                'name': mset_data.get('name', ''),
                                'elements': len(elements),
                                'nodes': len(nodes),
                                'material_id': line_elem.get('material_id')
                            }
                            print(f"  📏 线单元MSET {mset_id}: {mset_data.get('name', '')} (材料{line_elem.get('material_id')}, {len(elements)}个单元)")
                            break
        
        print(f"\n🎯 锚杆相关MSET分析:")
        print(f"  锚杆关键词MSET: {len(anchor_sets)} 个")
        print(f"  线单元MSET: {len(line_element_sets)} 个")
        
        # 4. 检查线单元的材料分布
        print(f"\n📋 线单元材料分布:")
        line_elements = fpn_data.get('line_elements', [])
        material_distribution = {}
        
        for line_elem in line_elements:
            mat_id = line_elem.get('material_id')
            if mat_id not in material_distribution:
                material_distribution[mat_id] = 0
            material_distribution[mat_id] += 1
        
        for mat_id, count in sorted(material_distribution.items()):
            print(f"  材料{mat_id}: {count:,} 个线单元")
        
        # 5. 分析锚杆分段（基于MSET分组）
        print(f"\n🔗 锚杆分段分析:")
        
        # 检查是否有明确的自由段/锚固段分组
        free_segments = []
        anchor_segments = []
        
        for mset_id, mset_data in line_element_sets.items():
            name = mset_data.get('name', '').lower()
            
            if any(keyword in name for keyword in ['free', '自由', 'unbonded']):
                free_segments.append(mset_id)
                print(f"  🆓 自由段MSET {mset_id}: {mset_data['name']} ({mset_data['elements']}个单元)")
            
            elif any(keyword in name for keyword in ['bond', 'anchor', '锚固', 'grouted']):
                anchor_segments.append(mset_id)
                print(f"  ⚓ 锚固段MSET {mset_id}: {mset_data['name']} ({mset_data['elements']}个单元)")
            
            else:
                print(f"  ❓ 未分类MSET {mset_id}: {mset_data['name']} ({mset_data['elements']}个单元)")
        
        # 6. 如果没有明确分组，尝试基于几何位置推断
        if not free_segments and not anchor_segments:
            print(f"\n💡 未找到明确的自由段/锚固段分组，尝试几何推断...")
            
            # 获取节点坐标
            nodes = fpn_data.get('nodes', {})
            if isinstance(nodes, list):
                node_coords = {n['id']: n['coordinates'] for n in nodes}
            else:
                node_coords = {nid: n['coordinates'] for nid, n in nodes.items()}
            
            # 分析锚杆的几何分布
            anchor_z_coords = []
            for line_elem in line_elements:
                if line_elem.get('material_id') in [13, 15]:  # 锚杆材料
                    nodes_list = line_elem.get('nodes', [])
                    for node_id in nodes_list:
                        if node_id in node_coords:
                            z = node_coords[node_id][2]
                            anchor_z_coords.append(z)
            
            if anchor_z_coords:
                min_z = min(anchor_z_coords)
                max_z = max(anchor_z_coords)
                print(f"  锚杆Z坐标范围: {min_z:.1f} ~ {max_z:.1f} m")
                
                # 推断：深度大的为锚固段，浅的为自由段
                anchor_threshold = min_z + (max_z - min_z) * 0.7  # 后30%为锚固段
                print(f"  推断锚固段阈值: Z < {anchor_threshold:.1f} m")
        
        # 7. 总结建议
        print(f"\n💡 约束设置建议:")
        
        if free_segments and anchor_segments:
            print(f"  ✅ 发现明确的分段信息:")
            print(f"    自由段: {len(free_segments)} 个MSET")
            print(f"    锚固段: {len(anchor_segments)} 个MSET")
            print(f"  建议: 使用MSET分组来设置约束")
        else:
            print(f"  ⚠️ 未发现明确的分段信息")
            print(f"  建议: 基于几何位置推断分段")
            print(f"    - 锚杆末端30%: 锚固段 (embedded约束)")
            print(f"    - 锚杆中间60%: 自由段 (无约束)")
            print(f"    - 锚杆前端10%: 锚头 (MPC约束)")
        
        return {
            'anchor_sets': anchor_sets,
            'line_element_sets': line_element_sets,
            'free_segments': free_segments,
            'anchor_segments': anchor_segments,
            'material_distribution': material_distribution
        }
        
    except Exception as e:
        print(f"❌ 检查失败: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    result = check_anchor_groups()
    if result:
        print("\n🎉 锚杆分组信息检查完成！")
    else:
        print("\n❌ 锚杆分组信息检查失败！")
