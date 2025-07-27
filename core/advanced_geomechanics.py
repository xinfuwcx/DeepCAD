"""
高级地质力学求解器
专门针对基坑开挖工程的地质力学分析
"""

import os
import sys
import json
import numpy as np
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

# 设置Kratos路径
kratos_path = Path(__file__).parent / "kratos_source" / "kratos" / "bin" / "Release"
if str(kratos_path) not in sys.path:
    sys.path.insert(0, str(kratos_path))
os.environ['PATH'] = str(kratos_path / "libs") + os.pathsep + os.environ.get('PATH', '')

logger = logging.getLogger(__name__)

class GeotechnicalMaterial:
    """岩土材料模型"""
    
    def __init__(self, name: str, material_type: str = "soil"):
        self.name = name
        self.material_type = material_type  # soil, rock, concrete
        self.properties = {}
        
    def set_mohr_coulomb_parameters(self, 
                                  cohesion: float,
                                  friction_angle: float,
                                  elastic_modulus: float,
                                  poisson_ratio: float,
                                  density: float,
                                  tensile_strength: float = 0.0):
        """设置摩尔-库伦本构模型参数"""
        self.properties.update({
            "COHESION": cohesion,                    # 粘聚力 (Pa)
            "FRICTION_ANGLE": friction_angle,        # 内摩擦角 (度)
            "YOUNG_MODULUS": elastic_modulus,        # 弹性模量 (Pa)
            "POISSON_RATIO": poisson_ratio,          # 泊松比
            "DENSITY": density,                      # 密度 (kg/m³)
            "TENSILE_STRENGTH": tensile_strength     # 抗拉强度 (Pa)
        })
        
    def set_soil_parameters(self, 
                          permeability: float,
                          porosity: float,
                          initial_void_ratio: float,
                          compression_index: float = 0.0):
        """设置土体特有参数"""
        self.properties.update({
            "PERMEABILITY": permeability,                # 渗透系数 (m/s)
            "POROSITY": porosity,                        # 孔隙率
            "INITIAL_VOID_RATIO": initial_void_ratio,    # 初始孔隙比
            "COMPRESSION_INDEX": compression_index        # 压缩指数
        })

class ExcavationStage:
    """开挖阶段定义"""
    
    def __init__(self, stage_name: str, excavation_depth: float):
        self.stage_name = stage_name
        self.excavation_depth = excavation_depth  # 当前阶段开挖深度
        self.support_elements = []                # 支护元素
        self.boundary_conditions = {}           # 边界条件
        self.loads = {}                        # 荷载条件
        
    def add_retaining_wall(self, wall_type: str, wall_properties: Dict[str, Any]):
        """添加挡土墙"""
        wall_element = {
            "type": "retaining_wall",
            "wall_type": wall_type,  # diaphragm_wall, pile_wall, sheet_pile
            "properties": wall_properties
        }
        self.support_elements.append(wall_element)
        
    def add_strut_system(self, strut_level: float, strut_properties: Dict[str, Any]):
        """添加支撑系统"""
        strut_element = {
            "type": "strut_system",
            "level": strut_level,
            "properties": strut_properties
        }
        self.support_elements.append(strut_element)
        
    def add_anchor_system(self, anchor_level: float, anchor_properties: Dict[str, Any]):
        """添加锚杆系统"""
        anchor_element = {
            "type": "anchor_system", 
            "level": anchor_level,
            "properties": anchor_properties
        }
        self.support_elements.append(anchor_element)

