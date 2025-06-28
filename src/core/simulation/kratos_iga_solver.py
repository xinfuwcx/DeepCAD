"""
@file kratos_iga_solver.py
@description Kratos IGA solver wrapper for deep excavation analysis
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import json
import shutil
from typing import Dict, Any, List

try:
    # Ensure Kratos is in the path
    kratos_root = os.getenv("KRATOS_ROOT", "../Kratos")
    sys.path.append(kratos_root)
    
    import KratosMultiphysics
    import KratosMultiphysics.IgaApplication
    import KratosMultiphysics.StructuralMechanicsApplication
    
    from KratosMultiphysics.StructuralMechanicsApplication.structural_mechanics_analysis import StructuralMechanicsAnalysis
    
    HAS_KRATOS_IGA = True
except ImportError:
    HAS_KRATOS_IGA = False
    print("Warning: Kratos IGA Application not available")


class KratosIgaSolver:
    """Kratos IGA solver wrapper for deep excavation analysis"""
    
    def __init__(self, output_dir: str = "./results"):
        """Initialize Kratos IGA solver"""
        self.output_dir = output_dir
        
        if not HAS_KRATOS_IGA:
            print("Kratos IGA not available, running in simulation mode")
            return
        
        # Create output directory if it doesn"t exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Initialize model
        self.model = KratosMultiphysics.Model()
        self.parameters = None
        self.analysis = None
        
    def set_parameters_from_file(self, param_file: str) -> bool:
        """Set simulation parameters from a file"""
        if not HAS_KRATOS_IGA:
            return False
            
        try:
            with open(param_file, 'r') as f:
                parameters = KratosMultiphysics.Parameters(f.read())
            
            self.parameters = parameters
            return True
        except Exception as e:
            print(f"Error loading parameters: {e}")
            return False
    
    def set_parameters(self, params: Dict[str, Any]) -> bool:
        """Set simulation parameters from a dictionary"""
        if not HAS_KRATOS_IGA:
            return False
            
        try:
            # Convert dictionary to Kratos Parameters
            parameters_str = json.dumps(params)
            self.parameters = KratosMultiphysics.Parameters(parameters_str)
            return True
        except Exception as e:
            print(f"Error setting parameters: {e}")
            return False
    
    def import_iga_model(self, iga_input_file: str) -> bool:
        """Import IGA model from file"""
        if not HAS_KRATOS_IGA or not self.parameters:
            return False
            
        try:
            # Read IGA model data
            degree_u, degree_v = 0, 0
            knots_u, knots_v = [], []
            control_points = []
            
            with open(iga_input_file, 'r') as f:
                lines = f.readlines()
                
                for i, line in enumerate(lines):
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                        
                    if line.startswith('NURBS_DEGREE_U'):
                        degree_u = int(line.split()[1])
                    elif line.startswith('NURBS_DEGREE_V'):
                        degree_v = int(line.split()[1])
                    elif line.startswith('KNOTS_U'):
                        knots_count = int(line.split()[1])
                        knots_u = list(map(float, lines[i+1].strip().split()))
                    elif line.startswith('KNOTS_V'):
                        knots_count = int(line.split()[1])
                        knots_v = list(map(float, lines[i+1].strip().split()))
                    elif line.startswith('CONTROL_POINTS'):
                        cp_count = int(line.split()[1])
                        for j in range(i+1, i+1+cp_count):
                            if j < len(lines):
                                cp = list(map(float, lines[j].strip().split()))
                                control_points.append(cp)
            
            # Set up model part for IGA surface
            model_part = self.model.CreateModelPart("IgaModelPart")
            
            # TODO: Create NURBS entities in Kratos model
            # This requires detailed implementation with Kratos IGA API
            # Using variables: degree_u, degree_v, knots_u, knots_v, control_points
            
            return True
        except Exception as e:
            print(f"Error importing IGA model: {e}")
            return False
            
    def set_material_properties(self, material_props: Dict[str, Any]) -> bool:
        """Set material properties for the simulation"""
        if not HAS_KRATOS_IGA:
            return False
            
        try:
            # Get model part
            model_part = self.model.GetModelPart("IgaModelPart")
            
            # Set material properties
            props = model_part.Properties[1]
            for key, value in material_props.items():
                if isinstance(value, (int, float)):
                    props[getattr(KratosMultiphysics, key)] = value
                elif isinstance(value, list):
                    # Handle vector or matrix properties
                    if len(value) == 3:  # Vector
                        vec = KratosMultiphysics.Vector(len(value))
                        for i, v in enumerate(value):
                            vec[i] = v
                        props[getattr(KratosMultiphysics, key)] = vec
            
            return True
        except Exception as e:
            print(f"Error setting material properties: {e}")
            return False
    
    def set_boundary_conditions(self, boundary_conditions: List[Dict[str, Any]]) -> bool:
        """Set boundary conditions for the simulation"""
        if not HAS_KRATOS_IGA:
            return False
            
        try:
            # Get model part
            model_part = self.model.GetModelPart("IgaModelPart")
            
            # Apply boundary conditions
            for bc in boundary_conditions:
                bc_type = bc.get("type")
                nodes = bc.get("nodes", [])
                value = bc.get("value")
                variable_name = bc.get("variable")
                
                if not variable_name or not nodes:
                    continue
                    
                variable = getattr(KratosMultiphysics, variable_name)
                
                if bc_type == "dirichlet":
                    for node_id in nodes:
                        if node_id < len(model_part.Nodes):
                            node = model_part.Nodes[node_id + 1]  # 1-based indexing in Kratos
                            node.Fix(variable)
                            node.SetSolutionStepValue(variable, 0, value)
            
            return True
        except Exception as e:
            print(f"Error setting boundary conditions: {e}")
            return False
            
    def solve(self) -> bool:
        """Run the simulation"""
        if not HAS_KRATOS_IGA or not self.parameters:
            return False
            
        try:
            # Create and run the analysis
            self.analysis = StructuralMechanicsAnalysis(self.model, self.parameters)
            self.analysis.Run()
            return True
        except Exception as e:
            print(f"Error running simulation: {e}")
            return False
    
    def get_results(self, variable_name: str) -> List[float]:
        """Get results for a specific variable"""
        if not HAS_KRATOS_IGA or not self.analysis:
            return []
            
        try:
            # Get model part
            model_part = self.model.GetModelPart("IgaModelPart")
            variable = getattr(KratosMultiphysics, variable_name)
            
            # Extract results
            results = []
            for node in model_part.Nodes:
                value = node.GetSolutionStepValue(variable)
                results.append(value)
                
            return results
        except Exception as e:
            print(f"Error getting results: {e}")
            return []
    
    def export_results(self, output_file: str, format: str = "vtk") -> bool:
        """Export results to a file"""
        if not HAS_KRATOS_IGA or not self.analysis:
            return False
            
        try:
            # Set up output process
            if format.lower() == "vtk":
                from KratosMultiphysics.IgaApplication.iga_output_process import IgaOutputProcess
                
                output_params = KratosMultiphysics.Parameters("""{
                    "model_part_name": "IgaModelPart",
                    "output_name": "iga_results",
                    "output_dir": """ + f'"{self.output_dir}"' + """,
                    "file_format": "vtk"
                }""")
                
                output_process = IgaOutputProcess(self.model, output_params)
                output_process.ExecuteFinalize()
                
                # Copy to specified output file
                source_file = os.path.join(self.output_dir, "iga_results.vtk")
                if os.path.exists(source_file):
                    shutil.copy(source_file, output_file)
                
            return True
        except Exception as e:
            print(f"Error exporting results: {e}")
            return False
    
    def generate_default_parameters(self) -> Dict[str, Any]:
        """Generate default parameters for IGA simulation"""
        return {
            "problem_data": {
                "problem_name": "iga_analysis",
                "start_time": 0.0,
                "end_time": 1.0,
                "echo_level": 1
            },
            "solver_settings": {
                "solver_type": "static",
                "model_part_name": "IgaModelPart",
                "domain_size": 3,
                "time_stepping": {
                    "time_step": 1.0
                },
                "model_import_settings": {
                    "input_type": "use_input_model_part"
                },
                "material_import_settings": {
                    "materials_filename": "IgaMaterials.json"
                },
                "line_search": False,
                "convergence_criterion": "residual_criterion",
                "displacement_relative_tolerance": 1.0e-4,
                "displacement_absolute_tolerance": 1.0e-9,
                "residual_relative_tolerance": 1.0e-4,
                "residual_absolute_tolerance": 1.0e-9,
                "max_iteration": 10
            },
            "output_processes": {
                "vtk_output": {
                    "python_module": "iga_output_process",
                    "kratos_module": "KratosMultiphysics.IgaApplication",
                    "process_name": "IgaOutputProcess",
                    "Parameters": {
                        "model_part_name": "IgaModelPart",
                        "output_name": "iga_results",
                        "output_dir": "./results",
                        "file_format": "vtk",
                        "output_control_type": "step",
                        "output_frequency": 1
                    }
                }
            }
        }