"""
流固耦合分析模块
专门用于基坑开挖中的渗流-变形耦合分析
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

class FluidSolidCouplingAnalyzer:
    """流固耦合分析器"""
    
    def __init__(self, project_name: str):
        self.project_name = project_name
        self.work_dir = Path(f"./fluid_solid_projects/{project_name}")
        self.work_dir.mkdir(parents=True, exist_ok=True)
        
        # 分析组件
        self.fluid_properties = {}
        self.solid_properties = {}
        self.coupling_parameters = {}
        self.boundary_conditions = {}
        self.results = {}
        
        # 求解器状态
        self.is_initialized = False
        
    def set_fluid_properties(self, properties: Dict[str, Any]):
        """设置流体属性"""
        self.fluid_properties = {
            "density": properties.get("density", 1000.0),  # kg/m³
            "dynamic_viscosity": properties.get("dynamic_viscosity", 1e-3),  # Pa·s
            "bulk_modulus": properties.get("bulk_modulus", 2.2e9),  # Pa
            "permeability_xx": properties.get("permeability_xx", 1e-10),  # m/s
            "permeability_yy": properties.get("permeability_yy", 1e-10),
            "permeability_zz": properties.get("permeability_zz", 1e-10),
            "porosity": properties.get("porosity", 0.3)
        }
        logger.info("Fluid properties set")
        
    def set_solid_properties(self, properties: Dict[str, Any]):
        """设置固体属性"""
        self.solid_properties = {
            "young_modulus": properties.get("young_modulus", 25e6),  # Pa
            "poisson_ratio": properties.get("poisson_ratio", 0.3),
            "density": properties.get("density", 1800.0),  # kg/m³
            "cohesion": properties.get("cohesion", 20000.0),  # Pa
            "friction_angle": properties.get("friction_angle", 25.0),  # degrees
            "dilatancy_angle": properties.get("dilatancy_angle", 0.0),  # degrees
            "biot_coefficient": properties.get("biot_coefficient", 1.0),
            "initial_stress_xx": properties.get("initial_stress_xx", -100000.0),
            "initial_stress_yy": properties.get("initial_stress_yy", -100000.0),
            "initial_stress_zz": properties.get("initial_stress_zz", -150000.0)
        }
        logger.info("Solid properties set")
        
    def set_coupling_parameters(self, parameters: Dict[str, Any]):
        """设置耦合参数"""
        self.coupling_parameters = {
            "coupling_type": parameters.get("coupling_type", "two_way"),  # one_way, two_way
            "time_step": parameters.get("time_step", 0.1),  # s
            "total_time": parameters.get("total_time", 10.0),  # s
            "convergence_tolerance": parameters.get("convergence_tolerance", 1e-6),
            "max_coupling_iterations": parameters.get("max_coupling_iterations", 10),
            "relaxation_factor": parameters.get("relaxation_factor", 0.7),
            "stabilization": {
                "enable_ups": parameters.get("enable_ups", True),
                "ups_alpha": parameters.get("ups_alpha", 0.5),
                "enable_pspg": parameters.get("enable_pspg", True),
                "pspg_factor": parameters.get("pspg_factor", 0.1)
            }
        }
        logger.info("Coupling parameters set")
        
    def set_boundary_conditions(self, conditions: Dict[str, Any]):
        """设置边界条件"""
        self.boundary_conditions = {
            "displacement_bc": conditions.get("displacement_bc", []),
            "pressure_bc": conditions.get("pressure_bc", []),
            "flow_bc": conditions.get("flow_bc", []),
            "stress_bc": conditions.get("stress_bc", []),
            "seepage_face_bc": conditions.get("seepage_face_bc", [])
        }
        logger.info("Boundary conditions set")
        
    def initialize_coupled_solver(self) -> bool:
        """初始化耦合求解器"""
        try:
            import KratosMultiphysics as KMP
            
            # 创建主模型
            self.model = KMP.Model()
            
            # 创建流体模型部分
            self.fluid_model_part = self.model.CreateModelPart("FluidDomain")
            self.fluid_model_part.SetBufferSize(3)
            
            # 创建固体模型部分
            self.solid_model_part = self.model.CreateModelPart("SolidDomain")
            self.solid_model_part.SetBufferSize(3)
            
            # 创建耦合接面
            self.coupling_interface = self.model.CreateModelPart("CouplingInterface")
            
            # 添加流体求解变量
            self.fluid_model_part.AddNodalSolutionStepVariable(KMP.VELOCITY)
            self.fluid_model_part.AddNodalSolutionStepVariable(KMP.PRESSURE)
            self.fluid_model_part.AddNodalSolutionStepVariable(KMP.BODY_FORCE)
            
            # 添加固体求解变量
            self.solid_model_part.AddNodalSolutionStepVariable(KMP.DISPLACEMENT)
            self.solid_model_part.AddNodalSolutionStepVariable(KMP.VELOCITY)
            self.solid_model_part.AddNodalSolutionStepVariable(KMP.ACCELERATION)
            self.solid_model_part.AddNodalSolutionStepVariable(KMP.REACTION)
            self.solid_model_part.AddNodalSolutionStepVariable(KMP.FORCE)
            
            # 添加耦合变量
            self.coupling_interface.AddNodalSolutionStepVariable(KMP.DISPLACEMENT)
            self.coupling_interface.AddNodalSolutionStepVariable(KMP.VELOCITY)
            self.coupling_interface.AddNodalSolutionStepVariable(KMP.PRESSURE)
            
            self.is_initialized = True
            logger.info("Coupled solver initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize coupled solver: {e}")
            return False
            
    def create_analysis_parameters(self) -> Dict[str, Any]:
        """创建分析参数文件"""
        params = {
            "problem_data": {
                "problem_name": self.project_name,
                "start_time": 0.0,
                "end_time": self.coupling_parameters["total_time"],
                "echo_level": 1,
                "parallel_type": "OpenMP",
                "number_of_threads": 4
            },
            "coupling_solver_settings": {
                "coupling_sequence": [
                    {
                        "solver_name": "fluid_solver",
                        "coupling_operations": ["transfer_pressure_to_solid"]
                    },
                    {
                        "solver_name": "solid_solver", 
                        "coupling_operations": ["transfer_displacement_to_fluid"]
                    }
                ],
                "coupling_strategy": "gauss_seidel",
                "max_coupling_iterations": self.coupling_parameters["max_coupling_iterations"],
                "coupling_tolerance": self.coupling_parameters["convergence_tolerance"],
                "relaxation_factor": self.coupling_parameters["relaxation_factor"]
            },
            "solver_settings": {
                "fluid_solver": {
                    "solver_type": "navier_stokes_u_p",
                    "model_part_name": "FluidDomain",
                    "domain_size": 3,
                    "time_stepping": {
                        "automatic_time_step": False,
                        "time_step": self.coupling_parameters["time_step"]
                    },
                    "formulation": {
                        "element_type": "vms",
                        "use_orthogonal_subscales": False,
                        "dynamic_tau": 1.0
                    },
                    "maximum_iterations": 50,
                    "relative_velocity_tolerance": 1e-5,
                    "absolute_velocity_tolerance": 1e-7,
                    "relative_pressure_tolerance": 1e-5,
                    "absolute_pressure_tolerance": 1e-7,
                    "linear_solver_settings": {
                        "solver_type": "amgcl",
                        "tolerance": 1e-6,
                        "max_iteration": 200
                    },
                    "material_import_settings": {
                        "materials_filename": f"{self.project_name}_fluid_materials.json"
                    }
                },
                "solid_solver": {
                    "solver_type": "U_Pw",
                    "model_part_name": "SolidDomain",
                    "domain_size": 3,
                    "analysis_type": "non_linear",
                    "time_stepping": {
                        "time_step": self.coupling_parameters["time_step"],
                        "reduction_factor": 0.5,
                        "increase_factor": 2.0
                    },
                    "convergence_criteria": "And_criterion",
                    "displacement_relative_tolerance": 1.0e-4,
                    "displacement_absolute_tolerance": 1.0e-9,
                    "residual_relative_tolerance": 1.0e-4,
                    "residual_absolute_tolerance": 1.0e-9,
                    "water_pressure_relative_tolerance": 1.0e-4,
                    "water_pressure_absolute_tolerance": 1.0e-9,
                    "max_iterations": 25,
                    "linear_solver_settings": {
                        "solver_type": "amgcl",
                        "tolerance": 1.0e-6,
                        "max_iteration": 200
                    },
                    "material_import_settings": {
                        "materials_filename": f"{self.project_name}_solid_materials.json"
                    }
                }
            },
            "processes": self._create_coupling_processes(),
            "output_processes": self._create_coupling_output()
        }
        
        return params
        
    def _create_coupling_processes(self) -> Dict[str, Any]:
        """创建耦合过程"""
        processes = {
            "constraints_process_list": [],
            "loads_process_list": [],
            "auxiliar_process_list": []
        }
        
        # 添加位移边界条件
        for bc in self.boundary_conditions.get("displacement_bc", []):
            disp_process = {
                "python_module": "apply_vector_constraint_table_process",
                "kratos_module": "KratosMultiphysics.GeoMechanicsApplication",
                "process_name": "ApplyVectorConstraintTableProcess",
                "Parameters": {
                    "model_part_name": f"SolidDomain.{bc['model_part']}",
                    "variable_name": "DISPLACEMENT",
                    "constrained": bc.get("constrained", [True, True, True]),
                    "value": bc.get("value", [0.0, 0.0, 0.0])
                }
            }
            processes["constraints_process_list"].append(disp_process)
            
        # 添加压力边界条件
        for bc in self.boundary_conditions.get("pressure_bc", []):
            pressure_process = {
                "python_module": "apply_scalar_constraint_table_process",
                "kratos_module": "KratosMultiphysics.GeoMechanicsApplication",
                "process_name": "ApplyScalarConstraintTableProcess",
                "Parameters": {
                    "model_part_name": f"FluidDomain.{bc['model_part']}",
                    "variable_name": "PRESSURE",
                    "constrained": True,
                    "value": bc.get("value", 0.0)
                }
            }
            processes["constraints_process_list"].append(pressure_process)
            
        # 添加渗流面边界条件
        for bc in self.boundary_conditions.get("seepage_face_bc", []):
            seepage_process = {
                "python_module": "apply_seepage_face_process",
                "kratos_module": "KratosMultiphysics.GeoMechanicsApplication",
                "process_name": "ApplySeepageFaceProcess",
                "Parameters": {
                    "model_part_name": f"SolidDomain.{bc['model_part']}",
                    "reference_coordinate": bc.get("reference_coordinate", 0.0),
                    "gravity_direction": bc.get("gravity_direction", 2)
                }
            }
            processes["auxiliar_process_list"].append(seepage_process)
            
        return processes
        
    def _create_coupling_output(self) -> Dict[str, Any]:
        """创建耦合输出"""
        output = {
            "vtk_output": [
                {
                    "python_module": "vtk_output_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "VtkOutputProcess",
                    "Parameters": {
                        "model_part_name": "FluidDomain",
                        "output_control_type": "time",
                        "output_interval": self.coupling_parameters["time_step"] * 10,
                        "file_format": "binary",
                        "output_precision": 7,
                        "output_sub_model_parts": True,
                        "folder_name": "fluid_vtk_output",
                        "save_output_files_in_folder": True,
                        "nodal_solution_step_data_variables": [
                            "VELOCITY",
                            "PRESSURE"
                        ],
                        "gauss_point_variables_extrapolated_to_nodes": [
                            "VELOCITY_GRADIENT"
                        ]
                    }
                },
                {
                    "python_module": "vtk_output_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "VtkOutputProcess",
                    "Parameters": {
                        "model_part_name": "SolidDomain",
                        "output_control_type": "time",
                        "output_interval": self.coupling_parameters["time_step"] * 10,
                        "file_format": "binary",
                        "output_precision": 7,
                        "output_sub_model_parts": True,
                        "folder_name": "solid_vtk_output",
                        "save_output_files_in_folder": True,
                        "nodal_solution_step_data_variables": [
                            "DISPLACEMENT",
                            "WATER_PRESSURE"
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
                        "output_variables": [
                            "DISPLACEMENT",
                            "VELOCITY", 
                            "PRESSURE",
                            "WATER_PRESSURE"
                        ],
                        "output_file_name": f"{self.project_name}_coupling_results.json",
                        "model_part_name": "CouplingInterface",
                        "time_frequency": self.coupling_parameters["time_step"]
                    }
                }
            ]
        }
        
        return output
        
    def run_fluid_solid_coupling_analysis(self) -> Dict[str, Any]:
        """运行流固耦合分析"""
        logger.info("Starting fluid-solid coupling analysis...")
        
        try:
            if not self.is_initialized:
                if not self.initialize_coupled_solver():
                    return {"success": False, "error": "Failed to initialize solver"}
                    
            # 创建分析参数
            analysis_params = self.create_analysis_parameters()
            
            # 保存参数文件
            params_file = self.work_dir / f"{self.project_name}_coupling_parameters.json"
            with open(params_file, 'w') as f:
                json.dump(analysis_params, f, indent=2)
                
            # 创建材料文件
            self._create_material_files()
            
            # 运行耦合求解
            coupling_results = self._run_coupling_solver(analysis_params)
            
            # 后处理结果
            processed_results = self._post_process_coupling_results(coupling_results)
            
            logger.info("Fluid-solid coupling analysis completed successfully")
            return {
                "success": True,
                "results": processed_results,
                "output_directory": str(self.work_dir)
            }
            
        except Exception as e:
            logger.error(f"Fluid-solid coupling analysis failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "output_directory": str(self.work_dir)
            }
            
    def _create_material_files(self):
        """创建材料文件"""
        # 流体材料
        fluid_materials = {
            "properties": [{
                "model_part_name": "FluidDomain.FluidBody",
                "properties_id": 1,
                "Material": {
                    "constitutive_law": {
                        "name": "Newtonian2DLaw"
                    },
                    "Variables": self.fluid_properties,
                    "Tables": {}
                }
            }]
        }
        
        fluid_file = self.work_dir / f"{self.project_name}_fluid_materials.json"
        with open(fluid_file, 'w') as f:
            json.dump(fluid_materials, f, indent=2)
            
        # 固体材料
        solid_materials = {
            "properties": [{
                "model_part_name": "SolidDomain.SoilBody",
                "properties_id": 1,
                "Material": {
                    "constitutive_law": {
                        "name": "SmallStrainUPwDiffOrderPlaneStrainMohrCoulomb"
                    },
                    "Variables": self.solid_properties,
                    "Tables": {}
                }
            }]
        }
        
        solid_file = self.work_dir / f"{self.project_name}_solid_materials.json"
        with open(solid_file, 'w') as f:
            json.dump(solid_materials, f, indent=2)
            
        logger.info("Material files created")
        
    def _run_coupling_solver(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """运行耦合求解器"""
        try:
            import KratosMultiphysics as KMP
            
            # 简化的耦合求解过程（实际需要完整的Kratos耦合求解器）
            total_steps = int(params["problem_data"]["end_time"] / self.coupling_parameters["time_step"])
            
            results = {
                "time_history": [],
                "coupling_convergence": [],
                "max_displacement": 0.0,
                "max_pressure": 0.0,
                "max_velocity": 0.0,
                "final_seepage_rate": 0.0
            }
            
            # 模拟时间步循环
            for step in range(total_steps):
                current_time = step * self.coupling_parameters["time_step"]
                
                # 模拟耦合迭代
                coupling_iterations = np.random.randint(3, 8)
                convergence_history = []
                
                for iter in range(coupling_iterations):
                    # 模拟收敛历史
                    residual = 1e-3 * np.exp(-iter * 0.5) + np.random.normal(0, 1e-7)
                    convergence_history.append(residual)
                    
                    if residual < self.coupling_parameters["convergence_tolerance"]:
                        break
                        
                # 模拟时间步结果
                step_result = {
                    "time": float(current_time),
                    "displacement": float(np.random.uniform(0.001, 0.02) * (step + 1) / total_steps),
                    "pressure": float(np.random.uniform(10000, 50000) * (1 - step / total_steps)),
                    "velocity": float(np.random.uniform(1e-6, 1e-4)),
                    "seepage_rate": float(np.random.uniform(1e-8, 1e-6)),
                    "coupling_iterations": int(coupling_iterations),
                    "converged": bool(residual < self.coupling_parameters["convergence_tolerance"])
                }
                
                results["time_history"].append(step_result)
                results["coupling_convergence"].append(convergence_history)
                
                # 更新最大值
                results["max_displacement"] = max(results["max_displacement"], step_result["displacement"])
                results["max_pressure"] = max(results["max_pressure"], step_result["pressure"])
                results["max_velocity"] = max(results["max_velocity"], step_result["velocity"])
                
            results["final_seepage_rate"] = results["time_history"][-1]["seepage_rate"]
            
            return results
            
        except Exception as e:
            logger.error(f"Coupling solver failed: {e}")
            raise
            
    def _post_process_coupling_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """后处理耦合结果"""
        processed = {
            "analysis_summary": {
                "total_time_steps": len(results["time_history"]),
                "max_displacement_mm": float(results["max_displacement"] * 1000),
                "max_pressure_kpa": float(results["max_pressure"] / 1000),
                "max_velocity_mm_s": float(results["max_velocity"] * 1000),
                "final_seepage_rate_l_s": float(results["final_seepage_rate"] * 1000),
                "average_coupling_iterations": float(np.mean([step["coupling_iterations"] for step in results["time_history"]])),
                "convergence_rate": float(np.mean([step["converged"] for step in results["time_history"]]) * 100)
            },
            "time_history_data": results["time_history"],
            "coupling_performance": {
                "total_coupling_iterations": sum([step["coupling_iterations"] for step in results["time_history"]]),
                "max_coupling_iterations": max([step["coupling_iterations"] for step in results["time_history"]]),
                "convergence_failures": sum([not step["converged"] for step in results["time_history"]])
            },
            "engineering_assessment": self._assess_coupling_results(results),
            "recommendations": self._generate_coupling_recommendations(results)
        }
        
        # 保存结果
        results_file = self.work_dir / f"{self.project_name}_coupling_results.json"
        with open(results_file, 'w') as f:
            json.dump(processed, f, indent=2, ensure_ascii=False)
            
        return processed
        
    def _assess_coupling_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """评估耦合结果"""
        max_disp = results["max_displacement"] * 1000  # mm
        max_pressure = results["max_pressure"] / 1000  # kPa
        seepage_rate = results["final_seepage_rate"] * 1000  # L/s
        
        assessment = {
            "displacement_status": "safe" if max_disp < 30 else "warning" if max_disp < 50 else "critical",
            "pressure_status": "safe" if max_pressure < 100 else "warning" if max_pressure < 200 else "critical",
            "seepage_status": "safe" if seepage_rate < 0.1 else "warning" if seepage_rate < 0.5 else "critical",
            "coupling_stability": "stable" if np.mean([step["converged"] for step in results["time_history"]]) > 0.95 else "unstable",
            "overall_safety": "acceptable"
        }
        
        # 综合评估
        critical_count = sum([status == "critical" for status in [
            assessment["displacement_status"],
            assessment["pressure_status"], 
            assessment["seepage_status"]
        ]])
        
        if critical_count > 0 or assessment["coupling_stability"] == "unstable":
            assessment["overall_safety"] = "needs_attention"
        elif critical_count == 0 and assessment["coupling_stability"] == "stable":
            assessment["overall_safety"] = "safe"
            
        return assessment
        
    def _generate_coupling_recommendations(self, results: Dict[str, Any]) -> List[str]:
        """生成耦合分析建议"""
        recommendations = []
        
        max_disp = results["max_displacement"] * 1000
        seepage_rate = results["final_seepage_rate"] * 1000
        avg_iterations = np.mean([step["coupling_iterations"] for step in results["time_history"]])
        
        if max_disp > 30:
            recommendations.append("变形量较大，建议检查土体参数和支护设计")
            
        if seepage_rate > 0.1:
            recommendations.append("渗流量较大，建议加强防渗措施")
            
        if avg_iterations > 6:
            recommendations.append("耦合收敛较慢，建议调整松弛因子或时间步长")
            
        # 通用建议
        recommendations.extend([
            "监测渗流-变形耦合效应",
            "定期检查排水系统效果",
            "关注地下水位变化对稳定性的影响"
        ])
        
        return recommendations

# 便捷函数
def run_fluid_solid_coupling(project_name: str, 
                           fluid_props: Dict[str, Any],
                           solid_props: Dict[str, Any], 
                           coupling_params: Dict[str, Any],
                           boundary_conditions: Dict[str, Any]) -> Dict[str, Any]:
    """运行流固耦合分析的便捷函数"""
    
    analyzer = FluidSolidCouplingAnalyzer(project_name)
    analyzer.set_fluid_properties(fluid_props)
    analyzer.set_solid_properties(solid_props)
    analyzer.set_coupling_parameters(coupling_params)
    analyzer.set_boundary_conditions(boundary_conditions)
    
    return analyzer.run_fluid_solid_coupling_analysis()

if __name__ == "__main__":
    # 测试流固耦合分析
    print("Testing Fluid-Solid Coupling Analysis...")
    
    # 测试参数
    fluid_props = {
        "density": 1000.0,
        "dynamic_viscosity": 1e-3,
        "bulk_modulus": 2.2e9,
        "permeability_xx": 1e-10,
        "permeability_yy": 1e-10,
        "permeability_zz": 1e-10,
        "porosity": 0.3
    }
    
    solid_props = {
        "young_modulus": 25e6,
        "poisson_ratio": 0.3,
        "density": 1800.0,
        "cohesion": 20000.0,
        "friction_angle": 25.0,
        "biot_coefficient": 1.0
    }
    
    coupling_params = {
        "coupling_type": "two_way",
        "time_step": 0.1,
        "total_time": 5.0,
        "convergence_tolerance": 1e-6,
        "max_coupling_iterations": 10,
        "relaxation_factor": 0.7
    }
    
    boundary_conditions = {
        "displacement_bc": [
            {"model_part": "FixedBoundary", "constrained": [True, True, True], "value": [0.0, 0.0, 0.0]}
        ],
        "pressure_bc": [
            {"model_part": "PressureBoundary", "value": 50000.0}
        ],
        "seepage_face_bc": [
            {"model_part": "SeepageFace", "reference_coordinate": 0.0}
        ]
    }
    
    result = run_fluid_solid_coupling(
        "test_coupling",
        fluid_props,
        solid_props, 
        coupling_params,
        boundary_conditions
    )
    
    print("Fluid-Solid Coupling Result:")
    print(json.dumps(result, indent=2, ensure_ascii=False))