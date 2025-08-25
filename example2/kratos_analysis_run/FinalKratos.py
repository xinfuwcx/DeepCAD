#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
最终Kratos分析脚本 - 成功运行完整分析
"""

import KratosMultiphysics
import KratosMultiphysics.StructuralMechanicsApplication as StructuralMechanicsApplication
import json
import time

def main():
    """主函数"""
    print("🚀 开始最终Kratos结构力学分析")
    print("=" * 60)
    
    start_time = time.time()
    
    try:
        # 创建模型
        model = KratosMultiphysics.Model()
        main_model_part = model.CreateModelPart("Structure")
        main_model_part.SetBufferSize(1)
        
        # 添加变量
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.REACTION)
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.VOLUME_ACCELERATION)
        
        print("📋 读取模型...")
        
        # 读取MDPA文件
        model_part_io = KratosMultiphysics.ModelPartIO("model")
        model_part_io.ReadModelPart(main_model_part)
        
        print(f"✅ 模型加载完成:")
        print(f"  节点数: {main_model_part.NumberOfNodes()}")
        print(f"  单元数: {main_model_part.NumberOfElements()}")
        
        # 设置材料属性和本构法则
        print("📋 设置材料属性...")
        for prop_id in [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1000, 200000]:
            if main_model_part.HasProperties(prop_id):
                prop = main_model_part.GetProperties(prop_id)

                if prop_id == 200000:  # 锚杆
                    prop.SetValue(KratosMultiphysics.YOUNG_MODULUS, 200e9)
                    prop.SetValue(KratosMultiphysics.DENSITY, 7800.0)
                    prop.SetValue(KratosMultiphysics.POISSON_RATIO, 0.3)
                    # 设置桁架本构法则
                    prop.SetValue(KratosMultiphysics.CONSTITUTIVE_LAW, StructuralMechanicsApplication.TrussConstitutiveLaw())

                elif prop_id == 1000:  # 混凝土
                    prop.SetValue(KratosMultiphysics.YOUNG_MODULUS, 30e9)
                    prop.SetValue(KratosMultiphysics.DENSITY, 2500.0)
                    prop.SetValue(KratosMultiphysics.POISSON_RATIO, 0.2)
                    # 设置平面应力本构法则
                    prop.SetValue(KratosMultiphysics.CONSTITUTIVE_LAW, StructuralMechanicsApplication.LinearElasticPlaneStress2DLaw())

                else:  # 土体
                    prop.SetValue(KratosMultiphysics.YOUNG_MODULUS, 10e6)
                    prop.SetValue(KratosMultiphysics.DENSITY, 2000.0)
                    prop.SetValue(KratosMultiphysics.POISSON_RATIO, 0.3)
                    # 设置3D线性弹性本构法则
                    prop.SetValue(KratosMultiphysics.CONSTITUTIVE_LAW, StructuralMechanicsApplication.LinearElastic3DLaw())
        
        print("✅ 材料属性设置完成")
        
        # 应用边界条件
        print("📋 应用边界条件...")
        
        # 底部固定
        bottom_count = 0
        if main_model_part.HasSubModelPart("BND_BOTTOM"):
            for node in main_model_part.GetSubModelPart("BND_BOTTOM").Nodes:
                node.Fix(KratosMultiphysics.DISPLACEMENT_X)
                node.Fix(KratosMultiphysics.DISPLACEMENT_Y)
                node.Fix(KratosMultiphysics.DISPLACEMENT_Z)
                bottom_count += 1
        
        # 侧面约束
        side_count = 0
        if main_model_part.HasSubModelPart("BND_8"):
            for node in main_model_part.GetSubModelPart("BND_8").Nodes:
                node.Fix(KratosMultiphysics.DISPLACEMENT_X)
                node.Fix(KratosMultiphysics.DISPLACEMENT_Y)
                side_count += 1
        
        print(f"✅ 边界条件: 底部{bottom_count}个节点, 侧面{side_count}个节点")
        
        # 应用重力
        print("📋 应用重力荷载...")
        for node in main_model_part.Nodes:
            node.SetSolutionStepValue(KratosMultiphysics.VOLUME_ACCELERATION_Z, -9.81)
        
        # 创建求解器组件
        print("📋 创建求解器组件...")
        
        # 线性求解器
        linear_solver = KratosMultiphysics.SkylineLUFactorizationSolver()
        
        # 求解方案
        scheme = KratosMultiphysics.ResidualBasedIncrementalUpdateStaticScheme()
        
        # 构建器和求解器
        builder_and_solver = KratosMultiphysics.ResidualBasedBlockBuilderAndSolver(linear_solver)
        
        # 收敛准则
        convergence_criterion = KratosMultiphysics.DisplacementCriteria(1e-4, 1e-6)
        
        print("📋 创建求解策略...")
        
        # 使用第二个构造函数格式
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
        
        print("📋 初始化求解策略...")
        solving_strategy.Initialize()
        
        print("🔄 开始求解...")
        
        # 执行求解
        solving_strategy.Solve()
        
        print("📊 计算结果...")
        
        # 计算最大位移
        max_displacement = 0.0
        max_node = 0
        total_displacement = 0.0
        node_count = 0
        
        for node in main_model_part.Nodes:
            disp = node.GetSolutionStepValue(KratosMultiphysics.DISPLACEMENT)
            disp_mag = (disp[0]**2 + disp[1]**2 + disp[2]**2)**0.5
            
            if disp_mag > max_displacement:
                max_displacement = disp_mag
                max_node = node.Id
            
            total_displacement += disp_mag
            node_count += 1
        
        avg_displacement = total_displacement / node_count if node_count > 0 else 0.0
        
        print(f"✅ 求解成功!")
        print(f"  最大位移: {max_displacement:.6f} m (节点 {max_node})")
        print(f"  平均位移: {avg_displacement:.6f} m")
        print(f"  计算时间: {time.time() - start_time:.2f} 秒")
        
        # 保存结果
        results = {
            "status": "SUCCESS",
            "analysis_type": "Static Structural (Final)",
            "nodes": main_model_part.NumberOfNodes(),
            "elements": main_model_part.NumberOfElements(),
            "max_displacement": max_displacement,
            "max_displacement_node": max_node,
            "average_displacement": avg_displacement,
            "computation_time": time.time() - start_time,
            "boundary_conditions": {
                "bottom_nodes": bottom_count,
                "side_nodes": side_count
            }
        }
        
        with open("analysis_results.json", 'w') as f:
            json.dump(results, f, indent=2)
        
        print("💾 结果已保存到 analysis_results.json")
        print("🎉 Kratos分析成功完成！")
        
        return True
        
    except Exception as e:
        print(f"❌ 分析失败: {e}")
        import traceback
        traceback.print_exc()
        
        error_results = {
            "status": "FAILED",
            "error": str(e),
            "computation_time": time.time() - start_time
        }
        
        with open("analysis_results.json", 'w') as f:
            json.dump(error_results, f, indent=2)
        
        return False

if __name__ == "__main__":
    success = main()
    if not success:
        print("💥 Kratos分析失败！")
