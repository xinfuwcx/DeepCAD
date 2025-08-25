#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试修复后的约束系统
"""

import sys
import os
from pathlib import Path

# 设置环境
os.environ['QT_OPENGL'] = 'software'
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def test_fixed_constraints():
    """测试修复后的约束系统"""
    print("🔧 测试修复后的约束系统")
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
        test_dir = project_root / "test_fixed_constraints_output"
        test_dir.mkdir(exist_ok=True)
        
        # 6. 生成所有文件，包括修复后的MPC约束
        print("📋 生成修复后的Kratos文件...")
        
        # MDPA文件
        mdpa_file = test_dir / "model.mdpa"
        kratos_interface._write_mdpa_file(mdpa_file)
        print(f"  ✅ MDPA文件: {mdpa_file.stat().st_size / 1024 / 1024:.1f} MB")
        
        # 材料文件
        materials_file = test_dir / "materials.json"
        kratos_interface._write_materials_file(materials_file)
        print(f"  ✅ 材料文件: {materials_file.stat().st_size / 1024:.1f} KB")
        
        # 项目参数文件
        params_file = test_dir / "ProjectParameters.json"
        kratos_interface._write_project_parameters(params_file, "model", "materials.json")
        print(f"  ✅ 参数文件: {params_file.stat().st_size / 1024:.1f} KB")
        
        # 7. 强制生成MPC约束（使用修复后的参数）
        print("📋 生成修复后的MPC约束...")
        print("   使用参数: search_radius=20.0m, projection_tolerance=2.0m, nearest_k=8")
        
        try:
            kratos_interface._write_interface_mappings(
                test_dir,
                projection_tolerance=2.0,  # 2.0m
                search_radius=20.0,       # 20.0m（你建议的10m的2倍，更保险）
                nearest_k=8              # 8个邻居节点
            )
            print(f"✅ MPC约束生成成功")
            
            # 检查生成的约束文件
            mpc_file = test_dir / "mpc_constraints.json"
            if mpc_file.exists():
                print(f"✅ MPC约束文件存在: {mpc_file.stat().st_size / 1024:.1f} KB")
                
                import json
                with open(mpc_file, 'r') as f:
                    mpc_data = json.load(f)
                
                shell_anchor = mpc_data.get('shell_anchor', [])
                anchor_solid = mpc_data.get('anchor_solid', [])
                
                print(f"\n🎯 约束统计结果:")
                print(f"  1. 锚杆-土体嵌入约束: {len(anchor_solid):,} 个")
                print(f"  2. 地连墙-锚杆MPC约束: {len(shell_anchor):,} 个")
                
                # 计算覆盖率
                total_truss_nodes = 64476  # 已知的锚杆节点数
                coverage_solid = len(anchor_solid) / total_truss_nodes * 100
                coverage_shell = len(shell_anchor) / total_truss_nodes * 100
                
                print(f"\n📊 约束覆盖率:")
                print(f"  锚杆-土体覆盖率: {coverage_solid:.1f}%")
                print(f"  锚杆-地连墙覆盖率: {coverage_shell:.1f}%")
                
                # 检查约束质量
                if len(anchor_solid) > 0:
                    print(f"\n✅ 锚杆-土体嵌入约束: 正常")
                    sample = anchor_solid[0]
                    print(f"  示例: 锚杆节点{sample['slave']} -> {len(sample['masters'])}个土体节点")
                else:
                    print(f"\n❌ 锚杆-土体嵌入约束: 失败")
                
                if len(shell_anchor) > 0:
                    print(f"✅ 地连墙-锚杆MPC约束: 正常")
                    sample = shell_anchor[0]
                    print(f"  示例: 锚杆节点{sample['slave']} -> {len(sample['masters'])}个地连墙节点")
                else:
                    print(f"❌ 地连墙-锚杆MPC约束: 失败")
                
                # 检查MPC处理进程
                proc_file = test_dir / "mpc_constraints_process.py"
                if proc_file.exists():
                    print(f"✅ MPC处理进程文件存在: {proc_file.stat().st_size / 1024:.1f} KB")
                else:
                    print(f"❌ MPC处理进程文件缺失")
                
                # 总结
                if len(anchor_solid) > 0 and len(shell_anchor) > 0:
                    print(f"\n🎉 约束系统修复成功!")
                    print(f"  ✅ 锚杆-土体嵌入约束: {len(anchor_solid):,} 个")
                    print(f"  ✅ 地连墙-锚杆MPC约束: {len(shell_anchor):,} 个")
                    print(f"  ✅ 现在可以进行有意义的Kratos计算了!")
                    return True
                else:
                    print(f"\n❌ 约束系统仍有问题")
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
    success = test_fixed_constraints()
    if success:
        print("\n🚀 准备运行修复后的Kratos分析...")
    else:
        print("\n🔧 需要进一步修复约束问题...")
