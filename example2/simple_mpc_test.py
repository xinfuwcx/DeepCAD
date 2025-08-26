#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化的MPC工具测试
"""

import sys
import os
sys.path.append('core')

def simple_mpc_test():
    """简化的MPC工具测试"""
    print("🔬 简化MPC工具测试")
    
    try:
        # 检查Kratos可用性
        try:
            import KratosMultiphysics as KM
            print("✅ KratosMultiphysics可用")
        except ImportError:
            print("❌ KratosMultiphysics不可用")
            return False
        
        # 检查AssignMasterSlaveConstraintsToNeighboursUtility
        try:
            utility_class = KM.AssignMasterSlaveConstraintsToNeighboursUtility
            print(f"✅ 找到工具类: {utility_class}")
        except AttributeError:
            print("❌ AssignMasterSlaveConstraintsToNeighboursUtility不可用")
            return False
        
        # 创建最简模型
        print("📋 创建最简模型...")
        model = KM.Model()
        main_part = model.CreateModelPart("Main")
        main_part.AddNodalSolutionStepVariable(KM.DISPLACEMENT)
        
        # 创建节点
        main_part.CreateNewNode(1, 0.0, 0.0, 0.0)  # 锚杆节点
        main_part.CreateNewNode(2, 1.0, 0.0, 0.0)  # 土体节点1
        main_part.CreateNewNode(3, 0.0, 1.0, 0.0)  # 土体节点2
        
        print(f"✅ 创建{main_part.NumberOfNodes()}个节点")
        
        # 测试工具构造
        try:
            utility = KM.AssignMasterSlaveConstraintsToNeighboursUtility(main_part.Nodes)
            print("✅ 工具构造成功")
        except Exception as e:
            print(f"❌ 工具构造失败: {e}")
            return False
        
        # 测试方法调用
        try:
            # 创建从节点容器（只包含节点1）
            slave_nodes = KM.ModelPart.NodesContainerType()
            slave_nodes.push_back(main_part.GetNode(1))
            
            variables_list = [KM.DISPLACEMENT_X, KM.DISPLACEMENT_Y, KM.DISPLACEMENT_Z]
            
            utility.AssignMasterSlaveConstraintsToNodes(
                slave_nodes,      # 从节点
                2.0,              # 搜索半径
                main_part,        # 计算模型部件
                variables_list,   # 变量列表
                1                 # 最小邻居数
            )
            
            constraint_count = main_part.NumberOfMasterSlaveConstraints()
            print(f"✅ 方法调用成功，创建{constraint_count}个约束")
            
            return constraint_count > 0
            
        except Exception as e:
            print(f"❌ 方法调用失败: {e}")
            print(f"错误类型: {type(e).__name__}")
            return False
    
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

if __name__ == "__main__":
    success = simple_mpc_test()
    if success:
        print("🎉 简化测试成功！")
    else:
        print("⚠️ 需要进一步调试")
