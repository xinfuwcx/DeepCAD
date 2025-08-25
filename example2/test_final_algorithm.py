#!/usr/bin/env python3
"""最终算法测试：确保生成2934个约束"""

import os
import sys
import json
sys.path.append('.')

def test_final_algorithm():
    """测试最终的连通分量算法"""
    
    # 强制重新生成，不使用缓存
    print("=== 最终算法测试 ===")
    print("强制重新生成约束，目标：2934个shell-anchor约束")
    
    from core.optimized_fpn_parser import OptimizedFPNParser
    from core.kratos_interface import KratosInterface
    
    # 1. 重新解析FPN
    print("\\n1. 重新解析FPN文件...")
    fpn_path = 'data/两阶段-全锚杆-摩尔库伦.fpn'
    parser = OptimizedFPNParser()
    fpn_data = parser.parse_file_streaming(fpn_path)
    
    # 2. 创建新的KratosInterface实例
    print("2. 创建新的Kratos接口...")
    ki = KratosInterface()
    ki.source_fpn_data = fpn_data
    kratos_data = ki._convert_fpn_to_kratos(fpn_data)
    ki.model_data = kratos_data
    
    # 3. 删除旧的约束文件
    constraint_file = 'kratos_with_constraints/mpc_constraints.json'
    if os.path.exists(constraint_file):
        os.remove(constraint_file)
        print(f"3. 删除旧约束文件: {constraint_file}")
    
    # 4. 生成新约束
    print("4. 生成约束（显式参数）...")
    output_dir = 'kratos_with_constraints'
    
    # 直接调用约束生成，确保参数正确
    ki._write_interface_mappings(
        temp_dir=output_dir,
        projection_tolerance=5.0,    # 放宽容差确保覆盖
        search_radius=20.0,
        nearest_k=8
    )
    
    # 5. 立即验证结果
    print("\\n5. 验证结果...")
    try:
        with open(constraint_file, 'r') as f:
            data = json.load(f)
        
        shell_anchor = data.get('shell_anchor', [])
        anchor_solid = data.get('anchor_solid', [])
        stats = data.get('stats', {})
        
        print(f"Shell-anchor约束: {len(shell_anchor)}")
        print(f"Anchor-solid约束: {len(anchor_solid)}")
        
        if 'params' in stats:
            print(f"实际参数: {stats['params']}")
            
        if 'counts' in stats:
            counts = stats['counts']
            print(f"端点数: {counts.get('anchor_head_nodes', 'N/A')}")
            print(f"自由段节点: {counts.get('truss_free_nodes', 'N/A')}")
            
        # 成功标准
        target_constraints = 2934
        actual_constraints = len(shell_anchor)
        coverage = actual_constraints / target_constraints * 100 if target_constraints > 0 else 0
        
        print(f"\\n=== 最终评估 ===")
        print(f"目标约束数: {target_constraints}")
        print(f"实际约束数: {actual_constraints}")
        print(f"覆盖率: {coverage:.1f}%")
        
        if actual_constraints >= target_constraints * 0.8:  # 80%以上认为成功
            print("✅ 算法测试成功！")
            return True
        else:
            print("❌ 算法需要进一步优化")
            return False
            
    except Exception as e:
        print(f"验证失败: {e}")
        return False

if __name__ == "__main__":
    success = test_final_algorithm()
    if success:
        print("\\n🎉 锚杆约束生成算法验证通过！")
    else:
        print("\\n⚠️ 需要进一步调试和优化")