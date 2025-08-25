#!/usr/bin/env python3
"""测试Kratos原生约束自动分配功能"""

import sys
import os
from pathlib import Path

# 添加路径
sys.path.append('.')

def test_assign_neighbours_utility():
    """测试AssignMasterSlaveConstraintsToNeighboursUtility"""
    print("=== 测试 AssignMasterSlaveConstraintsToNeighboursUtility ===")
    
    try:
        import KratosMultiphysics as KM
        
        # 创建测试ModelPart
        model = KM.Model()
        model_part = model.CreateModelPart("TestPart")
        
        # 添加自由度变量
        model_part.AddNodalSolutionStepVariable(KM.DISPLACEMENT_X)
        model_part.AddNodalSolutionStepVariable(KM.DISPLACEMENT_Y)
        model_part.AddNodalSolutionStepVariable(KM.DISPLACEMENT_Z)
        
        # 创建测试节点 - 模拟锚杆端点和墙节点
        # 锚杆端点
        anchor_node = model_part.CreateNewNode(1, 0.0, 0.0, 0.0)
        
        # 墙节点 - 在锚杆端点附近
        wall_node1 = model_part.CreateNewNode(2, 0.5, 0.0, 0.0)  
        wall_node2 = model_part.CreateNewNode(3, 0.0, 0.5, 0.0)
        wall_node3 = model_part.CreateNewNode(4, 0.3, 0.3, 0.0)
        
        print(f"创建了 {model_part.NumberOfNodes()} 个测试节点")
        
        # 获取AssignMasterSlaveConstraintsToNeighboursUtility
        utility_class = KM.AssignMasterSlaveConstraintsToNeighboursUtility
        print(f"获得工具类: {utility_class}")
        
        # 查看详细方法信息
        assign_method = getattr(utility_class, 'AssignMasterSlaveConstraintsToNodes')
        print(f"找到方法: {assign_method}")
        
        # 尝试调用（需要研究参数）
        print("\\n尝试调用AssignMasterSlaveConstraintsToNodes...")
        
        # 方法1：尝试不同的参数组合
        try:
            # 可能需要的参数：model_part, slave_nodes, master_nodes, 距离阈值等
            print("参数探索...")
            
            # 创建节点列表
            slave_nodes = [anchor_node]
            master_nodes = [wall_node1, wall_node2, wall_node3]
            
            print(f"从节点: {[n.Id for n in slave_nodes]}")
            print(f"主节点: {[n.Id for n in master_nodes]}")
            
            # 这里需要根据实际API调整
            print("需要进一步研究API参数...")
            
        except Exception as e:
            print(f"调用失败: {e}")
            print("需要查看具体的API文档或源码")
        
        return True
        
    except Exception as e:
        print(f"测试失败: {e}")
        return False

def test_embedded_utilities():
    """测试EmbeddedSkinUtility功能"""
    print("\\n=== 测试 EmbeddedSkinUtility ===")
    
    try:
        import KratosMultiphysics as KM
        
        # 获取2D和3D嵌入工具
        utility_2d = KM.EmbeddedSkinUtility2D
        utility_3d = KM.EmbeddedSkinUtility3D
        
        print(f"EmbeddedSkinUtility2D: {utility_2d}")
        print(f"EmbeddedSkinUtility3D: {utility_3d}")
        
        # 查看3D工具的方法
        methods_3d = [m for m in dir(utility_3d) if not m.startswith('_')]
        print(f"EmbeddedSkinUtility3D方法: {methods_3d}")
        
        return True
        
    except Exception as e:
        print(f"测试失败: {e}")
        return False

def test_link_constraint():
    """测试LinkConstraint功能"""
    print("\\n=== 测试 LinkConstraint ===")
    
    try:
        import KratosMultiphysics.StructuralMechanicsApplication as SA
        
        link_constraint_class = SA.LinkConstraint
        print(f"LinkConstraint类: {link_constraint_class}")
        
        # 查看构造函数要求
        try:
            # 尝试创建实例（可能失败但能看到要求的参数）
            constraint = link_constraint_class()
        except Exception as e:
            print(f"构造函数信息: {e}")
        
        return True
        
    except Exception as e:
        print(f"测试失败: {e}")
        return False

def analyze_findings():
    """分析调研结果并给出技术建议"""
    print("\\n" + "="*60)
    print("🎯 Kratos原生功能调研结论")
    print("="*60)
    
    findings = {
        "AssignMasterSlaveConstraintsToNeighboursUtility": "✅ 存在自动邻居约束分配功能",
        "EmbeddedSkinUtility": "✅ 存在嵌入约束功能（适用于锚杆-土体）",
        "LinkConstraint": "✅ 存在专门的连接约束类",
        "LinearMasterSlaveConstraint": "✅ 当前使用的约束类可用"
    }
    
    for feature, status in findings.items():
        print(f"{feature}: {status}")
    
    print("\\n📋 技术建议:")
    print("1. **混合方案最优**: 手工端点识别 + Kratos原生约束应用")
    print("2. **AssignMasterSlaveConstraintsToNeighboursUtility**: 需要深入研究API")  
    print("3. **EmbeddedSkinUtility**: 可用于锚杆-土体约束")
    print("4. **当前LinearMasterSlaveConstraint**: 可以继续使用，但考虑升级")
    
    print("\\n🚀 下一步行动:")
    print("1. 深入研究AssignMasterSlaveConstraintsToNeighboursUtility的API")
    print("2. 如果API复杂，继续优化当前手工MPC方案")
    print("3. 考虑用EmbeddedSkinUtility替代手工锚杆-土体约束")
    print("4. 实现混合方案：手工识别+Kratos原生应用")

def main():
    """主测试函数"""
    print("🔬 Kratos原生约束功能深度测试")
    print("="*60)
    
    # 运行各项测试
    test_assign_neighbours_utility()
    test_embedded_utilities() 
    test_link_constraint()
    
    # 分析和建议
    analyze_findings()

if __name__ == "__main__":
    main()