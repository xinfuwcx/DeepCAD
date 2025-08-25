#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化的Kratos分析脚本 - 使用基础API
"""

import KratosMultiphysics
import KratosMultiphysics.StructuralMechanicsApplication as StructuralMechanicsApplication
import json
import time

# 确保所有必要的元素类型都已注册
print("📋 注册Kratos元素类型...")
print(f"✅ StructuralMechanicsApplication已导入")

def main():
    """主函数"""
    print("🚀 开始简化Kratos结构力学分析")
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
        
        # 读取材料
        print("📋 读取材料...")
        materials_filename = "materials.json"
        with open(materials_filename, 'r') as materials_file:
            materials = KratosMultiphysics.Parameters(materials_file.read())
        
        # 分配材料属性
        KratosMultiphysics.ReadMaterialsUtility(materials, model)
        
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
        
        # 保存结果摘要
        results = {
            "analysis_type": "Static Structural (Simplified)",
            "nodes": main_model_part.NumberOfNodes(),
            "elements": main_model_part.NumberOfElements(),
            "max_displacement": max_displacement,
            "max_displacement_node": max_disp_node,
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
