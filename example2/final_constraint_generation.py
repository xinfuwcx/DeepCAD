#!/usr/bin/env python3
"""最终约束生成验证"""

import sys
import os
import json
import traceback
from pathlib import Path

sys.path.append('.')

def generate_constraints_final():
    """最终的约束生成测试"""
    print("=== 最终约束生成验证 ===")
    
    try:
        # 1. 导入模块
        print("1. 导入模块...")
        from core.optimized_fpn_parser import OptimizedFPNParser
        from core.kratos_interface import KratosInterface
        
        # 2. 解析FPN
        print("2. 解析FPN文件...")
        fpn_path = 'data/两阶段-全锚杆-摩尔库伦.fpn'
        parser = OptimizedFPNParser()
        fpn_data = parser.parse_file_streaming(fpn_path)
        print(f"   节点数: {len(fpn_data.get('nodes', []))}")
        print(f"   单元数: {len(fpn_data.get('elements', []))}")
        
        # 3. 创建Kratos接口
        print("3. 创建Kratos接口...")
        ki = KratosInterface()
        ki.source_fpn_data = fpn_data
        
        # 4. 转换数据
        print("4. 转换数据...")
        kratos_data = ki._convert_fpn_to_kratos(fpn_data)
        ki.model_data = kratos_data
        
        # 5. 生成约束
        print("5. 生成约束...")
        output_dir = 'kratos_with_constraints'
        Path(output_dir).mkdir(exist_ok=True)
        
        # 显式调用约束生成方法
        ki._write_interface_mappings(
            temp_dir=output_dir,
            projection_tolerance=5.0,
            search_radius=20.0, 
            nearest_k=8
        )
        
        # 6. 验证结果
        print("6. 验证结果...")
        constraint_file = f'{output_dir}/mpc_constraints.json'
        
        if os.path.exists(constraint_file):
            with open(constraint_file, 'r') as f:
                data = json.load(f)
            
            shell_anchor = data.get('shell_anchor', [])
            anchor_solid = data.get('anchor_solid', [])
            stats = data.get('stats', {})
            
            print(f"   约束文件大小: {os.path.getsize(constraint_file) / 1024:.1f} KB")
            print(f"   Shell-anchor约束: {len(shell_anchor)}")
            print(f"   Anchor-solid约束: {len(anchor_solid)}")
            
            # 参数验证
            params = stats.get('params', {})
            print(f"   实际参数: {params}")
            
            # 节点统计
            counts = stats.get('counts', {})
            print(f"   锚头节点: {counts.get('anchor_head_nodes', 'N/A')}")
            print(f"   自由段节点: {counts.get('truss_free_nodes', 'N/A')}")
            
            # 成功评估
            target = 2934
            actual = len(shell_anchor)
            success_rate = actual / target * 100 if target > 0 else 0
            
            print(f"\\n=== 最终结果 ===")
            print(f"目标约束数: {target}")
            print(f"实际约束数: {actual}")
            print(f"成功率: {success_rate:.1f}%")
            
            if actual >= target * 0.8:
                print("SUCCESS 算法验证成功！")
                return True, actual
            else:
                print("WARNING 约束数量不足，需要进一步优化")
                return False, actual
        else:
            print("ERROR 约束文件未生成")
            return False, 0
            
    except Exception as e:
        print(f"ERROR 生成过程失败: {e}")
        print("详细错误:")
        traceback.print_exc()
        return False, 0

if __name__ == "__main__":
    success, count = generate_constraints_final()
    
    print(f"\\n{'='*50}")
    if success:
        print(f"SUCCESS 约束生成成功！生成了 {count} 个锚头约束")
    else:
        print(f"INFO 约束生成完成，但数量为 {count}，可能需要进一步调试")
    print(f"{'='*50}")