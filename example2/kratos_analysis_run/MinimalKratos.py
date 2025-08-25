#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
最小化Kratos分析脚本 - 完全跳过材料文件
"""

import KratosMultiphysics
import KratosMultiphysics.StructuralMechanicsApplication as StructuralMechanicsApplication
import json
import time

def main():
    """主函数"""
    print("🚀 开始最小化Kratos结构力学分析")
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
        
        # 手动设置材料属性（避免材料文件）
        print("📋 手动设置材料属性...")
        
        # 获取所有属性ID
        property_ids = []
        for element in main_model_part.Elements:
            prop_id = element.Properties.Id
            if prop_id not in property_ids:
                property_ids.append(prop_id)
        
        print(f"发现材料属性ID: {sorted(property_ids)}")
        
        # 为每个属性设置材料参数
        for prop_id in property_ids:
            prop = main_model_part.GetProperties(prop_id)
            
            if prop_id == 200000:  # 锚杆材料
                prop.SetValue(KratosMultiphysics.YOUNG_MODULUS, 200e9)  # 200 GPa
                prop.SetValue(KratosMultiphysics.DENSITY, 7800.0)
                prop.SetValue(KratosMultiphysics.POISSON_RATIO, 0.3)
                # 设置桁架单元截面积
                try:
                    prop.SetValue(StructuralMechanicsApplication.CROSS_AREA, 0.025)
                except:
                    # 如果CROSS_AREA不存在，跳过
                    pass
                print(f"  材料{prop_id}: 锚杆钢材 (E=200GPa)")
                
            elif prop_id == 1000:  # 混凝土材料
                prop.SetValue(KratosMultiphysics.YOUNG_MODULUS, 30e9)  # 30 GPa
                prop.SetValue(KratosMultiphysics.DENSITY, 2500.0)
                prop.SetValue(KratosMultiphysics.POISSON_RATIO, 0.2)
                # 设置壳单元厚度
                try:
                    prop.SetValue(KratosMultiphysics.THICKNESS, 0.8)
                except:
                    # 如果THICKNESS不存在，跳过
                    pass
                print(f"  材料{prop_id}: 混凝土 (E=30GPa)")
                
            else:  # 土体材料
                # 根据材料ID设置不同的土体参数
                if prop_id <= 5:
                    young_modulus = 5e6  # 软土 5 MPa
                elif prop_id <= 10:
                    young_modulus = 15e6  # 中等土 15 MPa
                else:
                    young_modulus = 30e6  # 硬土 30 MPa
                
                prop.SetValue(KratosMultiphysics.YOUNG_MODULUS, young_modulus)
                prop.SetValue(KratosMultiphysics.DENSITY, 2000.0)
                prop.SetValue(KratosMultiphysics.POISSON_RATIO, 0.3)
                print(f"  材料{prop_id}: 土体 (E={young_modulus/1e6:.0f}MPa)")
        
        print("✅ 材料属性设置完成")
        
        # 设置边界条件
        print("📋 应用边界条件...")
        
        # 应用底部固定约束
        bottom_nodes = 0
        if main_model_part.HasSubModelPart("BND_BOTTOM"):
            for node in main_model_part.GetSubModelPart("BND_BOTTOM").Nodes:
                node.Fix(KratosMultiphysics.DISPLACEMENT_X)
                node.Fix(KratosMultiphysics.DISPLACEMENT_Y)
                node.Fix(KratosMultiphysics.DISPLACEMENT_Z)
                bottom_nodes += 1
            print(f"  底部约束: {bottom_nodes} 个节点")
        
        # 应用侧面约束
        side_nodes = 0
        for i in range(1, 20):  # 检查BND_1到BND_19
            subpart_name = f"BND_{i}"
            if main_model_part.HasSubModelPart(subpart_name):
                for node in main_model_part.GetSubModelPart(subpart_name).Nodes:
                    node.Fix(KratosMultiphysics.DISPLACEMENT_X)
                    node.Fix(KratosMultiphysics.DISPLACEMENT_Y)
                    side_nodes += 1
                print(f"  侧面约束 {subpart_name}: 节点数量")
        
        print(f"✅ 边界条件应用完成 (底部:{bottom_nodes}, 侧面:{side_nodes})")
        
        # 应用重力荷载
        print("📋 应用重力荷载...")
        for node in main_model_part.Nodes:
            node.SetSolutionStepValue(KratosMultiphysics.VOLUME_ACCELERATION_Z, -9.81)
        
        # 设置求解策略
        print("📋 设置求解策略...")

        # 使用正确的Parameters格式
        solver_parameters = KratosMultiphysics.Parameters("""{
            "name": "linear_strategy",
            "echo_level": 1,
            "compute_reactions": true,
            "move_mesh_flag": false,
            "reform_dofs_at_each_step": false,
            "compute_norm_dx": false,
            "build_level": 2,
            "linear_solver_settings": {
                "solver_type": "skyline_lu_factorization"
            },
            "scheme_settings": {},
            "builder_and_solver_settings": {}
        }""")

        # 使用Parameters创建线性策略
        solving_strategy = KratosMultiphysics.ResidualBasedLinearStrategy(
            main_model_part,
            solver_parameters
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
            "analysis_type": "Static Structural (Minimal)",
            "nodes": main_model_part.NumberOfNodes(),
            "elements": main_model_part.NumberOfElements(),
            "max_displacement": max_displacement,
            "max_displacement_node": max_disp_node,
            "average_displacement": avg_displacement,
            "computation_time": time.time() - start_time,
            "boundary_nodes": {
                "bottom": bottom_nodes,
                "sides": side_nodes
            },
            "material_properties": len(property_ids),
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
