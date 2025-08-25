#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速测试版本 - 验证Kratos计算流程
"""

import KratosMultiphysics
import KratosMultiphysics.StructuralMechanicsApplication as StructuralMechanicsApplication
import json
import time

def main():
    """快速测试主函数"""
    print("🚀 Kratos快速测试 - 验证计算流程")
    print("=" * 50)
    
    start_time = time.time()
    
    try:
        # 创建简单的测试模型
        model = KratosMultiphysics.Model()
        main_model_part = model.CreateModelPart("Structure")
        main_model_part.SetBufferSize(1)
        
        # 添加变量
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.REACTION)
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.VOLUME_ACCELERATION)
        
        print("📋 创建简单测试模型...")
        
        # 创建简单的立方体模型（8个节点，1个单元）
        # 节点坐标
        nodes = [
            (1, 0.0, 0.0, 0.0),
            (2, 1.0, 0.0, 0.0),
            (3, 1.0, 1.0, 0.0),
            (4, 0.0, 1.0, 0.0),
            (5, 0.0, 0.0, 1.0),
            (6, 1.0, 0.0, 1.0),
            (7, 1.0, 1.0, 1.0),
            (8, 0.0, 1.0, 1.0)
        ]
        
        # 添加节点
        for node_id, x, y, z in nodes:
            main_model_part.CreateNewNode(node_id, x, y, z)
        
        # 创建材料属性
        material_properties = main_model_part.CreateNewProperties(1)
        material_properties.SetValue(KratosMultiphysics.YOUNG_MODULUS, 10e6)
        material_properties.SetValue(KratosMultiphysics.DENSITY, 2000.0)
        material_properties.SetValue(KratosMultiphysics.POISSON_RATIO, 0.3)
        material_properties.SetValue(KratosMultiphysics.CONSTITUTIVE_LAW, 
                                    StructuralMechanicsApplication.LinearElastic3DLaw())
        
        # 创建单元（四面体）
        main_model_part.CreateNewElement("SmallDisplacementElement3D4N", 1, [1, 2, 3, 5], material_properties)
        main_model_part.CreateNewElement("SmallDisplacementElement3D4N", 2, [2, 3, 5, 6], material_properties)
        main_model_part.CreateNewElement("SmallDisplacementElement3D4N", 3, [3, 5, 6, 7], material_properties)
        main_model_part.CreateNewElement("SmallDisplacementElement3D4N", 4, [3, 5, 7, 8], material_properties)
        main_model_part.CreateNewElement("SmallDisplacementElement3D4N", 5, [1, 3, 4, 5], material_properties)
        main_model_part.CreateNewElement("SmallDisplacementElement3D4N", 6, [3, 4, 5, 8], material_properties)
        
        print(f"✅ 测试模型创建完成:")
        print(f"  节点数: {main_model_part.NumberOfNodes()}")
        print(f"  单元数: {main_model_part.NumberOfElements()}")
        
        # 应用边界条件
        print("📋 应用边界条件...")
        
        # 底面固定 (z=0)
        for node in main_model_part.Nodes:
            if abs(node.Z) < 1e-6:  # z=0的节点
                node.Fix(KratosMultiphysics.DISPLACEMENT_X)
                node.Fix(KratosMultiphysics.DISPLACEMENT_Y)
                node.Fix(KratosMultiphysics.DISPLACEMENT_Z)
        
        # 应用重力
        for node in main_model_part.Nodes:
            node.SetSolutionStepValue(KratosMultiphysics.VOLUME_ACCELERATION_Z, -9.81)
        
        print("✅ 边界条件和荷载设置完成")
        
        # 创建求解器
        print("📋 创建求解器...")
        
        linear_solver = KratosMultiphysics.SkylineLUFactorizationSolver()
        scheme = KratosMultiphysics.ResidualBasedIncrementalUpdateStaticScheme()
        convergence_criterion = KratosMultiphysics.DisplacementCriteria(1e-6, 1e-9)
        
        solving_strategy = KratosMultiphysics.ResidualBasedNewtonRaphsonStrategy(
            main_model_part,
            scheme,
            linear_solver,
            convergence_criterion,
            5,     # max_iterations
            True,  # calculate_reactions
            False, # reform_dofs_at_each_iteration
            True   # move_mesh
        )
        
        solving_strategy.SetEchoLevel(1)
        
        print("📋 初始化求解器...")
        solving_strategy.Initialize()
        
        print("🔄 开始求解...")
        solving_strategy.Solve()
        
        print("📊 计算结果...")
        
        # 计算结果
        max_displacement = 0.0
        max_node = 0
        
        for node in main_model_part.Nodes:
            disp = node.GetSolutionStepValue(KratosMultiphysics.DISPLACEMENT)
            disp_mag = (disp[0]**2 + disp[1]**2 + disp[2]**2)**0.5
            
            if disp_mag > max_displacement:
                max_displacement = disp_mag
                max_node = node.Id
            
            print(f"  节点{node.Id}: 位移({disp[0]:.6f}, {disp[1]:.6f}, {disp[2]:.6f}) = {disp_mag:.6f}m")
        
        print(f"✅ 快速测试成功!")
        print(f"  最大位移: {max_displacement:.6f} m (节点 {max_node})")
        print(f"  计算时间: {time.time() - start_time:.2f} 秒")
        
        # 保存结果
        results = {
            "status": "SUCCESS",
            "test_type": "Quick Test",
            "nodes": main_model_part.NumberOfNodes(),
            "elements": main_model_part.NumberOfElements(),
            "max_displacement": max_displacement,
            "max_displacement_node": max_node,
            "computation_time": time.time() - start_time
        }
        
        with open("quick_test_results.json", 'w') as f:
            json.dump(results, f, indent=2)
        
        print("💾 结果已保存到 quick_test_results.json")
        print("🎉 Kratos计算流程验证成功！")
        
        return True
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        
        error_results = {
            "status": "FAILED",
            "error": str(e),
            "computation_time": time.time() - start_time
        }
        
        with open("quick_test_results.json", 'w') as f:
            json.dump(error_results, f, indent=2)
        
        return False

if __name__ == "__main__":
    success = main()
    if not success:
        print("💥 快速测试失败！")
