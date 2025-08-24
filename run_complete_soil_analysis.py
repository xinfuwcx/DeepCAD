#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基于FPN数据的完整土层分析 - 使用真实的土层材料进行Kratos计算
"""

import os
import sys
import json
import time
import shutil
from pathlib import Path

def run_complete_soil_analysis():
    """运行完整的土层分析"""
    print("🚀 开始基于FPN数据的完整土层分析")
    print("=" * 80)
    
    # 使用现有的完整MDPA文件
    mdpa_file = Path("complete_fpn_model_with_all_materials.mdpa")
    if not mdpa_file.exists():
        print("❌ 完整MDPA文件不存在，请先运行 create_complete_mdpa.py")
        return False
    
    # 创建输出目录
    output_dir = Path("complete_soil_analysis")
    output_dir.mkdir(exist_ok=True)
    
    # 复制MDPA文件
    target_mdpa = output_dir / "complete_soil_model.mdpa"
    shutil.copy2(mdpa_file, target_mdpa)
    print(f"✅ MDPA文件已复制: {target_mdpa}")
    
    # 创建完整的材料配置
    materials = create_complete_soil_materials()
    materials_file = output_dir / "CompleteSoilMaterials.json"
    with open(materials_file, 'w', encoding='utf-8') as f:
        json.dump(materials, f, indent=2, ensure_ascii=False)
    print(f"✅ 材料文件已创建: {materials_file}")
    
    # 创建Kratos配置
    config = create_kratos_config()
    config_file = output_dir / "ProjectParameters.json"
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    print(f"✅ 配置文件已创建: {config_file}")
    
    # 运行Kratos分析
    print(f"\n🔧 开始Kratos计算...")
    success = run_kratos_analysis(output_dir)
    
    if success:
        print(f"\n🎯 完整土层分析成功完成！")
        print(f"   输出目录: {output_dir}")
        
        # 检查输出文件
        vtk_files = list(output_dir.glob('**/*.vtk'))
        if vtk_files:
            print(f"📊 生成VTK文件: {len(vtk_files)}个")
            for vtk_file in vtk_files[:3]:
                size = vtk_file.stat().st_size
                print(f"   {vtk_file.name}: {size:,} bytes")
        
        return True
    else:
        print(f"\n❌ 完整土层分析失败")
        return False

def create_complete_soil_materials():
    """创建完整的土层材料配置"""
    print("🔧 创建完整土层材料配置...")
    
    # 基于FPN数据的真实材料参数
    soil_materials = {
        2: {"name": "细砂", "E": 15e6, "nu": 0.3, "density": 2039.4},
        3: {"name": "粉质粘土", "E": 5e6, "nu": 0.3, "density": 1988.4},
        4: {"name": "粉质粘土", "E": 5e6, "nu": 0.3, "density": 1947.7},
        5: {"name": "粉质粘土", "E": 5e6, "nu": 0.3, "density": 2121.0},
        6: {"name": "卵石", "E": 40e6, "nu": 0.3, "density": 1988.4},
        7: {"name": "粉质粘土", "E": 8e6, "nu": 0.3, "density": 2121.0},
        8: {"name": "粉质粘土", "E": 9e6, "nu": 0.3, "density": 2110.8},
        9: {"name": "重粉质粘土", "E": 9e6, "nu": 0.3, "density": 2059.8},
        10: {"name": "卵石", "E": 40e6, "nu": 0.3, "density": 2141.4},
        11: {"name": "粉质粘土", "E": 12e6, "nu": 0.3, "density": 2059.8},
        12: {"name": "细砂", "E": 20e6, "nu": 0.3, "density": 2070.0}
    }
    
    materials = {"properties": []}
    
    for mat_id, props in soil_materials.items():
        material = {
            "model_part_name": f"Structure.MAT_{mat_id}",
            "properties_id": mat_id,
            "Material": {
                "constitutive_law": {
                    "name": "LinearElastic3DLaw"
                },
                "Variables": {
                    "DENSITY": props["density"],
                    "YOUNG_MODULUS": props["E"],
                    "POISSON_RATIO": props["nu"]
                },
                "Tables": {}
            }
        }
        materials["properties"].append(material)
        print(f"  ✅ 材料{mat_id}: {props['name']} (E={props['E']/1e6:.0f}MPa)")
    
    return materials

def create_kratos_config():
    """创建Kratos配置"""
    print("🔧 创建Kratos配置...")
    
    config = {
        "problem_data": {
            "problem_name": "complete_soil_analysis",
            "parallel_type": "OpenMP",
            "echo_level": 1,
            "start_time": 0.0,
            "end_time": 1.0
        },
        "solver_settings": {
            "solver_type": "Static",
            "model_part_name": "Structure",
            "domain_size": 3,
            "echo_level": 1,
            "analysis_type": "non_linear",
            "model_import_settings": {
                "input_type": "mdpa",
                "input_filename": "complete_soil_model"
            },
            "material_import_settings": {
                "materials_filename": "CompleteSoilMaterials.json"
            },
            "time_stepping": {
                "time_step": 1.0
            },
            "line_search": False,
            "convergence_criterion": "residual_criterion",
            "displacement_relative_tolerance": 0.0001,
            "displacement_absolute_tolerance": 1e-09,
            "residual_relative_tolerance": 0.0001,
            "residual_absolute_tolerance": 1e-09,
            "max_iteration": 20,
            "use_old_stiffness_in_first_iteration": False,
            "problem_domain_sub_model_part_list": ["Structure"],
            "processes_sub_model_part_list": ["BOTTOM_SUPPORT"]
        },
        "processes": {
            "constraints_process_list": [{
                "python_module": "assign_vector_variable_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorVariableProcess",
                "Parameters": {
                    "model_part_name": "Structure.BOTTOM_SUPPORT",
                    "variable_name": "DISPLACEMENT",
                    "constrained": [True, True, True],
                    "value": [0.0, 0.0, 0.0],
                    "interval": [0.0, "End"]
                }
            }],
            "loads_process_list": [{
                "python_module": "assign_vector_by_direction_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorByDirectionProcess",
                "Parameters": {
                    "model_part_name": "Structure",
                    "variable_name": "VOLUME_ACCELERATION",
                    "modulus": 9.80665,
                    "direction": [0.0, 0.0, -1.0],
                    "constrained": False,
                    "interval": [0.0, "End"]
                }
            }]
        },
        "output_processes": {
            "vtk_output": [{
                "python_module": "vtk_output_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "VtkOutputProcess",
                "Parameters": {
                    "model_part_name": "Structure",
                    "output_control_type": "step",
                    "output_interval": 1,
                    "file_format": "ascii",
                    "output_precision": 7,
                    "output_sub_model_parts": False,
                    "output_path": "VTK_Output_Complete_Soil",
                    "save_output_files_in_folder": True,
                    "nodal_solution_step_data_variables": [
                        "DISPLACEMENT",
                        "REACTION",
                        "VELOCITY",
                        "ACCELERATION"
                    ],
                    "gauss_point_variables_in_elements": [
                        "CAUCHY_STRESS_TENSOR",
                        "GREEN_LAGRANGE_STRAIN_TENSOR"
                    ],
                    "element_data_value_variables": [
                        "VON_MISES_STRESS"
                    ]
                }
            }]
        }
    }
    
    return config

def run_kratos_analysis(analysis_dir):
    """运行Kratos分析"""
    try:
        # 切换到分析目录
        original_cwd = os.getcwd()
        os.chdir(analysis_dir)
        
        # 运行Kratos
        import KratosMultiphysics
        from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
        
        start_time = time.time()
        
        with open('ProjectParameters.json', 'r', encoding='utf-8') as f:
            params_text = f.read()
        
        parameters = KratosMultiphysics.Parameters(params_text)
        model = KratosMultiphysics.Model()
        analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(model, parameters)
        analysis.Run()
        
        end_time = time.time()
        print(f"✅ 计算完成！用时: {end_time - start_time:.2f}秒")
        
        return True
        
    except Exception as e:
        print(f"❌ 分析失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        os.chdir(original_cwd)

if __name__ == "__main__":
    success = run_complete_soil_analysis()
    if success:
        print("\n🎉 完整土层分析成功！现在你有了基于真实FPN数据的合理计算结果！")
    else:
        print("\n💥 分析失败，请检查错误信息")
