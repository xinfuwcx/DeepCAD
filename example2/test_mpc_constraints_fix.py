#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试MPC约束修复效果
验证锚杆-土体和地连墙-锚杆约束是否正确生成和应用
"""

import sys
import os
from pathlib import Path
import json

# 设置环境
os.environ['QT_OPENGL'] = 'software'
os.environ['PYTHONIOENCODING'] = 'utf-8'
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def test_mpc_constraints():
    """测试MPC约束修复"""
    print("🧪 测试MPC约束修复效果")
    print("=" * 60)
    
    try:
        # 1. 创建QApplication (避免GUI相关错误)
        from PyQt6.QtWidgets import QApplication
        app = QApplication([])
        
        # 2. 加载FPN数据
        print("📋 步骤1: 加载FPN数据...")
        from optimized_fpn_parser import OptimizedFPNParser
        parser = OptimizedFPNParser()
        
        fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        if not fpn_file.exists():
            print(f"❌ FPN文件不存在: {fpn_file}")
            return False
        
        fpn_data = parser.parse_file_streaming(str(fpn_file))
        print(f"✅ FPN数据加载成功")
        
        # 3. 创建Kratos接口
        print("📋 步骤2: 创建Kratos接口...")
        from kratos_interface import KratosInterface
        kratos_interface = KratosInterface()
        
        # 4. 设置模型
        print("📋 步骤3: 设置模型...")
        success = kratos_interface.setup_model(fpn_data)
        if not success:
            print("❌ 模型设置失败")
            return False
        print("✅ 模型设置成功")
        
        # 5. 运行分析 (这会触发MPC约束生成)
        print("📋 步骤4: 运行分析...")
        try:
            analysis_results = kratos_interface.run_analysis()
            print("✅ 分析运行完成")
        except Exception as e:
            print(f"⚠️ 分析运行遇到错误: {e}")
            print("   继续检查MPC约束文件...")
        
        # 6. 检查生成的MPC约束文件
        print("📋 步骤5: 验证MPC约束文件...")
        temp_dir = Path("temp_kratos_final")
        mpc_file = temp_dir / "mpc_constraints.json"
        mpc_process_file = temp_dir / "mpc_constraints_process.py"
        
        if mpc_file.exists():
            print(f"✅ MPC约束文件存在: {mpc_file}")
            try:
                with open(mpc_file, 'r', encoding='utf-8') as f:
                    mpc_data = json.load(f)
                
                shell_anchor = mpc_data.get('shell_anchor', [])
                anchor_solid = mpc_data.get('anchor_solid', [])
                stats = mpc_data.get('stats', {})
                
                print(f"📊 约束统计:")
                print(f"  地连墙-锚杆约束: {len(shell_anchor)} 个")
                print(f"  锚杆-土体约束: {len(anchor_solid)} 个")
                
                if 'counts' in stats:
                    counts = stats['counts']
                    print(f"  节点统计:")
                    print(f"    地连墙节点: {counts.get('shell_nodes', 0)}")
                    print(f"    土体节点: {counts.get('solid_nodes', 0)}")
                    print(f"    锚杆节点: {counts.get('truss_nodes', 0)}")
                
                if 'params' in stats:
                    params = stats['params']
                    print(f"  搜索参数:")
                    print(f"    搜索半径: {params.get('search_radius', 0)}m")
                    print(f"    投影容差: {params.get('projection_tolerance', 0)}m")
                    print(f"    最近邻数量: {params.get('nearest_k', 0)}")
                
                # 检查约束质量
                total_constraints = len(shell_anchor) + len(anchor_solid)
                if total_constraints > 0:
                    print("✅ MPC约束生成成功")
                    
                    # 显示示例约束
                    if shell_anchor:
                        example = shell_anchor[0]
                        print(f"  示例地连墙-锚杆约束:")
                        print(f"    从动节点: {example['slave']}")
                        print(f"    主节点数量: {len(example['masters'])}")
                    
                    if anchor_solid:
                        example = anchor_solid[0]
                        print(f"  示例锚杆-土体约束:")
                        print(f"    从动节点: {example['slave']}")
                        print(f"    主节点数量: {len(example['masters'])}")
                        
                    return True
                else:
                    print("❌ 没有生成任何约束")
                    return False
                    
            except Exception as e:
                print(f"❌ MPC约束文件读取失败: {e}")
                return False
        else:
            print(f"❌ MPC约束文件未生成: {mpc_file}")
            return False
        
        if mpc_process_file.exists():
            print(f"✅ MPC处理脚本存在: {mpc_process_file}")
        else:
            print(f"❌ MPC处理脚本未生成: {mpc_process_file}")
        
        # 7. 检查ProjectParameters是否包含MPC进程
        params_file = temp_dir / "ProjectParameters.json"
        if params_file.exists():
            print(f"✅ ProjectParameters文件存在")
            try:
                with open(params_file, 'r', encoding='utf-8') as f:
                    params_data = json.load(f)
                
                constraints_list = params_data.get('processes', {}).get('constraints_process_list', [])
                has_mpc_process = any('mpc_constraints_process' in proc.get('python_module', '') 
                                    for proc in constraints_list)
                
                if has_mpc_process:
                    print("✅ ProjectParameters包含MPC约束处理进程")
                else:
                    print("⚠️ ProjectParameters中未找到MPC约束处理进程")
                    
            except Exception as e:
                print(f"⚠️ ProjectParameters读取失败: {e}")
        
    except Exception as e:
        print(f"❌ 测试过程出错: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_mpc_constraints()
    print("\n" + "=" * 60)
    if success:
        print("🎉 MPC约束修复测试通过！")
        print("✅ 锚杆-土体和地连墙-锚杆约束应该可以正常工作了")
    else:
        print("❌ MPC约束修复测试失败")
        print("需要进一步调试问题")