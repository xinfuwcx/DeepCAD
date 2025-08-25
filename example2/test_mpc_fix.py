#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试修复后的MPC约束实现
验证锚杆-地连墙连接是否正确生成和应用
"""

import sys
import os
import json
from pathlib import Path

# 设置环境
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def test_mpc_fix():
    """测试修复后的MPC约束功能"""
    print("测试修复后的MPC约束实现")
    print("=" * 60)
    
    try:
        # 1. 加载FPN数据
        from optimized_fpn_parser import OptimizedFPNParser
        parser = OptimizedFPNParser()
        
        fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        fpn_data = parser.parse_file_streaming(str(fpn_file))
        print("FPN数据解析成功")
        
        # 2. 创建Kratos接口并测试约束生成
        from kratos_interface import KratosInterface
        ki = KratosInterface()
        
        # 设置模型以触发约束生成
        success = ki.setup_model(fpn_data)
        if not success:
            print("模型设置失败")
            return False
        
        print("模型设置成功")
        
        # 3. 检查是否生成了MPC约束数据
        if hasattr(ki, 'mpc_constraint_data') and ki.mpc_constraint_data:
            constraint_data = ki.mpc_constraint_data
            
            shell_anchor = constraint_data.get('shell_anchor', [])
            anchor_solid = constraint_data.get('anchor_solid', [])
            
            print(f"\nMPC约束数据检查:")
            print(f"  地连墙-锚杆约束: {len(shell_anchor)} 个")
            print(f"  锚杆-土体约束: {len(anchor_solid)} 个")
            print(f"  总约束数量: {len(shell_anchor) + len(anchor_solid)} 个")
            
            # 显示约束示例
            if shell_anchor:
                example = shell_anchor[0]
                print(f"\n地连墙-锚杆约束示例:")
                print(f"  从节点: {example['slave']}")
                print(f"  主节点数: {len(example['masters'])}")
                print(f"  约束DOF: {example['dofs']}")
            
            if anchor_solid:
                example = anchor_solid[0]
                print(f"\n锚杆-土体约束示例:")
                print(f"  从节点: {example['slave']}")
                print(f"  主节点数: {len(example['masters'])}")
                print(f"  约束DOF: {example['dofs']}")
                
            # 4. 运行分析检查约束是否被应用
            print(f"\n开始运行分析...")
            result_success, result_data = ki.run_analysis()
            
            if result_success:
                print("分析运行成功!")
                
                # 5. 检查生成的项目参数文件
                params_file = Path("temp_kratos_analysis") / "ProjectParameters.json"
                if params_file.exists():
                    with open(params_file, 'r', encoding='utf-8') as f:
                        params = json.load(f)
                    
                    constraints_list = params.get('processes', {}).get('constraints_process_list', [])
                    
                    print(f"\nKratos配置检查:")
                    print(f"  约束进程数: {len(constraints_list)}")
                    
                    # 查找MPC约束进程
                    mpc_processes = [p for p in constraints_list if 'mpc_constraints' in p.get('python_module', '')]
                    
                    if mpc_processes:
                        print(f"  发现MPC约束进程: {len(mpc_processes)} 个")
                        
                        mpc_proc = mpc_processes[0]
                        params = mpc_proc.get('Parameters', {})
                        
                        shell_anchor_count = len(params.get('shell_anchor_constraints', []))
                        anchor_solid_count = len(params.get('anchor_solid_constraints', []))
                        
                        print(f"  MPC进程约束配置:")
                        print(f"    地连墙-锚杆: {shell_anchor_count} 个")
                        print(f"    锚杆-土体: {anchor_solid_count} 个")
                        
                        print(f"\n修复验证成功!")
                        print(f"  约束生成: {len(shell_anchor) + len(anchor_solid)} 个")
                        print(f"  约束应用: {shell_anchor_count + anchor_solid_count} 个")
                        
                        return True
                    else:
                        print("  未发现MPC约束进程")
                        return False
                else:
                    print("  ProjectParameters.json文件不存在")
                    return False
            else:
                print("分析运行失败")
                return False
        else:
            print("未生成MPC约束数据")
            return False
            
    except Exception as e:
        print(f"测试过程出错: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("开始MPC约束修复验证")
    
    success = test_mpc_fix()
    
    print("\n" + "=" * 60)
    if success:
        print("MPC约束修复验证通过!")
        print("锚杆-地连墙连接已正确实现")
    else:
        print("MPC约束修复验证失败")
        print("需要进一步调试")