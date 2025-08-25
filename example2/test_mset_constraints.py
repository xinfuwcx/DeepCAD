#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试基于MSET的约束生成
"""

import sys
import os
import json
from pathlib import Path

def test_mset_constraints():
    """测试基于MSET的约束生成"""
    print("🔧 测试基于MSET的约束生成")
    print("=" * 60)
    print("📋 参数设置:")
    print("  搜索半径: 10.0m")
    print("  投影容差: 1.0m")
    print("  基于FPN MSET分组")
    print("=" * 60)
    
    try:
        # 设置环境
        os.environ['QT_OPENGL'] = 'software'
        project_root = Path(__file__).parent
        sys.path.insert(0, str(project_root))
        sys.path.append(str(project_root / "core"))
        
        # 不使用QApplication，直接测试数据读取
        print("📋 直接读取FPN数据...")
        
        # 简化的FPN数据读取测试
        fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        
        if not fpn_file.exists():
            print(f"❌ FPN文件不存在: {fpn_file}")
            return False
        
        print(f"✅ FPN文件存在: {fpn_file.stat().st_size / 1024 / 1024:.1f} MB")
        
        # 直接搜索MSET信息
        print("📋 搜索MSET分组信息...")
        
        with open(fpn_file, 'r', encoding='gb18030') as f:
            content = f.read()
        
        lines = content.split('\n')
        
        # 查找锚固段MSET
        bonded_msets = []
        free_msets = []
        
        for i, line in enumerate(lines):
            line = line.strip()
            if line.startswith('MSET '):
                parts = line.split(',')
                if len(parts) >= 3:
                    try:
                        mset_id = int(parts[1].strip())
                        name = parts[2].strip()
                        
                        # 锚固段MSET
                        if mset_id in {1710, 1711, 1712}:
                            bonded_msets.append((mset_id, name))
                            print(f"🔒 锚固段MSET {mset_id}: {name}")
                        
                        # 自由段MSET (ê开头)
                        elif name.startswith('ê'):
                            free_msets.append((mset_id, name))
                            print(f"🆓 自由段MSET {mset_id}: {name}")
                    except (ValueError, IndexError):
                        continue
        
        print(f"\n📊 MSET分组统计:")
        print(f"  锚固段MSET: {len(bonded_msets)} 个")
        print(f"  自由段MSET: {len(free_msets)} 个")
        
        if len(bonded_msets) == 0:
            print(f"❌ 未找到锚固段MSET!")
            return False
        
        if len(free_msets) == 0:
            print(f"❌ 未找到自由段MSET!")
            return False
        
        # 模拟约束生成逻辑
        print(f"\n🔗 模拟约束生成:")
        print(f"  1. 锚固段MSET {[m[0] for m in bonded_msets]} -> 土体embedded约束")
        print(f"  2. 自由段MSET {[m[0] for m in free_msets[:5]]}... -> 地连墙MPC约束(仅锚头)")
        print(f"  3. 自由段中间节点 -> 完全悬空")
        
        # 创建测试约束文件
        test_dir = project_root / "test_mset_constraints"
        test_dir.mkdir(exist_ok=True)
        
        test_constraints = {
            "shell_anchor": [],  # 将由实际约束生成填充
            "anchor_solid": [],  # 将由实际约束生成填充
            "mset_info": {
                "bonded_msets": [{"id": m[0], "name": m[1]} for m in bonded_msets],
                "free_msets": [{"id": m[0], "name": m[1]} for m in free_msets],
                "total_bonded": len(bonded_msets),
                "total_free": len(free_msets)
            },
            "params": {
                "projection_tolerance": 1.0,
                "search_radius": 10.0,
                "nearest_k": 4
            }
        }
        
        with open(test_dir / "mset_constraints_info.json", 'w', encoding='utf-8') as f:
            json.dump(test_constraints, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ MSET信息已保存到: {test_dir / 'mset_constraints_info.json'}")
        
        # 验证成功条件
        success = (len(bonded_msets) >= 3 and len(free_msets) >= 10)
        
        if success:
            print(f"\n🎉 MSET分组验证成功!")
            print(f"  ✅ 发现{len(bonded_msets)}个锚固段MSET")
            print(f"  ✅ 发现{len(free_msets)}个自由段MSET")
            print(f"  ✅ 可以基于这些分组生成正确的约束")
        else:
            print(f"\n❌ MSET分组不完整")
        
        return success
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_mset_constraints()
    if success:
        print(f"\n🚀 可以继续实现基于MSET的约束生成!")
        print(f"下一步: 在Kratos转换中应用这些分组")
    else:
        print(f"\n🔧 需要进一步检查MSET数据...")
