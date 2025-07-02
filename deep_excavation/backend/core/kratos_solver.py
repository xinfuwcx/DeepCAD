"""
Kratos Multiphysics Solver Interface
This module is responsible for taking a pre-generated mesh file,
running a Kratos simulation, and outputting the results.
"""
import os
import json
import logging
import KratosMultiphysics
from KratosMultiphysics.StructuralMechanicsApplication import (
    structural_mechanics_analysis
)

logger = logging.getLogger(__name__)


# --- Intelligent Solver Configuration ---

def create_materials_file(working_dir: str):
    """
    Creates the materials.json file with distinct properties for core and
    infinite domains.
    """
    materials = {
        "properties": [
            {
                "model_part_name": "Structure.SOIL_CORE",
                "properties_id": 1,
                "Material": {
                    "constitutive_law": {"name": "LinearElastic3DLaw"},
                    "Variables": {
                        "YOUNG_MODULUS": 2.1e7,
                        "POISSON_RATIO": 0.3,
                        "DENSITY": 1800.0
                    },
                    "Tables": {}
                }
            },
            {
                "model_part_name": "Structure.INFINITE_DOMAIN",
                "properties_id": 2,
                "Material": {
                    # This is a simplification. A real infinite element would
                    # use a specific law from GeoMechanicsApplication.
                    "constitutive_law": {"name": "LinearElastic3DLaw"},
                    "Variables": {
                        "YOUNG_MODULUS": 1.0e6,  # Softer material
                        "POISSON_RATIO": 0.45,
                        "DENSITY": 1800.0
                    },
                    "Tables": {}
                }
            }
        ]
    }
    mats_file_path = os.path.join(working_dir, "materials.json")
    with open(mats_file_path, 'w') as f:
        json.dump(materials, f, indent=4)
    logger.info("动态生成 'materials.json' 文件。")


def create_project_parameters_file(working_dir: str, project_name: str):
    """
    Creates the ProjectParameters.json file, dynamically assigning processes
    to the correct model parts.
    """
    project_parameters = {
        "problem_data": {
            "problem_name": project_name,
            "parallel_type": "OpenMP",
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
        },
        "processes": {
            "constraints_process_list": [{
                "python_module": "assign_vector_by_direction_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorByDirectionProcess",
                "Parameters": {
                    # This is a simplification. A real setup would find the
                    # boundary surfaces of the infinite domain.
                    "model_part_name": "Structure.INFINITE_DOMAIN",
                    "variable_name": "DISPLACEMENT",
                    "constrained": [True, True, True],
                    "value": [0, 0, 0]
                }
            }],
            "loads_process_list": [{
                "python_module": "apply_gravity_on_bodies_process",
                "kratos_module": (
                    "KratosMultiphysics.StructuralMechanicsApplication"
                ),
                "process_name": "ApplyGravityOnBodiesProcess",
                "Parameters": {
                    # Apply gravity only to the core soil
                    "model_part_name": "Structure.SOIL_CORE",
                    "variable_name": "VOLUME_ACCELERATION",
                    "gravity_vector": [0.0, -9.81, 0.0]
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
                    "folder_name": os.path.join(working_dir, "vtk_output"),
                    "nodal_solution_step_data_variables": [
                        "DISPLACEMENT", "REACTION"
                    ],
                    "gauss_point_variables_in_elements": ["VON_MISES_STRESS"]
                }
            }]
        }
    }
    params_file_path = os.path.join(working_dir, "ProjectParameters.json")
    with open(params_file_path, 'w') as f:
        json.dump(project_parameters, f, indent=4)
    logger.info("动态生成 'ProjectParameters.json' 文件。")


def run_kratos_analysis(mesh_filename: str) -> str:
    """
    Runs a full Kratos analysis on the given mesh file using dynamically
    generated configuration files.
    """
    logger.info(f"Kratos智能求解器: 开始处理网格文件: {mesh_filename}")
    
    working_dir = os.path.dirname(mesh_filename)
    project_name = os.path.splitext(os.path.basename(mesh_filename))[0]

    # --- 1. Dynamically create config files ---
    create_materials_file(working_dir)
    create_project_parameters_file(working_dir, project_name)

    # --- 2. Run the analysis ---
    logger.info("Kratos求解器: 准备运行StructuralMechanicsAnalysis...")
    params_path = os.path.join(working_dir, "ProjectParameters.json")
    with open(params_path, 'r') as params_file:
        project_parameters = KratosMultiphysics.Parameters(params_file.read())

    current_model = KratosMultiphysics.Model()
    simulation = structural_mechanics_analysis.StructuralMechanicsAnalysis(
        current_model, project_parameters
    )
    simulation.Run()
    logger.info("Kratos求解器: 分析运行完成。")

    # --- 3. Return the path to the result file ---
    vtk_output_folder = os.path.join(working_dir, "vtk_output")
    result_filename = f"{project_name}_1.0.vtk"
    result_filepath = os.path.join(vtk_output_folder, result_filename)

    if not os.path.exists(result_filepath):
        msg = f"Kratos求解器错误: 未找到预期的结果文件: {result_filepath}"
        logger.error(msg)
        raise FileNotFoundError(msg)

    logger.info(f"Kratos求解器: 成功生成结果文件: {result_filepath}")
    return result_filepath 