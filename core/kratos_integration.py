"""
Kratos Multiphysics Integration Module for DeepCAD

This module provides the necessary utilities to integrate Kratos Multiphysics
into the DeepCAD application for structural analysis and simulation.
"""

import os
import sys
import logging
from pathlib import Path
from .kratos_utils import safe_get_kratos_version, safe_get_kratos_path, safe_check_kratos_application

# Configure logging
logger = logging.getLogger(__name__)

class KratosIntegration:
    """Main class for Kratos integration with DeepCAD"""
    
    def __init__(self):
        self.kratos_path = self._find_kratos_path()
        self.initialized = False
        
        if self.kratos_path:
            self._initialize_kratos()
        else:
            logger.error("Kratos path not found. Please ensure Kratos is properly installed.")
    
    def _find_kratos_path(self):
        """Find the Kratos installation path"""
        # Try to find Kratos in the project directory
        base_dir = Path(__file__).parent.parent
        possible_paths = [
            base_dir / "core" / "kratos_source" / "kratos" / "bin" / "Release",
            base_dir / "core" / "kratos_source" / "kratos" / "bin" / "Debug",
        ]
        
        for path in possible_paths:
            kratos_init = path / "KratosMultiphysics" / "__init__.py"
            if kratos_init.exists():
                logger.info(f"Found Kratos at: {path}")
                return path
                
        # If not found in project directory, check if it's in the Python path
        try:
            import KratosMultiphysics
            # 使用安全工具获取Kratos路径
            kratos_path_str = safe_get_kratos_path(KratosMultiphysics)
            if kratos_path_str:
                kratos_path = Path(kratos_path_str).parent if Path(kratos_path_str).is_file() else Path(kratos_path_str)
                logger.info(f"Found Kratos in Python path: {kratos_path}")
                return kratos_path
            else:
                logger.warning("Kratos found but path could not be determined")
                return None
        except ImportError:
            logger.warning("KratosMultiphysics not found in Python path")
            return None
    
    def _initialize_kratos(self):
        """Initialize Kratos by adding it to the Python path"""
        if self.kratos_path:
            # Add Kratos to Python path if not already there
            kratos_path_str = str(self.kratos_path)
            if kratos_path_str not in sys.path:
                sys.path.append(kratos_path_str)
                logger.info(f"Added Kratos to Python path: {kratos_path_str}")
            
            # Try to import Kratos to verify it works
            try:
                import KratosMultiphysics
                self.initialized = True
                
                # 使用安全工具获取Kratos版本信息
                version_info = safe_get_kratos_version(KratosMultiphysics)
                logger.info(f"Successfully initialized Kratos Multiphysics v{version_info}")
            except ImportError as e:
                logger.error(f"Failed to import KratosMultiphysics: {e}")
                self.initialized = False
    
    def is_available(self):
        """Check if Kratos is available and initialized"""
        return self.initialized
    
    def get_available_applications(self):
        """Get a list of available Kratos applications"""
        if not self.initialized:
            logger.error("Kratos not initialized")
            return []
        
        try:
            import KratosMultiphysics
            applications = []
            
            # 使用安全工具检查常见应用
            common_apps = [
                "StructuralMechanicsApplication",
                "FluidDynamicsApplication", 
                "GeoMechanicsApplication",
                "LinearSolversApplication",
                "FSIApplication",
                "OptimizationApplication"
            ]
            
            for app in common_apps:
                if safe_check_kratos_application(KratosMultiphysics, app):
                    applications.append(app)
                    if app == "GeoMechanicsApplication":
                        logger.info("GeoMechanicsApplication is available")
            
            if "GeoMechanicsApplication" not in applications:
                logger.warning("GeoMechanicsApplication not found or not properly installed")
            
            return applications
        except ImportError:
            logger.error("Failed to import KratosMultiphysics")
            return []
    
    def create_structural_solver(self, model_part_file, parameters):
        """Create a structural solver for the given model part and parameters"""
        if not self.initialized:
            logger.error("Kratos not initialized")
            return None
        
        try:
            import KratosMultiphysics
            import KratosMultiphysics.StructuralMechanicsApplication
            
            # Create a Kratos Model
            model = KratosMultiphysics.Model()
            
            # Create solver instance
            solver_settings = KratosMultiphysics.Parameters(parameters)
            solver = KratosMultiphysics.StructuralMechanicsApplication.StructuralMechanicsAnalysis(model, solver_settings)
            
            return solver
        except ImportError as e:
            logger.error(f"Failed to create structural solver: {e}")
            return None
        except Exception as e:
            logger.error(f"Error creating structural solver: {e}")
            return None

    def run_analysis(self, project_path):
        """
        Run a Kratos analysis using a ProjectParameters.json file.
        This is the standard way to run a Kratos simulation.
        """
        if not self.is_available():
            logger.error("Kratos is not available. Cannot run analysis.")
            return False, "Kratos not available"

        try:
            import KratosMultiphysics as KM

            # Read the ProjectParameters.json file first to decide analysis class
            with open(project_path, 'r') as parameter_file:
                parameters = KM.Parameters(parameter_file.read())

            # Decide which Analysis class to use based on solver_type
            AnalysisCls = None
            try:
                solver_type = parameters["solver_settings"]["solver_type"].GetString()
            except Exception:
                solver_type = ""

            try:
                if solver_type.lower().startswith("geomechanics"):
                    from KratosMultiphysics.GeoMechanicsApplication.geomechanics_analysis import GeoMechanicsAnalysis as AnalysisCls  # type: ignore
                    logger.info("Using GeoMechanicsAnalysis (by solver_type)")
                else:
                    from KratosMultiphysics.StructuralMechanicsApplication.structural_mechanics_analysis import StructuralMechanicsAnalysis as AnalysisCls
                    logger.info("Using StructuralMechanicsAnalysis (by solver_type)")
            except Exception as inner_e:
                logger.error(f"Failed to import selected Analysis class for solver_type='{solver_type}': {inner_e}")
                raise

            # Create and run the analysis stage
            model = KM.Model()
            simulation = AnalysisCls(model, parameters)
            simulation.Run()

            logger.info("Kratos analysis finished successfully.")
            return True, "Analysis successful"

        except Exception as e:
            logger.error(f"An error occurred during Kratos analysis: {e}")
            return False, f"Analysis failed: {str(e)}"

    def run_excavation_analysis(self, fpn_data, analysis_stages):
        """
        运行基坑工程专门的分析，包含摩尔-库伦本构模型和非线性求解
        """
        if not self.is_available():
            logger.error("Kratos is not available. Cannot run excavation analysis.")
            return False, "Kratos not available"

        try:
            import KratosMultiphysics
            from KratosMultiphysics import StructuralMechanicsApplication
            from KratosMultiphysics.StructuralMechanicsApplication.structural_mechanics_analysis import StructuralMechanicsAnalysis
            
            # 创建基坑工程专用的分析参数
            project_parameters = self._create_excavation_parameters(fpn_data, analysis_stages)
            
            # 运行分析
            model = KratosMultiphysics.Model()
            analysis = StructuralMechanicsAnalysis(model, project_parameters)
            analysis.Run()
            
            logger.info("基坑工程Kratos分析完成")
            return True, "Excavation analysis successful"
            
        except Exception as e:
            logger.error(f"基坑分析失败: {e}")
            return False, f"Analysis failed: {str(e)}"
    
    def _create_excavation_parameters(self, fpn_data, analysis_stages):
        """创建基坑工程专用的Kratos参数"""
        import KratosMultiphysics
        
        # 基坑工程分析参数模板
        parameters_dict = {
            "problem_data": {
                "problem_name": "excavation_analysis",
                "parallel_type": "OpenMP",
                "echo_level": 1,
                "start_time": 0.0,
                "end_time": len(analysis_stages)
            },
            "solver_settings": {
                "solver_type": "Static",
                "model_part_name": "Structure",
                "domain_size": 3,
                "echo_level": 1,
                "analysis_type": "non_linear",
                "model_import_settings": {
                    "input_type": "mdpa",
                    "input_filename": "excavation_model"
                },
                "material_import_settings": {
                    "materials_filename": "materials.json"
                },
                "time_stepping": {
                    "time_step": 1.0
                },
                "line_search": False,
                "convergence_criterion": "residual_criterion",
                "displacement_relative_tolerance": 1e-4,
                "displacement_absolute_tolerance": 1e-9,
                "residual_relative_tolerance": 1e-4,
                "residual_absolute_tolerance": 1e-9,
                "max_iteration": 20,
                "use_old_stiffness_in_first_iteration": False,
                "problem_domain_sub_model_part_list": ["Parts_soil", "Parts_structure"],
                "processes_sub_model_part_list": ["DISPLACEMENT_boundary", "SelfWeight3D_load"]
            },
            "processes": {
                "constraints_process_list": [
                    {
                        "python_module": "assign_vector_variable_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "AssignVectorVariableProcess",
                        "Parameters": {
                            "model_part_name": "Structure.DISPLACEMENT_boundary",
                            "variable_name": "DISPLACEMENT",
                            "constrained": [True, True, True],
                            "value": [0.0, 0.0, 0.0],
                            "interval": [0.0, "End"]
                        }
                    }
                ],
                "loads_process_list": [
                    {
                        "python_module": "assign_vector_by_direction_process",
                        "kratos_module": "KratosMultiphysics",
                        "check": "DirectorVectorNonZero direction",
                        "process_name": "AssignVectorByDirectionProcess",
                        "Parameters": {
                            "model_part_name": "Structure.SelfWeight3D_load",
                            "variable_name": "VOLUME_ACCELERATION",
                            "modulus": 9.81,
                            "direction": [0.0, 0.0, -1.0],
                            "interval": [0.0, "End"]
                        }
                    }
                ]
            },
            "output_processes": {
                "gid_output": [
                    {
                        "python_module": "gid_output_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "GiDOutputProcess",
                        "help": "This process writes postprocessing files for GiD",
                        "Parameters": {
                            "model_part_name": "Structure",
                            "output_name": "excavation_results",
                            "postprocess_parameters": {
                                "result_file_configuration": {
                                    "gidpost_flags": {
                                        "GiDPostMode": "GiD_PostBinary",
                                        "WriteDeformedMeshFlag": "WriteDeformed",
                                        "WriteConditionsFlag": "WriteConditions",
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
                                        "REACTION",
                                        "VELOCITY",
                                        "ACCELERATION"
                                    ],
                                    "gauss_point_results": [
                                        "CAUCHY_STRESS_TENSOR",
                                        "STRAIN_ENERGY"
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        }
        
        return KratosMultiphysics.Parameters(str(parameters_dict).replace("'", '"'))

# Create a singleton instance
kratos_integration = KratosIntegration()

def get_kratos_integration():
    """Get the KratosIntegration singleton instance"""
    return kratos_integration 