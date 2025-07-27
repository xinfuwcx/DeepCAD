"""
Kratos GeoMechanics Solver Module for DeepCAD

This module provides geotechnical analysis solvers using Kratos Multiphysics GeoMechanicsApplication.
"""

import os
import json
import logging
from pathlib import Path
from .kratos_integration import get_kratos_integration

# Configure logging
logger = logging.getLogger(__name__)


class GeoMechanicsSolver:
    """Geotechnical analysis solver using Kratos GeoMechanicsApplication"""
    
    def __init__(self):
        self.kratos = get_kratos_integration()
        self.model = None
        self.solver = None
        self.output_path = None
        
    def is_available(self):
        """Check if the geomechanics solver is available"""
        if not self.kratos.is_available():
            return False
            
        # Check if GeoMechanicsApplication is available
        apps = self.kratos.get_available_applications()
        return "GeoMechanicsApplication" in apps
    
    def setup(self, mesh_file, output_dir=None):
        """Set up the solver with the given mesh file"""
        if not self.is_available():
            logger.error("GeoMechanics solver is not available")
            return False
            
        if not os.path.exists(mesh_file):
            logger.error(f"Mesh file not found: {mesh_file}")
            return False
            
        # Set output directory
        if output_dir:
            self.output_path = Path(output_dir)
        else:
            self.output_path = Path(mesh_file).parent / "results"
            
        self.output_path.mkdir(parents=True, exist_ok=True)
        
        # Create default solver parameters
        solver_params = self._create_default_parameters(mesh_file)
        
        # Create solver
        try:
            self.solver = self._create_geomechanics_solver(mesh_file, solver_params)
            return True if self.solver else False
        except Exception as e:
            logger.error(f"Failed to set up geomechanics solver: {e}")
            return False
    
    def _create_default_parameters(self, mesh_file):
        """Create default solver parameters for geomechanics analysis"""
        model_name = Path(mesh_file).stem
        
        params = {
            "problem_data": {
                "problem_name": model_name,
                "start_time": 0.0,
                "end_time": 1.0,
                "echo_level": 1,
                "parallel_type": "OpenMP",
                "number_of_threads": 4
            },
            "solver_settings": {
                "solver_type": "geomechanics_U_Pw_solver",
                "model_part_name": "PorousDomain",
                "domain_size": 3,
                "model_import_settings": {
                    "input_type": "mdpa",
                    "input_filename": model_name
                },
                "material_import_settings": {
                    "materials_filename": f"{model_name}_materials.json"
                },
                "time_stepping": {
                    "time_step": 0.1
                },
                "solution_type": "quasi_static",
                "scheme_type": "Newmark",
                "newmark_beta": 0.25,
                "newmark_gamma": 0.5,
                "newmark_theta": 0.5,
                "strategy_type": "newton_raphson",
                "convergence_criterion": "Displacement_criterion",
                "water_pressure_relative_tolerance": 1.0e-4,
                "water_pressure_absolute_tolerance": 1.0e-9,
                "displacement_relative_tolerance": 1.0e-4,
                "displacement_absolute_tolerance": 1.0e-9,
                "residual_relative_tolerance": 1.0e-4,
                "residual_absolute_tolerance": 1.0e-9,
                "max_iterations": 15,
                "increase_factor": 2.0,
                "reduction_factor": 0.5,
                "linear_solver_settings": {
                    "solver_type": "amgcl",
                    "tolerance": 1.0e-6,
                    "max_iteration": 100,
                    "preconditioner_type": "amg",
                    "smoother_type": "ilu0",
                    "krylov_type": "gmres",
                    "coarsening_type": "aggregation"
                }
            },
            "processes": {},
            "output_processes": {
                "gid_output": [
                    {
                        "python_module": "gid_output_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "GiDOutputProcess",
                        "Parameters": {
                            "model_part_name": "PorousDomain",
                            "output_name": model_name,
                            "postprocess_parameters": {
                                "result_file_configuration": {
                                    "gidpost_flags": {
                                        "GiDPostMode": "GiD_PostBinary",
                                        "WriteDeformedMeshFlag": "WriteDeformed",
                                        "WriteConditionsFlag": "WriteConditions",
                                        "MultiFileFlag": "SingleFile"
                                    },
                                    "file_label": "step",
                                    "output_control_type": "step",
                                    "output_interval": 1,
                                    "body_output": True,
                                    "node_output": True,
                                    "skin_output": False,
                                    "plane_output": [],
                                    "nodal_results": [
                                        "DISPLACEMENT",
                                        "REACTION",
                                        "WATER_PRESSURE",
                                        "VELOCITY"
                                    ],
                                    "gauss_point_results": [
                                        "CAUCHY_STRESS_TENSOR",
                                        "GREEN_LAGRANGE_STRAIN_TENSOR"
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        }
        
        return json.dumps(params)
    
    def _create_geomechanics_solver(self, mesh_file, parameters_json):
        """Create a geomechanics solver for the given mesh file and parameters"""
        if not self.kratos.is_available():
            logger.error("Kratos not initialized")
            return None
        
        try:
            import KratosMultiphysics
            import KratosMultiphysics.GeoMechanicsApplication
            
            # Create a Kratos Model
            model = KratosMultiphysics.Model()
            
            # Create solver instance
            solver_settings = KratosMultiphysics.Parameters(parameters_json)
            solver = KratosMultiphysics.GeoMechanicsApplication.GeoMechanicsAnalysis(model, solver_settings)
            
            return solver
        except ImportError as e:
            logger.error(f"Failed to create geomechanics solver: {e}")
            return None
        except Exception as e:
            logger.error(f"Error creating geomechanics solver: {e}")
            return None
    
    def solve(self):
        """Run the geotechnical analysis"""
        if not self.solver:
            logger.error("Solver not set up. Call setup() first.")
            return False
            
        try:
            # Initialize solver
            self.solver.Initialize()
            
            # Run solver
            self.solver.RunSolutionLoop()
            
            # Finalize solver
            self.solver.Finalize()
            
            logger.info("Geotechnical analysis completed successfully")
            return True
        except Exception as e:
            logger.error(f"Error during geotechnical analysis: {e}")
            return False
    
    def get_results_path(self):
        """Get the path to the results directory"""
        return self.output_path 