"""
Kratos Solver Module for DeepCAD

This module provides structural analysis solvers using Kratos Multiphysics.
"""

import os
import json
import logging
from pathlib import Path
from .kratos_integration import get_kratos_integration

# Configure logging
logger = logging.getLogger(__name__)


class StructuralSolver:
    """Structural analysis solver using Kratos Multiphysics"""
    
    def __init__(self):
        self.kratos = get_kratos_integration()
        self.model = None
        self.solver = None
        self.output_path = None
        
    def is_available(self):
        """Check if the structural solver is available"""
        if not self.kratos.is_available():
            return False
            
        # Check if StructuralMechanicsApplication is available
        apps = self.kratos.get_available_applications()
        return "StructuralMechanicsApplication" in apps
    
    def setup(self, mesh_file, output_dir=None):
        """Set up the solver with the given mesh file"""
        if not self.is_available():
            logger.error("Structural solver is not available")
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
            self.solver = self.kratos.create_structural_solver(mesh_file, solver_params)
            return True if self.solver else False
        except Exception as e:
            logger.error(f"Failed to set up structural solver: {e}")
            return False
    
    def _create_default_parameters(self, mesh_file):
        """Create default solver parameters"""
        model_name = Path(mesh_file).stem
        
        params = {
            "problem_data": {
                "problem_name": model_name,
                "start_time": 0.0,
                "end_time": 1.0,
                "echo_level": 1
            },
            "solver_settings": {
                "solver_type": "static",
                "model_part_name": "Structure",
                "domain_size": 3,
                "model_import_settings": {
                    "input_type": "mdpa",
                    "input_filename": model_name
                },
                "time_stepping": {
                    "time_step": 0.1
                },
                "linear_solver_settings": {
                    "solver_type": "amgcl"
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
                            "model_part_name": "Structure",
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
                                    "nodal_results": ["DISPLACEMENT", "REACTION"],
                                    "gauss_point_results": ["VON_MISES_STRESS"]
                                }
                            }
                        }
                    }
                ]
            }
        }
        
        return json.dumps(params)
    
    def solve(self):
        """Run the structural analysis"""
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
            
            logger.info("Structural analysis completed successfully")
            return True
        except Exception as e:
            logger.error(f"Error during structural analysis: {e}")
            return False
    
    def get_results_path(self):
        """Get the path to the results directory"""
        return self.output_path 