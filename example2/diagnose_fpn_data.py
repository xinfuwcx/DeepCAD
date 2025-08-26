#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
诊断FPN数据结构，找出数据提取失败的原因
"""

import sys
import os
sys.path.append('core')

def diagnose_fpn_data():
    """诊断FPN数据结构"""
    print("🔍 诊断FPN数据结构")
    print("=" * 60)
    
    try:
        from optimized_fpn_parser import OptimizedFPNParser
        
        # 1. 解析FPN文件
        print("📋 解析FPN文件...")
        parser = OptimizedFPNParser()
        fpn_data = parser.parse_file_streaming('data/两阶段-全锚杆-摩尔库伦.fpn')
        
        if not fpn_data:
            print("❌ FPN解析失败")
            return False
        
        print(f"✅ FPN解析成功")
        
        # 2. 检查数据结构
        print("\n📊 数据结构分析:")
        print(f"顶层键: {list(fpn_data.keys())}")
        
        # 3. 检查elements结构
        elements = fpn_data.get('elements', [])
        print(f"\n📋 单元分析:")
        print(f"总单元数: {len(elements)}")
        
        if elements:
            # 分析前几个单元的结构
            print("\n🔍 前5个单元结构:")
            for i, el in enumerate(elements[:5]):
                print(f"  单元{i+1}: {el}")
            
            # 统计单元类型
            element_types = {}
            material_ids = {}
            
            for el in elements:
                el_type = el.get('type', 'Unknown')
                mat_id = el.get('material_id', 'Unknown')
                
                element_types[el_type] = element_types.get(el_type, 0) + 1
                material_ids[mat_id] = material_ids.get(mat_id, 0) + 1
            
            print(f"\n📊 单元类型统计:")
            for el_type, count in element_types.items():
                print(f"  {el_type}: {count}个")
            
            print(f"\n📊 材料ID统计:")
            for mat_id, count in material_ids.items():
                print(f"  材料ID {mat_id}: {count}个")
        
        # 4. 检查nodes结构
        nodes = fpn_data.get('nodes', {})
        print(f"\n📋 节点分析:")
        print(f"总节点数: {len(nodes)}")
        
        if nodes:
            # 检查节点结构
            first_node_id = list(nodes.keys())[0]
            first_node = nodes[first_node_id]
            print(f"第一个节点 {first_node_id}: {first_node}")
        
        # 5. 专门查找锚杆单元
        print(f"\n🎯 锚杆单元搜索:")
        anchor_candidates = []
        
        for i, el in enumerate(elements):
            el_type = el.get('type', '')
            mat_id = el.get('material_id', '')
            
            # 检查各种可能的锚杆标识
            if 'Truss' in el_type or mat_id == 13 or mat_id == '13':
                anchor_candidates.append((i, el))
                if len(anchor_candidates) <= 5:  # 只显示前5个
                    print(f"  候选锚杆{len(anchor_candidates)}: {el}")
        
        print(f"找到 {len(anchor_candidates)} 个锚杆候选单元")
        
        # 6. 专门查找土体单元
        print(f"\n🎯 土体单元搜索:")
        soil_candidates = []
        
        for i, el in enumerate(elements):
            el_type = el.get('type', '')
            
            if 'Tetrahedron' in el_type or 'Hexahedron' in el_type:
                soil_candidates.append((i, el))
                if len(soil_candidates) <= 5:  # 只显示前5个
                    print(f"  候选土体{len(soil_candidates)}: {el}")
        
        print(f"找到 {len(soil_candidates)} 个土体候选单元")
        
        # 7. 测试修正的数据提取
        print(f"\n🔧 测试修正的数据提取:")
        anchor_count, soil_count = test_corrected_extraction(fpn_data)
        print(f"修正后: 锚杆{anchor_count}个, 土体{soil_count}个")
        
        return True
        
    except Exception as e:
        print(f"❌ 诊断失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_corrected_extraction(fpn_data):
    """测试修正的数据提取方法"""
    elements = fpn_data.get('elements', [])
    
    # 更宽松的锚杆识别
    anchor_elements = []
    for el in elements:
        el_type = el.get('type', '')
        mat_id = str(el.get('material_id', ''))
        
        # 多种锚杆识别条件
        if ('Truss' in el_type or 
            'truss' in el_type.lower() or 
            mat_id == '13' or 
            mat_id == 13 or
            'Line' in el_type):
            anchor_elements.append(el)
    
    # 更宽松的土体识别
    soil_elements = []
    for el in elements:
        el_type = el.get('type', '')
        mat_id = str(el.get('material_id', ''))
        
        # 土体单元识别
        if (('Tetrahedron' in el_type or 
             'Hexahedron' in el_type or
             'tetrahedron' in el_type.lower() or
             'hexahedron' in el_type.lower()) and 
            mat_id != '13' and mat_id != 13):
            soil_elements.append(el)
    
    return len(anchor_elements), len(soil_elements)

if __name__ == "__main__":
    success = diagnose_fpn_data()
    
    if success:
        print("\n✅ 诊断完成！")
    else:
        print("\n❌ 诊断失败")
