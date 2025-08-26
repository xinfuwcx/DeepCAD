#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全面诊断FPN数据结构
重点识别：锚杆(线元)、地连墙(壳元)、土体(体元)
"""

import sys
import os
sys.path.append('core')

def comprehensive_fpn_diagnosis():
    """全面诊断FPN数据结构"""
    print("🔍 全面诊断FPN数据结构")
    print("🎯 重点：锚杆(线元) + 地连墙(壳元) + 土体(体元)")
    print("=" * 80)
    
    try:
        from optimized_fpn_parser import OptimizedFPNParser
        
        # 1. 解析FPN文件
        print("📋 步骤1: 解析FPN文件...")
        parser = OptimizedFPNParser()
        fpn_data = parser.parse_file_streaming('data/两阶段-全锚杆-摩尔库伦.fpn')
        
        if not fpn_data:
            print("❌ FPN解析失败")
            return False
        
        print(f"✅ FPN解析成功")
        print(f"   顶层键: {list(fpn_data.keys())}")
        
        # 2. 详细分析单元结构
        elements = fpn_data.get('elements', [])
        nodes = fpn_data.get('nodes', {})
        
        print(f"\n📊 基本统计:")
        print(f"   总节点数: {len(nodes)}")
        print(f"   总单元数: {len(elements)}")
        
        # 3. 分析单元类型和材料分布
        print(f"\n🔍 单元类型详细分析:")
        
        element_analysis = {}
        material_analysis = {}
        
        for i, el in enumerate(elements):
            if i < 10:  # 显示前10个单元的详细信息
                print(f"   单元{i+1}: {el}")
            
            el_type = el.get('type', 'Unknown')
            mat_id = el.get('material_id', 'Unknown')
            
            # 统计单元类型
            if el_type not in element_analysis:
                element_analysis[el_type] = {'count': 0, 'materials': set(), 'sample': el}
            element_analysis[el_type]['count'] += 1
            element_analysis[el_type]['materials'].add(mat_id)
            
            # 统计材料分布
            if mat_id not in material_analysis:
                material_analysis[mat_id] = {'count': 0, 'types': set(), 'sample': el}
            material_analysis[mat_id]['count'] += 1
            material_analysis[mat_id]['types'].add(el_type)
        
        # 4. 输出单元类型分析
        print(f"\n📊 单元类型统计:")
        for el_type, info in element_analysis.items():
            print(f"   {el_type}: {info['count']}个")
            print(f"     材料ID: {sorted(info['materials'])}")
            print(f"     示例: {info['sample']}")
            print()
        
        # 5. 输出材料分析
        print(f"📊 材料ID统计:")
        for mat_id, info in material_analysis.items():
            print(f"   材料{mat_id}: {info['count']}个单元")
            print(f"     单元类型: {sorted(info['types'])}")
            print(f"     示例: {info['sample']}")
            print()
        
        # 6. 智能识别锚杆、地连墙、土体
        print(f"🎯 智能识别分析:")
        
        # 锚杆识别（线单元）
        anchor_candidates = identify_anchors(elements)
        print(f"   🔗 锚杆候选（线单元）: {len(anchor_candidates)}个")
        if anchor_candidates:
            print(f"     示例: {anchor_candidates[0]}")
        
        # 地连墙识别（壳单元）
        wall_candidates = identify_walls(elements)
        print(f"   🧱 地连墙候选（壳单元）: {len(wall_candidates)}个")
        if wall_candidates:
            print(f"     示例: {wall_candidates[0]}")
        
        # 土体识别（体单元）
        soil_candidates = identify_soil(elements)
        print(f"   🌍 土体候选（体单元）: {len(soil_candidates)}个")
        if soil_candidates:
            print(f"     示例: {soil_candidates[0]}")
        
        # 7. 验证识别结果
        total_identified = len(anchor_candidates) + len(wall_candidates) + len(soil_candidates)
        print(f"\n✅ 识别验证:")
        print(f"   总识别: {total_identified}/{len(elements)} ({total_identified/len(elements)*100:.1f}%)")
        print(f"   锚杆: {len(anchor_candidates)}")
        print(f"   地连墙: {len(wall_candidates)}")
        print(f"   土体: {len(soil_candidates)}")
        
        return True
        
    except Exception as e:
        print(f"❌ 诊断失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def identify_anchors(elements):
    """识别锚杆单元（线单元）"""
    anchors = []
    
    for el in elements:
        el_type = el.get('type', '').lower()
        nodes = el.get('nodes', [])
        
        # 线单元特征：2个节点
        if (len(nodes) == 2 and 
            ('truss' in el_type or 
             'line' in el_type or 
             'beam' in el_type or
             'bar' in el_type or
             el_type == 'line' or
             el_type == 'truss')):
            anchors.append(el)
    
    return anchors

def identify_walls(elements):
    """识别地连墙单元（壳单元）"""
    walls = []
    
    for el in elements:
        el_type = el.get('type', '').lower()
        nodes = el.get('nodes', [])
        
        # 壳单元特征：3-4个节点
        if (len(nodes) in [3, 4] and 
            ('shell' in el_type or 
             'plate' in el_type or 
             'quad' in el_type or
             'tri' in el_type or
             'triangle' in el_type or
             'quadrilateral' in el_type or
             el_type in ['shell', 'plate', 'quad', 'tri'])):
            walls.append(el)
    
    return walls

def identify_soil(elements):
    """识别土体单元（体单元）"""
    soil = []
    
    for el in elements:
        el_type = el.get('type', '').lower()
        nodes = el.get('nodes', [])
        
        # 体单元特征：4-8个节点
        if (len(nodes) >= 4 and 
            ('tetra' in el_type or 
             'hexa' in el_type or 
             'penta' in el_type or
             'pyramid' in el_type or
             'brick' in el_type or
             el_type in ['tetra', 'hexa', 'penta', 'pyramid', 'brick'])):
            soil.append(el)
    
    return soil

if __name__ == "__main__":
    success = comprehensive_fpn_diagnosis()
    
    if success:
        print("\n🎉 全面诊断完成！")
        print("📋 下一步：基于诊断结果修正数据提取逻辑")
    else:
        print("\n❌ 诊断失败，需要进一步调试")
