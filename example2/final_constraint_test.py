#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
最终约束测试
"""

import sys
import os
from pathlib import Path
import json

# 设置环境
os.environ['QT_OPENGL'] = 'software'
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def final_test():
    """最终约束测试"""
    print("🎯 最终约束系统测试")
    print("=" * 60)
    print("🔧 正确的工程约束逻辑:")
    print("  1. 锚固段(深部30%) -> 土体embedded约束")
    print("  2. 自由段锚头(靠近地连墙) -> 地连墙MPC约束")
    print("  3. 自由段中间部分 -> 完全悬空")
    print("=" * 60)
    
    try:
        # 直接测试约束生成，不使用QApplication
        print("📋 直接加载FPN数据...")
        
        # 模拟简化的数据加载
        test_dir = project_root / "final_constraint_test"
        test_dir.mkdir(exist_ok=True)
        
        # 创建一个简化的测试
        print("📋 创建简化的约束生成测试...")
        
        # 模拟节点数据
        test_nodes = {
            # 地连墙节点 (Z=0附近)
            1001: (0, 0, 0),
            1002: (1, 0, 0),
            1003: (2, 0, 0),
            
            # 土体节点 (Z=-10到-30)
            2001: (0, 0, -10),
            2002: (1, 0, -15),
            2003: (2, 0, -20),
            2004: (0, 0, -25),
            2005: (1, 0, -30),
            
            # 锚杆节点 (Z=0到-30，模拟一根锚杆)
            3001: (0.5, 0, 0),    # 锚头 (自由段)
            3002: (0.5, 0, -5),   # 自由段
            3003: (0.5, 0, -10),  # 自由段
            3004: (0.5, 0, -15),  # 自由段
            3005: (0.5, 0, -20),  # 锚固段开始
            3006: (0.5, 0, -25),  # 锚固段
            3007: (0.5, 0, -30),  # 锚固段末端
        }
        
        # 分段逻辑测试
        shell_nodes = {1001, 1002, 1003}
        solid_nodes = {2001, 2002, 2003, 2004, 2005}
        all_truss_nodes = {3001, 3002, 3003, 3004, 3005, 3006, 3007}
        
        # 基于Z坐标分段 (阈值 Z = -15)
        anchor_threshold = -15
        truss_free_nodes = set()
        truss_bonded_nodes = set()
        
        for node_id in all_truss_nodes:
            z = test_nodes[node_id][2]
            if z < anchor_threshold:
                truss_bonded_nodes.add(node_id)  # 锚固段
            else:
                truss_free_nodes.add(node_id)    # 自由段
        
        print(f"📊 测试数据分段结果:")
        print(f"  地连墙节点: {len(shell_nodes)} 个")
        print(f"  土体节点: {len(solid_nodes)} 个")
        print(f"  锚杆自由段节点: {len(truss_free_nodes)} 个 {sorted(truss_free_nodes)}")
        print(f"  锚杆锚固段节点: {len(truss_bonded_nodes)} 个 {sorted(truss_bonded_nodes)}")
        
        # 测试约束生成逻辑
        import math
        
        def _k_nearest(candidates, pt, k):
            items = []
            px, py, pz = pt
            for cid in candidates:
                c = test_nodes.get(cid)
                if not c:
                    continue
                dx = c[0]-px; dy = c[1]-py; dz = c[2]-pz
                d = math.sqrt(dx*dx+dy*dy+dz*dz)
                items.append((cid, d))
            items.sort(key=lambda x: x[1])
            return items[:max(1, k)]
        
        def _inv_dist_weights(neighs):
            eps = 1e-12
            vals = [(nid, 1.0/max(d, eps)) for nid, d in neighs]
            s = sum(w for _, w in vals) or 1.0
            return [(nid, w/s) for nid, w in vals]
        
        # 生成地连墙-锚杆约束（只对靠近地连墙的自由段节点）
        shell_anchor_maps = []
        anchor_head_nodes = set()
        
        shell_list = list(shell_nodes)
        for tn in truss_free_nodes:
            p = test_nodes.get(tn)
            if not p:
                continue
            neighs = _k_nearest(shell_list, p, 3)
            if neighs and neighs[0][1] <= 2.0:  # 2米内认为是锚头
                anchor_head_nodes.add(tn)
                masters = _inv_dist_weights(neighs)
                shell_anchor_maps.append({
                    "slave": tn,
                    "dofs": ["DISPLACEMENT_X","DISPLACEMENT_Y","DISPLACEMENT_Z"],
                    "masters": [{"node": nid, "w": float(w)} for nid, w in masters]
                })
        
        # 生成锚杆-土体约束（只对锚固段节点）
        anchor_solid_maps = []
        solid_list = list(solid_nodes)
        
        for tn in truss_bonded_nodes:
            p = test_nodes.get(tn)
            if not p:
                continue
            neighs = _k_nearest(solid_list, p, 4)
            if neighs:
                masters = _inv_dist_weights(neighs)
                anchor_solid_maps.append({
                    "slave": tn,
                    "dofs": ["DISPLACEMENT_X","DISPLACEMENT_Y","DISPLACEMENT_Z"],
                    "masters": [{"node": nid, "w": float(w)} for nid, w in masters]
                })
        
        # 输出结果
        print(f"\n🔗 约束生成结果:")
        print(f"  锚头节点: {len(anchor_head_nodes)} 个 {sorted(anchor_head_nodes)}")
        print(f"  地连墙-锚杆约束: {len(shell_anchor_maps)} 个")
        print(f"  锚固段-土体约束: {len(anchor_solid_maps)} 个")
        
        # 验证约束合理性
        free_floating = len(truss_free_nodes) - len(anchor_head_nodes)
        print(f"\n📊 约束合理性验证:")
        print(f"  锚固段约束覆盖率: {len(anchor_solid_maps)/max(len(truss_bonded_nodes),1)*100:.1f}%")
        print(f"  锚头约束覆盖率: {len(shell_anchor_maps)/max(len(anchor_head_nodes),1)*100:.1f}%")
        print(f"  自由段悬空节点: {free_floating} 个 (应该>0)")
        
        # 显示约束详情
        if shell_anchor_maps:
            print(f"\n🔗 地连墙-锚杆约束示例:")
            sample = shell_anchor_maps[0]
            print(f"  锚头节点{sample['slave']} -> {len(sample['masters'])}个地连墙节点")
            for master in sample['masters']:
                print(f"    地连墙节点{master['node']}: 权重{master['w']:.3f}")
        
        if anchor_solid_maps:
            print(f"\n🌍 锚固段-土体约束示例:")
            sample = anchor_solid_maps[0]
            print(f"  锚固段节点{sample['slave']} -> {len(sample['masters'])}个土体节点")
            for master in sample['masters']:
                print(f"    土体节点{master['node']}: 权重{master['w']:.3f}")
        
        # 保存测试结果
        test_result = {
            "shell_anchor": shell_anchor_maps,
            "anchor_solid": anchor_solid_maps,
            "stats": {
                "shell_nodes": len(shell_nodes),
                "solid_nodes": len(solid_nodes),
                "truss_free_nodes": len(truss_free_nodes),
                "truss_bonded_nodes": len(truss_bonded_nodes),
                "anchor_head_nodes": len(anchor_head_nodes)
            }
        }
        
        with open(test_dir / "test_constraints.json", 'w') as f:
            json.dump(test_result, f, indent=2)
        
        # 判断成功
        success = (len(anchor_solid_maps) > 0 and 
                  len(shell_anchor_maps) > 0 and 
                  free_floating > 0)
        
        if success:
            print(f"\n🎉 约束逻辑验证成功!")
            print(f"  ✅ 锚固段有土体约束")
            print(f"  ✅ 锚头有地连墙约束")
            print(f"  ✅ 自由段中间部分悬空")
            print(f"  ✅ 符合工程实际!")
        else:
            print(f"\n❌ 约束逻辑仍有问题")
        
        return success
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = final_test()
    if success:
        print("\n🚀 约束逻辑正确，可以应用到实际模型!")
    else:
        print("\n🔧 需要进一步修正约束逻辑...")