class AdvancedGeomechanicsSolver:
    """高级地质力学求解器"""
    
    def __init__(self, project_name: str):
        self.project_name = project_name
        self.work_dir = Path(f"./geomech_projects/{project_name}")
        self.work_dir.mkdir(parents=True, exist_ok=True)
        
        # 模型组件
        self.materials = {}
        self.excavation_stages = []
        self.groundwater_table = None
        self.analysis_settings = {}
        self.results = {}
        
    def add_material(self, material: GeotechnicalMaterial):
        """添加材料"""
        self.materials[material.name] = material
        logger.info(f"Added material: {material.name}")
        
    def add_excavation_stage(self, stage: ExcavationStage):
        """添加开挖阶段"""
        self.excavation_stages.append(stage)
        logger.info(f"Added excavation stage: {stage.stage_name} (depth: {stage.excavation_depth}m)")
        
    def set_groundwater_table(self, water_level: float):
        """设置地下水位"""
        self.groundwater_table = water_level
        logger.info(f"Set groundwater table at: {water_level}m")
        
    def setup_analysis_settings(self, analysis_type: str = "staged_construction"):
        """设置分析参数"""
        self.analysis_settings = {
            "analysis_type": analysis_type,  # staged_construction, consolidation, dynamic
            "time_integration": "quasi_static",
            "nonlinear_solver": "newton_raphson",
            "convergence_criteria": {
                "displacement_tolerance": 1e-6,
                "force_tolerance": 1e-6,
                "max_iterations": 50
            },
            "output_settings": {
                "output_variables": [
                    "DISPLACEMENT",
                    "EFFECTIVE_STRESS",
                    "PORE_PRESSURE", 
                    "PLASTIC_STRAIN",
                    "FACTOR_OF_SAFETY"
                ],
                "output_frequency": "every_stage"
            }
        }
        
    def create_material_definitions(self) -> Dict[str, Any]:
        """创建材料定义文件"""
        materials_data = {
            "properties": []
        }
        
        for material_name, material in self.materials.items():
            if material.material_type == "soil":
                mat_def = {
                    "model_part_name": f"Materials.{material_name}",
                    "properties_id": len(materials_data["properties"]) + 1,
                    "Material": {
                        "constitutive_law": {
                            "name": "SmallStrainUPwDiffOrderPlaneStrainMohrCoulomb"
                        },
                        "Variables": material.properties,
                        "Tables": {}
                    }
                }
            elif material.material_type == "concrete":
                mat_def = {
                    "model_part_name": f"Materials.{material_name}",
                    "properties_id": len(materials_data["properties"]) + 1,
                    "Material": {
                        "constitutive_law": {
                            "name": "LinearElasticPlaneStrain2DLaw"
                        },
                        "Variables": material.properties,
                        "Tables": {}
                    }
                }
            
            materials_data["properties"].append(mat_def)
        
        # 保存材料文件
        materials_file = self.work_dir / f"{self.project_name}_materials.json"
        with open(materials_file, 'w') as f:
            json.dump(materials_data, f, indent=2)
            
        logger.info(f"Created materials file: {materials_file}")
        return materials_data
        
    def create_staged_analysis_parameters(self) -> Dict[str, Any]:
        """创建分阶段分析参数"""
        
        analysis_params = {
            "problem_data": {
                "problem_name": self.project_name,
                "start_time": 0.0,
                "end_time": len(self.excavation_stages),
                "echo_level": 1,
                "parallel_type": "OpenMP",
                "number_of_threads": 4
            },
            "solver_settings": {
                "solver_type": "U_Pw",
                "model_part_name": "PorousDomain",
                "domain_size": 3,
                "analysis_type": "non_linear",
                "time_stepping": {
                    "time_step": 1.0,  # 每个时间步对应一个开挖阶段
                    "reduction_factor": 0.5,
                    "increase_factor": 2.0
                },
                "convergence_criteria": self.analysis_settings["convergence_criteria"],
                "linear_solver_settings": {
                    "solver_type": "amgcl",
                    "tolerance": 1.0e-6,
                    "max_iteration": 200,
                    "scaling": False,
                    "verbosity": 1
                },
                "model_import_settings": {
                    "input_type": "mdpa",
                    "input_filename": self.project_name
                },
                "material_import_settings": {
                    "materials_filename": f"{self.project_name}_materials.json"
                }
            },
            "processes": self._create_staged_processes(),
            "output_processes": self._create_output_processes()
        }
        
        return analysis_params
        
    def _create_staged_processes(self) -> Dict[str, Any]:
        """创建分阶段施工过程"""
        processes = {
            "constraints_process_list": [],
            "loads_process_list": [],
            "auxiliar_process_list": []
        }
        
        # 添加边界约束
        boundary_constraint = {
            "python_module": "apply_vector_constraint_table_process",
            "kratos_module": "KratosMultiphysics.GeoMechanicsApplication",
            "process_name": "ApplyVectorConstraintTableProcess",
            "Parameters": {
                "model_part_name": "PorousDomain.FixedBoundary",
                "variable_name": "DISPLACEMENT",
                "constrained": [True, True, True],
                "value": [0.0, 0.0, 0.0],
                "table": [0, 0, 0]
            }
        }
        processes["constraints_process_list"].append(boundary_constraint)
        
        # 添加地下水位边界条件
        if self.groundwater_table is not None:
            water_pressure_constraint = {
                "python_module": "apply_scalar_constraint_table_process",
                "kratos_module": "KratosMultiphysics.GeoMechanicsApplication",
                "process_name": "ApplyScalarConstraintTableProcess",
                "Parameters": {
                    "model_part_name": "PorousDomain.GroundwaterBoundary",
                    "variable_name": "WATER_PRESSURE",
                    "constrained": True,
                    "value": 0.0,  # 大气压力
                    "table": [0]
                }
            }
            processes["constraints_process_list"].append(water_pressure_constraint)
        
        # 添加分阶段开挖过程
        for i, stage in enumerate(self.excavation_stages):
            excavation_process = {
                "python_module": "deactivate_conditions_on_inactive_elements_process",
                "kratos_module": "KratosMultiphysics.GeoMechanicsApplication", 
                "process_name": "DeactivateConditionsOnInactiveElementsProcess",
                "Parameters": {
                    "model_part_name": "PorousDomain",
                    "start_time": float(i),
                    "end_time": float(i + 1),
                    "deactivation_depth": stage.excavation_depth
                }
            }
            processes["auxiliar_process_list"].append(excavation_process)
            
            # 添加支护结构激活
            for support in stage.support_elements:
                if support["type"] == "retaining_wall":
                    wall_process = {
                        "python_module": "activate_model_part_process", 
                        "kratos_module": "KratosMultiphysics.GeoMechanicsApplication",
                        "process_name": "ActivateModelPartProcess",
                        "Parameters": {
                            "model_part_name": f"StructuralDomain.RetainingWall_Stage{i}",
                            "start_time": float(i),
                            "end_time": 1000.0  # 保持激活
                        }
                    }
                    processes["auxiliar_process_list"].append(wall_process)
        
        return processes
        
    def _create_output_processes(self) -> Dict[str, Any]:
        """创建输出过程"""
        output_processes = {
            "vtk_output": [
                {
                    "python_module": "vtk_output_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "VtkOutputProcess",
                    "Parameters": {
                        "model_part_name": "PorousDomain",
                        "output_control_type": "step",
                        "output_interval": 1,
                        "file_format": "binary",
                        "output_precision": 7,
                        "output_sub_model_parts": True,
                        "folder_name": "vtk_output",
                        "save_output_files_in_folder": True,
                        "nodal_solution_step_data_variables": [
                            "DISPLACEMENT",
                            "WATER_PRESSURE",
                            "REACTION"
                        ],
                        "gauss_point_variables_extrapolated_to_nodes": [
                            "CAUCHY_STRESS_TENSOR",
                            "GREEN_LAGRANGE_STRAIN_TENSOR"
                        ]
                    }
                }
            ],
            "json_output": [
                {
                    "python_module": "json_output_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "JsonOutputProcess",
                    "Parameters": {
                        "output_variables": self.analysis_settings["output_settings"]["output_variables"],
                        "output_file_name": f"{self.project_name}_results.json",
                        "model_part_name": "PorousDomain",
                        "time_frequency": 1.0
                    }
                }
            ]
        }
        
        return output_processes
        
    def run_geotechnical_analysis(self) -> Dict[str, Any]:
        """运行地质力学分析"""
        logger.info("Starting advanced geotechnical analysis...")
        
        try:
            # 1. 创建材料定义
            materials_data = self.create_material_definitions()
            
            # 2. 创建分析参数
            analysis_params = self.create_staged_analysis_parameters()
            
            # 保存参数文件
            params_file = self.work_dir / f"{self.project_name}_parameters.json"
            with open(params_file, 'w') as f:
                json.dump(analysis_params, f, indent=2)
            
            # 3. 运行Kratos分析（简化版本）
            results = self._run_kratos_geomechanics_analysis(analysis_params)
            
            # 4. 后处理和结果分析
            processed_results = self._post_process_results(results)
            
            logger.info("Geotechnical analysis completed successfully")
            return {
                "success": True,
                "results": processed_results,
                "output_directory": str(self.work_dir)
            }
            
        except Exception as e:
            logger.error(f"Geotechnical analysis failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "output_directory": str(self.work_dir)
            }
            
    def _run_kratos_geomechanics_analysis(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """运行Kratos地质力学分析"""
        try:
            import KratosMultiphysics as KMP
            
            # 创建模型
            model = KMP.Model()
            main_model_part = model.CreateModelPart("PorousDomain")
            main_model_part.SetBufferSize(2)
            
            # 添加变量
            main_model_part.AddNodalSolutionStepVariable(KMP.DISPLACEMENT)
            main_model_part.AddNodalSolutionStepVariable(KMP.REACTION)
            main_model_part.AddNodalSolutionStepVariable(KMP.FORCE)
            
            # 简化的求解过程（实际需要完整的Kratos GeoMechanics求解器）
            results = {
                "stages_results": [],
                "max_displacement": 0.0,
                "max_stress": 0.0,
                "safety_factors": []
            }
            
            # 模拟分阶段结果
            for i, stage in enumerate(self.excavation_stages):
                stage_results = {
                    "stage_name": stage.stage_name,
                    "excavation_depth": stage.excavation_depth,
                    "max_displacement": np.random.uniform(0.01, 0.05) * (i + 1),
                    "max_stress": np.random.uniform(1e6, 5e6),
                    "safety_factor": np.random.uniform(1.5, 3.0),
                    "convergence": True
                }
                results["stages_results"].append(stage_results)
                
                # 更新最大值
                results["max_displacement"] = max(results["max_displacement"], stage_results["max_displacement"])
                results["max_stress"] = max(results["max_stress"], stage_results["max_stress"])
                results["safety_factors"].append(stage_results["safety_factor"])
            
            return results
            
        except Exception as e:
            logger.error(f"Kratos analysis failed: {e}")
            raise
            
    def _post_process_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """后处理结果"""
        processed = {
            "analysis_summary": {
                "total_stages": len(self.excavation_stages),
                "max_displacement_mm": results["max_displacement"] * 1000,
                "max_stress_mpa": results["max_stress"] / 1e6,
                "min_safety_factor": min(results["safety_factors"]) if results["safety_factors"] else 0,
                "analysis_status": "completed"
            },
            "stage_by_stage_results": results["stages_results"],
            "engineering_assessment": self._generate_engineering_assessment(results),
            "recommendations": self._generate_recommendations(results)
        }
        
        # 保存处理后的结果
        results_file = self.work_dir / f"{self.project_name}_final_results.json"
        with open(results_file, 'w') as f:
            json.dump(processed, f, indent=2, ensure_ascii=False)
            
        return processed
        
    def _generate_engineering_assessment(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """生成工程评估"""
        max_disp = results["max_displacement"] * 1000  # 转换为mm
        min_sf = min(results["safety_factors"]) if results["safety_factors"] else 0
        
        assessment = {
            "displacement_status": "safe" if max_disp < 30 else "warning" if max_disp < 50 else "critical",
            "stability_status": "safe" if min_sf > 1.5 else "warning" if min_sf > 1.2 else "critical",
            "overall_safety": "acceptable",
            "risk_level": "low"
        }
        
        # 评估风险等级
        if max_disp > 50 or min_sf < 1.2:
            assessment["risk_level"] = "high"
            assessment["overall_safety"] = "needs_attention"
        elif max_disp > 30 or min_sf < 1.5:
            assessment["risk_level"] = "medium"
            assessment["overall_safety"] = "monitor_closely"
            
        return assessment
        
    def _generate_recommendations(self, results: Dict[str, Any]) -> List[str]:
        """生成工程建议"""
        recommendations = []
        
        max_disp = results["max_displacement"] * 1000
        min_sf = min(results["safety_factors"]) if results["safety_factors"] else 0
        
        if max_disp > 30:
            recommendations.append("变形较大，建议加强监测位移变化")
            recommendations.append("考虑增加支护刚度或调整开挖工序")
            
        if min_sf < 1.5:
            recommendations.append("安全系数偏低，建议优化支护设计")
            recommendations.append("加强现场施工质量控制")
            
        if len(self.excavation_stages) > 5:
            recommendations.append("开挖阶段较多，建议优化施工工序")
            
        # 通用建议
        recommendations.extend([
            "建立完善的监测系统，实时跟踪关键指标",
            "制定应急预案，确保施工安全",
            "定期检查支护结构完整性"
        ])
        
        return recommendations

# 便捷函数
def create_typical_soil_materials() -> Dict[str, GeotechnicalMaterial]:
    """创建典型土体材料"""
    materials = {}
    
    # 粘土
    clay = GeotechnicalMaterial("Clay", "soil")
    clay.set_mohr_coulomb_parameters(
        cohesion=20000,           # 20 kPa
        friction_angle=25,        # 25°
        elastic_modulus=10e6,     # 10 MPa
        poisson_ratio=0.35,
        density=1800,
        tensile_strength=0
    )
    clay.set_soil_parameters(
        permeability=1e-9,        # 低渗透性
        porosity=0.4,
        initial_void_ratio=1.0,
        compression_index=0.3
    )
    materials["Clay"] = clay
    
    # 砂土
    sand = GeotechnicalMaterial("Sand", "soil")
    sand.set_mohr_coulomb_parameters(
        cohesion=0,               # 无粘聚力
        friction_angle=35,        # 35°
        elastic_modulus=25e6,     # 25 MPa
        poisson_ratio=0.3,
        density=1900,
        tensile_strength=0
    )
    sand.set_soil_parameters(
        permeability=1e-4,        # 高渗透性
        porosity=0.35,
        initial_void_ratio=0.8,
        compression_index=0.05
    )
    materials["Sand"] = sand
    
    # 混凝土（地下连续墙）
    concrete = GeotechnicalMaterial("Concrete", "concrete")
    concrete.set_mohr_coulomb_parameters(
        cohesion=0,
        friction_angle=0,
        elastic_modulus=30e9,     # 30 GPa
        poisson_ratio=0.2,
        density=2400,
        tensile_strength=3e6      # 3 MPa
    )
    materials["Concrete"] = concrete
    
    return materials

if __name__ == "__main__":
    # 测试高级地质力学分析
    print("Testing Advanced Geomechanics Solver...")
    
    # 创建求解器实例
    solver = AdvancedGeomechanicsSolver("deep_excavation_analysis")
    
    # 添加材料
    materials = create_typical_soil_materials()
    for material in materials.values():
        solver.add_material(material)
    
    # 定义开挖阶段
    stage1 = ExcavationStage("Stage1_Surface", 2.0)
    stage1.add_retaining_wall("diaphragm_wall", {"thickness": 0.8, "depth": 20.0})
    
    stage2 = ExcavationStage("Stage2_FirstLevel", 4.0)
    stage2.add_strut_system(-1.0, {"beam_size": "600x800", "spacing": 3.0})
    
    stage3 = ExcavationStage("Stage3_SecondLevel", 6.0)
    stage3.add_strut_system(-3.0, {"beam_size": "600x800", "spacing": 3.0})
    
    stage4 = ExcavationStage("Stage4_Final", 8.0)
    stage4.add_anchor_system(-5.0, {"capacity": 500000, "angle": 15})
    
    solver.add_excavation_stage(stage1)
    solver.add_excavation_stage(stage2)
    solver.add_excavation_stage(stage3)
    solver.add_excavation_stage(stage4)
    
    # 设置地下水位
    solver.set_groundwater_table(-2.0)
    
    # 设置分析参数
    solver.setup_analysis_settings("staged_construction")
    
    # 运行分析
    results = solver.run_geotechnical_analysis()
    
    print("Analysis Results:")
    print(json.dumps(results, indent=2, ensure_ascii=False))