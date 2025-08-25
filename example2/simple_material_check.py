#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单检查材料信息
"""

def check_materials():
    """检查材料信息"""
    print("🔍 检查FPN文件中的材料信息")
    print("=" * 50)
    
    fpn_file = "data/两阶段-全锚杆-摩尔库伦.fpn"
    
    try:
        with open(fpn_file, 'r', encoding='gb18030') as f:
            content = f.read()
        
        print(f"✅ 成功读取FPN文件")
        
        # 查找材料定义行
        lines = content.split('\n')
        material_lines = []
        
        for i, line in enumerate(lines):
            line = line.strip()
            if line.startswith('MAT ') or line.startswith('MATGEN'):
                material_lines.append((i+1, line))
        
        print(f"\n📊 材料定义统计:")
        print(f"  总计材料行: {len(material_lines)} 个")
        
        # 查找锚杆相关材料
        anchor_materials = []
        for line_num, line in material_lines:
            line_lower = line.lower()
            if any(keyword in line_lower for keyword in ['anchor', '锚', 'truss', 'cable', 'tendon']):
                anchor_materials.append((line_num, line))
        
        print(f"\n🔗 锚杆相关材料:")
        for line_num, line in anchor_materials:
            print(f"  行{line_num:6d}: {line}")
        
        # 查找自由段/锚固段关键词
        free_materials = []
        bonded_materials = []
        
        for line_num, line in material_lines:
            line_lower = line.lower()
            
            if any(keyword in line_lower for keyword in ['free', '自由', 'unbonded']):
                free_materials.append((line_num, line))
            elif any(keyword in line_lower for keyword in ['bond', '锚固', 'grouted', 'anchor']):
                bonded_materials.append((line_num, line))
        
        print(f"\n🎯 分段材料:")
        print(f"  自由段材料: {len(free_materials)} 个")
        for line_num, line in free_materials:
            print(f"    行{line_num:6d}: {line}")
        
        print(f"  锚固段材料: {len(bonded_materials)} 个")
        for line_num, line in bonded_materials:
            print(f"    行{line_num:6d}: {line}")
        
        # 查找PETRUSS属性定义
        petruss_lines = []
        for i, line in enumerate(lines):
            line = line.strip()
            if line.startswith('PETRUSS'):
                petruss_lines.append((i+1, line))
        
        print(f"\n📏 PETRUSS属性定义:")
        print(f"  总计PETRUSS行: {len(petruss_lines)} 个")
        for line_num, line in petruss_lines[:10]:  # 显示前10个
            print(f"    行{line_num:6d}: {line}")
        
        # 总结
        print(f"\n💡 分析结果:")
        if anchor_materials:
            print(f"  ✅ 发现{len(anchor_materials)}个锚杆相关材料")
        else:
            print(f"  ⚠️ 未发现明确的锚杆材料命名")
        
        if free_materials or bonded_materials:
            print(f"  ✅ 发现分段材料: {len(free_materials)}个自由段, {len(bonded_materials)}个锚固段")
        else:
            print(f"  ⚠️ 未发现明确的分段材料命名")
        
        if petruss_lines:
            print(f"  ✅ 发现{len(petruss_lines)}个PETRUSS属性定义")
        
        return {
            'material_count': len(material_lines),
            'anchor_materials': anchor_materials,
            'free_materials': free_materials,
            'bonded_materials': bonded_materials,
            'petruss_count': len(petruss_lines)
        }
        
    except Exception as e:
        print(f"❌ 检查失败: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    result = check_materials()
    if result:
        print(f"\n🎉 材料信息检查完成！")
        print(f"现在可以基于这些信息来正确设置约束。")
    else:
        print(f"\n❌ 材料信息检查失败！")
