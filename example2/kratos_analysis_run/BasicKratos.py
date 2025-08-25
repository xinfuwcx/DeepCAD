#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基础Kratos分析脚本 - 跳过复杂材料读取
"""

import KratosMultiphysics
import KratosMultiphysics.StructuralMechanicsApplication as StructuralMechanicsApplication
import json
import time

def main():
    """主函数"""
    print("🚀 开始基础Kratos结构力学分析")
    print("=" * 60)
    
    start_time = time.time()
    
    try:
        # 创建模型
        model = KratosMultiphysics.Model()
        
        # 创建主模型部件
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
        print(f"  条件数: {main_model_part.NumberOfConditions()}")
        
        # 手动设置材料属性（避免复杂的材料文件读取）
        print("📋 设置材料属性...")
        
        # 为所有属性设置基本的线性弹性材料
        for prop_id in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1000, 200000]:
            if main_model_part.HasProperties(prop_id):
                prop = main_model_part.GetProperties(prop_id)
                
                if prop_id == 200000:  # 锚杆材料
                    prop.SetValue(KratosMultiphysics.YOUNG_MODULUS, 200e9)  # 200 GPa
                    prop.SetValue(KratosMultiphysics.DENSITY, 7800.0)
                    prop.SetValue(KratosMultiphysics.POISSON_RATIO, 0.3)
                    prop.SetValue(StructuralMechanicsApplication.CROSS_AREA, 0.025)
                elif prop_id == 1000:  # 混凝土材料
                    prop.SetValue(KratosMultiphysics.YOUNG_MODULUS, 30e9)  # 30 GPa
                    prop.SetValue(KratosMultiphysics.DENSITY, 2500.0)
                    prop.SetValue(KratosMultiphysics.POISSON_RATIO, 0.2)
                    prop.SetValue(StructuralMechanicsApplication.THICKNESS, 0.8)
                else:  # 土体材料
                    prop.SetValue(KratosMultiphysics.YOUNG_MODULUS, 10e6)  # 10 MPa
                    prop.SetValue(KratosMultiphysics.DENSITY, 2000.0)
                    prop.SetValue(KratosMultiphysics.POISSON_RATIO, 0.3)
        
        print("✅ 材料属性设置完成")
        
        # 设置边界条件
        print("📋 应用边界条件...")
        
        # 应用底部固定约束
        for node in main_model_part.GetSubModelPart("BND_BOTTOM").Nodes:
            node.Fix(KratosMultiphysics.DISPLACEMENT_X)
            node.Fix(KratosMultiphysics.DISPLACEMENT_Y)
            node.Fix(KratosMultiphysics.DISPLACEMENT_Z)
        
        # 应用侧面约束
        if main_model_part.HasSubModelPart("BND_8"):
            for node in main_model_part.GetSubModelPart("BND_8").Nodes:
                node.Fix(KratosMultiphysics.DISPLACEMENT_X)
                node.Fix(KratosMultiphysics.DISPLACEMENT_Y)
        
        print("✅ 边界条件应用完成")
        
        # 应用重力荷载
        print("📋 应用重力荷载...")
        for node in main_model_part.Nodes:
            node.SetSolutionStepValue(KratosMultiphysics.VOLUME_ACCELERATION_Z, -9.81)
        
        # 设置求解策略
        print("📋 设置求解策略...")
        
        # 创建线性求解器
        linear_solver = KratosMultiphysics.SkylineLUFactorizationSolver()
        
        # 创建收敛准则
        displacement_criterion = KratosMultiphysics.DisplacementCriteria(1e-6, 1e-9)
        
        # 创建求解策略
        solving_strategy = KratosMultiphysics.ResidualBasedNewtonRaphsonStrategy(
            main_model_part,
            KratosMultiphysics.VariableUtils().CreateSolutionScheme(main_model_part, "static"),
            linear_solver,
            displacement_criterion,
            30,  # max_iterations
            True,  # calculate_reactions
            False,  # reform_dofs_at_each_iteration
            True   # move_mesh
        )
        
        solving_strategy.SetEchoLevel(1)
        
        # 初始化策略
        print("📋 初始化求解策略...")
        solving_strategy.Initialize()
        
        print("🔄 开始求解...")
        
        # 执行求解
        solving_strategy.Solve()
        
        # 输出结果
        print("📊 分析完成，计算结果...")
        
        # 计算最大位移
        max_displacement = 0.0
        max_disp_node = 0
        
        for node in main_model_part.Nodes:
            disp = node.GetSolutionStepValue(KratosMultiphysics.DISPLACEMENT)
            disp_magnitude = (disp[0]**2 + disp[1]**2 + disp[2]**2)**0.5
            if disp_magnitude > max_displacement:
                max_displacement = disp_magnitude
                max_disp_node = node.Id
        
        print(f"✅ 求解成功:")
        print(f"  最大位移: {max_displacement:.6f} m (节点 {max_disp_node})")
        print(f"  计算时间: {time.time() - start_time:.2f} 秒")
        
        # 计算一些统计信息
        total_displacement = 0.0
        node_count = 0
        
        for node in main_model_part.Nodes:
            disp = node.GetSolutionStepValue(KratosMultiphysics.DISPLACEMENT)
            disp_magnitude = (disp[0]**2 + disp[1]**2 + disp[2]**2)**0.5
            total_displacement += disp_magnitude
            node_count += 1
        
        avg_displacement = total_displacement / node_count if node_count > 0 else 0.0
        
        print(f"  平均位移: {avg_displacement:.6f} m")
        print(f"  位移范围: 0.000000 ~ {max_displacement:.6f} m")
        
        # 保存结果摘要
        results = {
            "analysis_type": "Static Structural (Basic)",
            "nodes": main_model_part.NumberOfNodes(),
            "elements": main_model_part.NumberOfElements(),
            "max_displacement": max_displacement,
            "max_displacement_node": max_disp_node,
            "average_displacement": avg_displacement,
            "computation_time": time.time() - start_time,
            "status": "SUCCESS"
        }
        
        with open("analysis_results.json", 'w') as f:
            json.dump(results, f, indent=2)
        
        print("💾 结果已保存到 analysis_results.json")
        
        return True
        
    except Exception as e:
        print(f"❌ 分析失败: {e}")
        import traceback
        traceback.print_exc()
        
        # 保存错误信息
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
    if success:
        print("🎉 Kratos分析成功完成！")
    else:
        print("💥 Kratos分析失败！")
