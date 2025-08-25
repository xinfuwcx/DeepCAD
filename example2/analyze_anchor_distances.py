#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分析锚杆节点到地连墙的距离分布
"""

import sys
import os
import math
from pathlib import Path

# 设置环境
os.environ['QT_OPENGL'] = 'software'
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def analyze_distances():
    """分析锚杆到地连墙的距离"""
    print("🔍 分析锚杆节点到地连墙的距离分布")
    print("=" * 60)
    
    try:
        from PyQt6.QtWidgets import QApplication
        app = QApplication([])
        
        from optimized_fpn_parser import OptimizedFPNParser
        from kratos_interface import KratosInterface
        
        print("📋 加载数据...")
        parser = OptimizedFPNParser()
        fpn_data = parser.parse_file_streaming('data/两阶段-全锚杆-摩尔库伦.fpn')
        
        ki = KratosInterface()
        ki.setup_model(fpn_data)
        
        # 获取节点坐标
        md = ki.model_data or {}
        all_nodes = md.get('nodes') or []
        nodes_list = list(all_nodes.values()) if isinstance(all_nodes, dict) else list(all_nodes)
        
        node_xyz = {}
        for n in nodes_list:
            try:
                node_xyz[int(n['id'])] = tuple(map(float, n['coordinates']))
            except:
                continue
        
        print(f"✅ 节点坐标: {len(node_xyz):,} 个")
        
        # 获取MSET分组
        mesh_sets = fpn_data.get('mesh_sets', {})
        
        # 锚固段和自由段节点
        bonded_nodes = set()
        free_nodes = set()
        
        for mset_id, mset_data in mesh_sets.items():
            name = mset_data.get('name', '')
            nodes = mset_data.get('nodes', [])
            
            try:
                mset_id_int = int(mset_id)
                if mset_id_int in {1710, 1711, 1712}:
                    bonded_nodes.update(nodes)
                    print(f"🔒 锚固段MSET {mset_id}: {name} ({len(nodes)}个节点)")
                elif name.startswith('ê'):
                    free_nodes.update(nodes)
                    print(f"🆓 自由段MSET {mset_id}: {name} ({len(nodes)}个节点)")
            except:
                continue
        
        # 获取地连墙节点（假设是壳单元）
        all_elements = md.get('elements') or []
        shell_nodes = set()
        
        for el in all_elements:
            et = el.get('type')
            nids = el.get('nodes') or []
            
            if et in ('Triangle2D3N', 'Quadrilateral2D4N', 'ShellThinElementCorotational3D3N'):
                shell_nodes.update(int(x) for x in nids if x is not None)
        
        print(f"\n📊 节点统计:")
        print(f"  地连墙节点: {len(shell_nodes):,} 个")
        print(f"  锚杆自由段节点: {len(free_nodes):,} 个")
        print(f"  锚杆锚固段节点: {len(bonded_nodes):,} 个")
        
        # 分析距离分布
        print(f"\n🔍 分析自由段锚杆到地连墙的距离...")
        
        distances = []
        shell_list = list(shell_nodes)
        
        # 采样分析（避免计算量过大）
        sample_free = list(free_nodes)[:1000]  # 采样1000个节点
        
        for i, tn in enumerate(sample_free):
            if i % 100 == 0:
                print(f"  处理进度: {i}/{len(sample_free)}")
            
            p = node_xyz.get(tn)
            if not p:
                continue
            
            # 找到最近的地连墙节点
            min_dist = float('inf')
            for sn in shell_list:
                sp = node_xyz.get(sn)
                if not sp:
                    continue
                
                dx = p[0] - sp[0]
                dy = p[1] - sp[1] 
                dz = p[2] - sp[2]
                dist = math.sqrt(dx*dx + dy*dy + dz*dz)
                
                if dist < min_dist:
                    min_dist = dist
            
            if min_dist < float('inf'):
                distances.append(min_dist)
        
        print(f"\n📊 距离分布分析 (基于{len(distances)}个样本):")
        
        if distances:
            distances.sort()
            
            min_dist = min(distances)
            max_dist = max(distances)
            avg_dist = sum(distances) / len(distances)
            
            # 百分位数
            p10 = distances[int(len(distances) * 0.1)]
            p25 = distances[int(len(distances) * 0.25)]
            p50 = distances[int(len(distances) * 0.5)]
            p75 = distances[int(len(distances) * 0.75)]
            p90 = distances[int(len(distances) * 0.9)]
            
            print(f"  最小距离: {min_dist:.3f} m")
            print(f"  最大距离: {max_dist:.3f} m")
            print(f"  平均距离: {avg_dist:.3f} m")
            print(f"  中位数: {p50:.3f} m")
            print(f"  10%分位: {p10:.3f} m")
            print(f"  25%分位: {p25:.3f} m")
            print(f"  75%分位: {p75:.3f} m")
            print(f"  90%分位: {p90:.3f} m")
            
            # 分析不同容差下的覆盖率
            tolerances = [0.5, 1.0, 2.0, 5.0, 10.0]
            print(f"\n🎯 不同投影容差下的锚头覆盖率:")
            
            for tol in tolerances:
                count = sum(1 for d in distances if d <= tol)
                coverage = count / len(distances) * 100
                print(f"  {tol:4.1f}m: {count:4d}个节点 ({coverage:5.1f}%)")
            
            # 建议最佳容差
            print(f"\n💡 建议:")
            if p75 <= 2.0:
                print(f"  建议投影容差: 2.0m (覆盖75%的锚杆)")
            elif p50 <= 5.0:
                print(f"  建议投影容差: 5.0m (覆盖50%的锚杆)")
            else:
                print(f"  建议投影容差: 10.0m (覆盖大部分锚杆)")
            
            print(f"  当前设置1.0m可能太小，建议增大到{p75:.1f}m")
        
        return True
        
    except Exception as e:
        print(f"❌ 分析失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = analyze_distances()
    if success:
        print(f"\n🎉 距离分析完成！")
    else:
        print(f"\n❌ 距离分析失败！")
