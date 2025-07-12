"""
Kratos文件转换器
将DeepCAD的JSON配置转换为Kratos输入文件
"""

import json
import os
from typing import Dict, Any, List, Optional
from pathlib import Path
import numpy as np

from .schemas import (
    ProjectConfiguration, 
    ConstitutiveModelType, 
    SoilDomain, 
    AnchorSystem,
    AnalysisType
)


class KratosConverter:
    """DeepCAD到Kratos的转换器"""
    
    def __init__(self, project_config: ProjectConfiguration, output_dir: str):
        self.config = project_config
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Kratos本构模型映射
        self.constitutive_mapping = {
            ConstitutiveModelType.LINEAR_ELASTIC: "LinearElasticPlaneStrain2DLaw",
            ConstitutiveModelType.MOHR_COULOMB: "MohrCoulombPlaneStrain2DLaw", 
            ConstitutiveModelType.DRUCKER_PRAGER: "DruckerPragerPlaneStrain2DLaw",
            ConstitutiveModelType.CAM_CLAY: "CamClayPlaneStrain2DLaw",
            ConstitutiveModelType.HARDENING_SOIL: "HardeningSoilPlaneStrain2DLaw",
            ConstitutiveModelType.HYPOPLASTIC: "HypoplasticPlaneStrain2DLaw"
        }
        
        # 单元类型映射
        self.element_mapping = {
            "soil_domain": "SmallStrainUPwDiffOrderElement2D3N",
            "infinite_boundary": "InfiniteElement2D3N",
            "anchor": "TrussElement3D2N"
        }

    def convert_all(self) -> Dict[str, str]:
        """转换所有文件"""
        generated_files = {}
        
        # 生成主要配置文件
        generated_files["ProjectParameters.json"] = self._generate_project_parameters()
        generated_files["MaterialParameters.json"] = self._generate_material_parameters()
        generated_files["ProcessList.json"] = self._generate_process_list()
        
        # 生成网格文件（如果有）
        if hasattr(self.config, 'mesh_config') and self.config.mesh_config:
            generated_files["geometry.mdpa"] = self._generate_mdpa_file()
        
        return generated_files

    def _generate_project_parameters(self) -> str:
        """生成ProjectParameters.json"""
        project_params = {
            "problem_data": {
                "problem_name": self.config.project_info.get("name", "DeepCAD_Analysis"),
                "parallel_type": "OpenMP",
                "echo_level": 1,
                "start_time": 0.0,
                "end_time": 1.0
            },
            "solver_settings": self._get_solver_settings(),
            "processes": self._get_processes_config(),
            "output_processes": self._get_output_processes()
        }
        
        output_file = self.output_dir / "ProjectParameters.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(project_params, f, indent=2, ensure_ascii=False)
        
        return str(output_file)

    def _get_solver_settings(self) -> Dict[str, Any]:
        """获取求解器设置"""
        analysis_config = self.config.analysis_config
        solver_settings = analysis_config.solver_settings
        
        settings = {
            "solver_type": "U_Pw",
            "model_part_name": "PorousDomain",
            "domain_size": 2,
            "model_import_settings": {
                "input_type": "mdpa",
                "input_filename": "geometry"
            },
            "material_import_settings": {
                "materials_filename": "MaterialParameters.json"
            },
            "time_stepping": {
                "time_step": 0.1,
                "max_delta_time": 1.0,
                "min_delta_time": 1e-8
            },
            "buffer_size": 2,
            "echo_level": 1,
            "clear_storage": False,
            "compute_reactions": True,
            "move_mesh_flag": False,
            "reform_dofs_at_each_step": False,
            "nodal_smoothing": False,
            "block_builder": True,
            "solution_type": "quasi_static",
            "scheme_type": "Newmark",
            "newmark_beta": 0.25,
            "newmark_gamma": 0.5,
            "newmark_theta": 0.5,
            "rayleigh_m": 0.0,
            "rayleigh_k": 0.0,
            "strategy_type": analysis_config.analysis_type.value,
            "convergence_criterion": "displacement_criterion",
            "displacement_relative_tolerance": solver_settings.tolerance,
            "displacement_absolute_tolerance": 1e-9,
            "residual_relative_tolerance": solver_settings.tolerance,
            "residual_absolute_tolerance": 1e-9,
            "max_iteration": solver_settings.max_iterations,
            "linear_solver_settings": self._get_linear_solver_settings(solver_settings.linear_solver)
        }
        
        return settings

    def _get_linear_solver_settings(self, linear_solver: str) -> Dict[str, Any]:
        """获取线性求解器设置"""
        if linear_solver == "skyline_lu":
            return {
                "solver_type": "skyline_lu_factorization"
            }
        elif linear_solver == "amgcl":
            return {
                "solver_type": "amgcl",
                "tolerance": 1e-6,
                "max_iteration": 1000,
                "verbosity": 0,
                "smoother_type": "ilu0",
                "krylov_type": "gmres",
                "coarsening_type": "aggregation",
                "scaling": False
            }
        else:
            return {
                "solver_type": "skyline_lu_factorization"
            }

    def _generate_material_parameters(self) -> str:
        """生成MaterialParameters.json"""
        materials = {
            "properties": []
        }
        
        # 处理土层材料
        soil_domain = self.config.soil_domain
        for i, layer in enumerate(soil_domain.soil_layers):
            if not layer.enabled:
                continue
                
            material_id = i + 1
            constitutive_law = self.constitutive_mapping.get(
                layer.constitutive_model.type,
                "LinearElasticPlaneStrain2DLaw"
            )
            
            material_props = {
                "model_part_name": f"SoilLayer_{layer.id}",
                "properties_id": material_id,
                "Material": {
                    "constitutive_law": {
                        "name": constitutive_law
                    },
                    "Variables": self._convert_material_parameters(layer),
                    "Tables": {}
                }
            }
            
            materials["properties"].append(material_props)
        
        # 处理锚杆材料
        if self.config.anchor_system:
            anchor_material = {
                "model_part_name": "AnchorElements",
                "properties_id": 100,
                "Material": {
                    "constitutive_law": {
                        "name": "LinearElastic3DLaw"
                    },
                    "Variables": self._convert_anchor_material(self.config.anchor_system),
                    "Tables": {}
                }
            }
            materials["properties"].append(anchor_material)
        
        output_file = self.output_dir / "MaterialParameters.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(materials, f, indent=2, ensure_ascii=False)
        
        return str(output_file)

    def _convert_material_parameters(self, layer) -> Dict[str, Any]:
        """转换土层材料参数"""
        params = layer.constitutive_model.parameters
        physical_props = layer.physical_properties
        
        variables = {
            "DENSITY": physical_props.unit_weight / 9.81,  # 转换为密度
            "YOUNG_MODULUS": params.get("young_modulus", 50.0) * 1e6,  # MPa转Pa
            "POISSON_RATIO": params.get("poisson_ratio", 0.35),
            "PERMEABILITY_XX": physical_props.permeability or 1e-8,
            "PERMEABILITY_YY": physical_props.permeability or 1e-8,
            "PERMEABILITY_XY": 0.0
        }
        
        # 根据本构模型类型添加特定参数
        model_type = layer.constitutive_model.type
        
        if model_type == ConstitutiveModelType.MOHR_COULOMB:
            variables.update({
                "COHESION": params.get("cohesion", 20.0) * 1000,  # kPa转Pa
                "FRICTION_ANGLE": np.radians(params.get("friction_angle", 25.0)),
                "DILATANCY_ANGLE": np.radians(params.get("dilatancy_angle", 0.0))
            })
        elif model_type == ConstitutiveModelType.DRUCKER_PRAGER:
            variables.update({
                "COHESION": params.get("cohesion", 20.0) * 1000,
                "FRICTION_COEFFICIENT": params.get("alpha", 0.5)
            })
        elif model_type == ConstitutiveModelType.CAM_CLAY:
            variables.update({
                "NORMAL_COMPRESSION_SLOPE": params.get("lambda", 0.15),
                "SWELLING_SLOPE": params.get("kappa", 0.03),
                "CRITICAL_STATE_LINE": params.get("M", 1.2),
                "INITIAL_SHEAR_MODULUS": params.get("pc0", 100.0) * 1000
            })
        elif model_type == ConstitutiveModelType.HARDENING_SOIL:
            variables.update({
                "E50_REF": params.get("E50_ref", 30.0) * 1e6,
                "EOED_REF": params.get("Eoed_ref", 30.0) * 1e6,
                "EUR_REF": params.get("Eur_ref", 90.0) * 1e6,
                "COHESION": params.get("cohesion", 20.0) * 1000,
                "FRICTION_ANGLE": np.radians(params.get("friction_angle", 25.0)),
                "REFERENCE_PRESSURE": params.get("pref", 100.0) * 1000,
                "POWER_LAW_M": params.get("m", 0.5)
            })
        
        return variables

    def _convert_anchor_material(self, anchor_system: AnchorSystem) -> Dict[str, Any]:
        """转换锚杆材料参数"""
        material_props = anchor_system.material_properties
        
        return {
            "DENSITY": material_props.get("density", 7850.0),
            "YOUNG_MODULUS": material_props.get("elastic_modulus", 210000.0) * 1e6,
            "YIELD_STRESS": material_props.get("yield_strength", 400.0) * 1e6,
            "CROSS_AREA": np.pi * (material_props.get("diameter", 25.0) / 1000.0)**2 / 4
        }

    def _generate_process_list(self) -> str:
        """生成ProcessList.json"""
        processes = {
            "gravity": [],
            "boundary_conditions_process_list": [],
            "loads_process_list": [],
            "auxiliar_process_list": []
        }
        
        # 重力加载
        processes["gravity"].append({
            "python_module": "apply_vector_constraint_table_process",
            "kratos_module": "KratosMultiphysics.PoromechanicsApplication",
            "process_name": "ApplyVectorConstraintTableProcess",
            "Parameters": {
                "model_part_name": "PorousDomain.Body_Gravity",
                "variable_name": "VOLUME_ACCELERATION",
                "active": [False, True, False],
                "value": [0.0, -9.81, 0.0],
                "table": [0, 0, 1, 1]
            }
        })
        
        # 边界条件
        soil_domain = self.config.soil_domain
        for i, bc in enumerate(soil_domain.boundary_conditions):
            if bc.condition_type == "displacement":
                process_config = {
                    "python_module": "apply_vector_constraint_table_process",
                    "kratos_module": "KratosMultiphysics.PoromechanicsApplication", 
                    "process_name": "ApplyVectorConstraintTableProcess",
                    "Parameters": {
                        "model_part_name": f"PorousDomain.{bc.name}",
                        "variable_name": "DISPLACEMENT",
                        "active": [True, True, False],
                        "value": [
                            bc.values.get("displacement", {}).get("x", 0.0),
                            bc.values.get("displacement", {}).get("y", 0.0),
                            0.0
                        ],
                        "table": [0, 0, 1, 1]
                    }
                }
                processes["boundary_conditions_process_list"].append(process_config)
        
        # 锚杆预应力
        if self.config.anchor_system:
            anchor_system = self.config.anchor_system
            for row in anchor_system.anchor_rows:
                if row.enabled and row.prestress > 0:
                    prestress_process = {
                        "python_module": "apply_scalar_constraint_table_process",
                        "kratos_module": "KratosMultiphysics.PoromechanicsApplication",
                        "process_name": "ApplyScalarConstraintTableProcess",
                        "Parameters": {
                            "model_part_name": f"PorousDomain.AnchorRow_{row.id}",
                            "variable_name": "FORCE",
                            "value": row.prestress * 1000,  # kN转N
                            "table": [0, 0, 1, 1]
                        }
                    }
                    processes["loads_process_list"].append(prestress_process)
        
        output_file = self.output_dir / "ProcessList.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(processes, f, indent=2, ensure_ascii=False)
        
        return str(output_file)

    def _get_processes_config(self) -> Dict[str, str]:
        """获取过程配置"""
        return {
            "gravity": "ProcessList.json",
            "boundary_conditions_process_list": "ProcessList.json",
            "loads_process_list": "ProcessList.json",
            "auxiliar_process_list": "ProcessList.json"
        }

    def _get_output_processes(self) -> Dict[str, Any]:
        """获取输出过程配置"""
        return {
            "gid_output": [{
                "python_module": "gid_output_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "GiDOutputProcess",
                "help": "This process writes postprocessing files for GiD",
                "Parameters": {
                    "model_part_name": "PorousDomain",
                    "output_name": "results",
                    "postprocess_parameters": {
                        "result_file_configuration": {
                            "gidpost_flags": {
                                "GiDPostMode": "GiD_PostBinary",
                                "WriteDeformedMeshFlag": "WriteUndeformed",
                                "WriteConditionsFlag": "WriteElementsOnly",
                                "MultiFileFlag": "SingleFile"
                            },
                            "file_label": "time",
                            "output_control_type": "step",
                            "output_frequency": 1,
                            "body_output": True,
                            "node_output": False,
                            "skin_output": False,
                            "plane_output": [],
                            "nodal_results": [
                                "DISPLACEMENT",
                                "WATER_PRESSURE",
                                "EFFECTIVE_STRESS_TENSOR"
                            ],
                            "elemental_conditional_flags_results": [],
                            "elemental_results": [
                                "VON_MISES_STRESS",
                                "CAUCHY_STRESS_TENSOR"
                            ]
                        },
                        "point_data_configuration": []
                    }
                }
            }],
            "vtk_output": [{
                "python_module": "vtk_output_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "VtkOutputProcess",
                "help": "This process writes postprocessing files for Paraview",
                "Parameters": {
                    "model_part_name": "PorousDomain",
                    "output_control_type": "step",
                    "output_frequency": 1,
                    "file_format": "binary",
                    "output_precision": 7,
                    "output_sub_model_parts": False,
                    "folder_name": "vtk_output",
                    "save_output_files_in_folder": True,
                    "nodal_solution_step_data_variables": [
                        "DISPLACEMENT",
                        "WATER_PRESSURE"
                    ],
                    "element_data_value_variables": [
                        "VON_MISES_STRESS"
                    ]
                }
            }]
        }

    def _generate_mdpa_file(self) -> str:
        """生成MDPA网格文件（简化版）"""
        output_file = self.output_dir / "geometry.mdpa"
        
        # 这里应该集成网格生成器（如GMSH）
        # 现在提供一个基本的模板
        mdpa_content = """Begin ModelPartData
//  VARIABLE_NAME value
End ModelPartData

Begin Properties 1
    DENSITY 2000.0
    YOUNG_MODULUS 50000000.0
    POISSON_RATIO 0.35
End Properties

Begin Nodes
    1    0.0    0.0    0.0
    2   10.0    0.0    0.0
    3   10.0   10.0    0.0
    4    0.0   10.0    0.0
End Nodes

Begin Elements SmallStrainUPwDiffOrderElement2D3N
    1 1 1 2 3
    2 1 1 3 4
End Elements

Begin SubModelPart SoilDomain
    Begin SubModelPartData
    End SubModelPartData
    Begin SubModelPartNodes
        1
        2
        3
        4
    End SubModelPartNodes
    Begin SubModelPartElements
        1
        2
    End SubModelPartElements
End SubModelPart

Begin SubModelPart FixedBoundary
    Begin SubModelPartData
    End SubModelPartData
    Begin SubModelPartNodes
        1
        2
    End SubModelPartNodes
End SubModelPart
"""
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(mdpa_content)
        
        return str(output_file)

    def validate_configuration(self) -> Dict[str, Any]:
        """验证配置的合理性"""
        validation_result = {
            "is_valid": True,
            "warnings": [],
            "errors": []
        }
        
        # 检查土层配置
        soil_domain = self.config.soil_domain
        if not soil_domain.soil_layers:
            validation_result["errors"].append("至少需要定义一个土层")
            validation_result["is_valid"] = False
        
        # 检查本构模型参数
        for layer in soil_domain.soil_layers:
            if layer.enabled:
                params = layer.constitutive_model.parameters
                model_type = layer.constitutive_model.type
                
                if model_type == ConstitutiveModelType.MOHR_COULOMB:
                    if params.get("friction_angle", 0) > 45:
                        validation_result["warnings"].append(f"土层 {layer.name} 的内摩擦角过大")
                    if params.get("cohesion", 0) < 0:
                        validation_result["errors"].append(f"土层 {layer.name} 的粘聚力不能为负")
                        validation_result["is_valid"] = False
        
        # 检查锚杆配置
        if self.config.anchor_system:
            for row in self.config.anchor_system.anchor_rows:
                if row.enabled and row.prestress < 0:
                    validation_result["errors"].append(f"锚杆排 {row.id} 的预应力不能为负")
                    validation_result["is_valid"] = False
        
        return validation_result


def convert_deepcad_to_kratos(
    project_config: ProjectConfiguration, 
    output_directory: str
) -> Dict[str, Any]:
    """
    主转换函数
    
    Args:
        project_config: DeepCAD项目配置
        output_directory: 输出目录
    
    Returns:
        转换结果字典
    """
    try:
        converter = KratosConverter(project_config, output_directory)
        
        # 验证配置
        validation_result = converter.validate_configuration()
        if not validation_result["is_valid"]:
            return {
                "success": False,
                "errors": validation_result["errors"],
                "warnings": validation_result["warnings"]
            }
        
        # 执行转换
        generated_files = converter.convert_all()
        
        return {
            "success": True,
            "files_generated": generated_files,
            "validation_results": validation_result,
            "warnings": validation_result["warnings"],
            "errors": []
        }
        
    except Exception as e:
        return {
            "success": False,
            "errors": [f"转换过程中发生错误: {str(e)}"],
            "warnings": [],
            "files_generated": {}
        }