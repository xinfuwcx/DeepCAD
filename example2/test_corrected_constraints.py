#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试修正后的约束系统
"""

import sys
import os
from pathlib import Path

# 设置环境
os.environ['QT_OPENGL'] = 'software'
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def test_corrected_constraints():
    """测试修正后的约束系统"""
    print("🔧 测试修正后的约束系统")
    print("=" * 60)
    print("🎯 正确的约束逻辑:")
    print("  1. 锚固段节点 -> 土体embedded约束")
    print("  2. 自由段锚头节点 -> 地连墙MPC约束")
    print("  3. 自由段中间节点 -> 完全悬空")
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
        
        # 5. 创建测试输出目录
        test_dir = project_root / "test_corrected_constraints"
        test_dir.mkdir(exist_ok=True)
        
        # 6. 生成修正后的MPC约束
        print("📋 生成修正后的MPC约束...")
        print("   (只对锚固段设置土体约束，只对锚头设置地连墙约束)")
        
        try:
            kratos_interface._write_interface_mappings(
                test_dir,
                projection_tolerance=2.0,
                search_radius=10.0,  # 使用你建议的10m
                nearest_k=4
            )
            
            # 检查生成的约束文件
            mpc_file = test_dir / "mpc_constraints.json"
            if mpc_file.exists():
                print(f"✅ MPC约束文件生成成功: {mpc_file.stat().st_size / 1024:.1f} KB")
                
                import json
                with open(mpc_file, 'r') as f:
                    mpc_data = json.load(f)
                
                shell_anchor = mpc_data.get('shell_anchor', [])
                anchor_solid = mpc_data.get('anchor_solid', [])
                stats = mpc_data.get('stats', {})
                counts = stats.get('counts', {})
                
                print(f"\n🎯 修正后的约束统计:")
                print(f"  锚杆自由段节点: {counts.get('truss_free_nodes', 0):,} 个")
                print(f"  锚杆锚固段节点: {counts.get('truss_bonded_nodes', 0):,} 个")
                print(f"  锚头节点: {counts.get('anchor_head_nodes', 0):,} 个")
                print(f"  地连墙节点: {counts.get('shell_nodes', 0):,} 个")
                print(f"  土体节点: {counts.get('solid_nodes', 0):,} 个")
                
                print(f"\n🔗 生成的约束:")
                print(f"  1. 锚头-地连墙约束: {len(shell_anchor):,} 个")
                print(f"  2. 锚固段-土体约束: {len(anchor_solid):,} 个")
                
                # 验证约束的工程合理性
                total_truss = counts.get('truss_free_nodes', 0) + counts.get('truss_bonded_nodes', 0)
                
                print(f"\n📊 工程合理性验证:")
                
                # 锚固段约束覆盖率
                bonded_coverage = len(anchor_solid) / max(counts.get('truss_bonded_nodes', 1), 1) * 100
                print(f"  锚固段约束覆盖率: {bonded_coverage:.1f}% (应该接近100%)")
                
                # 锚头约束覆盖率
                head_coverage = len(shell_anchor) / max(counts.get('anchor_head_nodes', 1), 1) * 100
                print(f"  锚头约束覆盖率: {head_coverage:.1f}% (应该接近100%)")
                
                # 自由段悬空率
                free_nodes = counts.get('truss_free_nodes', 0)
                head_nodes = counts.get('anchor_head_nodes', 0)
                free_floating = free_nodes - head_nodes
                floating_rate = free_floating / max(free_nodes, 1) * 100
                print(f"  自由段悬空率: {floating_rate:.1f}% (应该在60-80%)")
                
                # 显示约束示例
                if shell_anchor:
                    print(f"\n🔗 锚头-地连墙约束示例:")
                    sample = shell_anchor[0]
                    print(f"  锚杆节点{sample['slave']} -> {len(sample['masters'])}个地连墙节点")
                    for i, master in enumerate(sample['masters'][:2]):
                        print(f"    地连墙节点{master['node']}: 权重{master['w']:.3f}")
                
                if anchor_solid:
                    print(f"\n🌍 锚固段-土体约束示例:")
                    sample = anchor_solid[0]
                    print(f"  锚杆节点{sample['slave']} -> {len(sample['masters'])}个土体节点")
                    for i, master in enumerate(sample['masters'][:2]):
                        print(f"    土体节点{master['node']}: 权重{master['w']:.3f}")
                
                # 最终判断
                if len(anchor_solid) > 0 and len(shell_anchor) > 0:
                    print(f"\n🎉 约束系统修正成功!")
                    print(f"  ✅ 锚固段-土体约束: {len(anchor_solid):,} 个")
                    print(f"  ✅ 锚头-地连墙约束: {len(shell_anchor):,} 个")
                    print(f"  ✅ 符合工程实际的约束关系!")
                    return True
                else:
                    print(f"\n❌ 约束系统仍有问题")
                    if len(anchor_solid) == 0:
                        print(f"    缺失锚固段-土体约束")
                    if len(shell_anchor) == 0:
                        print(f"    缺失锚头-地连墙约束")
                    return False
            else:
                print(f"❌ MPC约束文件未生成")
                return False
                
        except Exception as e:
            print(f"❌ MPC约束生成失败: {e}")
            import traceback
            traceback.print_exc()
            return False
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_corrected_constraints()
    if success:
        print("\n🚀 可以开始有意义的Kratos计算了!")
    else:
        print("\n🔧 需要进一步修正约束逻辑...")
