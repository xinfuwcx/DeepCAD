#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单检查MSET分组信息
"""

def check_mset_in_fpn():
    """直接从FPN文件检查MSET信息"""
    print("🔍 直接检查FPN文件中的MSET信息")
    print("=" * 50)
    
    fpn_file = "data/两阶段-全锚杆-摩尔库伦.fpn"
    
    try:
        with open(fpn_file, 'r', encoding='gb18030') as f:
            lines = f.readlines()
        
        print(f"✅ 成功读取FPN文件，共{len(lines):,}行")
        
        # 查找MSET相关行
        mset_lines = []
        msete_lines = []
        msetn_lines = []
        
        for i, line in enumerate(lines):
            line = line.strip()
            if line.startswith('MSET '):
                mset_lines.append((i+1, line))
            elif line.startswith('MSETE'):
                msete_lines.append((i+1, line))
            elif line.startswith('MSETN'):
                msetn_lines.append((i+1, line))
        
        print(f"\n📊 MSET相关行统计:")
        print(f"  MSET定义行: {len(mset_lines)} 个")
        print(f"  MSETE单元行: {len(msete_lines)} 个")
        print(f"  MSETN节点行: {len(msetn_lines)} 个")
        
        # 显示前20个MSET定义
        print(f"\n📋 前20个MSET定义:")
        for i, (line_num, line) in enumerate(mset_lines[:20]):
            print(f"  行{line_num:6d}: {line}")
        
        # 查找锚杆相关的MSET
        print(f"\n🔗 查找锚杆相关MSET:")
        anchor_keywords = ['anchor', 'line', 'truss', '锚', '杆', 'cable', 'tendon']
        
        anchor_msets = []
        for line_num, line in mset_lines:
            line_lower = line.lower()
            if any(keyword in line_lower for keyword in anchor_keywords):
                anchor_msets.append((line_num, line))
        
        if anchor_msets:
            print(f"  发现{len(anchor_msets)}个锚杆相关MSET:")
            for line_num, line in anchor_msets:
                print(f"    行{line_num:6d}: {line}")
        else:
            print(f"  未发现明确的锚杆相关MSET")
        
        # 查找自由段/锚固段关键词
        print(f"\n🎯 查找分段关键词:")
        segment_keywords = {
            'free': ['free', '自由', 'unbonded'],
            'anchor': ['bond', 'anchor', '锚固', 'grouted', 'fixed']
        }
        
        free_msets = []
        bonded_msets = []
        
        for line_num, line in mset_lines:
            line_lower = line.lower()
            
            # 检查自由段关键词
            if any(keyword in line_lower for keyword in segment_keywords['free']):
                free_msets.append((line_num, line))
            
            # 检查锚固段关键词
            elif any(keyword in line_lower for keyword in segment_keywords['anchor']):
                bonded_msets.append((line_num, line))
        
        print(f"  自由段MSET: {len(free_msets)} 个")
        for line_num, line in free_msets:
            print(f"    行{line_num:6d}: {line}")
        
        print(f"  锚固段MSET: {len(bonded_msets)} 个")
        for line_num, line in bonded_msets:
            print(f"    行{line_num:6d}: {line}")
        
        # 检查MSETE中的锚杆单元分组
        print(f"\n📏 检查MSETE中的分组:")
        
        # 查找包含大量单元的MSETE（可能是锚杆）
        large_msete = []
        for line_num, line in msete_lines:
            # 尝试解析MSETE行
            parts = line.split(',')
            if len(parts) >= 3:
                try:
                    mset_id = int(parts[1].strip())
                    count = int(parts[2].strip()) if parts[2].strip().isdigit() else 0
                    if count > 1000:  # 大于1000个单元的组
                        large_msete.append((line_num, mset_id, count, line))
                except:
                    pass
        
        if large_msete:
            print(f"  发现{len(large_msete)}个大型单元组:")
            for line_num, mset_id, count, line in large_msete:
                print(f"    MSET {mset_id}: {count:,}个单元 (行{line_num})")
        
        # 总结
        print(f"\n💡 分析结果:")
        if anchor_msets:
            print(f"  ✅ 发现{len(anchor_msets)}个锚杆相关MSET")
        else:
            print(f"  ⚠️ 未发现明确的锚杆MSET命名")
        
        if free_msets or bonded_msets:
            print(f"  ✅ 发现分段信息: {len(free_msets)}个自由段, {len(bonded_msets)}个锚固段")
        else:
            print(f"  ⚠️ 未发现明确的分段命名")
        
        if large_msete:
            print(f"  ✅ 发现{len(large_msete)}个大型单元组，可能包含锚杆")
        
        return {
            'mset_count': len(mset_lines),
            'anchor_msets': anchor_msets,
            'free_msets': free_msets,
            'bonded_msets': bonded_msets,
            'large_msete': large_msete
        }
        
    except Exception as e:
        print(f"❌ 检查失败: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    result = check_mset_in_fpn()
    if result:
        print(f"\n🎉 MSET检查完成！")
        print(f"建议: 基于发现的分组信息来设置正确的约束")
    else:
        print(f"\n❌ MSET检查失败！")
