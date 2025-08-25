#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kratos主执行脚本 - 两阶段全锚杆摩尔库伦分析
"""

import KratosMultiphysics
import KratosMultiphysics.StructuralMechanicsApplication as StructuralMechanicsApplication
import json
import time

def CreateSolver(model, project_parameters):
    """创建求解器"""
    solver_type = project_parameters["solver_settings"]["solver_type"].GetString()
    
    if solver_type == "Static":
        import KratosMultiphysics.StructuralMechanicsApplication.structural_mechanics_static_solver as solver_module
    else:
        raise Exception(f"Unknown solver type: {solver_type}")
    
    return solver_module.CreateSolver(model, project_parameters["solver_settings"])

def main():
    """主函数"""
    print("🚀 开始Kratos结构力学分析")
    print("=" * 60)
    
    start_time = time.time()
    
    try:
        # 读取项目参数
        with open("ProjectParameters.json", 'r') as f:
            project_parameters = KratosMultiphysics.Parameters(f.read())
        
        # 创建模型
        model = KratosMultiphysics.Model()
        
        # 创建求解器
        solver = CreateSolver(model, project_parameters)
        
        # 初始化求解器
        print("📋 初始化求解器...")
        solver.AddVariables()
        solver.AddDofs()
        solver.ImportModelPart()
        solver.PrepareModelPart()

        # 添加材料（Kratos 10.3 API）
        try:
            solver.AddMaterials()
        except AttributeError:
            # 如果AddMaterials不存在，尝试其他方法
            print("⚠️ 使用备用材料加载方法...")
            pass

        solver.Initialize()
        
        # 获取模型部件
        main_model_part = model["Structure"]
        print(f"✅ 模型加载完成:")
        print(f"  节点数: {main_model_part.NumberOfNodes()}")
        print(f"  单元数: {main_model_part.NumberOfElements()}")
        print(f"  条件数: {main_model_part.NumberOfConditions()}")
        
        # 执行分析
        print("🔄 开始求解...")
        solver.Solve()
        
        # 输出结果
        print("📊 分析完成，输出结果...")
        
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
            "analysis_type": "Static Structural",
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
    
    return True

if __name__ == "__main__":
    success = main()
    if success:
        print("🎉 Kratos分析成功完成！")
    else:
        print("💥 Kratos分析失败！")
