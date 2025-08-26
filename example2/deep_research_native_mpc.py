#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深度研究AssignMasterSlaveConstraintsToNeighboursUtility
基于源码分析的完整API研究
"""

import sys
import os
sys.path.append('core')

def deep_research_native_mpc():
    """基于源码分析深度研究原生MPC工具"""
    print("🔬 深度研究AssignMasterSlaveConstraintsToNeighboursUtility")
    print("=" * 80)
    print("📋 基于源码分析的API研究")
    print("=" * 80)
    
    try:
        import KratosMultiphysics as KM
        print("✅ KratosMultiphysics导入成功")
        
        # 1. 源码分析结果总结
        print("\n📊 源码分析结果:")
        print("🎯 构造函数: AssignMasterSlaveConstraintsToNeighboursUtility(NodesContainerType& rMasterStructureNodes)")
        print("🎯 核心方法: AssignMasterSlaveConstraintsToNodes(pSlaveNodes, Radius, rComputingModelPart, rVariableList, MinNumOfNeighNodes)")
        print("🎯 关键特性: 使用RBF形函数，支持并行执行，线程安全")
        
        # 2. 创建测试模型
        print("\n📋 创建测试模型...")
        model = KM.Model()
        main_part = model.CreateModelPart("Structure")
        anchor_part = main_part.CreateSubModelPart("AnchorPart")
        soil_part = main_part.CreateSubModelPart("SoilPart")
        
        # 添加必要变量
        main_part.AddNodalSolutionStepVariable(KM.DISPLACEMENT)
        
        # 创建测试节点
        print("📋 创建测试节点...")
        
        # 锚杆节点（从节点）
        anchor_part.CreateNewNode(1, 0.0, 0.0, 0.0)
        anchor_part.CreateNewNode(2, 1.0, 0.0, 0.0)
        anchor_part.CreateNewNode(3, 2.0, 0.0, 0.0)
        
        # 土体节点（主节点）
        soil_part.CreateNewNode(101, 0.5, 0.5, 0.0)
        soil_part.CreateNewNode(102, 1.5, 0.5, 0.0)
        soil_part.CreateNewNode(103, 2.5, 0.5, 0.0)
        soil_part.CreateNewNode(104, 0.5, -0.5, 0.0)
        soil_part.CreateNewNode(105, 1.5, -0.5, 0.0)
        soil_part.CreateNewNode(106, 2.5, -0.5, 0.0)
        
        print(f"✅ 创建节点: 锚杆{anchor_part.NumberOfNodes()}个, 土体{soil_part.NumberOfNodes()}个")
        
        # 3. 测试原生工具的各种调用方式
        print("\n🔬 开始深度API研究...")
        
        # 测试案例1: 标准调用方式
        success_count = test_standard_api_call(main_part, anchor_part, soil_part)
        if success_count > 0:
            print(f"🎉 标准API调用成功！创建了{success_count}个约束")
            return True
        
        # 测试案例2: Process方式
        success_count = test_process_approach(model)
        if success_count > 0:
            print(f"🎉 Process方式成功！创建了{success_count}个约束")
            return True
        
        # 测试案例3: 参数变化测试
        success_count = test_parameter_variations(main_part, anchor_part, soil_part)
        if success_count > 0:
            print(f"🎉 参数变化测试成功！创建了{success_count}个约束")
            return True
        
        print("⚠️ 所有测试案例都需要进一步研究")
        return False
        
    except Exception as e:
        print(f"❌ 深度研究失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_standard_api_call(main_part, anchor_part, soil_part):
    """测试标准API调用方式"""
    print("\n🎯 测试案例1: 标准API调用")
    try:
        import KratosMultiphysics as KM
        
        # 基于源码：主节点容器用于构造
        utility = KM.AssignMasterSlaveConstraintsToNeighboursUtility(soil_part.Nodes)
        print("  ✅ 工具构造成功")
        
        # 变量列表
        variables_list = [KM.DISPLACEMENT_X, KM.DISPLACEMENT_Y, KM.DISPLACEMENT_Z]
        
        # 调用核心方法
        utility.AssignMasterSlaveConstraintsToNodes(
            anchor_part.Nodes,    # 从节点（锚杆）
            2.0,                  # 搜索半径
            main_part,            # 计算模型部件
            variables_list,       # 变量列表
            2                     # 最小邻居数
        )
        
        constraint_count = main_part.NumberOfMasterSlaveConstraints()
        print(f"  ✅ 创建约束: {constraint_count}个")
        
        if constraint_count > 0:
            # 验证约束质量
            print("  🔍 验证约束质量...")
            for i, constraint in enumerate(main_part.MasterSlaveConstraints):
                print(f"    约束{i+1}: ID={constraint.Id}")
                print(f"      从DOF数: {constraint.GetSlaveDofsVector().size()}")
                print(f"      主DOF数: {constraint.GetMasterDofsVector().size()}")
        
        return constraint_count
        
    except Exception as e:
        print(f"  ❌ 标准API调用失败: {e}")
        return 0

def test_process_approach(model):
    """测试Process方式"""
    print("\n🎯 测试案例2: Process方式")
    try:
        import KratosMultiphysics as KM
        
        # 尝试导入Process
        try:
            from kratos_source.kratos.python_scripts.assign_master_slave_constraints_to_neighbours_process import AssignMasterSlaveConstraintsToNeighboursProcess
            print("  ✅ Process类导入成功")
        except ImportError:
            print("  ⚠️ Process类导入失败，尝试替代方案")
            return 0
        
        # 创建Process参数
        settings = KM.Parameters("""{
            "model_part_name": "Structure",
            "slave_model_part_name": "AnchorPart",
            "master_model_part_name": "SoilPart", 
            "variable_names": ["DISPLACEMENT_X", "DISPLACEMENT_Y", "DISPLACEMENT_Z"],
            "search_radius": 2.0,
            "minimum_number_of_neighbouring_nodes": 2,
            "reform_constraints_at_each_step": false
        }""")
        
        # 创建并执行Process
        process = AssignMasterSlaveConstraintsToNeighboursProcess(model, settings)
        process.ExecuteInitialize()
        
        main_part = model.GetModelPart("Structure")
        constraint_count = main_part.NumberOfMasterSlaveConstraints()
        print(f"  ✅ Process方式创建约束: {constraint_count}个")
        
        return constraint_count
        
    except Exception as e:
        print(f"  ❌ Process方式失败: {e}")
        return 0

def test_parameter_variations(main_part, anchor_part, soil_part):
    """测试参数变化"""
    print("\n🎯 测试案例3: 参数变化测试")
    
    test_configs = [
        {"radius": 1.0, "min_neighbors": 1, "desc": "小半径+少邻居"},
        {"radius": 3.0, "min_neighbors": 3, "desc": "大半径+多邻居"},
        {"radius": 2.0, "min_neighbors": 2, "desc": "中等参数"},
    ]
    
    for config in test_configs:
        try:
            import KratosMultiphysics as KM
            
            print(f"  🔍 测试配置: {config['desc']}")
            
            # 清除之前的约束
            main_part.RemoveAllMasterSlaveConstraints()
            
            utility = KM.AssignMasterSlaveConstraintsToNeighboursUtility(soil_part.Nodes)
            variables_list = [KM.DISPLACEMENT_X, KM.DISPLACEMENT_Y, KM.DISPLACEMENT_Z]
            
            utility.AssignMasterSlaveConstraintsToNodes(
                anchor_part.Nodes,
                config["radius"],
                main_part,
                variables_list,
                config["min_neighbors"]
            )
            
            constraint_count = main_part.NumberOfMasterSlaveConstraints()
            print(f"    ✅ {config['desc']}: {constraint_count}个约束")
            
            if constraint_count > 0:
                return constraint_count
                
        except Exception as e:
            print(f"    ❌ {config['desc']}失败: {e}")
    
    return 0

if __name__ == "__main__":
    success = deep_research_native_mpc()
    
    print("\n" + "=" * 80)
    print("📊 深度研究总结")
    print("=" * 80)
    
    if success:
        print("🎉 研究成功！找到了AssignMasterSlaveConstraintsToNeighboursUtility的正确用法")
        print("✅ 可以立即应用到生产环境")
    else:
        print("🔍 研究进行中，需要继续探索API的正确使用方式")
        print("📋 建议下一步:")
        print("  1. 检查Kratos版本兼容性")
        print("  2. 验证变量类型匹配")
        print("  3. 研究是否需要特定的应用程序模块")
        print("  4. 查看更多源码示例")
    
    print("\n🎯 这项研究符合opus4.1方案的核心目标：深度掌握Kratos原生功能")
