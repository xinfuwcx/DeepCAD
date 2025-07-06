"""
Kratos Multiphysics Solver Interface
This module is responsible for taking a pre-generated mesh file,
running a Kratos simulation, and outputting the results.
"""
import os
import json
import logging
import tempfile
from typing import Dict, Any, List, Optional, Union
import numpy as np

# Kratos Multiphysics导入
import KratosMultiphysics
from KratosMultiphysics.StructuralMechanicsApplication import (
    structural_mechanics_analysis
)
from KratosMultiphysics.ConvectionDiffusionApplication import (
    convection_diffusion_analysis
)

logger = logging.getLogger(__name__)


# --- 智能求解器配置 ---

class KratosSolverConfig:
    """Kratos求解器配置类，用于生成各种物理场的配置文件"""
    
    @staticmethod
    def create_materials_file(working_dir: str, materials: List[Dict[str, Any]] = None):
        """
        创建材料配置文件，支持多种材料类型
        """
        if materials is None:
            materials = [
                {
                    "model_part_name": "Structure.SOIL_CORE",
                    "properties_id": 1,
                    "Material": {
                        "constitutive_law": {"name": "LinearElastic3DLaw"},
                        "Variables": {
                            "YOUNG_MODULUS": 2.1e7,
                            "POISSON_RATIO": 0.3,
                            "DENSITY": 1800.0
                        }
                    }
                },
                {
                    "model_part_name": "Structure.INFINITE_DOMAIN",
                    "properties_id": 2,
                    "Material": {
                        "constitutive_law": {"name": "LinearElastic3DLaw"},
                        "Variables": {
                            "YOUNG_MODULUS": 1.0e6,
                            "POISSON_RATIO": 0.45,
                            "DENSITY": 1800.0
                        }
                    }
                }
            ]
        
        materials_data = {"properties": materials}
        mats_file_path = os.path.join(working_dir, "materials.json")
        with open(mats_file_path, 'w') as f:
            json.dump(materials_data, f, indent=4)
        logger.info("动态生成 'materials.json' 文件。")
        return mats_file_path

    @staticmethod
    def create_project_parameters_file(
        working_dir: str, 
        project_name: str,
        analysis_type: str = "static",
        solver_settings: Dict[str, Any] = None,
        output_settings: Dict[str, Any] = None,
        processes: Dict[str, List[Dict[str, Any]]] = None
    ):
        """
        创建项目参数文件，支持多种分析类型和求解器设置
        """
        # 默认求解器设置
        default_solver_settings = {
            "solver_type": analysis_type,
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
                "time_step": 0.1,
                "end_time": 1.0
            },
            "linear_solver_settings": {
                "solver_type": "amgcl",
                "tolerance": 1e-6,
                "max_iteration": 1000
            }
        }
        
        # 合并用户提供的求解器设置
        if solver_settings:
            for key, value in solver_settings.items():
                if isinstance(value, dict) and key in default_solver_settings and isinstance(default_solver_settings[key], dict):
                    default_solver_settings[key].update(value)
                else:
                    default_solver_settings[key] = value
        
        # 默认输出设置
        default_output = {
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
        
        # 合并用户提供的输出设置
        if output_settings:
            default_output.update(output_settings)
        
        # 默认过程设置
        default_processes = {
            "constraints_process_list": [{
                "python_module": "assign_vector_by_direction_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorByDirectionProcess",
                "Parameters": {
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
                    "model_part_name": "Structure.SOIL_CORE",
                    "variable_name": "VOLUME_ACCELERATION",
                    "gravity_vector": [0.0, -9.81, 0.0]
                }
            }]
        }
        
        # 合并用户提供的过程设置
        if processes:
            for key, value in processes.items():
                if key in default_processes:
                    default_processes[key].extend(value)
                else:
                    default_processes[key] = value
        
        # 创建完整的项目参数
        project_parameters = {
            "problem_data": {
                "problem_name": project_name,
                "parallel_type": "OpenMP",
                "echo_level": 1,
                "domain_size": 3
            },
            "solver_settings": default_solver_settings,
            "processes": default_processes,
            "output_processes": default_output
        }
        
        params_file_path = os.path.join(working_dir, "ProjectParameters.json")
        with open(params_file_path, 'w') as f:
            json.dump(project_parameters, f, indent=4)
        logger.info("动态生成 'ProjectParameters.json' 文件。")
        return params_file_path

    @staticmethod
    def create_seepage_materials_file(working_dir: str, materials):
        """
        为渗流分析创建材料文件，包含渗透系数等参数
        """
        seepage_materials = {
            "properties": []
        }
        
        for idx, material in enumerate(materials, 1):
            material_entry = {
                "model_part_name": f"SeepageDomain.{material['name']}",
                "properties_id": idx,
                "Material": {
                    "constitutive_law": {"name": "DarcyLaw3D"},
                    "Variables": {
                        "PERMEABILITY_XX": material["hydraulic_conductivity_x"],
                        "PERMEABILITY_YY": material["hydraulic_conductivity_y"],
                        "PERMEABILITY_ZZ": material["hydraulic_conductivity_z"],
                        "POROSITY": material.get("porosity", 0.3),
                        "SPECIFIC_STORAGE": material.get("specific_storage", 0.0001)
                    }
                }
            }
            seepage_materials["properties"].append(material_entry)
        
        mats_file_path = os.path.join(working_dir, "seepage_materials.json")
        with open(mats_file_path, 'w') as f:
            json.dump(seepage_materials, f, indent=4)
        logger.info("动态生成 'seepage_materials.json' 文件。")
        return mats_file_path

    @staticmethod
    def create_seepage_parameters_file(
        working_dir: str, 
        project_name: str, 
        boundary_conditions: List[Dict[str, Any]],
        analysis_type: str = "steady_state",
        solver_settings: Dict[str, Any] = None
    ):
        """
        为渗流分析创建参数文件，包含边界条件等设置
        """
        # 创建边界条件处理列表
        constraints_list = []
        
        for idx, bc in enumerate(boundary_conditions):
            if bc["type"] == "constant_head" or bc["type"] == "fixed_head":
                constraint = {
                    "python_module": "assign_scalar_variable_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "AssignScalarVariableProcess",
                    "Parameters": {
                        "model_part_name": f"SeepageDomain.{bc['boundary_name']}",
                        "variable_name": "HYDRAULIC_HEAD",
                        "value": bc["total_head"],
                        "constrained": True
                    }
                }
                constraints_list.append(constraint)
            elif bc["type"] == "flux":
                constraint = {
                    "python_module": "assign_scalar_variable_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "AssignScalarVariableProcess",
                    "Parameters": {
                        "model_part_name": f"SeepageDomain.{bc['boundary_name']}",
                        "variable_name": "FACE_WATER_FLUX",
                        "value": bc["flux_value"],
                        "constrained": False
                    }
                }
                constraints_list.append(constraint)
        
        # 默认求解器设置
        default_solver_settings = {
            "solver_type": analysis_type,
            "model_part_name": "SeepageDomain",
            "domain_size": 3,
            "model_import_settings": {
                "input_type": "mdpa",
                "input_filename": project_name
            },
            "material_import_settings": {
                "materials_filename": "seepage_materials.json"
            },
            "time_stepping": {
                "time_step": 0.1,
                "end_time": 1.0
            },
            "linear_solver_settings": {
                "solver_type": "amgcl",
                "tolerance": 1e-6,
                "max_iteration": 1000
            }
        }
        
        # 合并用户提供的求解器设置
        if solver_settings:
            for key, value in solver_settings.items():
                if isinstance(value, dict) and key in default_solver_settings and isinstance(default_solver_settings[key], dict):
                    default_solver_settings[key].update(value)
                else:
                    default_solver_settings[key] = value
        
        # 创建完整的参数文件
        seepage_parameters = {
            "problem_data": {
                "problem_name": project_name,
                "parallel_type": "OpenMP",
                "echo_level": 1,
                "domain_size": 3
            },
            "solver_settings": default_solver_settings,
            "processes": {
                "constraints_process_list": constraints_list,
            },
            "output_processes": {
                "vtk_output": [{
                    "python_module": "vtk_output_process",
                    "kratos_module": "KratosMultiphysics.VtkOutputApplication",
                    "process_name": "VtkOutputProcess",
                    "Parameters": {
                        "model_part_name": "SeepageDomain",
                        "folder_name": os.path.join(working_dir, "vtk_output"),
                        "nodal_solution_step_data_variables": [
                            "HYDRAULIC_HEAD", "WATER_PRESSURE", "DARCY_VELOCITY"
                        ]
                    }
                }]
            }
        }
        
        params_file_path = os.path.join(working_dir, "SeepageParameters.json")
        with open(params_file_path, 'w') as f:
            json.dump(seepage_parameters, f, indent=4)
        logger.info("动态生成 'SeepageParameters.json' 文件。")
        return params_file_path


class KratosSolver:
    """Kratos多物理场求解器接口，支持多种分析类型"""
    
    def __init__(self, working_dir: str = None):
        """初始化Kratos求解器"""
        self.working_dir = working_dir or tempfile.mkdtemp(prefix="kratos_solver_")
        self.current_model = KratosMultiphysics.Model()
        logger.info(f"KratosSolver初始化，工作目录: {self.working_dir}")
    
    def run_structural_analysis(
        self, 
        mesh_filename: str, 
        materials: List[Dict[str, Any]] = None,
        analysis_type: str = "static",
        solver_settings: Dict[str, Any] = None,
        boundary_conditions: List[Dict[str, Any]] = None,
        loads: List[Dict[str, Any]] = None
    ) -> str:
        """
        运行结构力学分析
        
        参数:
            mesh_filename: 网格文件路径
            materials: 材料列表
            analysis_type: 分析类型 (static, dynamic, modal)
            solver_settings: 求解器设置
            boundary_conditions: 边界条件列表
            loads: 荷载列表
            
        返回:
            结果文件路径
        """
        logger.info(f"开始结构力学分析: {analysis_type}, 网格文件: {mesh_filename}")
        
        working_dir = os.path.dirname(mesh_filename)
        project_name = os.path.splitext(os.path.basename(mesh_filename))[0]
        
        # 处理边界条件
        processes = {}
        if boundary_conditions:
            constraints_list = []
            for bc in boundary_conditions:
                if bc["type"] == "displacement":
                    constraint = {
                        "python_module": "assign_vector_by_direction_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "AssignVectorByDirectionProcess",
                        "Parameters": {
                            "model_part_name": f"Structure.{bc['boundary_name']}",
                            "variable_name": "DISPLACEMENT",
                            "constrained": bc.get("constrained", [True, True, True]),
                            "value": bc.get("value", [0, 0, 0])
                        }
                    }
                    constraints_list.append(constraint)
            
            if constraints_list:
                processes["constraints_process_list"] = constraints_list
        
        # 处理荷载
        if loads:
            loads_list = []
            for load in loads:
                if load["type"] == "gravity":
                    load_process = {
                        "python_module": "apply_gravity_on_bodies_process",
                        "kratos_module": "KratosMultiphysics.StructuralMechanicsApplication",
                        "process_name": "ApplyGravityOnBodiesProcess",
                        "Parameters": {
                            "model_part_name": f"Structure.{load['target']}",
                            "variable_name": "VOLUME_ACCELERATION",
                            "gravity_vector": load.get("value", [0.0, -9.81, 0.0])
                        }
                    }
                    loads_list.append(load_process)
                elif load["type"] == "pressure":
                    load_process = {
                        "python_module": "assign_scalar_variable_to_entities_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "AssignScalarVariableToEntitiesProcess",
                        "Parameters": {
                            "model_part_name": f"Structure.{load['target']}",
                            "variable_name": "PRESSURE",
                            "value": load["value"],
                            "entity_type": "element"
                        }
                    }
                    loads_list.append(load_process)
            
            if loads_list:
                processes["loads_process_list"] = loads_list
        
        # 创建材料文件
        KratosSolverConfig.create_materials_file(working_dir, materials)
        
        # 创建项目参数文件
        KratosSolverConfig.create_project_parameters_file(
            working_dir, 
            project_name, 
            analysis_type, 
            solver_settings, 
            processes=processes
        )
        
        # 运行分析
        logger.info("准备运行StructuralMechanicsAnalysis...")
        params_path = os.path.join(working_dir, "ProjectParameters.json")
        with open(params_path, 'r') as params_file:
            project_parameters = KratosMultiphysics.Parameters(params_file.read())
        
        simulation = structural_mechanics_analysis.StructuralMechanicsAnalysis(
            self.current_model, project_parameters
        )
        simulation.Run()
        logger.info("结构力学分析运行完成。")
        
        # 返回结果文件路径
        vtk_output_folder = os.path.join(working_dir, "vtk_output")
        result_filename = f"{project_name}_1.0.vtk"
        result_filepath = os.path.join(vtk_output_folder, result_filename)
        
        if not os.path.exists(result_filepath):
            msg = f"Kratos求解器错误: 未找到预期的结果文件: {result_filepath}"
            logger.error(msg)
            raise FileNotFoundError(msg)
        
        logger.info(f"成功生成结果文件: {result_filepath}")
        return result_filepath
    
    def run_seepage_analysis(
        self, 
        mesh_filename: str, 
        materials: List[Dict[str, Any]],
        boundary_conditions: List[Dict[str, Any]],
        analysis_type: str = "steady_state",
        solver_settings: Dict[str, Any] = None
    ) -> str:
        """
        运行渗流分析
        
        参数:
            mesh_filename: 网格文件路径
            materials: 材料列表
            boundary_conditions: 边界条件列表
            analysis_type: 分析类型 (steady_state, transient)
            solver_settings: 求解器设置
            
        返回:
            结果文件路径
        """
        logger.info(f"开始渗流分析: {analysis_type}, 网格文件: {mesh_filename}")
        
        working_dir = os.path.dirname(mesh_filename)
        project_name = os.path.splitext(os.path.basename(mesh_filename))[0]
        
        # 创建材料文件
        KratosSolverConfig.create_seepage_materials_file(working_dir, materials)
        
        # 创建参数文件
        KratosSolverConfig.create_seepage_parameters_file(
            working_dir, 
            project_name, 
            boundary_conditions,
            analysis_type,
            solver_settings
        )
        
        # 运行分析
        logger.info("准备运行ConvectionDiffusionAnalysis...")
        params_path = os.path.join(working_dir, "SeepageParameters.json")
        with open(params_path, 'r') as params_file:
            project_parameters = KratosMultiphysics.Parameters(params_file.read())
        
        simulation = convection_diffusion_analysis.ConvectionDiffusionAnalysis(
            self.current_model, project_parameters
        )
        simulation.Run()
        logger.info("渗流分析运行完成。")
        
        # 返回结果文件路径
        vtk_output_folder = os.path.join(working_dir, "vtk_output")
        result_filename = f"{project_name}_1.0.vtk"
        result_filepath = os.path.join(vtk_output_folder, result_filename)
        
        if not os.path.exists(result_filepath):
            msg = f"Kratos求解器错误: 未找到预期的结果文件: {result_filepath}"
            logger.error(msg)
            raise FileNotFoundError(msg)
        
        logger.info(f"成功生成结果文件: {result_filepath}")
        return result_filepath
    
    def run_coupled_analysis(
        self,
        mesh_filename: str,
        materials: List[Dict[str, Any]],
        boundary_conditions: List[Dict[str, Any]],
        coupling_settings: Dict[str, Any] = None
    ) -> str:
        """
        运行流固耦合分析
        
        参数:
            mesh_filename: 网格文件路径
            materials: 材料列表
            boundary_conditions: 边界条件列表
            coupling_settings: 耦合设置
            
        返回:
            结果文件路径
        """
        # 流固耦合分析需要更复杂的设置，这里只是一个占位实现
        logger.info(f"开始流固耦合分析，网格文件: {mesh_filename}")
        logger.warning("流固耦合分析功能尚未完全实现，返回模拟结果")
        
        # 返回一个临时结果文件
        return mesh_filename


# --- 向后兼容的函数 ---

def run_kratos_analysis(mesh_filename: str) -> str:
    """
    运行Kratos分析（向后兼容的函数）
    """
    solver = KratosSolver()
    return solver.run_structural_analysis(mesh_filename)


def run_seepage_analysis(mesh_filename: str, materials, boundary_conditions) -> str:
    """
    运行渗流分析（向后兼容的函数）
    """
    solver = KratosSolver()
    return solver.run_seepage_analysis(mesh_filename, materials, boundary_conditions)


# --- 辅助函数 ---

def convert_to_kratos_material(material_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    将通用材料字典转换为Kratos材料格式
    """
    kratos_material = {
        "model_part_name": f"Structure.{material_dict['name']}",
        "properties_id": material_dict.get("id", 1),
        "Material": {
            "constitutive_law": {"name": "LinearElastic3DLaw"},  # 默认使用线性弹性本构
            "Variables": {},
            "Tables": {}
        }
    }
    
    # 映射属性
    property_mapping = {
        "young_modulus": "YOUNG_MODULUS",
        "poisson_ratio": "POISSON_RATIO",
        "density": "DENSITY",
        "thickness": "THICKNESS",
        "compressive_strength": "COMPRESSIVE_STRENGTH",
        "yield_strength": "YIELD_STRESS"
    }
    
    for key, kratos_key in property_mapping.items():
        if key in material_dict:
            kratos_material["Material"]["Variables"][kratos_key] = material_dict[key]
    
    # 特殊处理本构模型
    if material_dict.get("type") == "soil":
        if material_dict.get("model") == "mohr_coulomb":
            kratos_material["Material"]["constitutive_law"] = {"name": "MohrCoulombPlasticityPlaneStrain2DLaw"}
            if "cohesion" in material_dict:
                kratos_material["Material"]["Variables"]["COHESION"] = material_dict["cohesion"]
            if "friction_angle" in material_dict:
                kratos_material["Material"]["Variables"]["FRICTION_ANGLE"] = material_dict["friction_angle"]
    
    return kratos_material 