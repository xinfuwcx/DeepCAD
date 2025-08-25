#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
调试MPC约束生成问题
"""

import sys
import os
from pathlib import Path

# 设置环境
os.environ['QT_OPENGL'] = 'software'
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def debug_mpc():
    """调试MPC约束生成"""
    print("🔍 调试MPC约束生成问题")
    print("=" * 50)
    
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
        
        # 3. 创建Kratos接口
        print("📋 创建Kratos接口...")
        from kratos_interface import KratosInterface
        kratos_interface = KratosInterface()
        
        # 4. 设置模型
        print("📋 设置模型...")
        success = kratos_interface.setup_model(fpn_data)
        if not success:
            print("❌ 模型设置失败")
            return False
        
        # 5. 手动调试MPC约束生成
        print("📋 手动调试MPC约束生成...")
        
        # 获取模型数据
        md = kratos_interface.model_data or {}
        all_nodes = md.get('nodes') or []
        all_elements = md.get('elements') or []
        nodes_list = list(all_nodes.values()) if isinstance(all_nodes, dict) else list(all_nodes)
        
        print(f"  节点数据类型: {type(all_nodes)}")
        print(f"  节点总数: {len(nodes_list)}")
        print(f"  单元总数: {len(all_elements)}")
        
        # 构建节点坐标字典
        node_xyz = {}
        for n in nodes_list:
            try:
                node_xyz[int(n['id'])] = tuple(map(float, n['coordinates']))
            except Exception as e:
                print(f"  ⚠️ 节点解析错误: {e}")
                continue
        
        print(f"  有效节点坐标: {len(node_xyz)}")
        
        # 分类节点
        shell_nodes, solid_nodes, truss_nodes = set(), set(), set()
        element_types = {}
        
        for el in all_elements:
            et = el.get('type')
            nids = el.get('nodes') or []
            
            # 统计元素类型
            element_types[et] = element_types.get(et, 0) + 1
            
            # 修复后的元素类型匹配
            if et in ('Triangle2D3N', 'Quadrilateral2D4N', 'ShellThinElementCorotational3D3N'):
                shell_nodes.update(int(x) for x in nids if x is not None)
            elif et in ('Tetrahedra3D4N', 'Tetrahedra3D10N', 'SmallDisplacementElement3D4N'):
                solid_nodes.update(int(x) for x in nids if x is not None)
            elif et in ('TrussElement3D2N', 'TrussElement3D3N'):
                truss_nodes.update(int(x) for x in nids if x is not None)
        
        print(f"\n📊 元素类型统计:")
        for et, count in element_types.items():
            print(f"  {et}: {count:,} 个")
        
        print(f"\n🔗 节点分类结果:")
        print(f"  地连墙节点: {len(shell_nodes):,} 个")
        print(f"  土体节点: {len(solid_nodes):,} 个")
        print(f"  锚杆节点: {len(truss_nodes):,} 个")
        
        # 检查关键问题
        if len(shell_nodes) == 0:
            print("❌ 关键问题: 没有找到地连墙节点!")
            print("   可能原因: 元素类型匹配错误")
            return False
        
        if len(truss_nodes) == 0:
            print("❌ 关键问题: 没有找到锚杆节点!")
            print("   可能原因: 元素类型匹配错误")
            return False
        
        if len(solid_nodes) == 0:
            print("❌ 关键问题: 没有找到土体节点!")
            print("   可能原因: 元素类型匹配错误")
            return False
        
        # 测试距离计算
        print(f"\n🧮 测试约束生成...")
        
        import math
        
        def _k_nearest(candidates, pt, k):
            items = []
            px, py, pz = pt
            for cid in candidates:
                c = node_xyz.get(cid)
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
        
        # 测试几个锚杆节点的约束生成
        shell_list = list(shell_nodes)
        solid_list = list(solid_nodes)
        truss_list = list(truss_nodes)
        
        shell_anchor_count = 0
        anchor_solid_count = 0
        
        # 测试前10个锚杆节点
        for i, tn in enumerate(truss_list[:10]):
            p = node_xyz.get(tn)
            if not p:
                continue
            
            # 测试地连墙-锚杆约束
            shell_neighs = _k_nearest(shell_list, p, 4)
            if shell_neighs and shell_neighs[0][1] <= 0.5:  # 搜索半径0.5m
                shell_anchor_count += 1
                if i < 3:  # 显示前3个的详细信息
                    print(f"  锚杆节点{tn} -> 地连墙约束:")
                    for nid, dist in shell_neighs[:2]:
                        print(f"    节点{nid}: 距离{dist:.3f}m")
            
            # 测试锚杆-土体约束
            solid_neighs = _k_nearest(solid_list, p, 4)
            if solid_neighs:
                anchor_solid_count += 1
                if i < 3:  # 显示前3个的详细信息
                    print(f"  锚杆节点{tn} -> 土体约束:")
                    for nid, dist in solid_neighs[:2]:
                        print(f"    节点{nid}: 距离{dist:.3f}m")
        
        print(f"\n✅ 约束生成测试结果:")
        print(f"  地连墙-锚杆约束: {shell_anchor_count} 个 (测试了前10个锚杆节点)")
        print(f"  锚杆-土体约束: {anchor_solid_count} 个 (测试了前10个锚杆节点)")
        
        if shell_anchor_count > 0 and anchor_solid_count > 0:
            print("🎉 约束生成逻辑正常！")
            return True
        else:
            print("❌ 约束生成逻辑有问题！")
            return False
        
    except Exception as e:
        print(f"❌ 调试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = debug_mpc()
    if success:
        print("\n✅ MPC约束生成逻辑验证成功！")
    else:
        print("\n❌ MPC约束生成逻辑有问题！")
