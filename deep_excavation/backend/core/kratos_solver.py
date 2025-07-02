"""
Kratos Multiphysics Solver Interface
This module is responsible for taking a pre-generated mesh file,
running a Kratos simulation, and outputting the results.
"""
import os
import json
import logging
import KratosMultiphysics
import KratosMultiphysics.StructuralMechanicsApplication as StructuralMechanicsApplication
from KratosMultiphysics.StructuralMechanicsApplication.structural_mechanics_analysis import StructuralMechanicsAnalysis

logger = logging.getLogger(__name__)

def run_kratos_analysis(mesh_filename: str) -> str:
    """
    Runs a full Kratos analysis on the given mesh file.

    Args:
        mesh_filename: The absolute path to the input mesh file (e.g., .mdpa).

    Returns:
        The absolute path to the output results file (e.g., .vtk).
    """
    logger.info(f"Kratos求解器: 开始处理网格文件: {mesh_filename}")
    
    # Kratos需要一个工作目录来存放所有文件
    working_dir = os.path.dirname(mesh_filename)
    project_name = os.path.splitext(os.path.basename(mesh_filename))[0]

    # --- 1. 定义Kratos分析设置 ---
    # 在真实的复杂应用中，这些参数会从一个模板文件或更复杂的配置对象中读取
    project_parameters = {
        "problem_data": {
            "problem_name": project_name,
            "parallel_type": "OpenMP",
            "start_time": 0.0,
            "end_time": 1.0,
            "echo_level": 1,
            "domain_size": 3
        },
        "solver_settings": {
            "solver_type": "static",
            "model_part_name": "Structure",
            "domain_size": 3,
            "model_import_settings": {
                "input_type": "mdpa",
                "input_filename": project_name
            },
            "material_import_settings": {
                "materials_filename": "materials.json"
            },
            "time_stepping": {
                "time_step": 1.0,
                "max_delta_time_factor": 1000.0
            },
            "line_search": False,
            "convergence_criterion": "displacement_criterion",
            "displacement_relative_tolerance": 1.0e-4,
            "displacement_absolute_tolerance": 1.0e-9,
            "residual_relative_tolerance": 1.0e-4,
            "residual_absolute_tolerance": 1.0e-9,
            "max_iteration": 10
        },
        "processes": {
            "constraints_process_list": [{
                "python_module": "assign_vector_by_direction_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorByDirectionProcess",
                "Parameters": {
                    "model_part_name": "Structure.bottom",
                    "variable_name": "DISPLACEMENT",
                    "modulus": 0.0,
                    "direction": [0.0, 1.0, 0.0],
                    "constituve_law_is_defined": False,
                    "gravity_is_defined": False
                }
            }],
            "loads_process_list": [{
                "python_module": "apply_vector_load_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "ApplyVectorLoadProcess",
                "Parameters": {
                    "model_part_name": "Structure.top",
                    "variable_name": "VOLUME_ACCELERATION",
                    "modulus": 9.81,
                    "direction": [0.0, -1.0, 0.0]
                }
            }]
        },
        "output_processes": {
            "vtk_output": [{
                "python_module": "vtk_output_process",
                "kratos_module": "KratosMultiphysics.VtkOutputApplication",
                "process_name": "VtkOutputProcess",
                "Parameters": {
                    "model_part_name": "Structure",
                    "output_control_type": "step",
                    "output_interval": 1,
                    "file_format": "binary",
                    "output_precision": 7,
                    "output_sub_model_parts": False,
                    "folder_name": os.path.join(working_dir, "vtk_output"),
                    "nodal_solution_step_data_variables": ["DISPLACEMENT", "REACTION"],
                    "nodal_data_value_variables": [],
                    "element_data_value_variables": [],
                    "gauss_point_variables_in_elements": ["VON_MISES_STRESS"]
                }
            }]
        }
    }
    
    # 将参数写入ProjectParameters.json
    params_file_path = os.path.join(working_dir, "ProjectParameters.json")
    with open(params_file_path, 'w') as f:
        json.dump(project_parameters, f, indent=4)
        
    # --- 2. 定义材料文件 ---
    materials = {
        "properties": [{
            "model_part_name": "Structure.domain",
            "properties_id": 1,
            "Material": {
                "constitutive_law": {
                    "name": "LinearElastic3DLaw"
                },
                "Variables": {
                    "YOUNG_MODULUS": 2.1e10,
                    "POISSON_RATIO": 0.3,
                    "DENSITY": 1800.0
                },
                "Tables": {}
            }
        }]
    }
    
    mats_file_path = os.path.join(working_dir, "materials.json")
    with open(mats_file_path, 'w') as f:
        json.dump(materials, f, indent=4)

    # --- 3. 运行分析 ---
    logger.info("Kratos求解器: 准备运行StructuralMechanicsAnalysis...")
    current_model = KratosMultiphysics.Model()
    simulation = StructuralMechanicsAnalysis(current_model, project_parameters)
    simulation.Run()
    logger.info("Kratos求解器: 分析运行完成。")

    # --- 4. 返回结果文件的路径 ---
    # VTK输出会根据时间步命名，我们取最后一个时间步的结果
    # 示例: project_name_1.0.vtk
    vtk_output_folder = os.path.join(working_dir, "vtk_output")
    result_filename = f"{project_name}_1.0.vtk"
    result_filepath = os.path.join(vtk_output_folder, result_filename)

    if not os.path.exists(result_filepath):
        logger.error(f"Kratos求解器错误: 未找到预期的结果文件: {result_filepath}")
        raise FileNotFoundError("Kratos simulation finished but the result file was not found.")

    logger.info(f"Kratos求解器: 成功生成结果文件: {result_filepath}")
    return result_filepath 