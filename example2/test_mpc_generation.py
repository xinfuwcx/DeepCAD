#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试MPC约束生成
"""

import sys
import os
from pathlib import Path

# 设置环境
os.environ['QT_OPENGL'] = 'software'
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def test_mpc_generation():
    """测试MPC约束生成"""
    print("🔧 测试MPC约束生成")
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
        
        # 5. 测试MPC约束生成
        print("📋 测试MPC约束生成...")
        
        test_dir = project_root / "test_mpc_output"
        test_dir.mkdir(exist_ok=True)
        
        try:
            kratos_interface._write_interface_mappings(
                test_dir,
                projection_tolerance=0.1,
                search_radius=0.5,
                nearest_k=4
            )
            print("✅ MPC约束生成成功")
            
            # 检查生成的文件
            mpc_file = test_dir / "mpc_constraints.json"
            if mpc_file.exists():
                print(f"✅ MPC文件存在: {mpc_file}")
                print(f"  文件大小: {mpc_file.stat().st_size / 1024:.1f} KB")
                
                # 读取并分析约束内容
                import json
                with open(mpc_file, 'r') as f:
                    mpc_data = json.load(f)
                
                shell_anchor = mpc_data.get('shell_anchor', [])
                anchor_solid = mpc_data.get('anchor_solid', [])
                
                print(f"📊 约束统计:")
                print(f"  地连墙-锚杆约束: {len(shell_anchor):,} 个")
                print(f"  锚杆-土体约束: {len(anchor_solid):,} 个")
                
                # 显示几个示例
                if shell_anchor:
                    print(f"\n🔗 地连墙-锚杆约束示例:")
                    for i, constraint in enumerate(shell_anchor[:3]):
                        slave = constraint['slave']
                        masters = constraint['masters']
                        print(f"  约束{i+1}: 锚杆节点{slave} -> {len(masters)}个地连墙节点")
                        for master in masters[:2]:
                            print(f"    主节点{master['node']}: 权重{master['w']:.3f}")
                
                if anchor_solid:
                    print(f"\n🌍 锚杆-土体约束示例:")
                    for i, constraint in enumerate(anchor_solid[:3]):
                        slave = constraint['slave']
                        masters = constraint['masters']
                        print(f"  约束{i+1}: 锚杆节点{slave} -> {len(masters)}个土体节点")
                        for master in masters[:2]:
                            print(f"    主节点{master['node']}: 权重{master['w']:.3f}")
                
                return True
            else:
                print("❌ MPC文件未生成")
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
    success = test_mpc_generation()
    if success:
        print("\n🎉 MPC约束生成测试成功！")
        print("现在可以确认约束关系是否正确实现。")
    else:
        print("\n❌ MPC约束生成测试失败！")
